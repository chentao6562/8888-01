import { Injectable } from '@nestjs/common';

/**
 * MVP 敏感词库。phase 8 起由管理后台配置 + 订阅官方更新。
 *
 * 原则：**只收录明确违规的短语**，不收单字或过度宽泛词（例如 "第一" "最好"
 * 正常文案里频繁出现，收录会造成大量误伤）。
 */
const BLOCKLIST: string[] = [
  '赌博',
  '博彩',
  '投注',
  '加微信发红包',
  '全网最牛',
  '全国第一',
  '国家级认证',
  '全网最低价',
  '假一赔十',
  '粉丝群',
  '私域引流',
  '私聊加微信',
];

@Injectable()
export class SensitiveService {
  /** 返回命中的敏感词。空数组表示通过。 */
  check(text: string): string[] {
    if (!text) return [];
    const hits = new Set<string>();
    for (const w of BLOCKLIST) {
      if (text.includes(w)) hits.add(w);
    }
    return [...hits];
  }

  isClean(text: string): boolean {
    return this.check(text).length === 0;
  }
}
