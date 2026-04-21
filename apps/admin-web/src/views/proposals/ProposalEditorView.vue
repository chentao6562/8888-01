<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { MButton, MCard, MStatusTag } from '@mindlink/ui';
import {
  proposalsApi,
  type Package,
  type PackageTier,
  type PositioningBook,
} from '@/api/proposals.api';
import { customersApi, type Customer } from '@/api/customers.api';
import type { AxiosError } from 'axios';

const route = useRoute();
const router = useRouter();

/** 两种路由：
 *  /proposals/new?customerId=xxx   创建新版本
 *  /proposals/:id                  编辑已有方案
 */
const isNew = computed(() => route.name === 'ProposalNew');
const routeId = computed(() => route.params.id as string | undefined);
const queryCustomerId = computed(() => route.query.customerId as string | undefined);

const proposal = ref<PositioningBook | null>(null);
const customer = ref<Customer | null>(null);
const packages = ref<Package[]>([]);
const loading = ref(false);
const saving = ref(false);
const creating = ref(false);
const errorMsg = ref<string | null>(null);

const chosenTier = ref<PackageTier>('monthly_package');
const regionFactor = ref(1.0);
const previewQuote = ref<{
  planTier: PackageTier;
  base: number;
  custom: number;
  total: number;
} | null>(null);

const form = reactive({
  onePager: '',
  content: '',
  priceQuote: 0,
});

async function loadPackages() {
  const res = await proposalsApi.listPackages();
  packages.value = res.data;
}

async function loadForEdit(id: string) {
  loading.value = true;
  try {
    const res = await proposalsApi.get(id);
    proposal.value = res.data;
    form.onePager = res.data.onePager ?? '';
    form.content = res.data.content ?? '';
    form.priceQuote = res.data.priceQuote;
    chosenTier.value = res.data.planTier;
    regionFactor.value = res.data.regionFactor;
    // 拉取客户信息（用于顶部面包屑）
    customer.value = (await customersApi.detail(res.data.customerId)).data;
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    errorMsg.value = err.response?.data?.error?.message ?? '加载失败';
  } finally {
    loading.value = false;
  }
}

async function loadForNew(cid: string) {
  loading.value = true;
  try {
    customer.value = (await customersApi.detail(cid)).data;
    const rec = await proposalsApi.recommendPackage(cid);
    if (rec.data) chosenTier.value = rec.data.tier;
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    errorMsg.value = err.response?.data?.error?.message ?? '加载失败';
  } finally {
    loading.value = false;
  }
}

async function recalcQuote() {
  try {
    const res = await proposalsApi.calculateQuote({
      planTier: chosenTier.value,
      regionFactor: regionFactor.value,
    });
    previewQuote.value = res.data;
    if (isNew.value) form.priceQuote = res.data.total;
  } catch {
    /* ignore */
  }
}

async function createProposal() {
  if (!customer.value) return;
  creating.value = true;
  try {
    const res = await proposalsApi.create(customer.value.id, {
      planTier: chosenTier.value,
      regionFactor: regionFactor.value,
    });
    router.replace(`/proposals/${res.data.id}`);
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    errorMsg.value = err.response?.data?.error?.message ?? '创建失败';
  } finally {
    creating.value = false;
  }
}

async function save() {
  if (!proposal.value) return;
  saving.value = true;
  try {
    const res = await proposalsApi.update(proposal.value.id, {
      onePager: form.onePager,
      content: form.content,
      priceQuote: form.priceQuote,
      regionFactor: regionFactor.value,
    });
    proposal.value = res.data;
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    errorMsg.value = err.response?.data?.error?.message ?? '保存失败';
  } finally {
    saving.value = false;
  }
}

async function finalize() {
  if (!proposal.value) return;
  await save();
  await proposalsApi.finalize(proposal.value.id);
  proposal.value = (await proposalsApi.get(proposal.value.id)).data;
}

