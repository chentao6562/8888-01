<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { fetchDashboard, type DashboardData } from '@/api/client';
import { getToken } from '@/api/http';

const data = ref<DashboardData | null>(null);
const loading = ref(false);
const err = ref('');

async function load() {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/login' });
    return;
  }
  loading.value = true;
  try {
    data.value = await fetchDashboard();
  } catch (e) {
    err.value = (e as { message?: string }).message ?? '加载失败';
    if ((e as { status?: number }).status === 401) {
      uni.reLaunch({ url: '/pages/login/login' });
    }
  } finally {
    loading.value = false;
  }
}

onShow(load);

function goVideos() { uni.switchTab({ url: '/pages/videos/list' }); }
function goReports() { uni.switchTab({ url: '/pages/reports/list' }); }
function goVideo(id: string) { uni.navigateTo({ url: `/pages/videos/detail?id=${id}` }); }
function goReport(id: string) { uni.navigateTo({ url: `/pages/reports/detail?id=${id}` }); }
</script>

<template>
  <view class="home">
    <view class="home__greeting">
      <text class="home__hi">你好，老板 👋</text>
      <text class="home__date">{{ new Date().toLocaleDateString('zh-CN') }}</text>
    </view>

    <view v-if="data" class="home__metrics">
      <view class="metric">
        <text class="metric__label">本月播放</text>
        <text class="metric__value">{{ (data.metrics.plays || 0).toLocaleString() }}</text>
      </view>
      <view class="metric">
        <text class="metric__label">本月流水</text>
        <text class="metric__value">{{ data.metrics.revenueHint }}</text>
      </view>
      <view class="metric">
        <text class="metric__label">ROI</text>
        <text class="metric__value">{{ data.metrics.roi }}</text>
      </view>
    </view>

    <view v-if="data" class="home__todos">
      <view class="home__section-title">待办</view>
      <view class="todo" @click="goVideos">
        <text class="todo__emoji">🎬</text>
        <view class="todo__body">
          <text class="todo__title">待我审视频</text>
          <text class="todo__desc">{{ data.todos.pendingReviews.length }} 条待审</text>
        </view>
        <text class="todo__arrow">›</text>
      </view>
      <view class="todo" @click="goReports">
        <text class="todo__emoji">📄</text>
        <view class="todo__body">
          <text class="todo__title">未读月报</text>
          <text class="todo__desc">{{ data.todos.unreadReports.length }} 份未读</text>
        </view>
        <text class="todo__arrow">›</text>
      </view>
      <view class="todo">
        <text class="todo__emoji">💰</text>
        <view class="todo__body">
          <text class="todo__title">待付款</text>
          <text class="todo__desc">{{ data.todos.pendingPayments.length }} 笔</text>
        </view>
        <text class="todo__arrow">›</text>
      </view>
    </view>

    <view v-if="data && data.recentVideos.length" class="home__recent">
      <view class="home__section-title">近期作品</view>
      <view
        v-for="v in data.recentVideos" :key="v.id"
        class="recent-card" @click="goVideo(v.id)"
      >
        <image v-if="v.coverUrl" :src="v.coverUrl" class="recent-card__cover" mode="aspectFill" />
        <view v-else class="recent-card__cover recent-card__placeholder" />
        <text class="recent-card__title">{{ v.title }}</text>
      </view>
    </view>

    <view v-if="data && data.renewal" class="home__renewal" @click="goReport(data.renewal.id)">
      <text class="home__renewal-title">⚠️ 续约预警</text>
      <text class="home__renewal-sub">合同将于 {{ data.renewal.expiresAt.slice(0, 10) }} 到期</text>
    </view>

    <view v-if="err" class="home__err">{{ err }}</view>
    <view v-if="loading" class="home__loading">加载中…</view>
  </view>
</template>

<style lang="scss" scoped>
.home { padding: 32rpx 24rpx 120rpx; }
.home__greeting {
  padding: 24rpx 16rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.home__hi { font-size: 36rpx; font-weight: 600; color: #0F1B3C; }
.home__date { font-size: 22rpx; color: #94A3B8; }

.home__metrics {
  display: flex;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 20rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(15, 27, 60, 0.06);
}
.metric { flex: 1; text-align: center; display: flex; flex-direction: column; gap: 6rpx; }
.metric__label { font-size: 22rpx; color: #64748B; }
.metric__value { font-size: 40rpx; font-weight: 700; color: #0F1B3C; }

.home__section-title {
  font-size: 28rpx; font-weight: 600; color: #0F1B3C;
  margin: 8rpx 12rpx 16rpx;
}
.home__todos { margin-bottom: 24rpx; }
.todo {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 12rpx;
}
.todo__emoji { font-size: 40rpx; }
.todo__body { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.todo__title { font-size: 28rpx; font-weight: 600; color: #0F1B3C; }
.todo__desc { font-size: 22rpx; color: #64748B; }
.todo__arrow { font-size: 40rpx; color: #CBD5E1; }

.home__recent { margin-bottom: 24rpx; }
.recent-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.recent-card__cover {
  width: 140rpx; height: 180rpx;
  border-radius: 12rpx; background: #E2E8F0;
}
.recent-card__placeholder { background: #E2E8F0; }
.recent-card__title { flex: 1; font-size: 26rpx; color: #0F1B3C; }

.home__renewal {
  background: #FEF3C7;
  border: 2rpx solid #F59E0B;
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.home__renewal-title { font-size: 28rpx; font-weight: 600; color: #92400E; }
.home__renewal-sub { font-size: 24rpx; color: #B45309; }

.home__err { color: #DC2626; padding: 24rpx; }
.home__loading { text-align: center; color: #94A3B8; padding: 40rpx; }
</style>
