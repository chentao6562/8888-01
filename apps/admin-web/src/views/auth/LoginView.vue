<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { MButton, MCard, MFormField } from '@mindlink/ui';
import { useAuthStore } from '@/stores/auth.store';
import type { AxiosError } from 'axios';

const router = useRouter();
const auth = useAuthStore();

const phone = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref<string | null>(null);

const canSubmit = computed(() => /^1[3-9]\d{9}$/.test(phone.value) && password.value.length >= 8);

async function onSubmit() {
  if (!canSubmit.value) return;
  loading.value = true;
  errorMsg.value = null;
  try {
    await auth.login(phone.value, password.value);
    const redirect = (router.currentRoute.value.query.redirect as string | undefined) ?? '/app';
    router.push(redirect);
  } catch (err) {
    const e = err as AxiosError<{ error: { code: string; message: string } }>;
    errorMsg.value = e.response?.data?.error?.message ?? '登录失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <MCard padded>
    <template #header>
      <h2 class="auth__title">账号登录</h2>
    </template>

    <form class="auth__form" @submit.prevent="onSubmit">
      <MFormField label="手机号" required>
        <input
          v-model="phone"
          class="auth__input"
          type="tel"
          maxlength="11"
          placeholder="11 位手机号"
          autocomplete="username"
        />
      </MFormField>

      <MFormField label="密码" required>
        <input
          v-model="password"
          class="auth__input"
          type="password"
          minlength="8"
          placeholder="≥ 8 位，含字母与数字"
          autocomplete="current-password"
        />
      </MFormField>

      <div v-if="errorMsg" class="auth__error">{{ errorMsg }}</div>

      <MButton type="submit" :loading="loading" :disabled="!canSubmit" block>登录</MButton>

      <div class="auth__links">
        <RouterLink to="/forgot">忘记密码</RouterLink>
        <RouterLink to="/register">注册新公司 →</RouterLink>
      </div>
    </form>
  </MCard>
</template>

<style scoped>
.auth__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-dark);
}
.auth__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.auth__input {
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-body);
  background: #fff;
}
.auth__input:focus {
  outline: none;
  border-color: var(--cyan);
}
.auth__error {
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--red);
  font-size: 12px;
}
.auth__links {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.auth__links a {
  color: var(--cyan);
  text-decoration: none;
}
</style>
