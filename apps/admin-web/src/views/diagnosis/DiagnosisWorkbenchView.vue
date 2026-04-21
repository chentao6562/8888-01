<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { MButton, MCard, MStatusTag } from '@mindlink/ui';
import { customersApi, type Customer } from '@/api/customers.api';
import { diagnosisApi, type DiagnosisReport } from '@/api/diagnosis.api';
import type { AxiosError } from 'axios';

const route = useRoute();
const router = useRouter();
const customerId = computed(() => route.params.customerId as string);

const customer = ref<Customer | null>(null);
const report = ref<DiagnosisReport | null>(null);
const loading = ref(false);
const saving = ref(false);
const generating = ref(false);
const errorMsg = ref<string | null>(null);

type StepKey =
  | 'basic'
  | 'interview'
  | 'knives'
  | 'cards'
  | 'report'
  | 'finalize';

const activeStep = ref<StepKey>('basic');

const form = reactive({
  knifeSelf: '',
  knifeEmployee: '',
  knifeOldCustomer: '',
  knifeCompetitor: '',
  card1Sells: '',
  card2CustomerMind: '',
  card3ProductVideo: '',
  card4WhyNotNext: '',
});

async function load() {
  loading.value = true;
  try {
    customer.value = (await customersApi.detail(customerId.value)).data;
    let r: DiagnosisReport;
    try {
      r = (await diagnosisApi.get(customerId.value)).data;
    } catch {
      // 没有诊断就创建
      r = (await diagnosisApi.create(customerId.value)).data;
    }
    report.value = r;
    form.knifeSelf = r.knifeSelf ?? '';
    form.knifeEmployee = r.knifeEmployee ?? '';
    form.knifeOldCustomer = r.knifeOldCustomer ?? '';
    form.knifeCompetitor = r.knifeCompetitor ?? '';
    form.card1Sells = r.card1Sells ?? '';
    form.card2CustomerMind = r.card2CustomerMind ?? '';
    form.card3ProductVideo = r.card3ProductVideo ?? '';
    form.card4WhyNotNext = r.card4WhyNotNext ?? '';
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    errorMsg.value = err.response?.data?.error?.message ?? '加载失败';
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!report.value || report.value.status === 'completed') return;
  saving.value = true;
  try {
    const res = await diagnosisApi.update(customerId.value, { ...form });
    report.value = res.data;
  } finally {
    saving.value = false;
  }
}

async function generateInterview() {
  generating.value = true;
  try {
    const res = await diagnosisApi.generateInterview(customerId.value);
    report.value = res.data;
  } finally {
    generating.value = false;
  }
}

async function generateReport() {
  await save();
  generating.value = true;
  try {
    const res = await diagnosisApi.generateReport(customerId.value);
    report.value = res.data;
    activeStep.value = 'report';
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '生成失败');
  } finally {
    generating.value = false;
  }
}

async function complete() {
  if (!report.value?.reportContent) {
    alert('请先生成诊断报告');
    return;
  }
  if (!confirm('完成诊断后客户将自动进入 S3 方案阶段，且不可再编辑。继续吗？')) return;
  try {
    const res = await diagnosisApi.complete(customerId.value);
    report.value = res.data;
    alert('诊断完成！客户已进入 S3 方案阶段。');
    router.push(`/customers/${customerId.value}`);
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '完成失败');
  }
}

onMounted(load);

const isCompleted = computed(() => report.value?.status === 'completed');

