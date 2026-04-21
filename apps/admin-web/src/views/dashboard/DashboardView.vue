<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { dashboardApi, type DashboardData } from '@/api/dashboard.api';
import { useAuthStore } from '@/stores/auth.store';

const router = useRouter();
const auth = useAuthStore();
const data = ref<DashboardData | null>(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    data.value = (await dashboardApi.all()).data;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 11) return 'GOOD MORNING · 早上好';
  if (h < 14) return 'GOOD NOON · 中午好';
  if (h < 18) return 'GOOD AFTERNOON · 下午好';
  return 'GOOD EVENING · 晚上好';
});

const dateDisplay = computed(() => {
  const d = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 周${weekdays[d.getDay()]} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
});

const monthProgress = computed(() => {
  const d = new Date();
  const total = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.round((d.getDate() / total) * 100);
});

function money(cents: number): string {
  const yuan = cents / 100;
  if (yuan >= 10000) return `¥ ${(yuan / 10000).toFixed(1)}万`;
  return `¥ ${yuan.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
}

function capLevelClass(level: string): string {
  if (level === 'danger') return 'cap-danger';
  if (level === 'warn') return 'cap-warn';
  return 'cap-good';
}

const roleLabel: Record<string, string> = {
  strategist: '策划',
  pm: '项目经理',
  creator: '创作者',
  adops: '投手',
  admin: '管理员',
};

function gotoCustomer(id: string) {
  router.push(`/customers/${id}`);
}

function dismissDecision(id: string) {
  if (!data.value) return;
  data.value.decisions = data.value.decisions.filter((d) => d.id !== id);
}
</script>

<template>
  <div class="dashboard-root" v-if="data">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="welcome-greeting">{{ greeting }}</div>
      <div class="welcome-title">
        {{ auth.currentUser?.name ?? '老板' }}，今日有
        <strong>{{ data.decisions.length }}</strong>
        件事需要您拍板
      </div>
      <div class="welcome-meta">
        <div>本月进度：<span class="val">{{ monthProgress }}%</span></div>
        <div>全公司健康度：<span class="val cyan">● {{ data.lights.green.count >= data.lights.red.count * 3 ? '良好' : '需关注' }}</span></div>
        <div>{{ dateDisplay }}</div>
      </div>
    </div>

    <!-- 第一行：客户红绿灯 + 团队产能 -->
    <div class="grid-main">
      <section class="card">
        <header class="card-header">
          <div class="card-title">客户状态红绿灯</div>
          <a class="card-action" @click="router.push('/customers')">查看全部 →</a>
        </header>
        <div class="traffic-lights">
          <div class="light-card light-green" @click="router.push('/customers?stage=delivering')">
            <div class="light-label"><span class="light-icon"></span>绿灯 · 续约稳</div>
            <div class="light-value">{{ data.lights.green.count }}</div>
            <div class="light-desc">健康度 85-100 分</div>
          </div>
          <div class="light-card light-yellow" @click="router.push('/customers')">
            <div class="light-label"><span class="light-icon"></span>黄灯 · 需维护</div>
            <div class="light-value">{{ data.lights.yellow.count }}</div>
            <div class="light-desc">健康度 60-84 分</div>
          </div>
          <div class="light-card light-red" @click="router.push('/customers')">
            <div class="light-label"><span class="light-icon"></span>红灯 · 高风险</div>
            <div class="light-value">{{ data.lights.red.count }}</div>
            <div class="light-desc">健康度 &lt; 60 分</div>
          </div>
        </div>
        <div class="alert-list" v-if="data.lights.red.samples.length">
          <div
            v-for="s in data.lights.red.samples"
            :key="s.id"
            class="alert-item"
            @click="gotoCustomer(s.id)"
          >
            <div class="alert-name">{{ s.name }}</div>
            <div class="alert-reason">{{ s.reason ?? '健康度偏低，建议主动介入' }}</div>
            <div class="alert-value">{{ s.score }} 分</div>
            <div class="alert-arrow">›</div>
          </div>
        </div>
        <div v-else class="alert-empty">👍 当前无红灯客户</div>
      </section>

      <section class="card">
        <header class="card-header">
          <div class="card-title">团队产能（本周）</div>
          <a class="card-action" @click="router.push('/staff')">员工管理 →</a>
        </header>
        <div class="capacity-list">
          <div v-for="r in data.capacity.byRole" :key="r.role" class="capacity-item">
            <div class="capacity-role">{{ roleLabel[r.role] ?? r.role }}</div>
            <div class="capacity-bar-wrap">
              <div :class="['capacity-bar', capLevelClass(r.level)]" :style="{ width: `${r.utilizationPct}%` }"></div>
            </div>
            <div class="capacity-percent">
              {{ r.utilizationPct }}%
              <span v-if="r.level === 'danger'" class="capacity-flag">🔴</span>
            </div>
          </div>
        </div>
        <div
          v-if="data.capacity.byRole.some((r) => r.level === 'danger')"
          class="capacity-warn"
        >
          <strong>⚠️ 有角色已满负荷</strong>
          <div>本周再接新项目需先扩编，或推迟新客户启动</div>
        </div>
      </section>
    </div>

    <!-- 第二行：本月指标 -->
    <section class="card" style="margin-bottom: 20px;">
      <header class="card-header">
        <div class="card-title">本月业务指标</div>
        <a class="card-action" @click="router.push('/analytics/company')">查看明细 →</a>
      </header>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value">{{ data.kpi.newCustomers.actual }}<span class="metric-unit">家</span></div>
          <div class="metric-label">新签客户</div>
          <div class="metric-target">目标 {{ data.kpi.newCustomers.target }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ data.kpi.renewalCustomers.actual }}<span class="metric-unit">家</span></div>
          <div class="metric-label">续约客户</div>
          <div class="metric-target">目标 {{ data.kpi.renewalCustomers.target }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" :class="{ 'metric-danger': data.kpi.churnCustomers.actual >= data.kpi.churnCustomers.redLine }">
            {{ data.kpi.churnCustomers.actual }}<span class="metric-unit">家</span>
          </div>
          <div class="metric-label">流失客户</div>
          <div class="metric-target">红线 {{ data.kpi.churnCustomers.redLine }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ data.kpi.renewalRate }}<span class="metric-unit">%</span></div>
          <div class="metric-label">续约率</div>
          <div class="metric-target">&nbsp;</div>
        </div>
        <div class="metric-card">
          <div class="metric-value mono">{{ money(data.kpi.arpuCents) }}</div>
          <div class="metric-label">客单价</div>
          <div class="metric-target">&nbsp;</div>
        </div>
      </div>
      <div class="cash-flow-card">
        <div class="cash-item">
          <div class="cash-label">本月收入</div>
          <div class="cash-value">{{ money(data.cashflow.incomeCents) }}</div>
        </div>
        <div class="cash-item">
          <div class="cash-label">本月成本</div>
          <div class="cash-value">{{ money(data.cashflow.costCents) }}</div>
        </div>
        <div class="cash-item">
          <div class="cash-label">本月净利润</div>
          <div class="cash-value cash-profit">{{ money(data.cashflow.profitCents) }}</div>
        </div>
      </div>
    </section>

    <!-- 第三行：今日 3 件决策 -->
    <section class="card">
      <header class="card-header">
        <div class="card-title">今日 {{ data.decisions.length }} 件决策</div>
        <a class="card-action" @click="load">刷新 ↻</a>
      </header>
      <div v-if="data.decisions.length === 0" class="alert-empty">
        🎉 今日无待决策事项，可以泡杯茶了
      </div>
      <div v-else class="decision-grid">
        <div
          v-for="d in data.decisions"
          :key="d.id"
          :class="['decision-card', `decision-${d.type}`]"
        >
          <div class="decision-head">
            <span :class="['decision-tag', decisionTagClass(d.type)]">
              {{ decisionTagLabel(d.type) }}
            </span>
            <button class="dismiss" @click="dismissDecision(d.id)">×</button>
          </div>
          <div class="decision-title">{{ d.title }}</div>
          <div class="decision-desc">{{ d.desc }}</div>
          <div class="decision-action">
            <button class="btn-go" @click="onDecisionAction(d)">
              {{ d.action }} →
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
  <div v-else-if="loading" class="loading">加载中…</div>
  <div v-else class="loading">加载失败</div>
</template>

<script lang="ts">
function decisionTagLabel(type: string): string {
  return ({
    'customer-red': '🔴 客户风险',
    'capacity-full': '⚠ 团队预警',
    'lead-pending': '🎯 线索超时',
    'contract-stale': '📄 合同滞后',
    'payment-overdue': '💰 付款逾期',
  } as Record<string, string>)[type] ?? '📌 待办';
}
function decisionTagClass(type: string): string {
  if (type === 'customer-red' || type === 'payment-overdue') return 'tag-urgent';
  if (type === 'capacity-full') return 'tag-review';
  return 'tag-decision';
}
function onDecisionAction(d: { type: string; refId?: string }) {
  const base = window.location.origin;
  if (d.type === 'customer-red' && d.refId) window.location.href = `${base}/customers/${d.refId}`;
  else if (d.type === 'capacity-full') window.location.href = `${base}/staff`;
  else if (d.type === 'lead-pending') window.location.href = `${base}/leads`;
  else if (d.type === 'payment-overdue') window.location.href = `${base}/contracts`;
}
export { decisionTagLabel, decisionTagClass, onDecisionAction };
</script>

<style scoped>
.dashboard-root {
  padding: 24px 32px 40px;
  background: #F3F5FA;
  min-height: 100vh;
}

/* 欢迎横幅 */
.welcome-banner {
  background: linear-gradient(135deg, #0F1B3C 0%, #1A2749 60%, #263459 100%);
  border-radius: 16px;
  padding: 24px 28px;
  color: white;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}
.welcome-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 85% 30%, rgba(56, 189, 248, 0.25), transparent 50%);
}
.welcome-greeting {
  font-size: 11px; letter-spacing: 4px;
  color: var(--cyan); margin-bottom: 8px;
  font-family: 'Inter', sans-serif; position: relative;
}
.welcome-title {
  font-size: 22px; font-weight: 600; margin-bottom: 14px;
  position: relative;
}
.welcome-title strong { color: var(--cyan); font-family: 'Inter', sans-serif; font-size: 28px; padding: 0 4px; }
.welcome-meta {
  display: flex; gap: 32px;
  font-size: 12px; color: rgba(203, 213, 225, 0.8);
  position: relative;
}
.welcome-meta .val { color: white; margin: 0 4px; font-weight: 600; }
.welcome-meta .cyan { color: var(--cyan); }

/* 2 列网格 */
.grid-main {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

/* 通用 card */
.card {
  background: white;
  border-radius: 16px;
  border: 1px solid var(--card-border);
  padding: 24px;
}
.card-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 18px;
}
.card-title { font-size: 15px; font-weight: 600; color: var(--text-dark); }
.card-action { font-size: 12px; color: var(--cyan); cursor: pointer; }
.card-action:hover { text-decoration: underline; }

/* 红绿灯 */
.traffic-lights {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
}
.light-card {
  padding: 16px 18px; border-radius: 12px;
  cursor: pointer; transition: all 0.15s;
  border: 1px solid transparent;
}
.light-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15, 27, 60, 0.08); }
.light-green { background: linear-gradient(135deg, #ECFDF5, #D1FAE5); border-color: #A7F3D0; }
.light-yellow { background: linear-gradient(135deg, #FFFBEB, #FEF3C7); border-color: #FDE68A; }
.light-red { background: linear-gradient(135deg, #FEF2F2, #FEE2E2); border-color: #FECACA; }
.light-label { font-size: 11px; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.light-icon {
  width: 8px; height: 8px; border-radius: 50%;
}
.light-green .light-icon { background: var(--green); }
.light-yellow .light-icon { background: var(--amber); }
.light-red .light-icon { background: var(--red); }
.light-value {
  font-size: 32px; font-weight: 700; font-family: 'Inter', sans-serif;
  color: var(--text-dark); line-height: 1;
}
.light-desc { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

/* 红灯客户列表 */
.alert-list {
  margin-top: 16px; display: flex; flex-direction: column; gap: 8px;
}
.alert-item {
  display: flex; align-items: center;
  padding: 10px 14px;
  background: #FFF8F8; border-left: 3px solid var(--red);
  border-radius: 4px; font-size: 12px;
  cursor: pointer; transition: all 0.15s;
}
.alert-item:hover { background: #FFF0F0; transform: translateX(2px); }
.alert-name { font-weight: 600; color: var(--text-dark); margin-right: 12px; }
.alert-reason { color: var(--text-body); flex: 1; }
.alert-value { color: var(--red); font-weight: 700; font-family: 'Inter', sans-serif; font-size: 13px; margin-right: 8px; }
.alert-arrow { color: var(--text-muted); font-size: 14px; }
.alert-empty { margin-top: 16px; padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; background: var(--card-bg); border-radius: 8px; }

/* 团队产能 */
.capacity-list { display: flex; flex-direction: column; gap: 14px; }
.capacity-item { display: flex; align-items: center; gap: 12px; }
.capacity-role { width: 70px; font-size: 13px; font-weight: 600; color: var(--text-dark); }
.capacity-bar-wrap {
  flex: 1; height: 22px;
  background: var(--card-bg);
  border-radius: 11px;
  overflow: hidden;
  position: relative;
}
.capacity-bar { height: 100%; border-radius: 11px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
.cap-good { background: linear-gradient(90deg, #6EE7B7, var(--green)); }
.cap-warn { background: linear-gradient(90deg, #FCD34D, var(--amber)); }
.cap-danger { background: linear-gradient(90deg, #FCA5A5, var(--red)); }
.capacity-percent {
  width: 62px; text-align: right;
  font-size: 13px; font-weight: 700; color: var(--text-dark);
  font-family: 'Inter', sans-serif;
}
.capacity-flag { font-size: 12px; margin-left: 4px; }
.capacity-warn {
  margin-top: 16px; padding: 12px 14px;
  background: #FFF8F8; border-radius: 8px;
  font-size: 12px; color: #991B1B;
}

/* 本月指标 */
.metric-grid {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px;
  margin-bottom: 18px;
}
.metric-card {
  text-align: center; padding: 16px 8px;
  background: var(--card-bg); border-radius: 10px;
  transition: all 0.15s;
}
.metric-card:hover { background: #E0F2FE; transform: translateY(-2px); }
.metric-value {
  font-size: 26px; font-weight: 700; color: var(--text-dark);
  font-family: 'Inter', sans-serif; line-height: 1.2;
}
.metric-value.metric-danger { color: var(--red); }
.metric-unit { font-size: 13px; font-weight: 500; color: var(--text-muted); margin-left: 2px; }
.metric-label { font-size: 12px; color: var(--text-muted); margin-top: 6px; }
.metric-target { font-size: 11px; color: var(--text-muted); margin-top: 2px; font-family: 'Inter', sans-serif; }
.mono { font-family: 'Inter', sans-serif; }

/* 现金流 */
.cash-flow-card {
  display: grid; grid-template-columns: repeat(3, 1fr);
  padding: 16px 20px;
  background: linear-gradient(90deg, var(--dark-bg), var(--dark-bg-2));
  border-radius: 12px;
  color: white;
}
.cash-item { text-align: center; border-right: 1px solid rgba(255,255,255,0.1); }
.cash-item:last-child { border-right: none; }
.cash-label { font-size: 11px; color: var(--text-light); margin-bottom: 6px; letter-spacing: 1px; }
.cash-value { font-size: 22px; font-weight: 700; font-family: 'Inter', sans-serif; }
.cash-profit { color: var(--cyan); }

/* 决策卡片 */
.decision-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;
}
.decision-card {
  padding: 16px 18px;
  background: var(--card-bg);
  border-radius: 12px;
  border-left: 4px solid var(--cyan);
  position: relative;
}
.decision-customer-red { border-left-color: var(--red); background: #FFF8F8; }
.decision-capacity-full { border-left-color: var(--amber); background: #FFFBEB; }
.decision-payment-overdue { border-left-color: var(--red); background: #FFF8F8; }
.decision-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.decision-tag {
  padding: 3px 10px; border-radius: 9999px;
  font-size: 10px; font-weight: 600; letter-spacing: 1px;
}
.tag-urgent { background: var(--red); color: white; }
.tag-review { background: var(--amber); color: white; }
.tag-decision { background: var(--cyan); color: white; }
.dismiss {
  background: none; border: none; color: var(--text-muted);
  font-size: 18px; cursor: pointer; padding: 0; line-height: 1;
}
.decision-title { font-size: 14px; font-weight: 600; color: var(--text-dark); margin-bottom: 6px; }
.decision-desc { font-size: 12px; color: var(--text-body); margin-bottom: 12px; line-height: 1.6; }
.btn-go {
  background: var(--dark-bg); color: white; border: none;
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  cursor: pointer;
}
.btn-go:hover { background: var(--dark-bg-2); }

.loading { padding: 80px; text-align: center; color: var(--text-muted); }
</style>
