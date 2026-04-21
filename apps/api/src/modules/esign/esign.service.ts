import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { FadadaProvider } from './providers/fadada.provider';

export interface EsignSendRequest {
  tenantId: string;
  contractId: string;
  contractNo: string;
  body: string;
  signers: Array<{ name: string; phone: string }>;
}

export interface EsignSendResult {
  orderId: string;
  signUrl: string;
  status: 'sent';
  provider: string;
}

export interface EsignCallback {
  orderId: string;
  status: 'signed' | 'rejected' | 'expired';
  signedAt?: Date;
  fileUrl?: string;
}

/**
 * 电子签抽象层。
 *  - `mock`（默认 dev/test）：立即返回 sent，提供 /callback mock 入口
 *  - `fadada`（phase 8 prod）：调用 FadadaProvider，需 FADADA_APP_ID/SECRET
 *
 * 切换：env `ESIGN_PROVIDER=fadada`
 */
@Injectable()
export class EsignService {
  private readonly logger = new Logger(EsignService.name);
  private fadada?: FadadaProvider;

  get provider(): string {
    return process.env.ESIGN_PROVIDER ?? 'mock';
  }

  private getFadada(): FadadaProvider {
    if (!this.fadada) {
      this.fadada = new FadadaProvider(
        process.env.FADADA_APP_ID ?? '',
        process.env.FADADA_APP_SECRET ?? '',
        process.env.FADADA_BASE_URL,
      );
    }
    return this.fadada;
  }

  async send(req: EsignSendRequest): Promise<EsignSendResult> {
    if (this.provider === 'fadada') {
      return this.getFadada().send(req);
    }
    const orderId = `mock-${randomBytes(8).toString('hex')}`;
    this.logger.debug(
      `[esign:${this.provider}] send contract=${req.contractNo} signers=${req.signers.length}`,
    );
    return {
      orderId,
      signUrl: `http://localhost:3000/api/v1/esign/mock/sign?orderId=${orderId}`,
      status: 'sent',
      provider: this.provider,
    };
  }
}
