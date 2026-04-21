import { Injectable } from '@nestjs/common';
import type {
  LlmChatMessage,
  LlmChatOptions,
  LlmChatResult,
  LlmProvider,
} from './llm-provider.interface';

/**
 * 默认 provider。确定性输出，支持 offline 开发与 CI。
 * Phase 4 保留；phase 8 通过 env 切换到真实 provider。
 *
 * 行为：
 *  - 识别 messages[0].content 中的 `[prompt:<name>]` 标记切换响应风格
 *  - 否则返回一个通用"mock" 响应
 */
@Injectable()
export class MockLlmProvider implements LlmProvider {
  readonly name = 'mock';

  async chat(
    messages: LlmChatMessage[],
    options: LlmChatOptions = {},
  ): Promise<LlmChatResult> {
    const system = messages.find((m) => m.role === 'system')?.content ?? '';
    const user = messages.find((m) => m.role === 'user')?.content ?? '';

    // 小延时：模拟网络
    await new Promise((r) => setTimeout(r, 30));

    const hint = /\[prompt:([\w.-]+)\]/.exec(system) ?? /\[prompt:([\w.-]+)\]/.exec(user);
    const name = hint?.[1] ?? 'generic';
    const content = render(name, user, system, options);
    return {
      content,
      tokensIn: Math.ceil((system.length + user.length) / 4),
      tokensOut: Math.ceil(content.length / 4),
    };
  }
}

function render(
  name: string,
  user: string,
  system: string,
  opts: LlmChatOptions,
): string {
  const dialect = /\[dialect:(standard|hohhot|dongbei)\]/.exec(system)?.[1] ?? 'standard';
  const seed = user.slice(0, 60).replace(/\s+/g, ' ');

  switch (name) {
    case 'copywriting.three-parts':
      return threeParts(seed, dialect);
    case 'titles.candidates':
      return titleCandidates(seed);
    case 'tags.recommend':
      return tagRecommend(seed);
    case 'dialect.adapt':
      return dialectAdapt(user, dialect);
    case 'interview.pre-questionnaire':
      return preInterview(seed);
    case 'diagnosis.report':
      return diagnosisReport(seed);
    case 'positioning.book':
      return positioningBook(seed);
    case 'monthly-report.draft':
      return monthlyReportDraft(user);
    case 'renewal.proposal':
      return renewalProposal(user);
    case 'sensitive.check':
      return 'clean';
    default:
      return `[mock-llm · ${name}] seed=${seed} · dialect=${dialect}`;
  }
}

function renewalProposal(rawUser: string): string {
  let companyName = '客户'; let discount = 0; let healthLevel = 'green';
  try {
    const p = JSON.parse(rawUser) as { companyName?: string; discountRatio?: number; healthLevel?: string };
    companyName = p.companyName ?? '客户';
    discount = p.discountRatio ?? 0;
    healthLevel = p.healthLevel ?? 'green';
  } catch { /* ignore */ }
  return [
    `# ${companyName} · 续约提案（AI 初稿）`,
    '',
    '## 过去一年回顾',
    '- 共产出 280 条短视频 · 本月 ROI 1.2',
    '- 客户咨询增长 30% · 续约率行业领先',
    '',
    '## 续约优惠',
    healthLevel === 'green'
      ? `- 老客户 5% 折扣（感谢长期支持）`
      : healthLevel === 'yellow'
        ? '- 平价续约 · 新增月度专项复盘'
        : '- 平价续约 · 附客户成功保障条款（未达 KPI 可 30 天内退款）',
    '',
    '## 下一年新增',
    '- 接入 AI 分镜可视化（V2 开放时）',
    '- 本地热点视频库专供',
    '- 每月老板专属诊断 1 次',
    '',
    `> 折扣系数：${(discount * 100).toFixed(0)}% · 请 PM 根据客户实际情况修订后发送`,
  ].join('\n');
}

function monthlyReportDraft(rawUser: string): string {
  let sections: {
    overview?: { plays?: number; roi?: number; adSpend?: number };
    deliverables?: { videoCount?: number };
  } = {};
  let companyName = '客户';
  let month = '';
  try {
    const parsed = JSON.parse(rawUser) as {
      companyName?: string;
      month?: string;
      sections?: typeof sections;
    };
    sections = parsed.sections ?? {};
    companyName = parsed.companyName ?? '客户';
    month = parsed.month ?? '';
  } catch { /* ignore */ }
  const o = sections.overview ?? {};
  const d = sections.deliverables ?? {};
  return [
    `# ${companyName} · ${month} 月度报告（AI 初稿）`,
    '',
    '## 1. 本月总览',
    `- 总播放 ${o.plays ?? 0} 次`,
    `- 平均 ROI ${o.roi ?? 0}`,
    `- 投流支出 ¥${((o.adSpend ?? 0) / 100).toFixed(2)}`,
    '',
    '## 2. 本月交付物',
    `- 视频 ${d.videoCount ?? 0} 条`,
    '',
    '## 3. 流量分析',
    '各平台数据整体平稳。Top 3 视频详见下节。',
    '',
    '## 4. 爆款拆解',
    '- 爆款 1：老板故事型，情感共鸣强',
    '- 爆款 2：产品展示型，转化率较高',
    '- 爆款 3：幕后花絮型，评论活跃',
    '',
    '## 5. 未达标反思',
    '（AI 初稿 · 请 PM 根据具体情况修订）',
    '',
    '## 6. 下月重点',
    '1. 保持发布节奏',
    '2. 强化老板人设',
    '3. 复盘 Top 3 爆点并复用',
    '',
    '> 本稿由 mock LLM 生成。phase 8 切到真实 provider 后会根据 metrics 动态总结。',
  ].join('\n');
}

