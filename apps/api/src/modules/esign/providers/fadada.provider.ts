import { Logger } from '@nestjs/common';
import type { EsignSendRequest, EsignSendResult, EsignCallback } from '../esign.service';

/**
 * 法大大电子签 provider · phase 8 stub。
 *
 * 上线前需补完：
 *  1. 凭 `FADADA_APP_ID` / `FADADA_APP_SECRET` 调 `/v2/account/sync_account` 同步租户主体
 *  2. `/v2/contract/create_contract` 上传合同 PDF（contractBody → puppeteer 渲染）
 *  3. `/v2/sign/extsign_auto_simple` 发起签署 → 返回 signUrl
 *  4. 回调 `/api/v1/esign/callback/fadada` 校验 sign（HMAC-SHA1 with appSecret）+ 幂等
 *  5. 回调通过后调 `/v2/contract/download_contract` 拿盖章 PDF → OSS
 *
 * 文档：https://open.fadada.com/api-docs
 *
 * 当前实现：仅占位 + 抛 NotImplemented，让 EsignService.send() 启动时显式失败。
 */
export class FadadaProvider {
  private readonly logger = new Logger(FadadaProvider.name);

  constructor(
    private readonly appId: string,
    private readonly appSecret: string,
    private readonly baseUrl: string = 'https://api.fadada.com',
  ) {
    if (!appId || !appSecret) {
      throw new Error('FadadaProvider requires FADADA_APP_ID + FADADA_APP_SECRET');
    }
  }

  async send(_req: EsignSendRequest): Promise<EsignSendResult> {
    this.logger.error('FadadaProvider.send 未实装 · phase 8 上线前必须补完');
    throw new Error('FadadaProvider.send not implemented · 联系 phase-8 owner');
  }

  /**
   * 回调签名校验。
   * Fadada 通常用 HMAC-SHA1(appSecret, sortedQuery + body)，phase 8 按 sandbox 文档实现。
   */
  verifyCallback(_signature: string, _payload: string): boolean {
    this.logger.error('FadadaProvider.verifyCallback 未实装');
    return false;
  }

  parseCallback(_payload: Record<string, unknown>): EsignCallback {
    throw new Error('FadadaProvider.parseCallback not implemented');
  }
}
