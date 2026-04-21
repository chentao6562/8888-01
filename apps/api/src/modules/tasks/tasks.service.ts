import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import {
  TASK_STATUS_TRANSITIONS,
  TaskEntity,
  TaskStatus,
  TaskType,
} from './entities/task.entity';

export interface CreateTaskInput {
  projectId: string;
  assigneeId: string;
  type?: TaskType;
  title: string;
  description?: string;
  dueAt?: Date | string | null;
  videoId?: string;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly repo: Repository<TaskEntity>,
  ) {}

  async create(
    tenantId: string,
    createdBy: string,
    input: CreateTaskInput,
  ): Promise<TaskEntity> {
    if (!input.title || input.title.length < 2) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'title 不能为空',
      });
    }
    const row = this.repo.create({
      tenantId,
      projectId: input.projectId,
      videoId: input.videoId ?? null,
      type: input.type ?? 'other',
      title: input.title,
      description: input.description ?? null,
      assigneeId: input.assigneeId,
      status: 'pending',
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      createdBy,
    });
    return this.repo.save(row);
  }

  async bulkCreate(
    tenantId: string,
    createdBy: string,
    inputs: CreateTaskInput[],
  ): Promise<TaskEntity[]> {
    const out: TaskEntity[] = [];
    for (const i of inputs) out.push(await this.create(tenantId, createdBy, i));
    return out;
  }

  async list(
    tenantId: string,
    filters: { projectId?: string; assigneeId?: string; status?: TaskStatus } = {},
  ): Promise<TaskEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.status) where.status = filters.status;
    return this.repo.find({ where, order: { dueAt: 'ASC', createdAt: 'DESC' } });
  }

  async mine(tenantId: string, assigneeId: string): Promise<TaskEntity[]> {
    return this.repo.find({
      where: { tenantId, assigneeId },
      order: { status: 'ASC', dueAt: 'ASC' },
    });
  }

  async findById(tenantId: string, id: string): Promise<TaskEntity> {
    const t = await this.repo.findOne({ where: { tenantId, id } });
    if (!t) throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: '任务不存在' });
    return t;
  }

  async update(
    tenantId: string,
    id: string,
    patch: Partial<Pick<TaskEntity, 'title' | 'description' | 'dueAt' | 'assigneeId'>>,
  ): Promise<TaskEntity> {
    const t = await this.findById(tenantId, id);
    Object.assign(t, patch);
    return this.repo.save(t);
  }

  async transition(tenantId: string, id: string, to: TaskStatus): Promise<TaskEntity> {
    const t = await this.findById(tenantId, id);
    const allowed = TASK_STATUS_TRANSITIONS[t.status];
    if (!allowed.includes(to)) {
      throw new ConflictException({
        code: 'TASK_INVALID_STATUS_TRANSITION',
        message: `不能从 ${t.status} 跳到 ${to}`,
      });
    }
    t.status = to;
    if (to === 'done') t.completedAt = new Date();
    return this.repo.save(t);
  }

  /** 扫描超期任务，标记 overdue + escalate。 */
  async scanOverdue(tenantId?: string): Promise<TaskEntity[]> {
    const where: Record<string, unknown> = {
      status: In(['pending', 'in_progress']),
      dueAt: LessThan(new Date()),
    };
    if (tenantId) where.tenantId = tenantId;
    const rows = await this.repo.find({ where });
    for (const t of rows) {
      const overdueHours = (Date.now() - (t.dueAt?.getTime() ?? Date.now())) / 3600_000;
      let level = 0;
      if (overdueHours > 0) level = 1;
      if (overdueHours > 24) level = 2;
      if (overdueHours > 72) level = 3;
      t.escalatedLevel = level;
      t.status = 'overdue';
      await this.repo.save(t);
    }
    return rows;
  }
}
