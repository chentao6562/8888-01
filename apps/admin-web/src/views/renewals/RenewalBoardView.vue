<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { MButton, MCard, MStatusTag } from '@mindlink/ui';
import { renewalsApi, type Renewal } from '@/api/dashboard.api';
import { customersApi, type Customer } from '@/api/customers.api';

const router = useRouter();
const renewals = ref<Renewal[]>([]);
const customers = ref<Record<string, Customer>>({});
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const [board, custs] = await Promise.all([
      renewalsApi.board(),
      customersApi.list({ pageSize: 200 }),
    ]);
    renewals.value = board.data;
    customers.value = Object.fromEntries(custs.data.map((c) => [c.id, c]));
  } finally {
    loading.value = false;
  }
}

async function scan() {
  await renewalsApi.scan();
  await load();
}

onMounted(load);

function daysLeft(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400_000);
}

/**
 * 二维：X 轴（到期天数 0-60）· Y 轴（健康度 0-100）
 * 右下角（到期近 + 健康差）= 危险象限
 */
const matrix = computed(() => {
  return renewals.value.map((r) => {
    const c = customers.value[r.customerId];
    const days = daysLeft(r.expiresAt);
    const health = c?.healthScore ?? 70;
    const danger = days < 15 && health < 70;
    return { renewal: r, customer: c, days, health, danger };
  });
});
</script>

<template>
  <div class="page">
    <header class="topbar">
      <div>
        <h1 class="title">续约预警看板</h1>
        <div class="sub">到期前 30 天自动进入 · 共 {{ renewals.length }} 条</div>
      </div>
      <MButton variant="secondary" @click="scan">扫描到期 ↻</MButton>
    </header>

    <div v-if="loading">加载中…</div>
    <MCard v-else-if="renewals.length === 0" padded>
      <div class="empty">🎉 当前无到期客户</div>
    </MCard>
    <MCard v-else padded>
      <template #header><h3 class="h">客户矩阵（到期时间 × 健康度）</h3></template>
      <div class="matrix">
        <div
          v-for="m in matrix"
          :key="m.renewal.id"
          :class="['cell', { danger: m.danger }]"
          :style="{
            left: `${Math.min(95, Math.max(2, (m.days / 30) * 90))}%`,
            bottom: `${Math.min(95, Math.max(2, m.health))}%`,
          }"
          @click="router.push(`/renewals/${m.renewal.id}`)"
        >
          <div class="cell__name">{{ m.customer?.companyName ?? '—' }}</div>
          <div class="cell__meta">{{ m.days }}天 · {{ m.health }}分</div>
        </div>

        <div class="axis-x"><span>剩 0 天</span><span>剩 30 天</span></div>
        <div class="axis-y"><span>100</span><span>50</span><span>0</span></div>
        <div class="quadrant quad-danger">危险象限</div>
      </div>
    </MCard>

    <MCard padded style="margin-top: 16px;">
      <template #header><h3 class="h">续约详细列表</h3></template>
      <table class="t">
        <thead>
          <tr>
            <th>客户</th><th>阶段</th><th>到期</th><th>剩余天数</th><th>健康度</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in matrix" :key="m.renewal.id" @click="router.push(`/renewals/${m.renewal.id}`)">
            <td>{{ m.customer?.companyName ?? m.renewal.customerId.slice(0, 8) + '…' }}</td>
            <td>
              <MStatusTag size="sm" :tone="m.renewal.stage === 'warning' ? 'amber' : 'cyan'">
                {{ m.renewal.stage === 'warning' ? '预警' : '谈判中' }}
              </MStatusTag>
            </td>
            <td>{{ new Date(m.renewal.expiresAt).toLocaleDateString() }}</td>
            <td :class="{ red: m.days < 15 }">{{ m.days }} 天</td>
            <td :class="{ red: m.health < 60 }">{{ m.health }}</td>
          </tr>
        </tbody>
      </table>
    </MCard>
  </div>
</template>

<style scoped>
.page { padding: 24px 32px 40px; background: #F3F5FA; min-height: 100vh; }
.topbar { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
.title { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-dark); }
.sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.h { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-dark); }
.empty { padding: 60px 0; text-align: center; color: var(--text-muted); }

.matrix {
  position: relative; height: 420px;
  background:
    linear-gradient(to top, rgba(239, 68, 68, 0.05), rgba(16, 185, 129, 0.05)),
    repeating-linear-gradient(to right, transparent, transparent 19px, var(--card-border) 19px, var(--card-border) 20px),
    repeating-linear-gradient(to bottom, transparent, transparent 19px, var(--card-border) 19px, var(--card-border) 20px);
  border: 1px solid var(--card-border); border-radius: 8px;
  margin: 20px 40px 40px 50px;
}
.cell {
  position: absolute; transform: translate(-50%, 50%);
  background: white; border: 1px solid var(--card-border); border-radius: 8px;
  padding: 6px 10px; cursor: pointer; transition: all 0.15s;
  min-width: 90px; text-align: center; z-index: 2;
}
.cell:hover { border-color: var(--cyan); box-shadow: 0 4px 12px rgba(15, 27, 60, 0.1); z-index: 3; }
.cell.danger { border-color: var(--red); background: #FFF8F8; }
.cell__name { font-size: 12px; font-weight: 600; color: var(--text-dark); }
.cell__meta { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

.axis-x {
  position: absolute; left: 0; right: 0; bottom: -24px;
  display: flex; justify-content: space-between;
  font-size: 11px; color: var(--text-muted);
}
.axis-y {
  position: absolute; top: 0; bottom: 0; left: -36px;
  display: flex; flex-direction: column; justify-content: space-between;
  font-size: 11px; color: var(--text-muted);
}
.quadrant {
  position: absolute;
  bottom: 10px; left: 6px;
  font-size: 10px; color: var(--red); font-weight: 600;
}

.t { width: 100%; border-collapse: collapse; }
.t thead { background: var(--card-bg); }
.t th {
  text-align: left; padding: 10px 14px; font-size: 11px;
  color: var(--text-muted); font-weight: 600; text-transform: uppercase;
  border-bottom: 1px solid var(--card-border);
}
.t tbody tr { border-bottom: 1px solid var(--card-border); cursor: pointer; }
.t tbody tr:hover { background: #F0F9FF; }
.t td { padding: 12px 14px; font-size: 13px; color: var(--text-body); }
.t .red { color: var(--red); font-weight: 600; }
</style>