async function sign() {
  if (!proposal.value) return;
  if (
    !confirm(
      '确认客户已签字？签字后方案不可再编辑，客户将自动进入 S4 签约阶段。',
    )
  )
    return;
  try {
    await proposalsApi.sign(proposal.value.id);
    proposal.value = (await proposalsApi.get(proposal.value.id)).data;
    alert('已标记为签字！客户进入 S4 签约阶段。');
    if (customer.value) router.push(`/customers/${customer.value.id}`);
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '签字失败');
  }
}

onMounted(async () => {
  await loadPackages();
  if (routeId.value) {
    await loadForEdit(routeId.value);
  } else if (queryCustomerId.value) {
    await loadForNew(queryCustomerId.value);
  }
  await recalcQuote();
});

watch([chosenTier, regionFactor], recalcQuote);

const readOnly = computed(() => proposal.value?.status === 'signed');

function formatMoney(cents: number): string {
  return `¥ ${(cents / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
}

const tierLabel: Record<PackageTier, string> = {
  starter_pack: '矩阵起号包',
  monthly_package: '月度代运营包',
  annual_partner: '年度合伙人包',
};
</script>

<template>
  <div class="proposal" v-if="customer">
    <header class="topbar">
      <RouterLink :to="`/customers/${customer.id}`" class="back">← {{ customer.companyName }}</RouterLink>
      <h1 class="title">{{ isNew ? '新建方案' : `方案 v${proposal?.version ?? ''}` }}</h1>
      <MStatusTag
        v-if="proposal"
        size="sm"
        :tone="proposal.status === 'signed' ? 'green' : proposal.status === 'final' ? 'cyan' : 'gray'"
      >
        {{ proposal.status === 'signed' ? '已签字' : proposal.status === 'final' ? '定稿' : '草稿' }}
      </MStatusTag>
    </header>

    <div class="body">
      <!-- 左：套餐选择 + 报价 -->
      <aside class="side">
        <MCard padded>
          <template #header><h3 class="pane__title">套餐选择</h3></template>
          <div class="pkg-picker">
            <label
              v-for="pkg in packages.filter(p => p.tenantId === null)"
              :key="pkg.id"
              :class="['pkg', { 'pkg--active': chosenTier === pkg.tier }]"
            >
              <input
                v-model="chosenTier"
                type="radio"
                :value="pkg.tier"
                :disabled="readOnly || (!isNew && Boolean(proposal))"
              />
              <div>
                <div class="pkg__name">{{ pkg.name }}</div>
                <div class="pkg__desc">{{ pkg.description }}</div>
                <div class="pkg__price">
                  {{ formatMoney(pkg.priceMin) }} – {{ formatMoney(pkg.priceMax) }}
                </div>
              </div>
            </label>
          </div>

          <div class="field" style="margin-top: 16px;">
            <label>地区系数（0.8 – 1.5）</label>
            <input
              v-model.number="regionFactor"
              class="input"
              type="number"
              step="0.1"
              min="0.8"
              max="1.5"
              :disabled="readOnly"
            />
          </div>

          <div class="quote">
            <div class="quote__row"><span>基础报价</span><strong>{{ previewQuote ? formatMoney(previewQuote.base) : '—' }}</strong></div>
            <div class="quote__row"><span>定制项</span><strong>{{ previewQuote ? formatMoney(previewQuote.custom) : '¥ 0' }}</strong></div>
            <div class="quote__row quote__row--total"><span>合计</span><strong>{{ previewQuote ? formatMoney(previewQuote.total) : '—' }}</strong></div>
          </div>
        </MCard>
      </aside>

      <!-- 右：一张纸 + 完整定位书 -->
      <section class="main">
        <div v-if="isNew && !proposal" class="create-hint">
          <MCard padded>
            <template #header><h3 class="pane__title">生成 AI 初稿</h3></template>
            <p>将基于客户诊断报告 + 所选套餐（<strong>{{ tierLabel[chosenTier] }}</strong>）
              生成定位书 v1 草稿。生成后可编辑"一张纸"和"完整定位书"。</p>
            <div v-if="errorMsg" class="err">{{ errorMsg }}</div>
            <div class="actions">
              <MButton :loading="creating" @click="createProposal">生成方案 v1</MButton>
            </div>
          </MCard>
        </div>

        <template v-else-if="proposal">
          <MCard padded>
            <template #header><h3 class="pane__title">一张纸定位</h3></template>
            <template #action>
              <span class="pane__hint">≤ 200 字 · 客户应能用自己的话复述</span>
            </template>
            <textarea
              v-model="form.onePager"
              class="textarea textarea--onepager"
              rows="5"
              :disabled="readOnly"
            />
          </MCard>

          <MCard padded class="mt">
            <template #header><h3 class="pane__title">完整定位书</h3></template>
            <template #action>
              <div class="actions--inline">
                <MButton size="sm" variant="ghost" :loading="saving" :disabled="readOnly" @click="save">
                  保存
                </MButton>
                <MButton size="sm" variant="secondary" :disabled="readOnly || proposal.status === 'final'" @click="finalize">
                  定稿
                </MButton>
                <MButton size="sm" :disabled="readOnly" @click="sign">标记客户签字</MButton>
              </div>
            </template>
            <textarea
              v-model="form.content"
              class="textarea"
              rows="18"
              :disabled="readOnly"
            />
            <div class="footnote">
              当前报价：
              <input
                v-model.number="form.priceQuote"
                class="input input--money"
                type="number"
                min="0"
                step="1000"
                :disabled="readOnly"
              />
              分 · 约 {{ formatMoney(form.priceQuote) }}
            </div>
          </MCard>
        </template>
      </section>
    </div>
  </div>
  <div v-else class="loading">{{ errorMsg ?? '加载中…' }}</div>
</template>

<style scoped>
.proposal {
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
.back { color: var(--text-muted); font-size: 12px; text-decoration: none; }
.back:hover { color: var(--cyan); }
.title { margin: 0; font-size: 18px; font-weight: 700; color: var(--text-dark); flex: 1; }

.body {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  padding: 20px 32px 40px;
}

.pane__title { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-dark); }
.pane__hint { font-size: 11px; color: var(--text-muted); }

.pkg-picker { display: flex; flex-direction: column; gap: 8px; }
.pkg {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.pkg:hover { border-color: var(--cyan); }
.pkg--active { border-color: var(--cyan); background: rgba(56, 189, 248, 0.08); }
.pkg__name { font-size: 13px; font-weight: 600; color: var(--text-dark); }
.pkg__desc { font-size: 11px; color: var(--text-muted); margin: 4px 0 6px; }
.pkg__price { font-size: 11px; color: var(--cyan); font-family: 'Inter', sans-serif; }
.pkg input { margin-top: 3px; }

.field label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.input {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  width: 100%;
}
.input:focus { outline: none; border-color: var(--cyan); }

.quote {
  margin-top: 16px;
  padding: 12px 14px;
  background: var(--card-bg);
  border-radius: 8px;
}
.quote__row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
  color: var(--text-body);
}
.quote__row--total {
  border-top: 1px solid var(--card-border);
  padding-top: 8px;
  margin-top: 4px;
  font-size: 14px;
  color: var(--text-dark);
}

.textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.7;
  resize: vertical;
}
.textarea:focus { outline: none; border-color: var(--cyan); }
.textarea:disabled { background: var(--card-bg); color: var(--text-muted); }
.textarea--onepager {
  font-size: 15px;
  line-height: 1.8;
}

.actions, .actions--inline {
  display: flex;
  gap: 8px;
  align-items: center;
}
.actions { margin-top: 16px; }

.mt { margin-top: 20px; }

.footnote {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-muted);
}
.input--money {
  width: 140px;
  height: 28px;
  display: inline-block;
  vertical-align: middle;
  margin: 0 6px;
}

.err {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--red);
  border-radius: 6px;
  font-size: 12px;
}

.create-hint p { font-size: 13px; color: var(--text-body); line-height: 1.8; margin-bottom: 0; }

.loading { padding: 60px; text-align: center; color: var(--text-muted); }
</style>
