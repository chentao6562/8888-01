<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { MButton, MCard, MStatusTag } from '@mindlink/ui';
import {
  contractsApi,
  type Contract,
  type Payment,
  type PaymentStage,
} from '@/api/contracts.api';
import type { AxiosError } from 'axios';

const route = useRoute();
const id = computed(() => route.params.id as string);

const contract = ref<Contract | null>(null);
const payments = ref<Payment[]>([]);
const loading = ref(false);
const msg = ref<string | null>(null);

async function load() {
  loading.value = true;
  msg.value = null;
  try {
    const [c, p] = await Promise.all([
      contractsApi.get(id.value),
      contractsApi.payments(id.value),
    ]);
    contract.value = c.data;
    payments.value = p.data;
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    msg.value = err.response?.data?.error?.message ?? '加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function sendForSign() {
  if (!contract.value) return;
  if (!confirm('发起电子签？（phase 3 mock · 下方可手工触发回调标为已签）')) return;
  try {
    const res = await contractsApi.sendForSign(contract.value.id);
    alert(`已发起 · orderId=${res.data.orderId}`);
    await load();
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '发起失败');
  }
}

async function triggerCallback() {
  if (!contract.value || !contract.value.esignOrderId) return;
  if (!confirm('手工触发 mock 回调 · 将把合同标为已签字。真实 provider 下不会用到此按钮。')) return;
  try {
    await contractsApi.esignCallback(contract.value.id, {
      tenantId: contract.value.tenantId,
      orderId: contract.value.esignOrderId,
      signed: true,
    });
    await load();
    alert('合同已签字');
  } catch {
    alert('回调失败');
  }
}

async function registerPayment(p: Payment) {
  const idempotencyKey = `${p.id}-${Date.now()}`;
  try {
    await contractsApi.registerPayment(id.value, p.id, {
      idempotencyKey,
      notes: '手工登记',
    });
    await load();
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '登记失败');
  }
}

const statusLabel: Record<Contract['status'], string> = {
  draft: '草稿',
  pending_sign: '待签',
  signed: '已签',
  executing: '执行中',
  completed: '已完成',
  renewed: '已续约',
  terminated: '已终止',
};

const stageLabel: Record<PaymentStage, string> = {
  plan: '策划 20%',
  shoot: '拍摄 40%',
  edit: '剪辑 35%',
  final: '尾款 5%',
};

function tone(s: Contract['status']) {
  if (s === 'signed' || s === 'executing') return 'green';
  if (s === 'pending_sign' || s === 'draft') return 'amber';
  return 'gray';
}

function payTone(s: Payment['status']) {
  if (s === 'paid') return 'green';
  if (s === 'overdue') return 'red';
  return 'amber';
}