function threeParts(seed: string, dialect: string): string {
  const flavor = dialect === 'hohhot' ? '（呼市老板口吻）' : dialect === 'dongbei' ? '（东北话口吻）' : '';
  return [
    `【钩子】${flavor} 3 秒留住：${seed.slice(0, 16)}…这事儿我今天给您唠明白。`,
    `【主体】${flavor} 第一点是事实，第二点是数据，第三点是客户自己来说。${seed ? '背景：' + seed : ''}`,
    `【CTA】${flavor} 关注我，明天继续聊；想加微信的扣 1。`,
  ].join('\n\n');
}

function titleCandidates(seed: string): string {
  const bases = [
    `这件事，90% 的${seed.slice(0, 6)}都做错了`,
    `老板亲自讲：${seed.slice(0, 10)}到底值不值`,
    `别再踩坑！${seed.slice(0, 8)}的 3 个真相`,
    `${seed.slice(0, 6)}｜真实案例拆解，今天讲清楚`,
    `我劝你看完：${seed.slice(0, 10)}避雷清单`,
  ];
  // 给每个假设一个 ctr 预测
  const items = bases.map((t, i) => ({
    title: t,
    ctrScore: Math.round((0.25 - i * 0.03 + Math.random() * 0.04) * 1000) / 10,
  }));
  items.sort((a, b) => b.ctrScore - a.ctrScore);
  return JSON.stringify(items);
}

function tagRecommend(seed: string): string {
  const base = [
    '本地生活',
    '呼和浩特',
    '老板故事',
    '真实案例',
    '选对不踩坑',
    '到店体验',
    '一条视频看懂',
    '行业干货',
    '幕后花絮',
    '服务口碑',
    '高性价比',
    '家的味道',
  ];
  if (seed.includes('餐饮')) base.unshift('本地吃喝', '到店打卡');
  if (seed.includes('驾校')) base.unshift('驾考攻略', '科目二秘诀');
  if (seed.includes('美业')) base.unshift('皮肤管理', '本地美业');
  return JSON.stringify(base.slice(0, 12));
}

function dialectAdapt(user: string, dialect: string): string {
  if (dialect === 'hohhot') return user.replace(/啊/g, '哇').replace(/的$/gm, '的哇');
  if (dialect === 'dongbei') return user.replace(/很/g, '贼').replace(/非常/g, '老');
  return user;
}

function preInterview(seed: string): string {
  return [
    `# ${seed} 预访谈问卷（60 题 · mock）`,
    '',
    '## 一、老板视角（12 题）',
    '1. 你希望三年后生意是什么样？',
    '2. 最近三个月的客单价波动？原因？',
    '3. 同行里你最羡慕谁？羡慕什么？',
    '...（此处省略，phase 4 接真实 LLM 后生成完整 60 题）',
  ].join('\n');
}

function diagnosisReport(seed: string): string {
  return [
    `# ${seed} · 诊断报告`,
    '',
    '## 1. 基本盘',
    '行业 / 客群 / 门店规模简述',
    '',
    '## 2. 4 张定位卡摘要',
    '- 卡 1（他卖啥）',
    '- 卡 2（客户半夜想啥）',
    '- 卡 3（产品上视频）',
    '- 卡 4（凭什么不选隔壁）',
    '',
    '## 3. 初步建议',
    '- 建议先用"老板故事型"短视频开局',
    '- 主推 3 个爆品做矩阵起号',
    '',
    '## 4. 风险',
    '成片审核节奏以周为单位 review。',
    '',
    '> 本稿由 mock LLM 生成，策划应修订后再交客户。',
  ].join('\n');
}

function positioningBook(seed: string): string {
  return [
    `# ${seed} · 一张纸定位书`,
    '',
    '**一句话定位**：本地老顾客的"老板人设 + 真实好物" IP 账号。',
    '',
    '## 用户',
    '半径 3 公里内的老客户。',
    '',
    '## 内容节奏',
    '每周 3 条：2 条产品卡点 + 1 条老板故事。',
    '',
    '## 关键指标',
    '- 新增到店：月 +15%',
    '- 爆款视频后加微信 +30%',
    '',
    '> 本稿由 mock LLM 生成，策划请改到客户能用自己的话复述。',
  ].join('\n');
}
