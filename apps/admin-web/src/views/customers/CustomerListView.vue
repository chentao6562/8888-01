<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { MButton } from '@mindlink/ui';
import CustomerNewModal from './CustomerNewModal.vue';
import { customersApi, type Customer, type StageCounts } from '@/api/customers.api';
import {
  STAGE_DOT_COLOR,
  STAGE_LABELS,
  STAGE_ORDER,
  type CustomerStage,
} from '@/api/types';

const router = useRouter();

const rows = ref<Customer[]>([]);
const counts = ref<StageCounts | null>(null);
const stageFilter = ref<CustomerStage | 'all'>('all');
const searchKw = ref('');
const loading = ref(false);
const showNewModal = ref(false);

async function load() {
  loading.value = true;
  try {
    const stage = stageFilter.value === 'all' ? undefined : stageFilter.value;
    const [listRes, countRes] = await Promise.all([
      customersApi.list({ stage, search: searchKw.value || undefined, pageSize: 100 }),
      customersApi.stageCounts(),
    ]);
    rows.value = listRes.data;
    counts.value = countRes.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch([stageFilter], load);

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchKw, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(load, 300);
});

function onNewCreated(customer: Customer) {
  showNewModal.value = false;
  router.push(`/customers/${customer.id}`);
}

function openDetail(id: string) {
  router.push(`/customers/${id}`);
}

function stageTagClass(stage: CustomerStage) {
  const map: Record<CustomerStage, string> = {
    lead: 'stage-s1',
    diagnosing: 'stage-s2',
    proposing: 'stage-s3',
    signed: 'stage-s4',
    delivering: 'stage-s5',
    reviewing: 'stage-s6',
    renewing: 'stage-s7',
    churned: 'stage-ch',
  };
  return ['stage-tag', map[stage]];
}

function healthTone(score: number): 'good' | 'warn' | 'bad' {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warn';
  return 'bad';
}

function firstChar(name: string): string {
  return (name[0] ?? '?').toUpperCase();
}

/** 7 种头像色循环 */
const AVATAR_COLORS = [
  'avatar-blue',
  'avatar-orange',
  'avatar-green',
  'avatar-pink',
  'avatar-purple',
  'avatar-cyan',
  'avatar-indigo',
];
function avatarColor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 3600_000) return `${Math.max(1, Math.round(diff / 60_000))} 分钟前`;
  if (diff < 86400_000) return `${Math.round(diff / 3600_000)} 小时前`;
  if (diff < 7 * 86400_000) return `${Math.round(diff / 86400_000)} 天前`;
  return d.toLocaleDateString();
}

const kpiItems = computed(() => {
  const byStage = counts.value?.byStage ?? ({} as Record<CustomerStage, number>);
  return [
    { key: 'all' as const, label: '全部客户', value: counts.value?.total ?? 0 },
    ...STAGE_ORDER.map((s) => ({
      key: s,
      label: STAGE_LABELS[s],
      dot: STAGE_DOT_COLOR[s],
      value: byStage[s] ?? 0,
    })),
  ];
});
</script>

