<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { fetchPendingVideos, type Video } from '@/api/client';

const items = ref<Video[]>([]);
const loading = ref(false);
const err = ref('');

async function load() {
  loading.value = true;
  try { items.value = await fetchPendingVideos(); }
  catch (e) { err.value = (e as { message?: string }).message ?? '加载失败'; }
  finally { loading.value = false; }
}
onShow(load);

function open(id: string) { uni.navigateTo({ url: `/pages/videos/detail?id=${id}` }); }
</script>

<template>
  <view class="list">
    <view v-if="!items.length && !loading" class="list__empty">
      <text class="list__empty-emoji">✅</text>
      <text>当前没有待审视频</text>
    </view>
    <view
      v-for="v in items" :key="v.id" class="card" @click="open(v.id)"
    >
      <image v-if="v.coverUrl" :src="v.coverUrl" class="card__cover" mode="aspectFill" />
      <view v-else class="card__cover card__cover--placeholder"><text>🎬</text></view>
      <view class="card__body">
        <text class="card__title">{{ v.title }}</text>
        <text class="card__meta">待审核 · {{ v.reviewSubmittedAt ? v.reviewSubmittedAt.slice(0, 10) : '刚刚' }}</text>
      </view>
      <text class="card__arrow">›</text>
    </view>
    <view v-if="err" class="list__err">{{ err }}</view>
  </view>
</template>

<style lang="scss" scoped>
.list { padding: 24rpx 24rpx 120rpx; }
.list__empty {
  padding: 120rpx 40rpx; text-align: center; color: #64748B;
  display: flex; flex-direction: column; align-items: center; gap: 20rpx;
}
.list__empty-emoji { font-size: 80rpx; }
.card {
  background: #fff; border-radius: 16rpx;
  padding: 20rpx; margin-bottom: 16rpx;
  display: flex; align-items: center; gap: 20rpx;
}
.card__cover {
  width: 140rpx; height: 180rpx; border-radius: 12rpx; background: #E2E8F0;
  display: flex; align-items: center; justify-content: center; font-size: 60rpx;
}
.card__cover--placeholder { color: #94A3B8; }
.card__body { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.card__title { font-size: 28rpx; font-weight: 600; color: #0F1B3C; }
.card__meta { font-size: 22rpx; color: #EA580C; }
.card__arrow { font-size: 40rpx; color: #CBD5E1; }
.list__err { color: #DC2626; padding: 24rpx; }
</style>