function fmt(cents: number) {
  return `¥ ${(cents / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
}
</script>

<template>
  <div class="page" v-if="contract">
    <header class="topbar">
      <RouterLink to="/contracts" class="back">← 合同列表</RouterLink>
      <h1 class="title">{{ contract.contractNo }}</h1>
      <MStatusTag :tone="tone(contract.status)">{{ statusLabel[contract.status] }}</MStatusTag>
    </header>

    <div class="body">
      <aside class="side">
        <MCard padded>
          <template #header><h3 class="card-title">合同信息</h3></template>
          <dl class="dl">
            <dt>总金额</dt><dd class="mono big">{{ fmt(contract.totalAmount) }}</dd>
            <dt>签约时间</dt>
            <dd>{{ contract.signedAt ? new Date(contract.signedAt).toLocaleString() : '—' }}</dd>
            <dt>电子签订单</dt><dd class="mono">{{ contract.esignOrderId ?? '—' }}</dd>
            <dt>创建时间</dt><dd>{{ new Date(contract.createdAt).toLocaleDateString() }}</dd>
          </dl>

          <div class="actions">
            <MButton
              v-if="contract.status === 'draft'"
              block
              @click="sendForSign"
            >
              发起电子签
            </MButton>
            <MButton
              v-if="contract.status === 'pending_sign'"
              block
              variant="secondary"
              @click="triggerCallback"
            >
              手工回调（mock）
            </MButton>
          </div>
        </MCard>
      </aside>

      <section class="main">
        <MCard padded>
          <template #header><h3 class="card-title">付款时间轴（先拍后付）</h3></template>
          <ol class="timeline">
            <li
              v-for="p in payments"
              :key="p.id"
              :class="['tl__item', `tl__item--${p.status}`]"
            >
              <div class="tl__head">
                <span class="tl__stage">{{ stageLabel[p.stage] }}</span>
                <MStatusTag size="sm" :tone="payTone(p.status)">
                  {{ p.status === 'paid' ? '已付' : p.status === 'overdue' ? '已逾期' : '待付' }}
                </MStatusTag>
              </div>
              <div class="tl__amount mono">{{ fmt(p.amount) }}</div>
              <div class="tl__meta">
                到期：{{ p.dueAt ? new Date(p.dueAt).toLocaleDateString() : '—' }}
                <span v-if="p.paidAt"> · 已付于 {{ new Date(p.paidAt).toLocaleDateString() }}</span>
              </div>
              <div v-if="p.notes" class="tl__notes">{{ p.notes }}</div>
              <div class="tl__actions">
                <MButton
                  v-if="p.status === 'pending'"
                  size="sm"
                  variant="secondary"
                  @click="registerPayment(p)"
                >
                  登记已付
                </MButton>
              </div>
            </li>
          </ol>
        </MCard>

        <MCard padded style="margin-top: 16px;">
          <template #header><h3 class="card-title">合同正文</h3></template>
          <pre class="body-snapshot">{{ contract.bodySnapshot }}</pre>
        </MCard>
      </section>
    </div>
  </div>
  <div v-else-if="loading" class="loading">加载中…</div>
  <div v-else class="loading">{{ msg ?? '合同不存在' }}</div>
</template>

<style scoped>
.page { background: #F3F5FA; min-height: 100vh; }
.topbar {
  display: flex; align-items: center; gap: 20px;
  padding: 16px 32px;
  background: white;
  border-bottom: 1px solid var(--card-border);
}
.back { color: var(--text-muted); font-size: 12px; text-decoration: none; }
.back:hover { color: var(--cyan); }
.title { margin: 0; font-size: 18px; font-weight: 700; color: var(--text-dark); flex: 1; font-family: 'Consolas', monospace; }

.body { display: grid; grid-template-columns: 320px 1fr; gap: 20px; padding: 20px 32px 40px; }

.card-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-dark); }
.dl { display: grid; grid-template-columns: 90px 1fr; gap: 10px 14px; font-size: 13px; margin: 0; }
.dl dt { color: var(--text-muted); }
.dl dd { margin: 0; color: var(--text-body); }
.mono { font-family: 'Consolas', monospace; }
.big { font-size: 18px; font-weight: 700; color: var(--text-dark); }
.actions { margin-top: 20px; }

.timeline { list-style: none; padding: 0; margin: 0; position: relative; }
.tl__item {
  padding: 16px 18px;
  background: var(--card-bg);
  border-radius: 8px;
  margin-bottom: 10px;
  border-left: 3px solid var(--card-border);
}
.tl__item--paid { border-left-color: var(--green); background: rgba(16, 185, 129, 0.06); }
.tl__item--overdue { border-left-color: var(--red); background: rgba(239, 68, 68, 0.06); }
.tl__head { display: flex; justify-content: space-between; margin-bottom: 8px; }
.tl__stage { font-weight: 600; color: var(--text-dark); }
.tl__amount { font-size: 18px; color: var(--text-dark); }
.tl__meta { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.tl__notes {
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-muted);
  padding: 6px 8px;
  background: white;
  border-radius: 4px;
}
.tl__actions { margin-top: 10px; }

.body-snapshot {
  font-family: inherit;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
  color: var(--text-body);
  background: var(--card-bg);
  padding: 16px;
  border-radius: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.loading { padding: 60px; text-align: center; color: var(--text-muted); }
</style>
