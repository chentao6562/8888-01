export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface LlmChatResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
}

export interface LlmProvider {
  readonly name: string;
  chat(messages: LlmChatMessage[], options?: LlmChatOptions): Promise<LlmChatResult>;
}
