<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { fetchReports, type Report } from '@/api/client';

const items = ref<Report[]>([]);
const loading = ref(false);
const err = ref('');

async function load() {
  loading.value = true;
  try { items.value = await fetchReports(); }
  catch (e) { err.value = (e as { message?: string }).message ?? '加载失败'; }
  finally { loading.value = false; }
}
onShow(load);

function open(id: string) { uni.navigateTo({ url: `/pages/reports/detail?id=${id}` }); }
</script>

<template>
  <view class="list">
    <view v-if="!items.length && !loading" class="list__empty">
      <text class="list__empty-emoji">📄</text>
      <text>还没有月报推送给你</text>
    </view>
    <view v-for="r in items" :key="r.id" class="card" @click="open(r.id)">
      <view class="card__month">
        <text class="card__month-num">{{ r.month.slice(5) }}</text>
        <text class="card__month-year">{{ r.month.slice(0, 4) }}</text>
      </view>
      <view class="card__body">
        <text class="card__title">{{ r.month }} 月度报告</text>
        <text class="card__meta">{{ r.status === 'read' ? '已阅读' : '未读 · 请查看' }}</text>
      </view>
      <text v-if="r.status !== 'read'" class="card__dot" />
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
  position: relative;
}
.card__month {
  width: 120rpx; height: 120rpx; border-radius: 12rpx;
  background: #0F1B3C; color: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.card__month-num { font-size: 44rpx; font-weight: 700; line-height: 1; }
.card__month-year { font-size: 22rpx; color: #94A3B8; margin-top: 4rpx; }
.card__body { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.card__title { font-size: 28rpx; font-weight: 600; color: #0F1B3C; }
.card__meta { font-size: 22rpx; color: #64748B; }
.card__dot {
  width: 16rpx; height: 16rpx; border-radius: 50%; background: #EF4444; margin-right: 8rpx;
}
.card__arrow { font-size: 40rpx; color: #CBD5E1; }
.list__err { color: #DC2626; padding: 24rpx; }
</style>