<template>
  <div class="page-body">
    <!-- topbar -->
    <div class="topbar">
      <div class="topbar-left">
        <div class="page-title">客户管理</div>
        <div class="page-subtitle">所有客户 · 按生命周期 7 阶段管理</div>
      </div>
      <div class="topbar-right">
        <MButton variant="secondary">📥 导出</MButton>
        <MButton @click="showNewModal = true">+ 新建客户</MButton>
      </div>
    </div>

    <!-- KPI 条 -->
    <div class="kpi-bar">
      <div
        v-for="item in kpiItems"
        :key="item.key"
        :class="['kpi-item', { active: stageFilter === item.key }]"
        @click="stageFilter = item.key"
      >
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-label">
          <span v-if="'dot' in item && item.dot" class="kpi-dot" :style="{ background: item.dot }" />
          {{ item.label }}
        </div>
      </div>
    </div>

    <!-- 工具条 -->
    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchKw"
          type="text"
          class="search-input"
          placeholder="搜索客户名称 / 行业 / 老板"
        />
      </div>
      <div class="toolbar-divider"></div>
      <div :class="['filter-chip', !searchKw && 'active']">所有行业</div>
      <div class="filter-chip">餐饮</div>
      <div class="filter-chip">美业</div>
      <div class="filter-chip">零售</div>
      <div class="filter-chip">教培</div>
    </div>

    <!-- 表格 -->
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th style="width: 26%;">客户</th>
            <th>阶段</th>
            <th>健康度</th>
            <th>合同金额</th>
            <th>来源</th>
            <th>负责人</th>
            <th>最近互动</th>
            <th style="text-align: right;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="empty">加载中…</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="8" class="empty">暂无客户 · 点击右上角「+ 新建客户」开始</td>
          </tr>
          <tr
            v-for="row in rows"
            v-else
            :key="row.id"
            @click="openDetail(row.id)"
          >
            <td>
              <div class="cust-cell">
                <div :class="['cust-avatar', avatarColor(row.id)]">{{ firstChar(row.bossName || row.companyName) }}</div>
                <div class="cust-info">
                  <div class="cust-name">{{ row.companyName }}</div>
                  <div class="cust-meta">{{ row.industry }} · {{ row.bossName }} · {{ row.region ?? '—' }}</div>
                </div>
              </div>
            </td>
            <td><span :class="stageTagClass(row.stage)">{{ STAGE_LABELS[row.stage] }}</span></td>
            <td>
              <div class="health-score">
                <div class="health-bar">
                  <div :class="['health-fill', `fill-${healthTone(row.healthScore)}`]" :style="{ width: `${row.healthScore}%` }"></div>
                </div>
                <span :class="['health-num', `num-${healthTone(row.healthScore)}`]">{{ row.healthScore }}</span>
              </div>
            </td>
            <td>
              <span class="money">
                {{ row.stage === 'lead' || row.stage === 'diagnosing' ? '待定' : '¥ —' }}
              </span>
            </td>
            <td>{{ row.source }}</td>
            <td>{{ row.pmId ? 'PM' : row.strategistId ? '策划' : '未分配' }}</td>
            <td>{{ formatTime(row.lastContactAt ?? row.updatedAt) }}</td>
            <td class="action-cell" @click.stop>
              <button class="icon-btn" title="查看" @click="openDetail(row.id)">👁</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <CustomerNewModal v-model="showNewModal" @created="onNewCreated" />
  </div>
</template>

<style scoped>
.page-body {
  padding: 0 0 40px;
  background: #F3F5FA;
  min-height: 100vh;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: white;
  border-bottom: 1px solid var(--card-border);
  margin-bottom: 24px;
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-dark);
}
.page-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  padding-left: 16px;
  border-left: 1px solid var(--card-border);
}
.topbar-right {
  display: flex;
  gap: 12px;
}

/* KPI bar */
.kpi-bar {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0;
  background: white;
  border: 1px solid var(--card-border);
  border-radius: 12px;
  overflow: hidden;
  margin: 0 32px 20px;
}
.kpi-item {
  padding: 16px 12px;
  text-align: center;
  border-right: 1px solid var(--card-border);
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
}
.kpi-item:last-child { border-right: none; }
.kpi-item:hover { background: #F0F9FF; }
.kpi-item.active { background: linear-gradient(135deg, #E0F2FE, white); }
.kpi-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 3px;
  background: var(--cyan);
  border-radius: 3px 3px 0 0;
}
.kpi-value {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-dark);
  line-height: 1;
}
.kpi-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 6px;
}
.kpi-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}

/* toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 32px 16px;
  background: white;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--card-border);
}
.search-box {
  flex: 1;
  max-width: 340px;
  position: relative;
}
.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--card-bg);
  font-family: inherit;
}
.search-input:focus {
  outline: none;
  border-color: var(--cyan);
  background: white;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.1);
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}
.filter-chip {
  padding: 7px 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-body);
  cursor: pointer;
  transition: all 0.15s;
}
.filter-chip:hover { border-color: var(--cyan); color: var(--cyan); }
.filter-chip.active {
  background: rgba(56, 189, 248, 0.1);
  border-color: var(--cyan);
  color: var(--cyan);
  font-weight: 600;
}
.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--card-border);
  margin: 0 4px;
}

/* 表格 */
.table-wrapper {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--card-border);
  overflow: hidden;
  margin: 0 32px;
}
table { width: 100%; border-collapse: collapse; }
thead { background: var(--card-bg); }
thead th {
  text-align: left;
  padding: 12px 16px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--card-border);
  text-transform: uppercase;
}
tbody tr {
  border-bottom: 1px solid var(--card-border);
  cursor: pointer;
  transition: background 0.12s;
}
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: #F0F9FF; }
tbody td {
  padding: 14px 16px;
  font-size: 13px;
  color: var(--text-body);
  vertical-align: middle;
}
.empty { text-align: center; padding: 60px 0; color: var(--text-muted); }

.cust-cell { display: flex; align-items: center; gap: 12px; }
.cust-avatar {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}
.avatar-blue { background: linear-gradient(135deg, #60A5FA, #3B82F6); }
.avatar-purple { background: linear-gradient(135deg, #A78BFA, #8B5CF6); }
.avatar-pink { background: linear-gradient(135deg, #F472B6, #EC4899); }
.avatar-green { background: linear-gradient(135deg, #34D399, #10B981); }
.avatar-orange { background: linear-gradient(135deg, #FB923C, #F97316); }
.avatar-cyan { background: linear-gradient(135deg, #22D3EE, #06B6D4); }
.avatar-indigo { background: linear-gradient(135deg, #818CF8, #6366F1); }
.cust-info { flex: 1; min-width: 0; }
.cust-name { font-size: 14px; font-weight: 600; color: var(--text-dark); margin-bottom: 2px; }
.cust-meta { font-size: 11px; color: var(--text-muted); }

/* stage tag */
.stage-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.stage-tag::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.stage-s1 { background: #FEF3C7; color: #92400E; }
.stage-s1::before { background: #F59E0B; }
.stage-s2 { background: #DBEAFE; color: #1E40AF; }
.stage-s2::before { background: #3B82F6; }
.stage-s3 { background: #E0E7FF; color: #3730A3; }
.stage-s3::before { background: #6366F1; }
.stage-s4 { background: #EDE9FE; color: #5B21B6; }
.stage-s4::before { background: #8B5CF6; }
.stage-s5 { background: #D1FAE5; color: #065F46; }
.stage-s5::before { background: #10B981; }
.stage-s6 { background: #CFFAFE; color: #155E75; }
.stage-s6::before { background: #06B6D4; }
.stage-s7 { background: #FCE7F3; color: #9F1239; }
.stage-s7::before { background: #EC4899; }
.stage-ch { background: #F1F5F9; color: #64748B; }
.stage-ch::before { background: #64748B; }

.health-score { display: inline-flex; align-items: center; gap: 8px; }
.health-bar {
  width: 60px;
  height: 6px;
  background: var(--card-bg);
  border-radius: 3px;
  overflow: hidden;
}
.health-fill { height: 100%; border-radius: 3px; }
.fill-good { background: linear-gradient(90deg, #6EE7B7, #10B981); }
.fill-warn { background: linear-gradient(90deg, #FCD34D, #F59E0B); }
.fill-bad { background: linear-gradient(90deg, #FCA5A5, #EF4444); }
.health-num { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13px; }
.num-good { color: #10B981; }
.num-warn { color: #F59E0B; }
.num-bad { color: #EF4444; }

.money { font-family: 'Inter', sans-serif; font-weight: 600; color: var(--text-dark); }

.action-cell { text-align: right; }
.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  background: white;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-muted);
}
.icon-btn:hover { border-color: var(--cyan); color: var(--cyan); }
</style>