const steps = computed(() => [
  { key: 'basic' as StepKey, title: '基础信息', desc: '确认客户资料' },
  { key: 'interview' as StepKey, title: 'AI 访谈预问卷', desc: '60 题骨架（phase 4 接真实 LLM）', done: Boolean(report.value?.preInterviewContent) },
  { key: 'knives' as StepKey, title: '4 把刀问卷', desc: '现场访谈', done: [form.knifeSelf, form.knifeEmployee, form.knifeOldCustomer, form.knifeCompetitor].every(Boolean) },
  { key: 'cards' as StepKey, title: '4 张定位卡', desc: '核心输出', done: [form.card1Sells, form.card2CustomerMind, form.card3ProductVideo, form.card4WhyNotNext].every(Boolean) },
  { key: 'report' as StepKey, title: '生成报告', desc: 'AI 辅助草稿', done: Boolean(report.value?.reportContent) },
  { key: 'finalize' as StepKey, title: '完成诊断', desc: '客户 → S3 方案', done: isCompleted.value },
]);

const progressPct = computed(() => {
  const done = steps.value.filter((s) => s.done).length;
  return Math.round((done / steps.value.length) * 100);
});
</script>

<template>
  <div class="diag" v-if="customer && report">
    <header class="topbar">
      <RouterLink :to="`/customers/${customerId}`" class="back">← {{ customer.companyName }}</RouterLink>
      <div class="title-wrap">
        <h1 class="title">诊断工作台 (S2)</h1>
        <MStatusTag size="sm" :tone="isCompleted ? 'green' : 'amber'">
          {{ isCompleted ? '已完成' : '进行中' }}
        </MStatusTag>
      </div>
      <div class="progress">
        <div class="progress__label">整体完成度 {{ progressPct }}%</div>
        <div class="progress__bar"><div class="progress__fill" :style="{ width: `${progressPct}%` }"></div></div>
      </div>
    </header>

    <div class="body">
      <!-- 左侧步骤导航 -->
      <aside class="steps">
        <button
          v-for="step in steps"
          :key="step.key"
          :class="['step', { 'step--active': activeStep === step.key, 'step--done': step.done }]"
          @click="activeStep = step.key"
        >
          <span class="step__check">{{ step.done ? '✓' : '○' }}</span>
          <div class="step__text">
            <div class="step__title">{{ step.title }}</div>
            <div class="step__desc">{{ step.desc }}</div>
          </div>
        </button>
      </aside>

      <!-- 右侧工作区 -->
      <section class="pane">
        <!-- 基础信息 -->
        <MCard v-if="activeStep === 'basic'" padded>
          <template #header><h3 class="pane__title">基础信息</h3></template>
          <dl class="info-dl">
            <dt>公司</dt><dd>{{ customer.companyName }}</dd>
            <dt>老板</dt><dd>{{ customer.bossName }} · {{ customer.bossPhone }}</dd>
            <dt>行业</dt><dd>{{ customer.industry }}</dd>
            <dt>门店</dt><dd>{{ customer.storeCount }} 家 · {{ customer.region ?? '—' }}</dd>
            <dt>预算预估</dt><dd>{{ customer.budgetHint }}</dd>
            <dt>备注</dt><dd>{{ customer.notes ?? '—' }}</dd>
          </dl>
          <div class="actions">
            <MButton @click="activeStep = 'interview'">下一步 · AI 访谈</MButton>
          </div>
        </MCard>

        <!-- AI 访谈 -->
        <MCard v-else-if="activeStep === 'interview'" padded>
          <template #header>
            <h3 class="pane__title">AI 访谈预问卷</h3>
          </template>
          <template #action>
            <MButton
              size="sm"
              variant="secondary"
              :loading="generating"
              :disabled="isCompleted"
              @click="generateInterview"
            >
              {{ report.preInterviewContent ? '重新生成' : '生成问卷' }}
            </MButton>
          </template>
          <div v-if="!report.preInterviewContent" class="empty">
            点击右上角「生成问卷」，AI 会根据客户画像生成 60 题预访谈问卷。
          </div>
          <pre v-else class="content">{{ report.preInterviewContent }}</pre>
          <div class="actions">
            <MButton variant="ghost" @click="activeStep = 'basic'">← 上一步</MButton>
            <MButton @click="activeStep = 'knives'">下一步 · 4 把刀</MButton>
          </div>
        </MCard>

        <!-- 4 把刀 -->
        <MCard v-else-if="activeStep === 'knives'" padded>
          <template #header>
            <h3 class="pane__title">4 把刀 · 现场问诊</h3>
          </template>
          <template #action>
            <MButton size="sm" variant="ghost" :loading="saving" :disabled="isCompleted" @click="save">保存草稿</MButton>
          </template>
          <div class="field">
            <label>刀 1 · 问老板自己：你卖什么？（老板视角）</label>
            <textarea v-model="form.knifeSelf" class="textarea" rows="3" :disabled="isCompleted" />
          </div>
          <div class="field">
            <label>刀 2 · 问员工：每天在做什么？（执行视角）</label>
            <textarea v-model="form.knifeEmployee" class="textarea" rows="3" :disabled="isCompleted" />
          </div>
          <div class="field">
            <label>刀 3 · 问老客户：你觉得他凭啥？（客户视角）</label>
            <textarea v-model="form.knifeOldCustomer" class="textarea" rows="3" :disabled="isCompleted" />
          </div>
          <div class="field">
            <label>刀 4 · 问竞品：隔壁在做什么？（市场视角）</label>
            <textarea v-model="form.knifeCompetitor" class="textarea" rows="3" :disabled="isCompleted" />
          </div>
          <div class="actions">
            <MButton variant="ghost" @click="activeStep = 'interview'">← 上一步</MButton>
            <MButton @click="save().then(() => (activeStep = 'cards'))">下一步 · 4 张卡</MButton>
          </div>
        </MCard>

        <!-- 4 张卡 -->
        <MCard v-else-if="activeStep === 'cards'" padded>
          <template #header>
            <h3 class="pane__title">4 张定位卡</h3>
          </template>
          <template #action>
            <MButton size="sm" variant="ghost" :loading="saving" :disabled="isCompleted" @click="save">保存草稿</MButton>
          </template>
          <div class="field">
            <label>卡 1 · 他卖啥（一句话）</label>
            <textarea v-model="form.card1Sells" class="textarea" rows="2" :disabled="isCompleted" />
          </div>
          <div class="field">
            <label>卡 2 · 客户半夜想啥（情绪触达）</label>
            <textarea v-model="form.card2CustomerMind" class="textarea" rows="2" :disabled="isCompleted" />
          </div>
          <div class="field">
            <label>卡 3 · 产品上视频（核心画面）</label>
            <textarea v-model="form.card3ProductVideo" class="textarea" rows="2" :disabled="isCompleted" />
          </div>
          <div class="field">
            <label>卡 4 · 凭什么不选隔壁（差异化）</label>
            <textarea v-model="form.card4WhyNotNext" class="textarea" rows="2" :disabled="isCompleted" />
          </div>
          <div class="actions">
            <MButton variant="ghost" @click="activeStep = 'knives'">← 上一步</MButton>
            <MButton :loading="generating" :disabled="isCompleted" @click="generateReport">
              生成诊断报告 →
            </MButton>
          </div>
        </MCard>

        <!-- 报告 -->
        <MCard v-else-if="activeStep === 'report'" padded>
          <template #header>
            <h3 class="pane__title">诊断报告</h3>
          </template>
          <template #action>
            <MButton size="sm" variant="ghost" :loading="generating" :disabled="isCompleted" @click="generateReport">
              重新生成
            </MButton>
          </template>
          <div v-if="!report.reportContent" class="empty">
            报告尚未生成。返回「4 张卡」步骤完成后点击「生成诊断报告」。
          </div>
          <pre v-else class="content content--report">{{ report.reportContent }}</pre>
          <div class="actions">
            <MButton variant="ghost" @click="activeStep = 'cards'">← 上一步</MButton>
            <MButton :disabled="!report.reportContent" @click="activeStep = 'finalize'">
              下一步 · 完成诊断
            </MButton>
          </div>
        </MCard>

        <!-- 完成 -->
        <MCard v-else-if="activeStep === 'finalize'" padded>
          <template #header>
            <h3 class="pane__title">完成诊断</h3>
          </template>
          <p>点击下方按钮后，客户将自动进入 <strong>S3 方案</strong> 阶段。此诊断报告会被锁定为只读。</p>
          <ul class="checklist">
            <li :class="{ 'li--done': form.knifeSelf && form.knifeEmployee && form.knifeOldCustomer && form.knifeCompetitor }">
              4 把刀：4 / 4
            </li>
            <li :class="{ 'li--done': form.card1Sells && form.card2CustomerMind && form.card3ProductVideo && form.card4WhyNotNext }">
              4 张卡：4 / 4
            </li>
            <li :class="{ 'li--done': report.reportContent }">诊断报告已生成</li>
          </ul>
          <div class="actions">
            <MButton variant="ghost" @click="activeStep = 'report'">← 上一步</MButton>
            <MButton :disabled="isCompleted" @click="complete">
              {{ isCompleted ? '已完成' : '完成诊断 · 进入 S3' }}
            </MButton>
          </div>
        </MCard>
      </section>
    </div>
  </div>
  <div v-else-if="loading" class="loading">加载中…</div>
  <div v-else class="loading">{{ errorMsg ?? '加载失败' }}</div>
