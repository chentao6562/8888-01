<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { MButton, MCard, MStatusTag } from '@mindlink/ui';
import { reportsApi, type MonthlyReport, type MonthlyReportStatus } from '@/api/reports.api';
import { customersApi, type Customer } from '@/api/customers.api';
import type { AxiosError } from 'axios';

const router = useRouter();
const rows = ref<MonthlyReport[]>([]);
const customers = ref<Customer[]>([]);
const loading = ref(false);

// 生成表单
const genCustomerId = ref('');
const genMonth = ref(defaultMonth());
const generating = ref(false);
const err = ref<string | null>(null);

async function load() {
  loading.value = true;
  try {
    rows.value = (await reportsApi.list()).data;
    customers.value = (await customersApi.list({ pageSize: 100 })).data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function generate() {
  if (!genCustomerId.value) return;
  generating.value = true;
  err.value = null;
  try {
    const res = await reportsApi.generate(genCustomerId.value, genMonth.value);
    router.push(`/reports/${res.data.id}`);
  } catch (e) {
    const ex = e as AxiosError<{ error: { message: string } }>;
    err.value = ex.response?.data?.error?.message ?? '生成失败';
  } finally {
    generating.value = false;
  }
}

function defaultMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1); // 默认上月
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function customerName(id: string): string {
  const c = customers.value.find((x) => x.id === id);
  return c?.companyName ?? id.slice(0, 8) + '…';
}

const statusLabel: Record<MonthlyReportStatus, string> = {
  drafting: '草稿',
  pending_review: '待审',
  sent: '已推送',
  read: '已读',
};

function tone(s: MonthlyReportStatus) {
  if (s === 'read') return 'green';
  if (s === 'sent') return 'cyan';
  return 'amber';
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <div>
        <h1 class="title">月度报告</h1>
        <div class="sub">共 {{ rows.length }} 份</div>
      </div>
    </header>

    <MCard padded style="margin-bottom: 16px;">
      <template #header><h3 class="h">生成新报告</h3></template>
      <div class="gen">
        <select v-model="genCustomerId" class="input">
          <option value="">选择客户</option>
          <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.companyName }}</option>
        </select>
        <input v-model="genMonth" type="month" class="input input--sm" />
        <MButton :loading="generating" :disabled="!genCustomerId" @click="generate">
          AI 生成 6 段月报
        </MButton>
      </div>
      <div v-if="err" class="err">{{ err }}</div>
    </MCard>

    <MCard padded>
      <div v-if="loading">加载中…</div>
      <div v-else-if="rows.length === 0" class="empty">暂无月报</div>
      <table v-else class="t">
        <thead>
          <tr>
            <th>月份</th>
            <th>客户</th>
            <th>状态</th>
            <th>推送时间</th>
            <th>阅读时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" @click="router.push(`/reports/${r.id}`)">
            <td class="mono">{{ r.month }}</td>
            <td>{{ customerName(r.customerId) }}</td>
            <td><MStatusTag size="sm" :tone="tone(r.status)">{{ statusLabel[r.status] }}</MStatusTag></td>
            <td>{{ r.pushedAt ? new Date(r.pushedAt).toLocaleString() : '—' }}</td>
            <td>{{ r.readAt ? new Date(r.readAt).toLocaleString() : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </MCard>
  </div>
</template>

<style scoped>
.page { padding: 24px 32px 40px; background: #F3F5FA; min-height: 100vh; }
.topbar { margin-bottom: 16px; }
.title { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-dark); }
.sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.h { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-dark); }
.gen { display: flex; gap: 10px; align-items: center; }
.input {
  padding: 8px 12px; border: 1px solid var(--card-border); border-radius: 6px;
  font-size: 13px; font-family: inherit; min-width: 200px;
}
.input--sm { min-width: 140px; }
.input:focus { outline: none; border-color: var(--cyan); }
.err { margin-top: 10px; padding: 8px 12px; background: rgba(239, 68, 68, 0.1); color: var(--red); border-radius: 6px; font-size: 12px; }
.empty { padding: 40px 0; text-align: center; color: var(--text-muted); }
.t { width: 100%; border-collapse: collapse; }
.t thead { background: var(--card-bg); }
.t th {
  text-align: left; padding: 10px 14px; font-size: 11px;
  color: var(--text-muted); font-weight: 600; text-transform: uppercase;
  border-bottom: 1px solid var(--card-border);
}
.t tbody tr { border-bottom: 1px solid var(--card-border); cursor: pointer; }
.t tbody tr:hover { background: #F0F9FF; }
.t td { padding: 14px; font-size: 13px; color: var(--text-body); }
.mono { font-family: 'Consolas', monospace; }
</style>
