<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { MCard } from '@mindlink/ui';
import { analyticsApi } from '@/api/reports.api';

type Data = Awaited<ReturnType<typeof analyticsApi.company>>['data'];
const data = ref<Data | null>(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    data.value = (await analyticsApi.company()).data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const STAGE_COLOR: Record<string, string> = {
  lead: '#F59E0B', diagnosing: '#3B82F6', proposing: '#6366F1',
  signed: '#8B5CF6', delivering: '#10B981', reviewing: '#06B6D4',
  renewing: '#EC4899', churned: '#64748B',
};
const STAGE_LABEL: Record<string, string> = {
  lead: 'S1 线索', diagnosing: 'S2 诊断', proposing: 'S3 方案',
  signed: 'S4 签约', delivering: 'S5 交付', reviewing: 'S6 复盘',
  renewing: 'S7 续约', churned: '流失',
};

function money(cents: number): string {
  return `¥ ${(cents / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1 class="title">公司层分析</h1>
    </header>

    <div v-if="loading">加载中…</div>
    <div v-else-if="data" class="grid">
      <MCard padded>
        <template #header><h3 class="h">客户概况</h3></template>
        <div class="big">
          <div class="big__num">{{ data.customers.total }}</div>
          <div class="big__label">总客户数</div>
        </div>
        <div class="mid">
          <div>活跃（交付中/复盘/续约）<strong>{{ data.customers.active }}</strong></div>
          <div>合同签约总数 <strong>{{ data.contracts.signed }} / {{ data.contracts.total }}</strong></div>
        </div>
      </MCard>

      <MCard padded>
        <template #header><h3 class="h">生命周期分布</h3></template>
        <ul class="stages">
          <li v-for="(count, stage) in data.customers.byStage" :key="stage">
            <span class="stage__dot" :style="{ background: STAGE_COLOR[stage] ?? '#CBD5E1' }"></span>
            <span class="stage__name">{{ STAGE_LABEL[stage] ?? stage }}</span>
            <span class="stage__count">{{ count }}</span>
            <div class="stage__bar">
              <div
                class="stage__fill"
                :style="{
                  width: `${(Number(count) / Math.max(1, data.customers.total)) * 100}%`,
                  background: STAGE_COLOR[stage] ?? '#CBD5E1',
                }"
              ></div>
            </div>
          </li>
        </ul>
      </MCard>

      <MCard padded>
        <template #header><h3 class="h">本月现金流</h3></template>
        <div class="big">
          <div class="big__num mono">{{ money(data.thisMonth.incomeCents) }}</div>
          <div class="big__label">本月已收款</div>
        </div>
      </MCard>

      <MCard padded>
        <template #header><h3 class="h">风险</h3></template>
        <div class="big">
          <div class="big__num" :style="{ color: data.tasks.overdue > 0 ? 'var(--red)' : 'var(--text-dark)' }">
            {{ data.tasks.overdue }}
          </div>
          <div class="big__label">已逾期任务</div>
        </div>
      </MCard>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 24px 32px 40px; background: #F3F5FA; min-height: 100vh; }
.topbar { margin-bottom: 16px; }
.title { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-dark); }
.h { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-dark); }

.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }

.big { text-align: center; padding: 20px 0; }
.big__num { font-family: 'Inter', sans-serif; font-size: 44px; font-weight: 700; color: var(--text-dark); }
.big__label { font-size: 12px; color: var(--text-muted); margin-top: 6px; }
.mid { display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: var(--text-body); }
.mid strong { color: var(--text-dark); font-family: 'Inter', sans-serif; }

.stages { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.stages li { display: grid; grid-template-columns: auto auto auto 1fr; gap: 10px; align-items: center; font-size: 13px; }
.stage__dot { width: 8px; height: 8px; border-radius: 50%; }
.stage__name { color: var(--text-body); }
.stage__count { color: var(--text-muted); font-family: 'Inter', sans-serif; }
.stage__bar { height: 6px; background: var(--card-bg); border-radius: 3px; overflow: hidden; }
.stage__fill { height: 100%; transition: width 300ms; }
.mono { font-family: 'Inter', sans-serif; }
</style>
