<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { MButton, MFormField, MModal } from '@mindlink/ui';
import { staffApi } from '@/api/staff.api';
import type { StaffRole } from '@/api/types';
import type { AxiosError } from 'axios';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  invited: [payload: { inviteLink: string }];
}>();

const name = ref('');
const phone = ref('');
const email = ref('');
const role = ref<Exclude<StaffRole, 'admin'>>('pm');
const loading = ref(false);
const errorMsg = ref<string | null>(null);

const canSubmit = computed(
  () => name.value.length >= 2 && /^1[3-9]\d{9}$/.test(phone.value),
);

async function onSubmit() {
  if (!canSubmit.value) return;
  loading.value = true;
  errorMsg.value = null;
  try {
    const res = await staffApi.invite({
      name: name.value,
      phone: phone.value,
      email: email.value || undefined,
      role: role.value,
    });
    emit('invited', { inviteLink: res.data.inviteLink });
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    errorMsg.value = err.response?.data?.error?.message ?? '邀请失败';
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      name.value = '';
      phone.value = '';
      email.value = '';
      role.value = 'pm';
      errorMsg.value = null;
    }
  },
);
</script>

<template>
  <MModal
    :model-value="modelValue"
    title="邀请员工"
    width="420px"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <form class="invite" @submit.prevent="onSubmit">
      <MFormField label="姓名" required>
        <input v-model="name" class="invite__input" maxlength="60" />
      </MFormField>
      <MFormField label="手机号" required hint="将通过短信发送邀请链接">
        <input v-model="phone" class="invite__input" maxlength="11" />
      </MFormField>
      <MFormField label="邮箱">
        <input v-model="email" class="invite__input" type="email" placeholder="可选" />
      </MFormField>
      <MFormField label="角色" required>
        <select v-model="role" class="invite__input">
          <option value="pm">项目经理 (PM)</option>
          <option value="strategist">策划</option>
          <option value="creator">创作者</option>
          <option value="adops">投手</option>
        </select>
      </MFormField>

      <div v-if="errorMsg" class="invite__error">{{ errorMsg }}</div>
    </form>

    <template #footer>
      <MButton variant="ghost" @click="emit('update:modelValue', false)">取消</MButton>
      <MButton :loading="loading" :disabled="!canSubmit" @click="onSubmit">发送邀请</MButton>
    </template>
  </MModal>
</template>

<style scoped>
.invite {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.invite__input {
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
  font-family: inherit;
}
.invite__input:focus {
  outline: none;
  border-color: var(--cyan);
}
.invite__error {
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--red);
  font-size: 12px;
}
</style>
