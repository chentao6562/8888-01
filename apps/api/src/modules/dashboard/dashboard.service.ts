import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, Repository, In } from 'typeorm';
import { CustomerEntity } from '@/modules/customers/entities/customer.entity';
import { StaffEntity } from '@/modules/staff/entities/staff.entity';
import { TaskEntity } from '@/modules/tasks/entities/task.entity';
import { ContractEntity } from '@/modules/contracts/entities/contract.entity';
import { PaymentEntity } from '@/modules/contracts/entities/payment.entity';
import { RenewalRecordEntity } from '@/modules/renewals/entities/renewal-record.entity';
import { GoalsService } from '@/modules/goals/goals.service';

export interface CustomerLightsResult {
  green: { count: number; samples: Array<{ id: string; name: string; score: number }> };
  yellow: { count: number; samples: Array<{ id: string; name: string; score: number }> };
  red: { count: number; samples: Array<{ id: string; name: string; score: number; reason?: string }> };
}

export interface TeamCapacityResult {
  byRole: Array<{ role: string; activeCount: number; utilizationPct: number; level: 'good' | 'warn' | 'danger' }>;
}

export interface MonthlyKpiResult {
  newCustomers: { actual: number; target: number };
  renewalCustomers: { actual: number; target: number };
  churnCustomers: { actual: number; redLine: number };
  renewalRate: number; // %
  arpuCents: number; // 本月平均客单价
}

export interface CashflowResult {
  incomeCents: number;
  costCents: number;   // MVP 简化为 0，V2 接财务
  profitCents: number;
}

