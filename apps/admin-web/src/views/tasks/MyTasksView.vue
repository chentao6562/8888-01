<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { MButton, MCard, MStatusTag } from '@mindlink/ui';
import { tasksApi, type Task, type TaskStatus } from '@/api/tasks.api';
import type { AxiosError } from 'axios';

const rows = ref<Task[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const res = await tasksApi.mine();
    rows.value = res.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function transition(t: Task, to: TaskStatus) {
  try {
    await tasksApi.transition(t.id, to);
    await load();
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '状态跳转失败');
  }
}

const grouped = computed(() => {
  const now = Date.now();
  const today: Task[] = [];
  const week: Task[] = [];
  const overdue: Task[] = [];
  const done: Task[] = [];
  for (const t of rows.value) {
    if (t.status === 'done') { done.push(t); continue; }
    if (t.status === 'overdue') { overdue.push(t); continue; }
    if (!t.dueAt) { week.push(t); continue; }
    const diff = new Date(t.dueAt).getTime() - now;
    if (diff < 0) overdue.push(t);
    else if (diff < 86400_000) today.push(t);
    else week.push(t);
  }
  return { today, week, overdue, done };
});

const taskStatusLabel: Record<TaskStatus, string> = {
  pending: '待做',
  in_progress: '进行中',
  pending_review: '待验收',
  done: '已完成',
  rework: '返工',
  overdue: '已逾期',
};

function tone(s: TaskStatus) {
  if (s === 'done') return 'green';
  if (s === 'overdue' || s === 'rework') return 'red';
  if (s === 'in_progress' || s === 'pending_review') return 'cyan';
  return 'gray';
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1 class="title">我的任务</h1>
      <div class="sub">共 {{ rows.length }} 条</div>
    </header>

    <div class="sections">
      <MCard padded>
        <template #header><h3 class="h">🔥 已逾期 · {{ grouped.overdue.length }}</h3></template>
        <div v-if="grouped.overdue.length === 0" class="empty">无</div>
        <ul v-else class="task-list">
          <li v-for="t in grouped.overdue" :key="t.id" :class="['task', `task--${t.status}`]">
            <div class="task__main">
              <div class="task__title">{{ t.title }}</div>
              <div class="task__meta">
                {{ t.type }} · 到期 {{ t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '未设' }}
              </div>
            </div>
            <MStatusTag size="sm" :tone="tone(t.status)">{{ taskStatusLabel[t.status] }}</MStatusTag>
            <div class="task__actions">
              <MButton size="sm" @click="transition(t, 'in_progress')">处理</MButton>
            </div>
          </li>
        </ul>
      </MCard>

      <MCard padded>
        <template #header><h3 class="h">⏰ 今日 · {{ grouped.today.length }}</h3></template>
        <div v-if="grouped.today.length === 0" class="empty">今日无紧迫任务</div>
        <ul v-else class="task-list">
          <li v-for="t in grouped.today" :key="t.id" :class="['task', `task--${t.status}`]">
            <div class="task__main">
              <div class="task__title">{{ t.title }}</div>
              <div class="task__meta">{{ t.type }}</div>
            </div>
            <MStatusTag size="sm" :tone="tone(t.status)">{{ taskStatusLabel[t.status] }}</MStatusTag>
            <div class="task__actions">
              <MButton
                v-if="t.status === 'pending'"
                size="sm" variant="ghost"
                @click="transition(t, 'in_progress')"
              >开始</MButton>
              <MButton
                v-if="t.status === 'in_progress'"
                size="sm" variant="secondary"
                @click="transition(t, 'pending_review')"
              >提交验收</MButton>
            </div>
          </li>
        </ul>
      </MCard>

      <MCard padded>
        <template #header><h3 class="h">📅 本周 · {{ grouped.week.length }}</h3></template>
        <div v-if="grouped.week.length === 0" class="empty">本周无其他任务</div>
        <ul v-else class="task-list">
          <li v-for="t in grouped.week" :key="t.id" :class="['task', `task--${t.status}`]">
            <div class="task__main">
              <div class="task__title">{{ t.title }}</div>
              <div class="task__meta">
                {{ t.type }} · {{ t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '—' }}
              </div>
            </div>
            <MStatusTag size="sm" :tone="tone(t.status)">{{ taskStatusLabel[t.status] }}</MStatusTag>
            <div class="task__actions">
              <MButton
                v-if="t.status === 'pending'"
                size="sm" variant="ghost"
                @click="transition(t, 'in_progress')"
              >开始</MButton>
            </div>
          </li>
        </ul>
      </MCard>

      <MCard padded>
        <template #header><h3 class="h">✅ 已完成 · {{ grouped.done.length }}</h3></template>
        <ul v-if="grouped.done.length" class="task-list task-list--compact">
          <li v-for="t in grouped.done.slice(0, 10)" :key="t.id" class="task task--done">
            <div class="task__main">
              <div class="task__title">{{ t.title }}</div>
              <div class="task__meta">
                完成于 {{ t.completedAt ? new Date(t.completedAt).toLocaleDateString() : '—' }}
              </div>
            </div>
          </li>
        </ul>
        <div v-else class="empty">暂无已完成</div>
      </MCard>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 24px 32px; background: #F3F5FA; min-height: 100vh; }
.topbar { display: flex; align-items: baseline; gap: 16px; margin-bottom: 16px; }
.title { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-dark); }
.sub { font-size: 12px; color: var(--text-muted); }

.sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 16px;
}

.h { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-dark); }
.empty { padding: 20px 0; text-align: center; color: var(--text-muted); font-size: 13px; }
.task-list { list-style: none; padding: 0; margin: 0; }
.task-list--compact .task { padding: 8px 12px; }
.task {
  display: grid; grid-template-columns: 1fr auto auto; gap: 12px;
  align-items: center;
  padding: 12px 14px;
  background: var(--card-bg);
  border-radius: 8px;
  margin-bottom: 6px;
}
.task--done { opacity: 0.65; }
.task--overdue { background: rgba(239, 68, 68, 0.08); }
.task__title { font-size: 13px; font-weight: 500; color: var(--text-dark); }
.task__meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.task__actions { display: flex; gap: 6px; }
</style>
