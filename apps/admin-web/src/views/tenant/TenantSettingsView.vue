<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { MButton, MCard, MFormField } from '@mindlink/ui';
import { tenantsApi } from '@/api/tenants.api';
import type { Tenant } from '@/api/types';
import type { AxiosError } from 'axios';

const loading = ref(false);
const saving = ref(false);
const tenant = ref<Tenant | null>(null);
const form = reactive({ name: '', contactPhone: '', contactEmail: '', logo: '' });
const errorMsg = ref<string | null>(null);
const okMsg = ref<string | null>(null);

async function load() {
  loading.value = true;
  try {
    const res = await tenantsApi.current();
    tenant.value = res.data;
    form.name = res.data.name;
    form.contactPhone = res.data.contactPhone ?? '';
    form.contactEmail = res.data.contactEmail ?? '';
    form.logo = res.data.logo ?? '';
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  errorMsg.value = null;
  okMsg.value = null;
  try {
    const res = await tenantsApi.update({
      name: form.name,
      contactPhone: form.contactPhone || undefined,
      contactEmail: form.contactEmail || undefined,
      logo: form.logo || undefined,
    });
    tenant.value = res.data;
    okMsg.value = '已保存';
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    errorMsg.value = err.response?.data?.error?.message ?? '保存失败';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="tenant">
    <MCard title="公司设置" padded>
      <form v-if="tenant" class="tenant__form" @submit.prevent="save">
        <div class="tenant__meta">
          <div><span>档位</span><strong>{{ tenant.plan }}</strong></div>
          <div><span>员工上限</span><strong>{{ tenant.maxStaff }}</strong></div>
          <div><span>状态</span><strong>{{ tenant.status }}</strong></div>
          <div><span>创建时间</span><strong>{{ new Date(tenant.createdAt).toLocaleDateString() }}</strong></div>
        </div>

        <MFormField label="公司名" required>
          <input v-model="form.name" class="tenant__input" />
        </MFormField>
        <MFormField label="联系电话">
          <input v-model="form.contactPhone" class="tenant__input" maxlength="11" />
        </MFormField>
        <MFormField label="联系邮箱">
          <input v-model="form.contactEmail" class="tenant__input" type="email" />
        </MFormField>
        <MFormField label="Logo URL">
          <input v-model="form.logo" class="tenant__input" placeholder="https://..." />
        </MFormField>

        <div v-if="okMsg" class="tenant__ok">{{ okMsg }}</div>
        <div v-if="errorMsg" class="tenant__error">{{ errorMsg }}</div>

        <div class="tenant__actions">
          <MButton type="submit" :loading="saving">保存</MButton>
        </div>
      </form>
      <div v-else-if="loading">加载中…</div>
    </MCard>
  </div>
</template>

<style scoped>
.tenant {
  padding: 24px 32px;
  max-width: 720px;
}
.tenant__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tenant__meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 20px;
  padding: 12px 0 16px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--card-border);
  font-size: 12px;
}
.tenant__meta span {
  color: var(--text-muted);
  margin-right: 6px;
}
.tenant__meta strong {
  color: var(--text-body);
  font-weight: 500;
}
.tenant__input {
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
  font-family: inherit;
}
.tenant__input:focus {
  outline: none;
  border-color: var(--cyan);
}
.tenant__ok {
  padding: 8px 12px;
  background: rgba(16, 185, 129, 0.1);
  color: var(--green);
  border-radius: 6px;
  font-size: 12px;
}
.tenant__error {
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--red);
  border-radius: 6px;
  font-size: 12px;
}
.tenant__actions {
  margin-top: 8px;
}
</style>
