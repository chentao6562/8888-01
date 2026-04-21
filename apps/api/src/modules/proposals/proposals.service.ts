import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PackageEntity, PackageTier } from './entities/package.entity';
import { PositioningBookEntity } from './entities/positioning-book.entity';
import { CustomersService } from '@/modules/customers/customers.service';
import { DiagnosisService } from '@/modules/diagnosis/diagnosis.service';
import { LlmService } from '@/modules/llm/llm.service';
import {
  CalculateQuoteDto,
  CreateProposalDto,
  UpdateProposalDto,
} from './dto/create-proposal.dto';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(PackageEntity)
    private readonly packages: Repository<PackageEntity>,
    @InjectRepository(PositioningBookEntity)
    private readonly books: Repository<PositioningBookEntity>,
    private readonly customers: CustomersService,
    private readonly diagnosis: DiagnosisService,
    private readonly llm: LlmService,
  ) {}

  // ---- Packages ----

  async listPackages(tenantId: string): Promise<PackageEntity[]> {
    // 官方（tenantId=null）+ 租户私库
    return this.packages.find({
      where: [{ tenantId: IsNull() }, { tenantId }],
      order: { tier: 'ASC' },
    });
  }

  async recommendPackage(
    tenantId: string,
    customerId: string,
  ): Promise<PackageEntity | null> {
    const customer = await this.customers.findByIdOrFail(tenantId, customerId);
    const candidates = await this.listPackages(tenantId);
    if (candidates.length === 0) return null;

    // 简单规则：小预算 → starter_pack，中等 → monthly，大 → annual。
    let tier: PackageTier;
    switch (customer.budgetHint) {
      case 'lt_5k':
        tier = 'starter_pack';
        break;
      case '5k_10k':
      case '10k_30k':
        tier = 'monthly_package';
        break;
      case 'gt_30k':
        tier = 'annual_partner';
        break;
      default:
        tier = 'monthly_package';
    }
    const exact = candidates.find((p) => p.tier === tier && p.tenantId);
    return exact ?? candidates.find((p) => p.tier === tier) ?? candidates[0];
  }

  // ---- Quote calculator ----

  async calculateQuote(
    tenantId: string,
    dto: CalculateQuoteDto,
  ): Promise<{ planTier: PackageTier; base: number; custom: number; total: number }> {
    const candidates = await this.listPackages(tenantId);
    const match = candidates.find((p) => p.tier === dto.planTier);
    if (!match) {
      throw new NotFoundException({ code: 'PACKAGE_NOT_FOUND', message: '套餐不存在' });
    }
    const base = Math.round(((match.priceMin + match.priceMax) / 2) * (dto.regionFactor ?? 1));
    const custom = (dto.customItems ?? []).reduce((sum, item) => sum + (item.amount ?? 0), 0);
    return { planTier: dto.planTier, base, custom, total: base + custom };
  }

  // ---- Positioning books ----

  async create(
    tenantId: string,
    customerId: string,
    dto: CreateProposalDto,
  ): Promise<PositioningBookEntity> {
    const customer = await this.customers.findByIdOrFail(tenantId, customerId);
    if (!['diagnosing', 'proposing'].includes(customer.stage)) {
      throw new UnprocessableEntityException({
        code: 'PROPOSAL_INVALID_STAGE',
        message: `客户阶段 ${customer.stage} 不能创建方案`,
      });
    }

    const diagnosis = await this.diagnosis.findByCustomer(tenantId, customerId);
    if (!diagnosis || diagnosis.status !== 'completed') {
      throw new UnprocessableEntityException({
        code: 'DIAGNOSIS_NOT_COMPLETED',
        message: '诊断尚未完成，无法生成方案',
      });
    }

    const existing = await this.books.find({ where: { tenantId, customerId } });
    const version = (existing.reduce((m, b) => Math.max(m, b.version), 0) ?? 0) + 1;

    // LLM 初稿
    const llm = await this.llm.invoke(
      'positioning.book',
      {
        companyName: customer.companyName,
        industry: customer.industry,
        plan: dto.planTier,
      },
      { tenantId },
    );

    // 报价
    const quote = await this.calculateQuote(tenantId, {
      planTier: dto.planTier,
      regionFactor: dto.regionFactor ?? 1,
    });

    const book = this.books.create({
      tenantId,
      customerId,
      diagnosisReportId: diagnosis.id,
      version,
      onePager: this.extractOnePager(llm.content),
      content: llm.content,
      packageId: dto.packageId ?? null,
      planTier: dto.planTier,
      priceQuote: quote.total,
      regionFactor: dto.regionFactor ?? 1,
      customItems: null,
      status: 'draft',
    });
    return this.books.save(book);
  }

  async list(tenantId: string, customerId: string): Promise<PositioningBookEntity[]> {
    return this.books.find({
      where: { tenantId, customerId },
      order: { version: 'DESC' },
    });
  }

  async findById(tenantId: string, id: string): Promise<PositioningBookEntity> {
    const book = await this.books.findOne({ where: { tenantId, id } });
    if (!book) {
      throw new NotFoundException({ code: 'PROPOSAL_NOT_FOUND', message: '方案不存在' });
    }
    return book;
  }

  async update(
    tenantId: string,
    id: string,
    patch: UpdateProposalDto,
  ): Promise<PositioningBookEntity> {
    const book = await this.findById(tenantId, id);
    if (book.status === 'signed') {
      throw new ConflictException({
        code: 'PROPOSAL_ALREADY_SIGNED',
        message: '已签字方案不可编辑',
      });
    }
    if (patch.content !== undefined) book.content = patch.content;
    if (patch.onePager !== undefined) book.onePager = patch.onePager;
    if (patch.priceQuote !== undefined) book.priceQuote = patch.priceQuote;
    if (patch.regionFactor !== undefined) book.regionFactor = patch.regionFactor;
    if (patch.customItems !== undefined) book.customItems = JSON.stringify(patch.customItems);
    return this.books.save(book);
  }

  async sign(tenantId: string, id: string): Promise<PositioningBookEntity> {
    const book = await this.findById(tenantId, id);
    if (book.status === 'signed') return book;
    book.status = 'signed';
    book.signedAt = new Date();
    await this.books.save(book);

    // 自动 customer.stage: proposing → signed
    await this.customers.transitionStage(tenantId, book.customerId, 'signed');
    return book;
  }

  async finalize(tenantId: string, id: string): Promise<PositioningBookEntity> {
    const book = await this.findById(tenantId, id);
    if (book.status === 'draft') book.status = 'final';
    return this.books.save(book);
  }

  private extractOnePager(content: string): string {
    // 取第一个 ## 之前的前几行概要作为"一张纸"摘要
    const firstBlock = content.split(/\n##\s/).slice(0, 1).join('');
    return firstBlock.trim().slice(0, 300);
  }
}
