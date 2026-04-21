<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { getToken } from '@/api/http';

onLoad(() => {
  if (getToken()) {
    uni.reLaunch({ url: '/pages/home/home' });
  } else {
    uni.reLaunch({ url: '/pages/login/login' });
  }
});
</script>

<template>
  <view class="splash">
    <text class="splash__brand">MindLink</text>
    <text class="splash__sub">加载中…</text>
  </view>
</template>

<style lang="scss" scoped>
.splash {
  min-height: 100vh;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16rpx; background: #0F1B3C;
}
.splash__brand { font-size: 64rpx; font-weight: 700; color: #fff; }
.splash__sub { font-size: 24rpx; color: #94A3B8; }
</style>
