<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { currentRenewal, bookRenewalConsult } from '@/api/client';

interface Renewal {
  id: string;
  stage: 'warning' | 'negotiating' | 'won' | 'lost';
  expiresAt: string;
  proposal: string | null;
  discountRatio: number | null;
}

const renewal = ref<Renewal | null>(null);
const loading = ref(false);
const err = ref('');

async function load() {
  loading.value = true;
  try { renewal.value = (await currentRenewal()) as Renewal | null; }
  catch (e) { err.value = (e as { message?: string }).message ?? '加载失败'; }
  finally { loading.value = false; }
}
onShow(load);

async function book() {
  if (!renewal.value) return;
  try {
    await bookRenewalConsult(renewal.value.id);
    uni.showToast({ title: '已通知 PM', icon: 'success' });
  } catch (e) {
    err.value = (e as { message?: string }).message ?? '预约失败';
  }
}

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400_000));
}
</script>

<template>
  <view class="page">
    <view v-if="!renewal && !loading" class="empty">
      <text class="empty__emoji">✅</text>
      <text>当前没有到期预警</text>
      <text class="empty__sub">合同到期前 30 天会自动提醒</text>
    </view>

    <view v-else-if="renewal" class="card">
      <view class="card__head">
        <text class="card__badge">到期预警</text>
        <text class="card__days">{{ daysLeft(renewal.expiresAt) }} 天</text>
      </view>
      <text class="card__title">合同将于 {{ renewal.expiresAt.slice(0, 10) }} 到期</text>
      <text class="card__sub">阶段：{{ { warning: '预警', negotiating: '洽谈中', won: '已续约', lost: '已流失' }[renewal.stage] }}</text>

      <view v-if="renewal.proposal" class="card__proposal">
        <text class="card__proposal-title">续约方案</text>
        <text class="card__proposal-text">{{ renewal.proposal }}</text>
      </view>

      <button class="card__btn" @click="book">预约 PM 沟通</button>
    </view>

    <view v-if="err" class="err">{{ err }}</view>
  </view>
</template>

<style lang="scss" scoped>
.page { padding: 24rpx 24rpx 120rpx; }
.empty {
  padding: 140rpx 40rpx; text-align: center; color: #64748B;
  display: flex; flex-direction: column; align-items: center; gap: 16rpx;
}
.empty__emoji { font-size: 100rpx; }
.empty__sub { font-size: 22rpx; color: #94A3B8; }

.card {
  background: #fff; border-radius: 20rpx; padding: 32rpx;
  display: flex; flex-direction: column; gap: 20rpx;
}
.card__head { display: flex; justify-content: space-between; align-items: center; }
.card__badge {
  background: #FEF3C7; color: #92400E;
  padding: 6rpx 16rpx; border-radius: 8rpx; font-size: 22rpx;
}
.card__days { font-size: 32rpx; font-weight: 700; color: #F59E0B; }
.card__title { font-size: 32rpx; font-weight: 600; color: #0F1B3C; }
.card__sub { font-size: 24rpx; color: #64748B; }
.card__proposal {
  background: #F1F5F9; border-radius: 12rpx; padding: 20rpx;
  display: flex; flex-direction: column; gap: 8rpx;
}
.card__proposal-title { font-size: 24rpx; font-weight: 600; color: #0F1B3C; }
.card__proposal-text { font-size: 26rpx; color: #334155; line-height: 1.6; }
.card__btn {
  background: #0F1B3C; color: #fff; border-radius: 12rpx;
  height: 88rpx; font-size: 28rpx; font-weight: 600;
}
.err { color: #DC2626; padding: 24rpx; }
</style>
