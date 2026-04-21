<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { MButton, MCard } from '@mindlink/ui';
import CustomerNewModal from '../customers/CustomerNewModal.vue';
import { customersApi, type Customer } from '@/api/customers.api';
import { http } from '@/api/http';
import type { AxiosError } from 'axios';

const router = useRouter();

const rows = ref<Customer[]>([]);
const loading = ref(false);
const showNewModal = ref(false);

async function load() {
  loading.value = true;
  try {
    const res = await customersApi.list({ stage: 'lead', pageSize: 100 });
    rows.value = res.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function onConvert(row: Customer) {
  if (!confirm(`确认转诊断？「${row.companyName}」将进入 S2 诊断阶段。`)) return;
  try {
    await http.post(`/leads/${row.id}/convert`, {});
    router.push(`/diagnosis/${row.id}`);
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '转诊断失败');
  }
}

async function onArchive(row: Customer) {
  if (!confirm(`确认淘汰？此操作将把客户移入流失档案。`)) return;
  try {
    await http.post(`/leads/${row.id}/archive`, {});
    await load();
  } catch {
    alert('归档失败');
  }
}

function onNewCreated(c: Customer) {
  showNewModal.value = false;
  rows.value.unshift(c);
}

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

const stats = computed(() => ({
  total: rows.value.length,
  lateContact: rows.value.filter(
    (r) =>
      !r.lastContactAt ||
      Date.now() - new Date(r.lastContactAt).getTime() > 24 * 3600_000,
  ).length,
}));

function budgetLabel(b: string): string {
  return (
    {
      lt_5k: '< 5k',
      '5k_10k': '5-10k',
      '10k_30k': '10-30k',
      gt_30k: '> 30k',
      unknown: '未知',
    } as Record<string, string>
  )[b] ?? b;
}
</script>

<template>
  <div class="leads">
    <header class="topbar">
      <div>
        <div class="topbar__title">线索池 (S1)</div>
        <div class="topbar__sub">
          共 {{ stats.total }} 条 · 超 24h 未跟进 <span style="color: var(--red);">{{ stats.lateContact }}</span> 条
        </div>
      </div>
      <MButton @click="showNewModal = true">+ 新增线索</MButton>
    </header>

    <MCard padded>
      <template #header>
        <h3 class="title">待处理线索</h3>
      </template>
      <div v-if="loading">加载中…</div>
      <div v-else-if="rows.length === 0" class="empty">暂无线索。点击右上角「+ 新增线索」。</div>
      <ul v-else class="list">
        <li v-for="row in rows" :key="row.id" class="item">
          <div class="item__left">
            <div class="item__name">{{ row.companyName }}</div>
            <div class="item__meta">
              {{ row.industry }} · {{ row.bossName }} · {{ row.bossPhone }}
              · 预算 {{ budgetLabel(row.budgetHint) }}
              · 来源 {{ row.source }}
            </div>
          </div>
          <div class="item__mid">
            <div class="age" :class="{ 'age--late': !row.lastContactAt }">
              {{ formatAge(row.lastContactAt ?? row.createdAt) }}
            </div>
          </div>
          <div class="item__actions">
            <MButton size="sm" variant="secondary" @click="router.push(`/customers/${row.id}`)">
              查看详情
            </MButton>
            <MButton size="sm" @click="onConvert(row)">转诊断 →</MButton>
            <button class="btn-ghost" @click="onArchive(row)">淘汰</button>
          </div>
        </li>
      </ul>
    </MCard>

    <CustomerNewModal v-model="showNewModal" @created="onNewCreated" />
  </div>
</template>

<style scoped>
.leads {
  padding: 24px 32px 40px;
  background: #F3F5FA;
  min-height: 100vh;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
}
.topbar__title { font-size: 20px; font-weight: 700; color: var(--text-dark); }
.topbar__sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.title { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-dark); }
.empty { padding: 60px 0; text-align: center; color: var(--text-muted); }
.list { list-style: none; padding: 0; margin: 0; }
.item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px;
  border-bottom: 1px solid var(--card-border);
}
.item:last-child { border-bottom: none; }
.item__left { flex: 1; min-width: 0; }
.item__name { font-size: 14px; font-weight: 600; color: var(--text-dark); margin-bottom: 4px; }
.item__meta { font-size: 12px; color: var(--text-muted); }
.item__mid { flex: 0 0 120px; text-align: center; }
.age { font-size: 12px; color: var(--text-muted); }
.age--late { color: var(--red); font-weight: 600; }
.item__actions { display: flex; gap: 6px; align-items: center; }
.btn-ghost {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 0 4px;
}
.btn-ghost:hover { color: var(--red); }
</style>