</template>

<style scoped>
.diag {
  background: #F3F5FA;
  min-height: 100vh;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 32px;
  background: white;
  border-bottom: 1px solid var(--card-border);
}
.back { color: var(--text-muted); font-size: 12px; text-decoration: none; }
.back:hover { color: var(--cyan); }
.title-wrap { display: flex; gap: 12px; align-items: center; flex: 1; }
.title { margin: 0; font-size: 18px; font-weight: 700; color: var(--text-dark); }
.progress { width: 260px; text-align: right; }
.progress__label { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; }
.progress__bar {
  height: 6px;
  background: var(--card-bg);
  border-radius: 3px;
  overflow: hidden;
}
.progress__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--cyan), var(--green));
  transition: width 0.3s;
}

.body {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  padding: 20px 32px 40px;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: white;
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 8px;
  height: fit-content;
  position: sticky;
  top: 20px;
}
.step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: none;
  border: none;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.step:hover { background: var(--card-bg); }
.step--active { background: #E0F2FE; }
.step__check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--card-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
  margin-top: 1px;
}
.step--done .step__check { border-color: var(--green); background: var(--green); color: white; }
.step--active .step__check { border-color: var(--cyan); color: var(--cyan); }
.step__text { flex: 1; }
.step__title { font-size: 13px; font-weight: 600; color: var(--text-dark); }
.step__desc { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.pane { min-width: 0; }
.pane__title { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-dark); }

.info-dl {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 10px 20px;
  font-size: 13px;
  margin: 0 0 20px;
}
.info-dl dt { color: var(--text-muted); }
.info-dl dd { color: var(--text-body); margin: 0; }

.field { margin-bottom: 16px; }
.field label {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.7;
  resize: vertical;
}
.textarea:focus { outline: none; border-color: var(--cyan); }
.textarea:disabled { background: var(--card-bg); color: var(--text-muted); }

.content {
  padding: 16px;
  background: var(--card-bg);
  border-radius: 8px;
  font-size: 12px;
  font-family: 'Consolas', monospace;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.7;
}
.content--report {
  font-family: inherit;
  font-size: 14px;
}

.empty {
  padding: 40px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--card-border);
}

.checklist {
  list-style: none;
  padding: 0;
  margin: 20px 0;
}
.checklist li {
  padding: 10px 14px;
  background: var(--card-bg);
  border-radius: 6px;
  margin-bottom: 6px;
  color: var(--text-muted);
  font-size: 13px;
}
.checklist .li--done {
  background: rgba(16, 185, 129, 0.08);
  color: var(--green);
}

.loading {
  padding: 60px;
  text-align: center;
  color: var(--text-muted);
}
</style>
