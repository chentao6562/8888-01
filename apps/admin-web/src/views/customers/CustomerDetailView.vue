<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { MButton, MStatusTag } from '@mindlink/ui';
import {
  customersApi,
  type Customer,
  type FollowUp,
} from '@/api/customers.api';
import { diagnosisApi, type DiagnosisReport } from '@/api/diagnosis.api';
import { proposalsApi, type PositioningBook } from '@/api/proposals.api';
import {
  STAGE_DOT_COLOR,
  STAGE_LABELS,
  type CustomerStage,
} from '@/api/types';
import type { AxiosError } from 'axios';

const route = useRoute();
const router = useRouter();
const customerId = computed(() => route.params.id as string);

const customer = ref<Customer | null>(null);
const followUps = ref<FollowUp[]>([]);
const diagnosis = ref<DiagnosisReport | null>(null);
const proposals = ref<PositioningBook[]>([]);
const loading = ref(false);
const errorMsg = ref<string | null>(null);

type Tab = 'overview' | 'diagnosis' | 'proposals' | 'followups';
const activeTab = ref<Tab>('overview');

const newFollowChannel = ref<FollowUp['channel']>('call');
const newFollowNotes = ref('');

async function load() {
  loading.value = true;
  errorMsg.value = null;
  try {
    const res = await customersApi.detail(customerId.value);
    customer.value = res.data;
    const [fu, diag, props] = await Promise.all([
      customersApi.listFollowUps(customerId.value).then((r) => r.data).catch(() => []),
      diagnosisApi.get(customerId.value).then((r) => r.data).catch(() => null),
      proposalsApi.listForCustomer(customerId.value).then((r) => r.data).catch(() => []),
    ]);
    followUps.value = fu;
    diagnosis.value = diag;
    proposals.value = props;
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    errorMsg.value = err.response?.data?.error?.message ?? '加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(customerId, load);

async function startDiagnosis() {
  await diagnosisApi.create(customerId.value);
  router.push(`/diagnosis/${customerId.value}`);
}

async function openDiagnosis() {
  router.push(`/diagnosis/${customerId.value}`);
}

async function openProposal(id?: string) {
  if (id) {
    router.push(`/proposals/${id}`);
  } else {
    router.push(`/proposals/new?customerId=${customerId.value}`);
  }
}

async function createContract() {
  // 取最新已签字方案
  const signed = proposals.value.find((p) => p.status === 'signed');
  if (!signed) {
    alert('没有已签字的方案，无法生成合同');
    return;
  }
  try {
    const { contractsApi } = await import('@/api/contracts.api');
    const res = await contractsApi.create({ proposalId: signed.id });
    router.push(`/contracts/${res.data.contract.id}`);
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '创建合同失败');
  }
}

async function addFollowUp() {
  if (newFollowNotes.value.trim().length < 2) return;
  try {
    await customersApi.addFollowUp(customerId.value, {
      channel: newFollowChannel.value,
      notes: newFollowNotes.value.trim(),
    });
    newFollowNotes.value = '';
    await load();
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '记录失败');
  }
}

function avatarInitial(name: string) {
  return (name[0] ?? '?').toUpperCase();
}

function stageBadgeClass(stage: CustomerStage) {
  const m: Record<CustomerStage, string> = {
    lead: 'stage-s1',
    diagnosing: 'stage-s2',
    proposing: 'stage-s3',
    signed: 'stage-s4',
    delivering: 'stage-s5',
    reviewing: 'stage-s6',
    renewing: 'stage-s7',
    churned: 'stage-ch',
  };
  return ['stage-tag', m[stage]];
}

