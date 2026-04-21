import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * 列级加密服务（AES-256-GCM）。
 *
 * 设计要点：
 *  - key 来源：env `ENCRYPTION_KEY`（32 字节 base64）或 `ENCRYPTION_PASSPHRASE`（任意长度，scrypt 派生）
 *  - 输出格式：base64(iv|tag|cipher)，单字段密文，便于直接存 varchar
 *  - phase 8 启用：将 `customers.boss_phone` / `users.phone` 改用 `encrypt()` 写入
 *  - dev/test 默认 passphrase=`mindlink-dev`，仅用于本地，不要落生产
 *
 * 使用：
 *   const enc = encryption.encrypt('13800001111')
 *   const plain = encryption.decrypt(enc)
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const rawKey = config.get<string>('ENCRYPTION_KEY');
    if (rawKey) {
      const buf = Buffer.from(rawKey, 'base64');
      if (buf.length !== 32) {
        throw new Error(`ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length})`);
      }
      this.key = buf;
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'ENCRYPTION_KEY 未设置 · 生产环境必须配置 32 字节 base64 key · 参见 .env.production.example',
        );
      }
      const pass = config.get<string>('ENCRYPTION_PASSPHRASE') ?? 'mindlink-dev';
      this.key = scryptSync(pass, 'mindlink-salt-v1', 32);
    }
  }

  encrypt(plain: string): string {
    if (plain == null || plain === '') return plain;
    const iv = randomBytes(12); // GCM 推荐 12 字节
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  }

  decrypt(cipherText: string): string {
    if (cipherText == null || cipherText === '') return cipherText;
    const buf = Buffer.from(cipherText, 'base64');
    if (buf.length < 28) throw new Error('cipherText too short');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
  }

  /** 手机号脱敏：保留前 3 后 4，中间 ****。用于审计日志/回显。 */
  maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return phone;
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  }
}
