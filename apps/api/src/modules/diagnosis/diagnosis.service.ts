import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiagnosisReportEntity } from './entities/diagnosis-report.entity';
import { UpdateDiagnosisDto } from './dto/update-diagnosis.dto';
import { CustomersService } from '@/modules/customers/customers.service';
import { LlmService } from '@/modules/llm/llm.service';

@Injectable()
export class DiagnosisService {
  constructor(
    @InjectRepository(DiagnosisReportEntity)
    private readonly repo: Repository<DiagnosisReportEntity>,
    private readonly customers: CustomersService,
    private readonly llm: LlmService,
  ) {}

  async create(
    tenantId: string,
    customerId: string,
    strategistId: string,
  ): Promise<DiagnosisReportEntity> {
    const customer = await this.customers.findByIdOrFail(tenantId, customerId);
    if (!['lead', 'diagnosing'].includes(customer.stage)) {
      throw new UnprocessableEntityException({
        code: 'DIAGNOSIS_INVALID_STAGE',
        message: `客户当前阶段（${customer.stage}）不能开启诊断`,
      });
    }
    const existing = await this.repo.findOne({ where: { tenantId, customerId } });
    if (existing) return existing;

    const row = this.repo.create({
      tenantId,
      customerId,
      strategistId,
      status: 'drafting',
    });
    const saved = await this.repo.save(row);

    // 自动进入 diagnosing 状态
    if (customer.stage === 'lead') {
      await this.customers.transitionStage(tenantId, customerId, 'diagnosing');
    }
    return saved;
  }

  async findByCustomer(
    tenantId: string,
    customerId: string,
  ): Promise<DiagnosisReportEntity | null> {
    return this.repo.findOne({ where: { tenantId, customerId } });
  }

  async findByCustomerOrFail(
    tenantId: string,
    customerId: string,
  ): Promise<DiagnosisReportEntity> {
    const report = await this.findByCustomer(tenantId, customerId);
    if (!report) {
      throw new NotFoundException({
        code: 'DIAGNOSIS_NOT_FOUND',
        message: '诊断未创建。请先 POST /diagnosis/:customerId',
      });
    }
    return report;
  }

  async update(
    tenantId: string,
    customerId: string,
    patch: UpdateDiagnosisDto,
  ): Promise<DiagnosisReportEntity> {
    const report = await this.findByCustomerOrFail(tenantId, customerId);
    if (report.status === 'completed') {
      throw new ForbiddenException({
        code: 'DIAGNOSIS_COMPLETED',
        message: '诊断已完成，不可再编辑',
      });
    }
    Object.assign(report, patch);
    return this.repo.save(report);
  }

  async generateInterview(
    tenantId: string,
    customerId: string,
  ): Promise<DiagnosisReportEntity> {
    const report = await this.ensureDraft(tenantId, customerId);
    const customer = await this.customers.findByIdOrFail(tenantId, customerId);
    const llm = await this.llm.invoke(
      'interview.pre-questionnaire',
      {
        companyName: customer.companyName,
        industry: customer.industry,
        bossName: customer.bossName,
      },
      { tenantId },
    );
    report.preInterviewContent = llm.content;
    return this.repo.save(report);
  }

  async generateReport(
    tenantId: string,
    customerId: string,
  ): Promise<DiagnosisReportEntity> {
    const report = await this.ensureDraft(tenantId, customerId);
    this.assertCardsComplete(report);
    const customer = await this.customers.findByIdOrFail(tenantId, customerId);
    const llm = await this.llm.invoke(
      'diagnosis.report',
      {
        companyName: customer.companyName,
        industry: customer.industry,
        cards: {
          sells: report.card1Sells,
          customerMind: report.card2CustomerMind,
          productVideo: report.card3ProductVideo,
          whyNotNext: report.card4WhyNotNext,
        },
      },
      { tenantId },
    );
    report.reportContent = llm.content;
    return this.repo.save(report);
  }

  async complete(tenantId: string, customerId: string): Promise<DiagnosisReportEntity> {
    const report = await this.ensureDraft(tenantId, customerId);
    this.assertCardsComplete(report);
    if (!report.reportContent) {
      throw new UnprocessableEntityException({
        code: 'DIAGNOSIS_INCOMPLETE',
        message: '请先生成诊断报告内容',
      });
    }
    report.status = 'completed';
    await this.repo.save(report);
    await this.customers.transitionStage(tenantId, customerId, 'proposing');
    return report;
  }

  private async ensureDraft(
    tenantId: string,
    customerId: string,
  ): Promise<DiagnosisReportEntity> {
    const report = await this.findByCustomerOrFail(tenantId, customerId);
    if (report.status === 'completed') {
      throw new ForbiddenException({
        code: 'DIAGNOSIS_COMPLETED',
        message: '诊断已完成，不可再编辑',
      });
    }
    return report;
  }

  private assertCardsComplete(report: DiagnosisReportEntity): void {
    const missing: string[] = [];
    if (!report.card1Sells) missing.push('card1_sells');
    if (!report.card2CustomerMind) missing.push('card2_customer_mind');
    if (!report.card3ProductVideo) missing.push('card3_product_video');
    if (!report.card4WhyNotNext) missing.push('card4_why_not_next');
    if (!report.knifeSelf) missing.push('knife_self');
    if (!report.knifeEmployee) missing.push('knife_employee');
    if (!report.knifeOldCustomer) missing.push('knife_old_customer');
    if (!report.knifeCompetitor) missing.push('knife_competitor');
    if (missing.length > 0) {
      throw new UnprocessableEntityException({
        code: 'DIAGNOSIS_INCOMPLETE',
        message: `以下字段未完成：${missing.join(', ')}`,
        details: { missing },
      });
    }
  }
}
