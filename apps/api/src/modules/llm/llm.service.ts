import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import type {
  LlmProvider,
  LlmChatOptions,
  LlmChatResult,
} from './providers/llm-provider.interface';
import { MockLlmProvider } from './providers/mock.provider';
import { OpenAiCompatProvider } from './providers/openai-compat.provider';
import { LlmUsageLogEntity } from './entities/llm-usage-log.entity';
import { QuotaService } from './quota.service';

export interface LlmInvokeOptions extends LlmChatOptions {
  tenantId: string;
  staffId?: string;
}

export interface LlmInvokeResult extends LlmChatResult {
  provider: string;
  latencyMs: number;
}

/**
 * LLM 网关。phase 4 起：
 *  - 支持通过 env `LLM_PROVIDER` 切换 mock / openai-compat
 *  - 调用前检查配额（本月用量 vs plan 上限）
 *  - 调用后写 usage log
 *  - Prompt 在 system 里附 `[prompt:name]` 标记，以便 mock provider 识别
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly mock: MockLlmProvider,
    @Optional() private readonly real: OpenAiCompatProvider,
    @InjectRepository(LlmUsageLogEntity)
    private readonly logs: Repository<LlmUsageLogEntity>,
    private readonly quota: QuotaService,
  ) {}

  private pickProvider(): LlmProvider {
    const name = this.config.get<string>('LLM_PROVIDER') ?? 'mock';
    if (name === 'mock') return this.mock;
    if (name === 'openai-compat') {
      if (!this.real) {
        this.logger.warn('LLM_PROVIDER=openai-compat 但 provider 未注入，降级 mock');
        return this.mock;
      }
      return this.real;
    }
    this.logger.warn(`未知 LLM_PROVIDER=${name}，降级 mock`);
    return this.mock;
  }

  async invoke(
    promptName: string,
    variables: Record<string, unknown>,
    opts: LlmInvokeOptions,
  ): Promise<LlmInvokeResult> {
    await this.checkQuota(opts.tenantId);

    const provider = this.pickProvider();
    const messages = this.buildMessages(promptName, variables);
    const start = Date.now();
    let result: LlmChatResult;
    try {
      result = await provider.chat(messages, {
        temperature: opts.temperature ?? 0.3,
        maxTokens: opts.maxTokens ?? 1024,
        timeoutMs: opts.timeoutMs ?? 30_000,
      });
    } catch (e) {
      await this.writeLog({
        tenantId: opts.tenantId,
        staffId: opts.staffId ?? null,
        promptName,
        provider: provider.name,
        tokensIn: 0,
        tokensOut: 0,
        latencyMs: Date.now() - start,
        success: 0,
        errorCode: 'LLM_SERVICE_UNAVAILABLE',
      });
      throw new HttpException(
        {
          code: 'LLM_SERVICE_UNAVAILABLE',
          message: `LLM 调用失败：${e instanceof Error ? e.message : 'unknown'}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
    const latencyMs = Date.now() - start;
    await this.writeLog({
      tenantId: opts.tenantId,
      staffId: opts.staffId ?? null,
      promptName,
      provider: provider.name,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      latencyMs,
      success: 1,
      errorCode: null,
    });
    return { ...result, provider: provider.name, latencyMs };
  }

  /** 本月已用次数（粗粒度计数 phase 8 再优化到独立计数器）。 */
  async usedThisMonth(tenantId: string): Promise<number> {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    return this.logs.count({ where: { tenantId, createdAt: Between(start, end) } });
  }

  async usage(tenantId: string): Promise<{
    used: number;
    limit: number;
    provider: string;
  }> {
    const used = await this.usedThisMonth(tenantId);
    const limit = await this.quota.limitFor(tenantId);
    return { used, limit, provider: this.config.get<string>('LLM_PROVIDER') ?? 'mock' };
  }

  private async checkQuota(tenantId: string): Promise<void> {
    const used = await this.usedThisMonth(tenantId);
    await this.quota.consume(tenantId, used);
  }

  private buildMessages(
    promptName: string,
    variables: Record<string, unknown>,
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const dialect = (variables.dialect as string) ?? 'standard';
    const system = [
      `[prompt:${promptName}] [dialect:${dialect}]`,
      '你是 MindLink 代运营系统的内容助手。',
      '严格按用户给出的框架生成中文内容，避免平台敏感词（赌博 / 博彩 / 最牛 等）。',
    ].join('\n');
    const user = JSON.stringify(variables, null, 2);
    return [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];
  }

  private async writeLog(row: Partial<LlmUsageLogEntity>): Promise<void> {
    try {
      await this.logs.save(this.logs.create(row));
    } catch (e) {
      this.logger.warn(`写入 usage log 失败：${(e as Error).message}`);
    }
  }
}
