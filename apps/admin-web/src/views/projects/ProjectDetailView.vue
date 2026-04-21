<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { MButton, MCard, MStatusTag } from '@mindlink/ui';
import {
  projectsApi,
  type KickoffMeeting,
  type Project,
} from '@/api/projects.api';
import { tasksApi, type Task, type TaskStatus } from '@/api/tasks.api';
import { videosApi, type Video, type VideoStatus } from '@/api/videos.api';
import type { AxiosError } from 'axios';

const route = useRoute();
const id = computed(() => route.params.id as string);

const project = ref<Project | null>(null);
const kickoffs = ref<KickoffMeeting[]>([]);
const tasks = ref<Task[]>([]);
const videos = ref<Video[]>([]);
const loading = ref(false);

type Tab = 'board' | 'tasks' | 'kickoff';
const activeTab = ref<Tab>('board');

async function load() {
  loading.value = true;
  try {
    project.value = (await projectsApi.get(id.value)).data;
    kickoffs.value = (await projectsApi.listKickoffs(id.value)).data;
    tasks.value = (await tasksApi.list({ projectId: id.value })).data;
    videos.value = (await videosApi.list({ projectId: id.value })).data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const BOARD_COLS: Array<{ status: VideoStatus; label: string }> = [
  { status: 'planning', label: '策划' },
  { status: 'shooting', label: '拍摄' },
  { status: 'editing', label: '剪辑' },
  { status: 'pending_review', label: '待审' },
  { status: 'approved', label: '通过' },
  { status: 'pending_publish', label: '待发' },
  { status: 'published', label: '已发' },
];

const videosByStatus = computed(() => {
  const map = new Map<VideoStatus, Video[]>();
  for (const col of BOARD_COLS) map.set(col.status, []);
  for (const v of videos.value) {
    const list = map.get(v.status) ?? [];
    list.push(v);
    map.set(v.status, list);
  }
  return map;
});

async function createKickoff() {
  try {
    await projectsApi.createKickoff(id.value, {
      goals: '本期项目目标（编辑我）',
      initialTasks: JSON.stringify([
        { title: '月度选题', assigneeRole: 'strategist', dueInDays: 3, type: 'plan' },
        { title: '拍摄清单', assigneeRole: 'creator', dueInDays: 7, type: 'shoot' },
      ]),
    });
    await load();
    activeTab.value = 'kickoff';
  } catch {
    alert('创建启动会失败');
  }
}

async function finalizeKickoff(k: KickoffMeeting) {
  if (!confirm('定稿启动会？此操作不可撤销，会把项目推进到 running、批量派发初始任务。')) return;
  try {
    const res = await projectsApi.finalizeKickoff(k.id);
    alert(`定稿成功 · 生成 ${res.data.tasksCreated} 条任务`);
    await load();
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '定稿失败');
  }
}

async function transitionTask(t: Task, to: TaskStatus) {
  try {
    await tasksApi.transition(t.id, to);
    await load();
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '状态跳转失败');
  }
}

const taskStatusLabel: Record<TaskStatus, string> = {
  pending: '待做',
  in_progress: '进行中',
  pending_review: '待验收',
  done: '已完成',
  rework: '返工',
  overdue: '已逾期',
};
function taskTone(s: TaskStatus) {
  if (s === 'done') return 'green';
  if (s === 'overdue' || s === 'rework') return 'red';
  if (s === 'in_progress' || s === 'pending_review') return 'cyan';
  return 'gray';
}

const statusLabel: Record<Project['status'], string> = {
  kickoff: '启动中',
  running: '进行中',
  at_risk: '风险中',
  completed: '已完成',
  aborted: '已中止',
};
</script>

