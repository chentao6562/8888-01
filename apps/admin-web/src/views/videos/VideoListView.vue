<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { MCard, MStatusTag } from '@mindlink/ui';
import { videosApi, type Video, type VideoStatus } from '@/api/videos.api';

const router = useRouter();
const rows = ref<Video[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    rows.value = (await videosApi.list()).data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const statusLabel: Record<VideoStatus, string> = {
  planning: '策划中',
  shooting: '拍摄中',
  editing: '剪辑中',
  pending_review: '待审',
  approved: '已通过',
  minor_change: '小改',
  reshoot: '重拍',
  pending_publish: '待发布',
  published: '已发布',
  offline: '已下架',
};

function tone(s: VideoStatus) {
  if (s === 'published' || s === 'approved') return 'green';
  if (s === 'minor_change' || s === 'reshoot' || s === 'offline') return 'red';
  if (s === 'pending_review' || s === 'pending_publish') return 'cyan';
  return 'gray';
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <h1 class="title">视频列表</h1>
    </header>
    <MCard padded>
      <div v-if="loading">加载中…</div>
      <div v-else-if="rows.length === 0" class="empty">
        暂无视频。在项目详情页「视频看板」策划会创建。
      </div>
      <ul v-else class="list">
        <li
          v-for="v in rows"
          :key="v.id"
          class="row"
          @click="router.push(`/projects/${v.projectId}`)"
        >
          <div class="row__main">
            <div class="row__title">{{ v.title }}</div>
            <div class="row__meta">
              项目 {{ v.projectId.slice(0, 8) }}… · 更新 {{ new Date(v.updatedAt).toLocaleDateString() }}
            </div>
          </div>
          <MStatusTag size="sm" :tone="tone(v.status)">{{ statusLabel[v.status] }}</MStatusTag>
        </li>
      </ul>
    </MCard>
  </div>
</template>

<style scoped>
.page { padding: 24px 32px; background: #F3F5FA; min-height: 100vh; }
.topbar { margin-bottom: 16px; }
.title { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-dark); }
.empty { padding: 40px 0; text-align: center; color: var(--text-muted); }
.list { list-style: none; padding: 0; margin: 0; }
.row {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--card-border);
  cursor: pointer;
}
.row:last-child { border-bottom: none; }
.row:hover { background: #F0F9FF; }
.row__title { font-size: 14px; font-weight: 500; color: var(--text-dark); }
.row__meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
</style>
