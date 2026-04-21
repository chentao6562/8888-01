<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MButton, MCard, MFormField } from '@mindlink/ui';
import { useAuthStore } from '@/stores/auth.store';
import type { AxiosError } from 'axios';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const token = (route.query.token as string) ?? '';
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const errorMsg = ref<string | null>(null);

const passwordValid = computed(
  () => password.value.length >= 8 && /[A-Za-z]/.test(password.value) && /\d/.test(password.value),
);
const canSubmit = computed(
  () => token && passwordValid.value && password.value === confirmPassword.value,
);

async function onSubmit() {
  if (!canSubmit.value) return;
  loading.value = true;
  errorMsg.value = null;
  try {
    await auth.acceptInvite(token, password.value);
    router.push('/app');
  } catch (err) {
    const e = err as AxiosError<{ error: { code: string; message: string } }>;
    errorMsg.value = e.response?.data?.error?.message ?? '邀请无效或已过期';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <MCard padded>
    <template #header>
      <h2 class="auth__title">接受邀请</h2>
    </template>

    <div v-if="!token" class="auth__error">邀请链接无效（缺少 token）</div>

    <form v-else class="auth__form" @submit.prevent="onSubmit">
      <p class="auth__hint">请设置登录密码。后续用邀请时填写的手机号登录。</p>
      <MFormField label="新密码" required hint="≥ 8 位，含字母与数字">
        <input v-model="password" class="auth__input" type="password" />
      </MFormField>
      <MFormField
        label="确认密码"
        required
        :error="confirmPassword && password !== confirmPassword ? '两次密码不一致' : undefined"
      >
        <input v-model="confirmPassword" class="auth__input" type="password" />
      </MFormField>

      <div v-if="errorMsg" class="auth__error">{{ errorMsg }}</div>

      <MButton type="submit" :loading="loading" :disabled="!canSubmit" block>加入公司</MButton>
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
.auth__hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
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
</style>
