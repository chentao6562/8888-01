<script setup lang="ts">
import { ref } from 'vue';
import { devLogin, wechatLogin, bindPhone } from '@/api/client';

const phone = ref('');
const tempToken = ref<string | null>(null);
const bindingPhone = ref('');
const loading = ref(false);
const err = ref('');

async function handleDevLogin() {
  if (!/^1\d{10}$/.test(phone.value)) { err.value = '请输入正确的手机号'; return; }
  err.value = '';
  loading.value = true;
  try {
    await devLogin(phone.value);
    uni.reLaunch({ url: '/pages/home/home' });
  } catch (e) {
    err.value = (e as { message?: string }).message ?? '登录失败';
  } finally {
    loading.value = false;
  }
}

async function handleWechatLogin() {
  err.value = '';
  loading.value = true;
  // #ifdef MP-WEIXIN
  uni.login({
    provider: 'weixin',
    success: async (r) => {
      try {
        const res = await wechatLogin(r.code);
        if (res.needBind) {
          tempToken.value = res.tempToken!;
        } else {
          uni.reLaunch({ url: '/pages/home/home' });
        }
      } catch (e) {
        err.value = (e as { message?: string }).message ?? '登录失败';
      } finally {
        loading.value = false;
      }
    },
    fail: () => { err.value = '微信登录失败'; loading.value = false; },
  });
  // #endif
  // #ifdef H5
  err.value = 'H5 端请使用"手机号登录（开发）"';
  loading.value = false;
  // #endif
}

async function handleBindPhone() {
  if (!tempToken.value) return;
  if (!/^1\d{10}$/.test(bindingPhone.value)) { err.value = '请输入正确的手机号'; return; }
  loading.value = true;
  try {
    await bindPhone(tempToken.value, bindingPhone.value);
    uni.reLaunch({ url: '/pages/home/home' });
  } catch (e) {
    err.value = (e as { message?: string }).message ?? '绑定失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <view class="login">
    <view class="login__brand">
      <text class="login__title">MindLink</text>
      <text class="login__sub">代运营协同 · 客户端</text>
    </view>

    <view v-if="!tempToken" class="login__form">
      <view class="login__section-title">手机号登录（开发）</view>
      <input v-model="phone" class="input" type="number" maxlength="11" placeholder="输入老板手机号" />
      <button class="btn btn--primary" :loading="loading" @click="handleDevLogin">登录</button>

      <view class="login__divider">或</view>
      <button class="btn btn--wechat" :loading="loading" @click="handleWechatLogin">微信一键登录</button>
    </view>

    <view v-else class="login__form">
      <view class="login__section-title">首次登录 · 绑定手机号</view>
      <text class="login__hint">请输入 PM 登记的老板手机号，系统将自动关联你的店铺档案。</text>
      <input v-model="bindingPhone" class="input" type="number" maxlength="11" placeholder="老板手机号" />
      <button class="btn btn--primary" :loading="loading" @click="handleBindPhone">绑定并进入</button>
    </view>

    <view v-if="err" class="login__err">{{ err }}</view>
  </view>
</template>

<style lang="scss" scoped>
.login {
  min-height: 100vh;
  padding: 80rpx 48rpx 40rpx;
  background: linear-gradient(180deg, #0F1B3C 0%, #1A2749 45%, #F8FAFC 45%);
}
.login__brand {
  color: #fff;
  margin-bottom: 80rpx;
}
.login__title { font-size: 64rpx; font-weight: 700; display: block; }
.login__sub { font-size: 24rpx; color: #94A3B8; letter-spacing: 2rpx; }
.login__form {
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 36rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  box-shadow: 0 4rpx 24rpx rgba(15, 27, 60, 0.08);
}
.login__section-title { font-size: 30rpx; font-weight: 600; color: #0F1B3C; }
.login__hint { font-size: 24rpx; color: #64748B; line-height: 1.5; }
.input {
  border: 2rpx solid #E2E8F0;
  border-radius: 12rpx;
  padding: 18rpx 22rpx;
  font-size: 30rpx;
}
.btn {
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  height: 88rpx;
  line-height: 88rpx;
}
.btn--primary { background: #0F1B3C; color: #fff; }
.btn--wechat { background: #07C160; color: #fff; }
.login__divider { text-align: center; color: #CBD5E1; font-size: 24rpx; }
.login__err {
  margin-top: 24rpx;
  background: #FEF2F2;
  color: #DC2626;
  padding: 20rpx 24rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
}
</style>
