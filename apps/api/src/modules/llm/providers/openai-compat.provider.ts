import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  LlmChatMessage,
  LlmChatOptions,
  LlmChatResult,
  LlmProvider,
} from './llm-provider.interface';

/**
 * OpenAI 兼容协议 provider。适用于：
 *  - OpenAI（gpt-4o-mini、gpt-4.1 等）
 *  - 通义千问（兼容模式 · DashScope）
 *  - DeepSeek（v3 API）
 *
 * 配置：
 *   LLM_PROVIDER=openai-compat
 *   LLM_API_KEY=sk-...
 *   LLM_BASE_URL=https://api.openai.com/v1  (或 https://dashscope.aliyuncs.com/compatible-mode/v1)
 *   LLM_MODEL=gpt-4o-mini
 *
 * Phase 4 不激活（保持 mock 默认）；phase 8 起配置了 env 后自动切。
 */
@Injectable()
export class OpenAiCompatProvider implements LlmProvider {
  readonly name: string;
  private readonly logger = new Logger(OpenAiCompatProvider.name);

  constructor(private readonly config: ConfigService) {
    this.name = this.config.get<string>('LLM_PROVIDER') ?? 'openai-compat';
  }

  async chat(
    messages: LlmChatMessage[],
    options: LlmChatOptions = {},
  ): Promise<LlmChatResult> {
    const apiKey = this.config.get<string>('LLM_API_KEY');
    const baseUrl = this.config.get<string>('LLM_BASE_URL') ?? 'https://api.openai.com/v1';
    const model = this.config.get<string>('LLM_MODEL') ?? 'gpt-4o-mini';
    if (!apiKey) {
      throw new Error('LLM_API_KEY not configured');
    }

    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), options.timeoutMs ?? 30_000);

    try {
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 1024,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`LLM upstream ${resp.status}: ${text.slice(0, 200)}`);
      }
      const data = (await resp.json()) as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = data.choices?.[0]?.message?.content ?? '';
      return {
        content,
        tokensIn: data.usage?.prompt_tokens ?? 0,
        tokensOut: data.usage?.completion_tokens ?? 0,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
