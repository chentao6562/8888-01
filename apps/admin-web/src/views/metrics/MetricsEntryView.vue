<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { MButton, MCard } from '@mindlink/ui';
import { videosApi, type Video } from '@/api/videos.api';
import { metricsApi, type VideoMetric } from '@/api/reports.api';
import type { AxiosError } from 'axios';

const videos = ref<Video[]>([]);
const videoId = ref('');
const history = ref<VideoMetric[]>([]);
const form = ref({
  platform: '抖音',
  date: new Date().toISOString().slice(0, 10),
  plays: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  collections: 0,
  adSpend: 0,
  roi: 1,
});
const saving = ref(false);
const msg = ref<{ tone: 'ok' | 'err'; text: string } | null>(null);

async function loadVideos() {
  videos.value = (await videosApi.list()).data;
  if (videos.value.length && !videoId.value) videoId.value = videos.value[0].id;
}

async function loadHistory() {
  if (!videoId.value) { history.value = []; return; }
  history.value = (await metricsApi.byVideo(videoId.value)).data;
}

onMounted(async () => {
  await loadVideos();
  await loadHistory();
});

watch(videoId, loadHistory);

async function submit() {
  if (!videoId.value) return;
  saving.value = true;
  msg.value = null;
  try {
    await metricsApi.upsert(videoId.value, {
      platform: form.value.platform,
      date: form.value.date,
      plays: Number(form.value.plays),
      likes: Number(form.value.likes),
      comments: Number(form.value.comments),
      shares: Number(form.value.shares),
      collections: Number(form.value.collections),
      adSpend: Number(form.value.adSpend),
      roi: Number(form.value.roi),
    });
    msg.value = { tone: 'ok', text: '已录入' };
    await loadHistory();
  } catch (e) {
    const ex = e as AxiosError<{ error: { message: string } }>;
    msg.value = { tone: 'err', text: ex.response?.data?.error?.message ?? '录入失败' };
  } finally {
    saving.value = false;
  }
}

const selectedVideo = computed(() => videos.value.find((v) => v.id === videoId.value));
</script>

<template>
  <div class="page">
    <header class="topbar">
      <div>
        <h1 class="title">数据录入</h1>
        <div class="sub">MVP 手工录入 · V2 接开放平台自动采集</div>
      </div>
    </header>

    <div class="grid">
      <MCard padded>
        <template #header><h3 class="h">录入表单</h3></template>
        <label class="label">视频</label>
        <select v-model="videoId" class="input">
          <option value="">选择视频</option>
          <option v-for="v in videos" :key="v.id" :value="v.id">
            {{ v.title }} · {{ v.status }}
          </option>
        </select>

        <div class="row">
          <div class="field">
            <label class="label">平台</label>
            <select v-model="form.platform" class="input">
              <option>抖音</option>
              <option>视频号</option>
              <option>小红书</option>
              <option>快手</option>
            </select>
          </div>
          <div class="field">
            <label class="label">日期</label>
            <input v-model="form.date" type="date" class="input" />
          </div>
        </div>

        <div class="row">
          <div class="field"><label class="label">播放</label><input v-model.number="form.plays" type="number" class="input" /></div>
          <div class="field"><label class="label">点赞</label><input v-model.number="form.likes" type="number" class="input" /></div>
        </div>
        <div class="row">
          <div class="field"><label class="label">评论</label><input v-model.number="form.comments" type="number" class="input" /></div>
          <div class="field"><label class="label">分享</label><input v-model.number="form.shares" type="number" class="input" /></div>
        </div>
        <div class="row">
          <div class="field"><label class="label">收藏</label><input v-model.number="form.collections" type="number" class="input" /></div>
          <div class="field"><label class="label">投流支出（分）</label><input v-model.number="form.adSpend" type="number" class="input" /></div>
        </div>
        <div class="field"><label class="label">ROI</label><input v-model.number="form.roi" type="number" step="0.01" class="input" /></div>

        <div v-if="msg" :class="['msg', `msg--${msg.tone}`]">{{ msg.text }}</div>
        <MButton :loading="saving" :disabled="!videoId" block @click="submit">录入 / 更新</MButton>
      </MCard>

      <MCard padded>
        <template #header><h3 class="h">时序数据 · {{ selectedVideo?.title ?? '—' }}</h3></template>
        <div v-if="history.length === 0" class="empty">暂无数据</div>
        <table v-else class="t">
          <thead>
            <tr>
              <th>日期</th><th>平台</th><th>播放</th><th>ROI</th><th>异常</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in history" :key="m.id">
              <td class="mono">{{ m.date }}</td>
              <td>{{ m.platform }}</td>
              <td class="mono">{{ m.plays.toLocaleString() }}</td>
              <td class="mono">{{ m.roi.toFixed(2) }}</td>
              <td>
                <span v-if="m.anomalyFlag" class="anomaly">⚠ 异常</span>
                <span v-else class="ok">·</span>
              </td>
            </tr>
          </tbody>
        </table>
      </MCard>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 24px 32px 40px; background: #F3F5FA; min-height: 100vh; }
.topbar { margin-bottom: 16px; }
.title { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-dark); }
.sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.h { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-dark); }

.grid { display: grid; grid-template-columns: 420px 1fr; gap: 16px; }
.label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; margin-top: 10px; }
.input {
  width: 100%; padding: 8px 12px; border: 1px solid var(--card-border);
  border-radius: 6px; font-size: 13px; font-family: inherit;
}
.input:focus { outline: none; border-color: var(--cyan); }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field { display: flex; flex-direction: column; }
.msg { padding: 8px 12px; border-radius: 6px; font-size: 12px; margin: 10px 0; }
.msg--ok { background: rgba(16, 185, 129, 0.1); color: var(--green); }
.msg--err { background: rgba(239, 68, 68, 0.1); color: var(--red); }

.empty { padding: 40px 0; text-align: center; color: var(--text-muted); }
.t { width: 100%; border-collapse: collapse; }
.t thead { background: var(--card-bg); }
.t th {
  text-align: left; padding: 8px 12px; font-size: 11px;
  color: var(--text-muted); font-weight: 600;
  border-bottom: 1px solid var(--card-border);
}
.t td { padding: 10px 12px; font-size: 12px; color: var(--text-body); border-bottom: 1px solid var(--card-border); }
.mono { font-family: 'Consolas', monospace; }
.anomaly { color: var(--red); font-weight: 600; }
.ok { color: var(--text-muted); }
</style>
