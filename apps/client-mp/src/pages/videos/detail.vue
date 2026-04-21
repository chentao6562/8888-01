<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';
import {
  fetchVideoDetail, addVideoComment, reviewVideo,
  type Video, type VideoComment,
} from '@/api/client';

const videoId = ref('');
const video = ref<Video | null>(null);
const comments = ref<VideoComment[]>([]);
const commentText = ref('');
const timestampSec = ref(0);
const loading = ref(false);
const err = ref('');

onLoad((opts) => {
  videoId.value = (opts as { id?: string }).id ?? '';
  if (videoId.value) void load();
});

async function load() {
  loading.value = true;
  try {
    const r = await fetchVideoDetail(videoId.value);
    video.value = r.video;
    comments.value = r.comments;
  } catch (e) { err.value = (e as { message?: string }).message ?? '加载失败'; }
  finally { loading.value = false; }
}

async function submitComment() {
  if (!commentText.value.trim()) return;
  try {
    await addVideoComment(videoId.value, {
      timestamp: Number(timestampSec.value) || 0,
      text: commentText.value.trim(),
      author: '老板',
    });
    commentText.value = '';
    await load();
  } catch (e) { err.value = (e as { message?: string }).message ?? '提交失败'; }
}

async function doReview(action: 'approve' | 'minor_change' | 'reshoot') {
  const tipMap = { approve: '通过', minor_change: '小改', reshoot: '重拍' };
  uni.showModal({
    title: `确认${tipMap[action]}`,
    content: action === 'reshoot' ? '重拍将退回拍摄阶段，确认吗？' : '',
    success: async (r) => {
      if (!r.confirm) return;
      try {
        await reviewVideo(videoId.value, action);
        uni.showToast({ title: '已提交', icon: 'success' });
        await load();
        setTimeout(() => uni.navigateBack(), 800);
      } catch (e) {
        err.value = (e as { message?: string }).message ?? '提交失败';
      }
    },
  });
}

function onTimeupdate(e: Event) {
  const detail = (e as unknown as { detail?: { currentTime?: number } }).detail;
  if (detail && typeof detail.currentTime === 'number') {
    timestampSec.value = detail.currentTime;
  }
}

function formatTs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}
</script>

<template>
  <view class="detail">
    <view v-if="video" class="detail__video">
      <video
        v-if="video.draftVideoUrl"
        :src="video.draftVideoUrl"
        controls
        class="detail__player"
        @timeupdate="onTimeupdate"
      />
      <text class="detail__title">{{ video.title }}</text>
      <text class="detail__ts">当前时间点：{{ formatTs(timestampSec) }}</text>
    </view>

    <view class="detail__section">
      <text class="detail__section-title">批注（{{ comments.length }}）</text>
      <view v-for="c in comments" :key="c.id" class="comment">
        <text class="comment__ts">{{ formatTs(c.timestamp) }}</text>
        <view class="comment__body">
          <text class="comment__author">{{ c.author }}</text>
          <text class="comment__text">{{ c.text }}</text>
        </view>
      </view>
      <view class="comment-input">
        <textarea
          v-model="commentText"
          class="comment-input__ta"
          placeholder="输入批注，可绑定当前时间点"
          :maxlength="200"
        />
        <button class="comment-input__btn" size="mini" @click="submitComment">在 {{ formatTs(timestampSec) }} 插入批注</button>
      </view>
    </view>

    <view v-if="video && video.status === 'pending_review'" class="detail__actions">
      <button class="act act--approve" @click="doReview('approve')">通过</button>
      <button class="act act--minor" @click="doReview('minor_change')">小改</button>
      <button class="act act--reshoot" @click="doReview('reshoot')">重拍</button>
    </view>

    <view v-if="err" class="detail__err">{{ err }}</view>
    <view v-if="loading" class="detail__loading">加载中…</view>
  </view>
</template>

<style lang="scss" scoped>
.detail { padding: 24rpx 24rpx 200rpx; }
.detail__video {
  background: #fff; border-radius: 16rpx; padding: 20rpx;
  display: flex; flex-direction: column; gap: 12rpx; margin-bottom: 24rpx;
}
.detail__player { width: 100%; height: 420rpx; border-radius: 12rpx; background: #000; }
.detail__title { font-size: 32rpx; font-weight: 600; color: #0F1B3C; }
.detail__ts { font-size: 24rpx; color: #64748B; }

.detail__section {
  background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx;
}
.detail__section-title {
  display: block; font-size: 28rpx; font-weight: 600; color: #0F1B3C; margin-bottom: 16rpx;
}
.comment { display: flex; gap: 16rpx; padding: 16rpx 0; border-bottom: 2rpx solid #F1F5F9; }
.comment:last-child { border-bottom: none; }
.comment__ts {
  background: #0F1B3C; color: #fff; font-size: 22rpx;
  padding: 4rpx 12rpx; border-radius: 8rpx; min-width: 80rpx; text-align: center;
  align-self: flex-start;
}
.comment__body { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.comment__author { font-size: 22rpx; color: #64748B; }
.comment__text { font-size: 26rpx; color: #0F1B3C; }
.comment-input { margin-top: 20rpx; display: flex; flex-direction: column; gap: 12rpx; }
.comment-input__ta {
  border: 2rpx solid #E2E8F0; border-radius: 12rpx;
  padding: 16rpx; height: 120rpx; font-size: 26rpx;
}
.comment-input__btn { background: #E0F2FE; color: #0369A1; }

.detail__actions {
  position: fixed; left: 24rpx; right: 24rpx; bottom: 24rpx;
  display: flex; gap: 16rpx;
}
.act { flex: 1; font-size: 30rpx; font-weight: 600; height: 96rpx; border-radius: 16rpx; }
.act--approve { background: #16A34A; color: #fff; }
.act--minor { background: #F59E0B; color: #fff; }
.act--reshoot { background: #DC2626; color: #fff; }

.detail__err { color: #DC2626; padding: 24rpx; }
.detail__loading { text-align: center; color: #94A3B8; padding: 40rpx; }
</style>
