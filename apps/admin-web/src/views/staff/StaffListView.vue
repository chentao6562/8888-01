<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { MButton, MCard, MDataTable, MStatusTag } from '@mindlink/ui';
import StaffInviteModal from './StaffInviteModal.vue';
import { staffApi } from '@/api/staff.api';
import type { Staff, StaffRole } from '@/api/types';
import type { AxiosError } from 'axios';

const rows = ref<Staff[]>([]);
const loading = ref(false);
const inviteOpen = ref(false);
const inviteLink = ref<string | null>(null);
const errorMsg = ref<string | null>(null);

const roleLabel: Record<StaffRole, string> = {
  admin: '管理员',
  pm: '项目经理',
  strategist: '策划',
  creator: '创作者',
  adops: '投手',
};

const columns = [
  { key: 'name', title: '姓名', width: '140px' },
  { key: 'phone', title: '手机号', width: '140px' },
  { key: 'role', title: '角色', width: '120px' },
  { key: 'status', title: '状态', width: '100px' },
  { key: 'joinedAt', title: '入职时间', width: '160px' },
  { key: 'actions', title: '操作', width: '180px', align: 'right' as const },
];

async function load() {
  loading.value = true;
  errorMsg.value = null;
  try {
    const res = await staffApi.list();
    rows.value = res.data;
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    errorMsg.value = err.response?.data?.error?.message ?? '加载失败';
  } finally {
    loading.value = false;
  }
}

async function toggleStatus(row: Staff) {
  const next = row.status === 'disabled' ? 'active' : 'disabled';
  await staffApi.update(row.id, { status: next });
  await load();
}

async function remove(row: Staff) {
  if (!confirm(`确定移除 ${row.name}？（不可撤销）`)) return;
  try {
    await staffApi.remove(row.id);
    await load();
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '移除失败');
  }
}

function onInvited(payload: { inviteLink: string }) {
  inviteOpen.value = false;
  inviteLink.value = payload.inviteLink;
  void load();
}

onMounted(load);

const headerSummary = computed(() => {
  const total = rows.value.length;
  const active = rows.value.filter((r) => r.status === 'active').length;
  const invited = rows.value.filter((r) => r.status === 'invited').length;
  return `共 ${total} 人 · 在职 ${active} · 待加入 ${invited}`;
});
</script>

<template>
  <div class="staff">
    <MCard padded>
      <template #header>
        <div>
          <h2 class="staff__title">员工管理</h2>
          <div class="staff__summary">{{ headerSummary }}</div>
        </div>
      </template>
      <template #action>
        <MButton size="sm" @click="inviteOpen = true">邀请员工</MButton>
      </template>

      <div v-if="errorMsg" class="staff__error">{{ errorMsg }}</div>

      <div v-if="inviteLink" class="staff__invite-banner">
        邀请链接（MVP 期通过日志模拟，直接复制发给对方）：<br />
        <code>{{ inviteLink }}</code>
        <button class="staff__close" @click="inviteLink = null">×</button>
      </div>

      <MDataTable :columns="columns" :rows="rows" :loading="loading">
        <template #cell-role="{ row }">{{ roleLabel[(row as Staff).role] }}</template>
        <template #cell-status="{ row }">
          <MStatusTag
            size="sm"
            :tone="(row as Staff).status === 'active' ? 'green' : (row as Staff).status === 'invited' ? 'cyan' : 'gray'"
          >
            {{ (row as Staff).status === 'active' ? '在职' : (row as Staff).status === 'invited' ? '已邀请' : '已禁用' }}
          </MStatusTag>
        </template>
        <template #cell-joinedAt="{ row }">
          {{ (row as Staff).joinedAt ? new Date((row as Staff).joinedAt!).toLocaleDateString() : '—' }}
        </template>
        <template #cell-actions="{ row }">
          <div class="staff__actions">
            <button
              v-if="(row as Staff).role !== 'admin'"
              class="staff__link"
              @click="toggleStatus(row as Staff)"
            >
              {{ (row as Staff).status === 'disabled' ? '启用' : '禁用' }}
            </button>
            <button
              v-if="(row as Staff).role !== 'admin'"
              class="staff__link staff__link--danger"
              @click="remove(row as Staff)"
            >
              移除
            </button>
          </div>
        </template>
      </MDataTable>
    </MCard>

    <StaffInviteModal v-model="inviteOpen" @invited="onInvited" />
  </div>
</template>

<style scoped>
.staff {
  padding: 24px 32px;
}
.staff__title {
  margin: 0;
  font-size: 18px;
  color: var(--text-dark);
}
.staff__summary {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}
.staff__error {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--red);
  border-radius: 6px;
  font-size: 12px;
}
.staff__invite-banner {
  position: relative;
  margin-bottom: 12px;
  padding: 12px 40px 12px 12px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-body);
  word-break: break-all;
}
.staff__invite-banner code {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 6px;
  font-family: 'Consolas', monospace;
  background: #fff;
  border-radius: 4px;
}
.staff__close {
  position: absolute;
  top: 6px;
  right: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  color: var(--text-muted);
}
.staff__actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.staff__link {
  background: none;
  border: none;
  color: var(--cyan);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.staff__link--danger {
  color: var(--red);
}
</style>
