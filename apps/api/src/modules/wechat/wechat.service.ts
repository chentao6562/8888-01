import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Code2SessionResult {
  openid: string;
  unionid?: string;
  sessionKey?: string;
}

export interface SubscribeMessagePayload {
  openid: string;
  templateId: string;
  data: Record<string, { value: string }>;
  page?: string;
}

/**
 * 微信小程序服务。phase 7 MVP 用 mock：
 *  - code2Session：code 回传固定 openid（或 `openid:xxx` 格式）
 *  - 订阅消息：console.log 输出，不实际调微信 API
 *
 * phase 8 起按 env 切真实 WeChat MP API：
 *  - WECHAT_APP_ID · WECHAT_APP_SECRET
 *  - 接 https://api.weixin.qq.com/sns/jscode2session
 *  - 接 https://api.weixin.qq.com/cgi-bin/message/subscribe/send
 */
@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  constructor(private readonly config: ConfigService) {}

  get provider(): string {
    return this.config.get<string>('WECHAT_PROVIDER') ?? 'mock';
  }

  async code2Session(code: string): Promise<Code2SessionResult> {
    if (this.provider === 'mock') {
      // 开发模式：code 自身即 openid，或 `dev:13800001234` 可指定手机
      return { openid: code.startsWith('dev:') ? code : `mock-${code.slice(0, 32)}` };
    }
    const appId = this.config.get<string>('WECHAT_APP_ID');
    const appSecret = this.config.get<string>('WECHAT_APP_SECRET');
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
    const resp = await fetch(url);
    const data = (await resp.json()) as { openid?: string; unionid?: string; session_key?: string; errmsg?: string };
    if (!data.openid) {
      throw new Error(`code2Session failed: ${data.errmsg ?? 'unknown'}`);
    }
    return { openid: data.openid, unionid: data.unionid, sessionKey: data.session_key };
  }

  async sendSubscribeMessage(payload: SubscribeMessagePayload): Promise<void> {
    if (this.provider === 'mock') {
      this.logger.log(
        `subscribeMessage → openid=${payload.openid.slice(0, 10)}… template=${payload.templateId}`,
      );
      // eslint-disable-next-line no-console
      console.info(`[wechat:mock] subscribe data: ${JSON.stringify(payload.data)}`);
      return;
    }
    // phase 8：真实调 /cgi-bin/message/subscribe/send，需要先取 access_token
    // 本 phase 保留接口，phase 8 填入真实实现
    throw new Error('real WeChat subscribe message not yet implemented');
  }
}
