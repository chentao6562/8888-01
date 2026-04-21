import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PROJECT_STATUS_TRANSITIONS,
  ProjectEntity,
  ProjectStatus,
} from './entities/project.entity';
import {
  KickoffMeetingEntity,
  KickoffStatus,
} from './entities/kickoff-meeting.entity';
import { ContractEntity } from '@/modules/contracts/entities/contract.entity';
import { CustomersService } from '@/modules/customers/customers.service';
import { TasksService } from '@/modules/tasks/tasks.service';
import { StaffEntity } from '@/modules/staff/entities/staff.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(KickoffMeetingEntity)
    private readonly kickoffs: Repository<KickoffMeetingEntity>,
    @InjectRepository(ContractEntity)
    private readonly contracts: Repository<ContractEntity>,
    @InjectRepository(StaffEntity)
    private readonly staff: Repository<StaffEntity>,
    private readonly customers: CustomersService,
    private readonly tasks: TasksService,
  ) {}

  // --- Projects ---

  async list(tenantId: string, status?: ProjectStatus): Promise<ProjectEntity[]> {
    const where = status ? { tenantId, status } : { tenantId };
    return this.projects.find({ where, order: { updatedAt: 'DESC' } });
  }

  async findById(tenantId: string, id: string): Promise<ProjectEntity> {
    const p = await this.projects.findOne({ where: { tenantId, id } });
    if (!p) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: '项目不存在' });
    return p;
  }

  async create(
    tenantId: string,
    pmId: string | null,
    params: { contractId: string; name: string; startAt?: Date; endAt?: Date },
  ): Promise<ProjectEntity> {
    const contract = await this.contracts.findOne({
      where: { tenantId, id: params.contractId },
    });
    if (!contract) {
      throw new NotFoundException({
        code: 'CONTRACT_NOT_FOUND',
        message: '合同不存在',
      });
    }
    if (contract.status !== 'signed' && contract.status !== 'executing') {
      throw new UnprocessableEntityException({
        code: 'CONTRACT_NOT_SIGNED',
        message: `合同 ${contract.status}，不可开启项目`,
      });
    }
    // 检查是否已存在
    const existing = await this.projects.findOne({
      where: { tenantId, contractId: contract.id },
    });
    if (existing) return existing;

    const proj = this.projects.create({
      tenantId,
      customerId: contract.customerId,
      contractId: contract.id,
      name: `项目 · ${contract.contractNo}`,
      plan: 'monthly_package',
      status: 'kickoff',
      pmId,
      startAt: params.startAt ?? new Date(),
      endAt: params.endAt ?? null,
    });
    const saved = await this.projects.save(proj);

    // 回写 contract.projectId
    contract.projectId = saved.id;
    await this.contracts.save(contract);

    return saved;
  }

  async transition(
    tenantId: string,
    id: string,
    to: ProjectStatus,
  ): Promise<ProjectEntity> {
    const p = await this.findById(tenantId, id);
    const allowed = PROJECT_STATUS_TRANSITIONS[p.status];
    if (!allowed.includes(to)) {
      throw new ConflictException({
        code: 'PROJECT_INVALID_STATUS_TRANSITION',
        message: `不能从 ${p.status} 跳到 ${to}`,
      });
    }
    p.status = to;
    return this.projects.save(p);
  }

  // --- Kickoff ---

  async createKickoff(
    tenantId: string,
    projectId: string,
    body: Partial<KickoffMeetingEntity> = {},
  ): Promise<KickoffMeetingEntity> {
    await this.findById(tenantId, projectId);
    const row = this.kickoffs.create({
      tenantId,
      projectId,
      ...body,
      status: 'drafting' as KickoffStatus,
    });
    return this.kickoffs.save(row);
  }

  async updateKickoff(
    tenantId: string,
    kickoffId: string,
    patch: Partial<KickoffMeetingEntity>,
  ): Promise<KickoffMeetingEntity> {
    const k = await this.kickoffs.findOne({ where: { tenantId, id: kickoffId } });
    if (!k) throw new NotFoundException({ code: 'KICKOFF_NOT_FOUND', message: '启动会不存在' });
    if (k.status === 'finalized') {
      throw new ConflictException({
        code: 'KICKOFF_ALREADY_FINALIZED',
        message: '启动会已定稿，不可再编辑',
      });
    }
    Object.assign(k, patch);
    return this.kickoffs.save(k);
  }

  async listKickoffs(tenantId: string, projectId: string): Promise<KickoffMeetingEntity[]> {
    return this.kickoffs.find({
      where: { tenantId, projectId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 定稿启动会：
   *  - status → finalized
   *  - 触发 project.status = running + customer.stage = delivering
   *  - 根据 initialTasks 批量生成 Task
   */
  async finalizeKickoff(
    tenantId: string,
    kickoffId: string,
    createdBy: string,
  ): Promise<{ kickoff: KickoffMeetingEntity; tasksCreated: number }> {
    const k = await this.kickoffs.findOne({ where: { tenantId, id: kickoffId } });
    if (!k) throw new NotFoundException({ code: 'KICKOFF_NOT_FOUND', message: '启动会不存在' });
    if (k.status === 'finalized') {
      return { kickoff: k, tasksCreated: 0 };
    }
    k.status = 'finalized';
    await this.kickoffs.save(k);

    const project = await this.findById(tenantId, k.projectId);
    if (project.status === 'kickoff') {
      await this.transition(tenantId, project.id, 'running');
    }
    const customer = await this.customers.findByIdOrFail(tenantId, project.customerId);
    if (customer.stage === 'signed') {
      await this.customers.transitionStage(tenantId, customer.id, 'delivering');
    }

    // 批量生成任务
    let created = 0;
    if (k.initialTasks) {
      try {
        const items = JSON.parse(k.initialTasks) as Array<{
          title: string;
          assigneeRole?: string;
          dueInDays?: number;
          type?: string;
        }>;
        const staffList = await this.staff.find({
          where: { tenantId, status: 'active' },
        });
        for (const item of items) {
          const assignee = this.pickAssignee(staffList, item.assigneeRole ?? 'pm', project.pmId);
          if (!assignee) continue;
          await this.tasks.create(tenantId, createdBy, {
            projectId: project.id,
            assigneeId: assignee,
            title: item.title,
            type: (item.type ?? 'other') as 'plan' | 'shoot' | 'edit' | 'publish' | 'other',
            dueAt: item.dueInDays
              ? new Date(Date.now() + item.dueInDays * 86400_000)
              : null,
          });
          created++;
        }
      } catch (e) {
        // initialTasks JSON 格式错误不阻断 finalize
      }
    }

    return { kickoff: k, tasksCreated: created };
  }

  private pickAssignee(
    staffList: StaffEntity[],
    role: string,
    fallback: string | null,
  ): string | null {
    const byRole = staffList.find((s) => s.role === role);
    if (byRole) return byRole.id;
    return fallback;
  }
}
