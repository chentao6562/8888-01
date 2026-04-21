<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { MButton, MFormField, MModal } from '@mindlink/ui';
import { customersApi, type Customer } from '@/api/customers.api';
import type { AxiosError } from 'axios';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  'update:modelValue': [v: boolean];
  created: [c: Customer];
}>();

const companyName = ref('');
const bossName = ref('');
const bossPhone = ref('');
const industry = ref('餐饮');
const region = ref('');
const source = ref<'referral' | 'website' | 'outreach' | 'ad' | 'other'>('referral');
const budgetHint = ref<'lt_5k' | '5k_10k' | '10k_30k' | 'gt_30k' | 'unknown'>('10k_30k');
const notes = ref('');
const loading = ref(false);
const errorMsg = ref<string | null>(null);

const canSubmit = computed(
  () =>
    companyName.value.length >= 2 &&
    bossName.value.length >= 2 &&
    /^1[3-9]\d{9}$/.test(bossPhone.value) &&
    industry.value.length >= 2,
);

async function onSubmit() {
  if (!canSubmit.value) return;
  loading.value = true;
  errorMsg.value = null;
  try {
    const res = await customersApi.create({
      companyName: companyName.value,
      bossName: bossName.value,
      bossPhone: bossPhone.value,
      industry: industry.value,
      region: region.value || undefined,
      source: source.value,
      budgetHint: budgetHint.value,
      notes: notes.value || undefined,
    });
    emit('created', res.data);
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    errorMsg.value = err.response?.data?.error?.message ?? '创建失败';
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      companyName.value = '';
      bossName.value = '';
      bossPhone.value = '';
      industry.value = '餐饮';
      region.value = '';
      source.value = 'referral';
      budgetHint.value = '10k_30k';
      notes.value = '';
      errorMsg.value = null;
    }
  },
);
</script>

<template>
  <MModal
    :model-value="modelValue"
    title="新建客户"
    width="520px"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <form class="form" @submit.prevent="onSubmit">
      <MFormField label="公司名" required>
        <input v-model="companyName" class="input" maxlength="120" placeholder="呼市金辉家居" />
      </MFormField>
      <div class="row">
        <MFormField label="老板姓名" required>
          <input v-model="bossName" class="input" maxlength="60" />
        </MFormField>
        <MFormField label="老板手机" required>
          <input v-model="bossPhone" class="input" maxlength="11" />
        </MFormField>
      </div>
      <div class="row">
        <MFormField label="行业" required>
          <input v-model="industry" class="input" maxlength="20" />
        </MFormField>
        <MFormField label="地区">
          <input v-model="region" class="input" placeholder="内蒙古呼和浩特 · 回民区" />
        </MFormField>
      </div>
      <div class="row">
        <MFormField label="来源">
          <select v-model="source" class="input">
            <option value="referral">朋友介绍</option>
            <option value="website">官网表单</option>
            <option value="outreach">地推</option>
            <option value="ad">广告</option>
            <option value="other">其他</option>
          </select>
        </MFormField>
        <MFormField label="预算预估">
          <select v-model="budgetHint" class="input">
            <option value="lt_5k">&lt; 5k</option>
            <option value="5k_10k">5-10k</option>
            <option value="10k_30k">10-30k</option>
            <option value="gt_30k">&gt; 30k</option>
            <option value="unknown">未知</option>
          </select>
        </MFormField>
      </div>
      <MFormField label="备注">
        <textarea v-model="notes" class="input" rows="2" maxlength="1000" />
      </MFormField>

      <div v-if="errorMsg" class="err">{{ errorMsg }}</div>
    </form>
    <template #footer>
      <MButton variant="ghost" @click="emit('update:modelValue', false)">取消</MButton>
      <MButton :loading="loading" :disabled="!canSubmit" @click="onSubmit">创建</MButton>
    </template>
  </MModal>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 14px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.input {
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  font-size: 14px;
  background: white;
  font-family: inherit;
  width: 100%;
}
.input:focus { outline: none; border-color: var(--cyan); }
textarea.input { height: auto; padding: 10px 12px; resize: vertical; }
.err {
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--red);
  border-radius: 6px;
  font-size: 12px;
}
</style>