export interface Decision {
  id: string;
  type: 'customer-red' | 'capacity-full' | 'lead-pending' | 'contract-stale' | 'payment-overdue';
  title: string;
  desc: string;
  action: string;
  refId?: string;
  priority: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customers: Repository<CustomerEntity>,
    @InjectRepository(StaffEntity)
    private readonly staff: Repository<StaffEntity>,
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
    @InjectRepository(ContractEntity)
    private readonly contracts: Repository<ContractEntity>,
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(RenewalRecordEntity)
    private readonly renewals: Repository<RenewalRecordEntity>,
    private readonly goals: GoalsService,
  ) {}

  // === 5 大 collector + 3 件决策 + 组合 ===

  async customerLights(tenantId: string): Promise<CustomerLightsResult> {
    const active = await this.customers.find({
      where: { tenantId },
      order: { healthScore: 'ASC' },
    });
    const result: CustomerLightsResult = {
      green: { count: 0, samples: [] },
      yellow: { count: 0, samples: [] },
      red: { count: 0, samples: [] },
    };
    for (const c of active) {
      if (c.stage === 'churned') continue;
      const group = result[c.healthLevel];
      if (!group) continue;
      group.count++;
      if (group.samples.length < 3) {
        group.samples.push({
          id: c.id,
          name: c.companyName,
          score: c.healthScore,
          ...(c.healthLevel === 'red' ? { reason: this.redReason(c.healthScore) } : {}),
        });
      }
    }
    return result;
  }

  async teamCapacity(tenantId: string): Promise<TeamCapacityResult> {
    // 本周（过去 7 天）按 assigneeId 统计 pending / in_progress 任务数
    // 每名员工容量基准：按角色 10 任务 = 100%（简化）
    const roleCapacityBase: Record<string, number> = {
      strategist: 8, pm: 10, creator: 6, adops: 8, admin: 6,
    };
    const staffList = await this.staff.find({
      where: { tenantId, status: 'active' },
    });
    const byRole = new Map<string, { staffCount: number; activeCount: number }>();
    for (const s of staffList) {
      const cur = byRole.get(s.role) ?? { staffCount: 0, activeCount: 0 };
      cur.staffCount++;
      byRole.set(s.role, cur);
    }
    const now = Date.now();
    const weekAgo = new Date(now - 7 * 86400_000);
    const tasks = await this.tasks.find({
      where: {
        tenantId,
        status: In(['pending', 'in_progress', 'pending_review']),
      },
    });
    for (const t of tasks) {
      if (t.createdAt && t.createdAt < weekAgo && t.status === 'pending') continue;
      const staffRow = staffList.find((s) => s.id === t.assigneeId);
      if (!staffRow) continue;
      const cur = byRole.get(staffRow.role) ?? { staffCount: 0, activeCount: 0 };
      cur.activeCount++;
      byRole.set(staffRow.role, cur);
    }

    const out: TeamCapacityResult['byRole'] = [];
    for (const [role, v] of byRole) {
      const capacity = (roleCapacityBase[role] ?? 8) * v.staffCount;
      const pct = capacity > 0 ? Math.round((v.activeCount / capacity) * 100) : 0;
      const level: 'good' | 'warn' | 'danger' =
        pct >= 95 ? 'danger' : pct >= 80 ? 'warn' : 'good';
      out.push({ role, activeCount: v.activeCount, utilizationPct: Math.min(100, pct), level });
    }
    return { byRole: out };
  }

  async monthlyKpi(tenantId: string): Promise<MonthlyKpiResult> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const goal = await this.goals.current(tenantId);

    const [newCount, churnCount, renewalWon, contracts] = await Promise.all([
      this.customers.count({ where: { tenantId, createdAt: Between(start, end) } }),
      this.customers.count({ where: { tenantId, churnedAt: Between(start, end) } }),
      this.renewals.count({
        where: { tenantId, stage: 'won', updatedAt: Between(start, end) },
      }),
      this.contracts.find({
        where: { tenantId, signedAt: Between(start, end) },
      }),
    ]);
    const arpu = contracts.length
      ? Math.round(contracts.reduce((s, c) => s + c.totalAmount, 0) / contracts.length)
      : 0;
    const renewalLost = await this.renewals.count({
      where: { tenantId, stage: 'lost', updatedAt: Between(start, end) },
    });
    const renewalTotal = renewalWon + renewalLost;
    const renewalRate = renewalTotal
      ? Math.round((renewalWon / renewalTotal) * 100)
      : 100;

    return {
      newCustomers: { actual: newCount, target: goal?.newCustomers ?? 0 },
      renewalCustomers: { actual: renewalWon, target: goal?.renewalCustomers ?? 0 },
      churnCustomers: { actual: churnCount, redLine: goal?.churnRedLine ?? 3 },
      renewalRate,
      arpuCents: arpu,
    };
  }

  async cashflow(tenantId: string): Promise<CashflowResult> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const paid = await this.payments.find({
      where: { tenantId, status: 'paid', paidAt: Between(start, end) },
    });
    const income = paid.reduce((s, p) => s + p.amount, 0);
    const cost = 0; // MVP 不采集成本
    return { incomeCents: income, costCents: cost, profitCents: income - cost };
  }

  async dailyDecisions(tenantId: string): Promise<Decision[]> {
    const out: Decision[] = [];

    // 1. 红灯客户
    const reds = await this.customers.find({
      where: { tenantId, healthLevel: 'red' },
      order: { healthScore: 'ASC' },
      take: 3,
    });
    for (const c of reds) {
      if (c.stage === 'churned') continue;
      out.push({
        id: `red-${c.id}`,
        type: 'customer-red',
        title: `${c.companyName} 健康度 ${c.healthScore}`,
        desc: '红灯客户未介入，建议主动沟通',
        action: '去看',
        refId: c.id,
        priority: 100 - c.healthScore,
      });
    }

    // 2. 满负荷角色 + 有新线索未分配
    const { byRole } = await this.teamCapacity(tenantId);
    for (const r of byRole) {
      if (r.utilizationPct >= 95) {
        out.push({
          id: `cap-${r.role}`,
          type: 'capacity-full',
          title: `${r.role} 已满负荷 ${r.utilizationPct}%`,
          desc: '本周不宜再接新客户，或先扩编',
          action: '去看',
          priority: 60 + (r.utilizationPct - 95),
        });
      }
    }

    // 3. 24h 未跟进线索
    const dayAgo = new Date(Date.now() - 24 * 3600_000);
    const pending = await this.customers.find({
      where: { tenantId, stage: 'lead', lastContactAt: LessThan(dayAgo) },
      take: 5,
    });
    const unassigned = pending.filter((c) => !c.lastContactAt);
    if (unassigned.length > 0) {
      out.push({
        id: 'leads-pending',
        type: 'lead-pending',
        title: `${unassigned.length} 条新线索超 24h 未分配`,
        desc: '超过 SLA 会影响转化率',
        action: '去分配',
        priority: 70,
      });
    }

    // 4. 付款逾期
    const overduePays = await this.payments.count({
      where: { tenantId, status: 'overdue' },
    });
    if (overduePays > 0) {
      out.push({
        id: 'payments-overdue',
        type: 'payment-overdue',
        title: `${overduePays} 笔付款逾期`,
        desc: '影响现金流',
        action: '去跟进',
        priority: 75,
      });
    }

    // Top 3 by priority
    out.sort((a, b) => b.priority - a.priority);
    return out.slice(0, 3);
  }

  async dashboard(tenantId: string) {
    const [lights, capacity, kpi, cash, decisions] = await Promise.all([
      this.customerLights(tenantId),
      this.teamCapacity(tenantId),
      this.monthlyKpi(tenantId),
      this.cashflow(tenantId),
      this.dailyDecisions(tenantId),
    ]);
    return { lights, capacity, kpi, cashflow: cash, decisions };
  }

  private redReason(score: number): string {
    if (score < 40) return 'ROI 严重不达标';
    if (score < 50) return '客户投诉或互动低迷';
    return '交付不达预期';
  }
}
