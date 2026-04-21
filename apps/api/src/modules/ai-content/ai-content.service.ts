import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { LlmService } from '@/modules/llm/llm.service';
import { SensitiveService } from '@/modules/llm/sensitive.service';
import type {
  CopywritingDto,
  DialectAdaptDto,
  TagsDto,
  TitlesDto,
} from './dto/copywriting.dto';

export interface CopywritingResult {
  hook: string;
  body: string;
  cta: string;
  provider: string;
  latencyMs: number;
}

export interface TitleCandidate {
  title: string;
  ctrScore: number;
}

@Injectable()
export class AiContentService {
  constructor(
    private readonly llm: LlmService,
    private readonly sensitive: SensitiveService,
  ) {}

  async copywriting(
    tenantId: string,
    staffId: string,
    dto: CopywritingDto,
  ): Promise<CopywritingResult> {
    this.preCheck(`${dto.sellingPoint} ${(dto.evidence ?? []).join(' ')}`);
    const llm = await this.llm.invoke(
      'copywriting.three-parts',
      {
        sellingPoint: dto.sellingPoint,
        evidence: dto.evidence ?? [],
        framework: dto.framework ?? 'story',
        dialect: dto.dialect ?? 'standard',
      },
      { tenantId, staffId, temperature: 0.4 },
    );
    const { hook, body, cta } = this.parseThreeParts(llm.content);
    this.postCheck(`${hook}\n${body}\n${cta}`);
    return { hook, body, cta, provider: llm.provider, latencyMs: llm.latencyMs };
  }

  async titles(
    tenantId: string,
    staffId: string,
    dto: TitlesDto,
  ): Promise<TitleCandidate[]> {
    this.preCheck(dto.summary);
    const llm = await this.llm.invoke(
      'titles.candidates',
      { summary: dto.summary, dialect: dto.dialect ?? 'standard' },
      { tenantId, staffId, temperature: 0.6 },
    );
    return this.safeJson<TitleCandidate[]>(llm.content, []);
  }

  async tags(tenantId: string, staffId: string, dto: TagsDto): Promise<string[]> {
    this.preCheck(dto.content);
    const llm = await this.llm.invoke(
      'tags.recommend',
      { platform: dto.platform, content: dto.content, industry: dto.industry ?? '' },
      { tenantId, staffId },
    );
    const tags = this.safeJson<string[]>(llm.content, []);
    return tags.slice(0, 15);
  }

  async dialectAdapt(
    tenantId: string,
    staffId: string,
    dto: DialectAdaptDto,
  ): Promise<{ text: string; dialect: string; provider: string }> {
    this.preCheck(dto.text);
    const llm = await this.llm.invoke(
      'dialect.adapt',
      { text: dto.text, dialect: dto.dialect },
      { tenantId, staffId },
    );
    return { text: llm.content, dialect: dto.dialect, provider: llm.provider };
  }

  checkSensitive(text: string): { clean: boolean; hits: string[] } {
    const hits = this.sensitive.check(text);
    return { clean: hits.length === 0, hits };
  }

  private preCheck(text: string): void {
    const hits = this.sensitive.check(text);
    if (hits.length > 0) {
      throw new HttpException(
        {
          code: 'SENSITIVE_WORD_DETECTED',
          message: `命中敏感词：${hits.join(', ')}`,
          details: { hits },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private postCheck(text: string): void {
    // 调 LLM 后再检查一次，防止生成物踩雷
    const hits = this.sensitive.check(text);
    if (hits.length > 0) {
      throw new HttpException(
        {
          code: 'SENSITIVE_WORD_DETECTED',
          message: `AI 生成物命中敏感词，已拦截：${hits.join(', ')}`,
          details: { hits, stage: 'post' },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private parseThreeParts(raw: string): { hook: string; body: string; cta: string } {
    const hook = this.between(raw, '【钩子】', '【主体】') ?? '';
    const body = this.between(raw, '【主体】', '【CTA】') ?? '';
    const cta = this.after(raw, '【CTA】') ?? '';
    // 若未命中分段标记，fallback：整段拆成 3 行
    if (!hook && !body && !cta) {
      const lines = raw.split(/\n+/).filter(Boolean);
      return {
        hook: lines[0] ?? '',
        body: lines.slice(1, -1).join('\n') ?? '',
        cta: lines[lines.length - 1] ?? '',
      };
    }
    return { hook: hook.trim(), body: body.trim(), cta: cta.trim() };
  }

  private between(s: string, a: string, b: string): string | null {
    const i = s.indexOf(a);
    if (i < 0) return null;
    const j = s.indexOf(b, i + a.length);
    if (j < 0) return null;
    return s.slice(i + a.length, j);
  }
  private after(s: string, a: string): string | null {
    const i = s.indexOf(a);
    if (i < 0) return null;
    return s.slice(i + a.length);
  }

  private safeJson<T>(s: string, fallback: T): T {
    try {
      return JSON.parse(s) as T;
    } catch {
      return fallback;
    }
  }
}
