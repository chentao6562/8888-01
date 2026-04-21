<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { MButton, MCard, MFormField } from '@mindlink/ui';
import { useAuthStore } from '@/stores/auth.store';
import type { AxiosError } from 'axios';

const router = useRouter();
const auth = useAuthStore();

const step = ref<1 | 2>(1);
const companyName = ref('');
const plan = ref<'basic' | 'pro' | 'enterprise'>('basic');
const contactEmail = ref('');
const adminName = ref('');
const phone = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const errorMsg = ref<string | null>(null);

const canNext = computed(() => companyName.value.length >= 2);
const passwordValid = computed(
  () => password.value.length >= 8 && /[A-Za-z]/.test(password.value) && /\d/.test(password.value),
);
const canSubmit = computed(
  () =>
    adminName.value.length >= 2 &&
    /^1[3-9]\d{9}$/.test(phone.value) &&
    passwordValid.value &&
    password.value === confirmPassword.value,
);

async function onSubmit() {
  if (!canSubmit.value) return;
  loading.value = true;
  errorMsg.value = null;
  try {
    await auth.registerTenant({
      companyName: companyName.value,
      plan: plan.value,
      adminName: adminName.value,
      phone: phone.value,
      password: password.value,
      contactEmail: contactEmail.value || undefined,
    });
    router.push('/app');
  } catch (err) {
    const e = err as AxiosError<{ error: { code: string; message: string } }>;
    errorMsg.value = e.response?.data?.error?.message ?? '注册失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <MCard padded>
    <template #header>
      <h2 class="auth__title">注册新公司（{{ step }}/2）</h2>
    </template>

    <form v-if="step === 1" class="auth__form" @submit.prevent="step = 2">
      <MFormField label="公司名" required>
        <input v-model="companyName" class="auth__input" maxlength="120" placeholder="呼市老彭代运营" />
      </MFormField>

      <MFormField label="订阅档位" required hint="开发阶段硬编码，V2 接入计费">
        <div class="plan-picker">
          <label v-for="p in ['basic','pro','enterprise'] as const" :key="p" :class="['plan-picker__item', { 'is-active': plan === p }]">
            <input v-model="plan" type="radio" :value="p" />
            <div class="plan-picker__name">{{ p === 'basic' ? '基础版 5 人' : p === 'pro' ? '专业版 20 人' : '企业版 50 人' }}</div>
          </label>
        </div>
      </MFormField>

      <MFormField label="公司邮箱">
        <input v-model="contactEmail" class="auth__input" type="email" placeholder="可选" />
      </MFormField>

      <MButton type="submit" :disabled="!canNext" block>下一步</MButton>
      <div class="auth__links">
        <RouterLink to="/login">← 已有账号，去登录</RouterLink>
      </div>
    </form>

    <form v-else class="auth__form" @submit.prevent="onSubmit">
      <MFormField label="管理员姓名" required>
        <input v-model="adminName" class="auth__input" maxlength="60" placeholder="老彭" />
      </MFormField>
      <MFormField label="管理员手机号" required>
        <input v-model="phone" class="auth__input" maxlength="11" placeholder="11 位手机号" />
      </MFormField>
      <MFormField label="密码" required hint="≥ 8 位，含字母与数字">
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

      <div class="auth__actions">
        <MButton type="button" variant="ghost" @click="step = 1">← 上一步</MButton>
        <MButton type="submit" :loading="loading" :disabled="!canSubmit" block>创建公司</MButton>
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
.auth__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.auth__links {
  font-size: 12px;
  text-align: center;
}
.auth__links a {
  color: var(--cyan);
  text-decoration: none;
}
.plan-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.plan-picker__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: border-color 150ms;
}
.plan-picker__item.is-active {
  border-color: var(--cyan);
  background: rgba(56, 189, 248, 0.08);
}
.plan-picker__name {
  flex: 1;
  color: var(--text-body);
}
</style>
