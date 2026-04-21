<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { MCard, MStatusTag } from '@mindlink/ui';
import { projectsApi, type Project, type ProjectStatus } from '@/api/projects.api';

const router = useRouter();
const rows = ref<Project[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const res = await projectsApi.list();
    rows.value = res.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const statusLabel: Record<ProjectStatus, string> = {
  kickoff: '启动中',
  running: '进行中',
  at_risk: '风险中',
  completed: '已完成',
  aborted: '已中止',
};

function tone(s: ProjectStatus) {
  if (s === 'running') return 'green';
  if (s === 'at_risk') return 'red';
  if (s === 'kickoff') return 'cyan';
  if (s === 'completed') return 'purple';
  return 'gray';
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1 class="title">项目管理</h1>
    </header>

    <div v-if="loading">加载中…</div>
    <div v-else-if="rows.length === 0" class="empty">
      <MCard padded>暂无项目。合同签字后在合同详情页"创建项目"。</MCard>
    </div>

    <div v-else class="grid">
      <MCard
        v-for="row in rows"
        :key="row.id"
        padded
        class="proj"
        @click="router.push(`/projects/${row.id}`)"
      >
        <template #header>
          <div class="proj__head">
            <span class="proj__name">{{ row.name }}</span>
            <MStatusTag size="sm" :tone="tone(row.status)">{{ statusLabel[row.status] }}</MStatusTag>
          </div>
        </template>
        <dl class="proj__dl">
          <dt>客户</dt><dd>{{ row.customerId.slice(0, 8) }}…</dd>
          <dt>方案</dt><dd>{{ row.plan }}</dd>
          <dt>开始</dt><dd>{{ row.startAt ? new Date(row.startAt).toLocaleDateString() : '—' }}</dd>
          <dt>结束</dt><dd>{{ row.endAt ? new Date(row.endAt).toLocaleDateString() : '—' }}</dd>
        </dl>
      </MCard>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 24px 32px; background: #F3F5FA; min-height: 100vh; }
.topbar { margin-bottom: 16px; }
.title { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-dark); }
.empty { }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.proj { cursor: pointer; transition: all 0.15s; }
.proj:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15, 27, 60, 0.1); }
.proj__head { display: flex; align-items: center; justify-content: space-between; }
.proj__name { font-size: 15px; font-weight: 600; color: var(--text-dark); }
.proj__dl {
  display: grid; grid-template-columns: 70px 1fr;
  gap: 6px 12px; font-size: 12px; margin: 0;
}
.proj__dl dt { color: var(--text-muted); }
.proj__dl dd { color: var(--text-body); margin: 0; }
</style>
