<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { MButton, MCard, MStatusTag } from '@mindlink/ui';
import {
  contractsApi,
  type Contract,
  type ContractStatus,
} from '@/api/contracts.api';

const router = useRouter();

const rows = ref<Contract[]>([]);
const loading = ref(false);
const statusFilter = ref<ContractStatus | 'all'>('all');

const tabs: Array<{ key: ContractStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'pending_sign', label: '待签' },
  { key: 'signed', label: '已签' },
  { key: 'executing', label: '执行中' },
  { key: 'completed', label: '已完成' },
];

async function load() {
  loading.value = true;
  try {
    const s = statusFilter.value === 'all' ? undefined : statusFilter.value;
    const res = await contractsApi.list(s);
    rows.value = res.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(statusFilter, load);

function tone(s: ContractStatus) {
  if (s === 'signed' || s === 'executing') return 'green';
  if (s === 'draft' || s === 'pending_sign') return 'amber';
  if (s === 'completed') return 'cyan';
  return 'gray';
}

const statusLabel: Record<ContractStatus, string> = {
  draft: '草稿',
  pending_sign: '待签',
  signed: '已签',
  executing: '执行中',
  completed: '已完成',
  renewed: '已续约',
  terminated: '已终止',
};

const total = computed(() => rows.value.length);

function fmtMoney(cents: number) {
  return `¥ ${(cents / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <div>
        <h1 class="title">合同管理</h1>
        <div class="sub">{{ total }} 条记录</div>
      </div>
    </header>

    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="['tab', { 'tab--active': statusFilter === t.key }]"
        @click="statusFilter = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <MCard padded>
      <div v-if="loading">加载中…</div>
      <div v-else-if="rows.length === 0" class="empty">
        暂无合同 · 到客户详情页把已签字方案转合同
      </div>
      <table v-else class="t">
        <thead>
          <tr>
            <th>合同编号</th>
            <th>客户</th>
            <th>金额</th>
            <th>状态</th>
            <th>签约时间</th>
            <th>更新</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            @click="router.push(`/contracts/${row.id}`)"
          >
            <td class="mono">{{ row.contractNo }}</td>
            <td>{{ row.customerId.slice(0, 8) }}…</td>
            <td class="mono">{{ fmtMoney(row.totalAmount) }}</td>
            <td><MStatusTag size="sm" :tone="tone(row.status)">{{ statusLabel[row.status] }}</MStatusTag></td>
            <td>{{ row.signedAt ? new Date(row.signedAt).toLocaleDateString() : '—' }}</td>
            <td>{{ new Date(row.updatedAt).toLocaleDateString() }}</td>
          </tr>
        </tbody>
      </table>
    </MCard>
  </div>
</template>

<style scoped>
.page { padding: 24px 32px; background: #F3F5FA; min-height: 100vh; }
.topbar { display: flex; justify-content: space-between; margin-bottom: 16px; }
.title { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-dark); }
.sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.tabs {
  display: flex; gap: 4px;
  background: white;
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 16px;
  width: fit-content;
}
.tab {
  background: none; border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-body);
  cursor: pointer;
  font-family: inherit;
}
.tab:hover { background: var(--card-bg); }
.tab--active {
  background: var(--dark-bg); color: white; font-weight: 600;
}
.empty { padding: 60px 0; text-align: center; color: var(--text-muted); }

.t { width: 100%; border-collapse: collapse; }
.t thead { background: var(--card-bg); }
.t th {
  text-align: left;
  padding: 10px 14px;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  border-bottom: 1px solid var(--card-border);
}
.t tbody tr {
  border-bottom: 1px solid var(--card-border);
  cursor: pointer;
}
.t tbody tr:hover { background: #F0F9FF; }
.t td { padding: 14px; font-size: 13px; color: var(--text-body); }
.mono { font-family: 'Consolas', monospace; }
</style>