function formatMoney(cents: number | null): string {
  if (cents == null) return '—';
  return `¥ ${(cents / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
}

const channelLabel: Record<FollowUp['channel'], string> = {
  call: '📞 电话',
  wechat: '💬 微信',
  visit: '🚶 上门',
  email: '✉️ 邮件',
  other: '其他',
};

const proposalsSummary = computed(() => {
  if (proposals.value.length === 0) return '暂无方案';
  return `${proposals.value.length} 版 · 最新 v${proposals.value[0].version} · ${proposals.value[0].status}`;
});
</script>

<template>
  <div class="detail" v-if="customer">
    <!-- Top bar -->
    <header class="topbar">
      <RouterLink to="/customers" class="topbar__back">← 客户列表</RouterLink>
      <div class="topbar__title">
        <div class="topbar__name">{{ customer.companyName }}</div>
        <div class="topbar__sub">
          {{ customer.industry }} · {{ customer.bossName }} · {{ customer.region ?? '—' }}
        </div>
      </div>
      <div class="topbar__right">
        <span :class="stageBadgeClass(customer.stage)">{{ STAGE_LABELS[customer.stage] }}</span>
      </div>
    </header>

    <div class="body">
      <!-- Left sidebar · customer card -->
      <aside class="side">
        <div class="card side__card">
          <div class="side__avatar">{{ avatarInitial(customer.companyName) }}</div>
          <div class="side__company">{{ customer.companyName }}</div>
          <div :class="stageBadgeClass(customer.stage)" style="margin-bottom: 20px;">
            {{ STAGE_LABELS[customer.stage] }}
          </div>
          <dl class="side__dl">
            <dt>老板</dt><dd>{{ customer.bossName }}</dd>
            <dt>电话</dt><dd>{{ customer.bossPhone }}</dd>
            <dt>微信</dt><dd>{{ customer.bossWechat ?? '—' }}</dd>
            <dt>行业</dt><dd>{{ customer.industry }}</dd>
            <dt>地区</dt><dd>{{ customer.region ?? '—' }}</dd>
            <dt>门店数</dt><dd>{{ customer.storeCount }}</dd>
            <dt>来源</dt><dd>{{ customer.source }}</dd>
            <dt>健康度</dt>
            <dd>
              <span :style="{ color: customer.healthLevel === 'green' ? 'var(--green)' : customer.healthLevel === 'yellow' ? 'var(--amber)' : 'var(--red)' }">
                {{ customer.healthScore }}
              </span>
            </dd>
            <dt>创建于</dt><dd>{{ new Date(customer.createdAt).toLocaleDateString() }}</dd>
            <dt>最近互动</dt>
            <dd>{{ customer.lastContactAt ? new Date(customer.lastContactAt).toLocaleDateString() : '—' }}</dd>
          </dl>

          <div class="side__actions">
            <MButton
              v-if="customer.stage === 'lead'"
              block
              @click="startDiagnosis"
            >
              开启诊断 · 进入 S2
            </MButton>
            <MButton
              v-else-if="customer.stage === 'diagnosing'"
              block
              @click="openDiagnosis"
            >
              继续诊断
            </MButton>
            <MButton
              v-else-if="customer.stage === 'proposing'"
              block
              @click="openProposal()"
            >
              生成方案 · S3
            </MButton>
            <MButton
              v-else-if="customer.stage === 'signed'"
              block
              @click="createContract"
            >
              创建合同 · 进入 S4
            </MButton>
            <MButton v-else block variant="secondary" @click="activeTab = 'followups'">
              查看跟进记录
            </MButton>
          </div>
        </div>
      </aside>

      <!-- Right main -->
      <section class="main">
        <nav class="tabs">
          <button
            v-for="t in (['overview','diagnosis','proposals','followups'] as Tab[])"
            :key="t"
            :class="['tab', { 'tab--active': activeTab === t }]"
            @click="activeTab = t"
          >
            {{ ({ overview: '概览', diagnosis: '诊断 (S2)', proposals: '方案 (S3)', followups: '跟进' } as Record<Tab, string>)[t] }}
          </button>
        </nav>

        <!-- 概览 -->
        <div v-if="activeTab === 'overview'" class="card card--padded">
          <h3 class="card__title">概览</h3>
          <div class="overview-grid">
            <div class="overview-item">
              <div class="overview-label">当前阶段</div>
              <div class="overview-value">{{ STAGE_LABELS[customer.stage] }}</div>
            </div>
            <div class="overview-item">
              <div class="overview-label">诊断状态</div>
              <div class="overview-value">
                <MStatusTag
                  size="sm"
                  :tone="diagnosis?.status === 'completed' ? 'green' : diagnosis ? 'amber' : 'gray'"
                >
                  {{ diagnosis?.status === 'completed' ? '已完成' : diagnosis ? '进行中' : '未开始' }}
                </MStatusTag>
              </div>
            </div>
            <div class="overview-item">
              <div class="overview-label">方案</div>
              <div class="overview-value">{{ proposalsSummary }}</div>
            </div>
            <div class="overview-item">
              <div class="overview-label">最近跟进</div>
              <div class="overview-value">
                {{ followUps[0] ? new Date(followUps[0].createdAt).toLocaleDateString() : '无' }}
              </div>
            </div>
          </div>

          <div v-if="customer.notes" class="notes">
            <div class="notes__label">备注</div>
            <div class="notes__body">{{ customer.notes }}</div>
          </div>
        </div>

        <!-- 诊断 -->
        <div v-else-if="activeTab === 'diagnosis'" class="card card--padded">
          <div class="tab-head">
            <h3 class="card__title">诊断工作台 (S2)</h3>
            <MButton size="sm" @click="diagnosis ? openDiagnosis() : startDiagnosis()">
              {{ diagnosis ? '打开诊断工作台 →' : '开启诊断' }}
            </MButton>
          </div>
          <div v-if="!diagnosis" class="empty-hint">客户尚未开启诊断。点击右上角启动 S1→S2。</div>
          <div v-else>
            <div class="diag-status">
              状态：
              <MStatusTag size="sm" :tone="diagnosis.status === 'completed' ? 'green' : 'amber'">
                {{ diagnosis.status === 'completed' ? '已完成' : '草稿' }}
              </MStatusTag>
            </div>
            <div class="diag-progress">
              <div>4 把刀：{{ [diagnosis.knifeSelf, diagnosis.knifeEmployee, diagnosis.knifeOldCustomer, diagnosis.knifeCompetitor].filter(Boolean).length }} / 4</div>
              <div>4 张卡：{{ [diagnosis.card1Sells, diagnosis.card2CustomerMind, diagnosis.card3ProductVideo, diagnosis.card4WhyNotNext].filter(Boolean).length }} / 4</div>
              <div>诊断报告：{{ diagnosis.reportContent ? '已生成' : '未生成' }}</div>
            </div>
          </div>
        </div>

        <!-- 方案 -->
        <div v-else-if="activeTab === 'proposals'" class="card card--padded">
          <div class="tab-head">
            <h3 class="card__title">方案 (S3)</h3>
            <MButton
              size="sm"
              :disabled="diagnosis?.status !== 'completed'"
              @click="openProposal()"
            >
              新建方案版本
            </MButton>
          </div>
          <div v-if="diagnosis?.status !== 'completed'" class="empty-hint">
            诊断未完成，不能创建方案。请先在「诊断」tab 完成 4 刀 4 卡并生成报告。
          </div>
          <div v-else-if="proposals.length === 0" class="empty-hint">
            暂无方案版本。点击「新建方案版本」生成 v1。
          </div>
          <ul v-else class="proposal-list">
            <li
              v-for="p in proposals"
              :key="p.id"
              class="proposal-item"
              @click="openProposal(p.id)"
            >
              <div class="proposal-item__head">
                <span class="proposal-item__ver">v{{ p.version }}</span>
                <MStatusTag
                  size="sm"
                  :tone="p.status === 'signed' ? 'green' : p.status === 'final' ? 'cyan' : 'gray'"
                >
                  {{ p.status === 'signed' ? '已签字' : p.status === 'final' ? '定稿' : '草稿' }}
                </MStatusTag>
              </div>
              <div class="proposal-item__onepager">{{ p.onePager ?? '（未生成一张纸）' }}</div>
              <div class="proposal-item__meta">
                套餐 {{ p.planTier }} · 报价 {{ formatMoney(p.priceQuote) }} ·
                {{ new Date(p.updatedAt).toLocaleDateString() }}
              </div>
            </li>
          </ul>
        </div>

        <!-- 跟进 -->
        <div v-else-if="activeTab === 'followups'" class="card card--padded">
          <h3 class="card__title">跟进记录</h3>
          <form class="follow-form" @submit.prevent="addFollowUp">
            <select v-model="newFollowChannel" class="input input--sm">
              <option value="call">电话</option>
              <option value="wechat">微信</option>
              <option value="visit">上门</option>
              <option value="email">邮件</option>
              <option value="other">其他</option>
            </select>
            <input
              v-model="newFollowNotes"
              class="input"
              placeholder="简单记录这次沟通的关键信息"
              maxlength="500"
            />
            <MButton size="sm" type="submit" :disabled="newFollowNotes.trim().length < 2">
              记录
            </MButton>
          </form>

          <ul v-if="followUps.length > 0" class="follow-list">
            <li v-for="f in followUps" :key="f.id" class="follow-item">
              <div class="follow-item__head">
                <span class="follow-item__chan">{{ channelLabel[f.channel] }}</span>
                <span class="follow-item__time">
                  {{ new Date(f.createdAt).toLocaleString() }}
                </span>
              </div>
              <div class="follow-item__body">{{ f.notes }}</div>
            </li>
          </ul>
          <div v-else class="empty-hint">暂无跟进记录。在上方记录第一条。</div>
        </div>
      </section>
    </div>
  </div>
  <div v-else-if="loading" class="loading">加载中…</div>
  <div v-else class="loading">{{ errorMsg ?? '客户不存在' }}</div>
</template>

<style scoped>
.detail {
  background: #F3F5FA;
  min-height: 100vh;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 32px;
  background: white;
  border-bottom: 1px solid var(--card-border);
}
.topbar__back {
  color: var(--text-muted);
  font-size: 12px;
  text-decoration: none;
}
.topbar__back:hover { color: var(--cyan); }
.topbar__title { flex: 1; }
.topbar__name { font-size: 20px; font-weight: 700; color: var(--text-dark); }
.topbar__sub { font-size: 12px; color: var(--text-muted); }

.body {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  padding: 20px 32px 40px;
}

.card {
  background: white;
  border: 1px solid var(--card-border);
  border-radius: 12px;
}
.card--padded { padding: 20px; }
.card__title { margin: 0 0 16px; font-size: 15px; font-weight: 600; color: var(--text-dark); }

.side__card { padding: 24px 20px; text-align: center; }
.side__avatar {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  background: linear-gradient(135deg, #60A5FA, #3B82F6);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 16px;
}
.side__company { font-size: 16px; font-weight: 600; color: var(--text-dark); margin-bottom: 10px; }
.side__dl {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 8px 12px;
  margin: 20px 0;
  text-align: left;
  font-size: 12px;
}
.side__dl dt { color: var(--text-muted); }
.side__dl dd { color: var(--text-body); margin: 0; }
.side__actions { margin-top: 20px; }

.tabs {
  display: flex;
  gap: 4px;
  background: white;
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
}
.tab {
  flex: 1;
  background: none;
  border: none;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-body);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.tab:hover { background: var(--card-bg); }
.tab--active {
  background: var(--dark-bg);
  color: white;
  font-weight: 600;
}

.tab-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.empty-hint {
  padding: 32px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.overview-item {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 14px 16px;
}
.overview-label { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.overview-value { font-size: 14px; color: var(--text-dark); font-weight: 500; }

.notes {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--card-border);
}
.notes__label { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.notes__body { font-size: 13px; color: var(--text-body); line-height: 1.7; white-space: pre-wrap; }

.diag-status { font-size: 13px; color: var(--text-body); margin-bottom: 12px; }
.diag-progress {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: var(--text-muted);
  padding: 16px;
  background: var(--card-bg);
  border-radius: 8px;
}

.proposal-list { list-style: none; padding: 0; margin: 0; }
.proposal-item {
  padding: 14px 16px;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.proposal-item:hover { border-color: var(--cyan); background: #F0F9FF; }
.proposal-item__head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.proposal-item__ver { font-weight: 700; color: var(--text-dark); }
.proposal-item__onepager {
  font-size: 12px;
  color: var(--text-body);
  line-height: 1.6;
  max-height: 40px;
  overflow: hidden;
}
.proposal-item__meta { font-size: 11px; color: var(--text-muted); margin-top: 6px; }

.follow-form { display: flex; gap: 8px; margin-bottom: 16px; }
.input {
  flex: 1;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
}
.input--sm { flex: 0 0 100px; }
.input:focus { outline: none; border-color: var(--cyan); }
.follow-list { list-style: none; padding: 0; margin: 0; }
.follow-item {
  padding: 12px 14px;
  border-left: 2px solid var(--cyan);
  background: var(--card-bg);
  margin-bottom: 8px;
  border-radius: 4px;
}
.follow-item__head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 4px;
}
.follow-item__chan { color: var(--cyan); font-weight: 600; }
.follow-item__time { color: var(--text-muted); }
.follow-item__body { font-size: 13px; color: var(--text-body); line-height: 1.7; }

/* stage tag */
.stage-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
.stage-tag::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.stage-s1 { background: #FEF3C7; color: #92400E; } .stage-s1::before { background: #F59E0B; }
.stage-s2 { background: #DBEAFE; color: #1E40AF; } .stage-s2::before { background: #3B82F6; }
.stage-s3 { background: #E0E7FF; color: #3730A3; } .stage-s3::before { background: #6366F1; }
.stage-s4 { background: #EDE9FE; color: #5B21B6; } .stage-s4::before { background: #8B5CF6; }
.stage-s5 { background: #D1FAE5; color: #065F46; } .stage-s5::before { background: #10B981; }
.stage-s6 { background: #CFFAFE; color: #155E75; } .stage-s6::before { background: #06B6D4; }
.stage-s7 { background: #FCE7F3; color: #9F1239; } .stage-s7::before { background: #EC4899; }
.stage-ch { background: #F1F5F9; color: #64748B; } .stage-ch::before { background: #64748B; }

.loading {
  padding: 60px;
  text-align: center;
  color: var(--text-muted);
}
</style>
