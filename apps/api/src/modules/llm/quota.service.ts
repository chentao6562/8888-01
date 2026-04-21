import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from '@/modules/tenants/entities/tenant.entity';

/** 按 plan 档位的月度调用额度（PRD §1.6）。 */
const QUOTA_BY_PLAN: Record<string, number> = {
  basic: 50_000,
  pro: 200_000,
  enterprise: 1_000_000,
};

@Injectable()
export class QuotaService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
  ) {}

  /** 给外部看的当前用量（本实现用 audit 粗估；真实计费 phase 8 接独立表）。 */
  async limitFor(tenantId: string): Promise<number> {
    const t = await this.tenants.findOne({ where: { id: tenantId } });
    return QUOTA_BY_PLAN[t?.plan ?? 'basic'] ?? 50_000;
  }

  /**
   * 预占额度。超限抛 429。
   * MVP 实现：用 llm_usage_logs 计数（service 里查）。
   * phase 8 改为独立计数器 + Redis。
   */
  async consume(tenantId: string, usedThisMonth: number): Promise<void> {
    const limit = await this.limitFor(tenantId);
    if (usedThisMonth >= limit) {
      throw new HttpException(
        {
          code: 'LLM_QUOTA_EXCEEDED',
          message: `本月 AI 额度已用完（上限 ${limit} 次）`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