<template>
  <div class="page" v-if="project">
    <header class="topbar">
      <RouterLink to="/projects" class="back">← 项目列表</RouterLink>
      <h1 class="title">{{ project.name }}</h1>
      <MStatusTag :tone="project.status === 'running' ? 'green' : project.status === 'at_risk' ? 'red' : 'cyan'">
        {{ statusLabel[project.status] }}
      </MStatusTag>
    </header>

    <nav class="tabs">
      <button
        v-for="t in (['board','tasks','kickoff'] as Tab[])"
        :key="t"
        :class="['tab', { 'tab--active': activeTab === t }]"
        @click="activeTab = t"
      >
        {{ ({board:'视频看板',tasks:'任务',kickoff:'启动会'} as Record<Tab,string>)[t] }}
      </button>
    </nav>

    <!-- 视频看板 -->
    <div v-if="activeTab === 'board'" class="board">
      <div
        v-for="col in BOARD_COLS"
        :key="col.status"
        class="col"
      >
        <div class="col__head">
          {{ col.label }}
          <span class="col__count">{{ videosByStatus.get(col.status)?.length ?? 0 }}</span>
        </div>
        <div class="col__body">
          <div
            v-for="v in videosByStatus.get(col.status) ?? []"
            :key="v.id"
            class="vcard"
          >
            <div class="vcard__title">{{ v.title }}</div>
            <div class="vcard__meta">
              {{ new Date(v.updatedAt).toLocaleDateString() }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务 -->
    <div v-else-if="activeTab === 'tasks'">
      <MCard padded>
        <template #header><h3 class="card-title">本项目任务（{{ tasks.length }} 条）</h3></template>
        <ul v-if="tasks.length" class="task-list">
          <li
            v-for="t in tasks"
            :key="t.id"
            :class="['task', `task--${t.status}`]"
          >
            <div class="task__main">
              <div class="task__title">{{ t.title }}</div>
              <div class="task__meta">
                {{ t.type }} · 到期 {{ t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '未设' }}
              </div>
            </div>
            <MStatusTag size="sm" :tone="taskTone(t.status)">
              {{ taskStatusLabel[t.status] }}
            </MStatusTag>
            <div class="task__actions">
              <MButton
                v-if="t.status === 'pending'"
                size="sm"
                variant="ghost"
                @click="transitionTask(t, 'in_progress')"
              >开始</MButton>
              <MButton
                v-if="t.status === 'in_progress'"
                size="sm"
                variant="secondary"
                @click="transitionTask(t, 'pending_review')"
              >提交验收</MButton>
              <MButton
                v-if="t.status === 'pending_review'"
                size="sm"
                @click="transitionTask(t, 'done')"
              >验收通过</MButton>
            </div>
          </li>
        </ul>
        <div v-else class="empty">暂无任务。定稿启动会可批量生成。</div>
      </MCard>
    </div>

    <!-- 启动会 -->
    <div v-else-if="activeTab === 'kickoff'">
      <div v-if="kickoffs.length === 0" class="empty">
        <MCard padded>
          暂无启动会。点击下方按钮新建。
          <div style="margin-top: 16px;">
            <MButton @click="createKickoff">新建启动会</MButton>
          </div>
        </MCard>
      </div>
      <div v-else>
        <MCard
          v-for="k in kickoffs"
          :key="k.id"
          padded
          class="kickoff"
          style="margin-bottom: 12px;"
        >
          <template #header>
            <div style="display:flex;align-items:center;gap:10px;">
              <h3 class="card-title">启动会（{{ new Date(k.createdAt ?? '').toLocaleDateString() }}）</h3>
              <MStatusTag size="sm" :tone="k.status === 'finalized' ? 'green' : 'amber'">
                {{ k.status === 'finalized' ? '已定稿' : '草稿' }}
              </MStatusTag>
            </div>
          </template>
          <template #action>
            <MButton
              v-if="k.status !== 'finalized'"
              size="sm"
              @click="finalizeKickoff(k)"
            >定稿并派任务</MButton>
          </template>
          <dl class="k-dl">
            <dt>目标</dt><dd>{{ k.goals ?? '—' }}</dd>
            <dt>排期</dt><dd>{{ k.schedule ?? '—' }}</dd>
            <dt>风险</dt><dd>{{ k.risks ?? '—' }}</dd>
            <dt>沟通机制</dt><dd>{{ k.communicationRule ?? '—' }}</dd>
          </dl>
        </MCard>
      </div>
    </div>
  </div>
  <div v-else-if="loading" class="loading">加载中…</div>
  <div v-else class="loading">项目不存在</div>
</template>

<style scoped>
.page { background: #F3F5FA; min-height: 100vh; padding-bottom: 40px; }
.topbar {
  display: flex; align-items: center; gap: 20px;
  padding: 16px 32px;
  background: white;
  border-bottom: 1px solid var(--card-border);
}
.back { color: var(--text-muted); font-size: 12px; text-decoration: none; }
.back:hover { color: var(--cyan); }
.title { margin: 0; font-size: 18px; font-weight: 700; color: var(--text-dark); flex: 1; }

.tabs {
  display: flex; gap: 4px;
  background: white;
  margin: 16px 32px;
  padding: 4px;
  border: 1px solid var(--card-border);
  border-radius: 10px;
  width: fit-content;
}
.tab {
  background: none; border: none; padding: 8px 16px; border-radius: 6px;
  font-family: inherit; font-size: 13px; cursor: pointer; color: var(--text-body);
}
.tab:hover { background: var(--card-bg); }
.tab--active { background: var(--dark-bg); color: white; font-weight: 600; }

.board {
  display: grid; grid-template-columns: repeat(7, 1fr);
  gap: 12px; padding: 0 32px;
  overflow-x: auto;
}
.col {
  background: white; border: 1px solid var(--card-border); border-radius: 10px;
  min-height: 400px; padding: 10px;
}
.col__head {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; font-weight: 600; color: var(--text-muted);
  padding: 4px 8px 10px; border-bottom: 1px solid var(--card-border);
}
.col__count {
  background: var(--card-bg); color: var(--text-body);
  padding: 1px 8px; border-radius: 10px; font-size: 11px;
}
.col__body { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; }
.vcard {
  background: var(--card-bg); padding: 10px; border-radius: 6px;
  font-size: 12px; border-left: 3px solid var(--cyan);
}
.vcard__title { font-weight: 600; color: var(--text-dark); margin-bottom: 4px; }
.vcard__meta { color: var(--text-muted); font-size: 11px; }

.card-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-dark); }
.empty { padding: 40px 32px; text-align: center; color: var(--text-muted); }

.task-list { list-style: none; padding: 0; margin: 0; }
.task {
  display: grid; grid-template-columns: 1fr auto auto;
  gap: 16px; align-items: center;
  padding: 12px 14px;
  background: var(--card-bg); border-radius: 8px; margin-bottom: 6px;
}
.task--done { opacity: 0.65; }
.task--overdue { background: rgba(239, 68, 68, 0.08); }
.task__title { font-size: 13px; font-weight: 500; color: var(--text-dark); }
.task__meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.task__actions { display: flex; gap: 6px; }

.k-dl {
  display: grid; grid-template-columns: 90px 1fr; gap: 10px 14px;
  font-size: 13px; margin: 0;
}
.k-dl dt { color: var(--text-muted); }
.k-dl dd { color: var(--text-body); margin: 0; }

.loading { padding: 60px; text-align: center; color: var(--text-muted); }

/* 外层 body container 给 board 和 tasks 加 padding */
.board, .task-list { padding: 0 32px; }
</style>
