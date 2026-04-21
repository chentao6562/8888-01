<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { MButton, MCard, MStatusTag } from '@mindlink/ui';
import { reportsApi, type MonthlyReport } from '@/api/reports.api';
import type { AxiosError } from 'axios';

const route = useRoute();
const router = useRouter();
const id = computed(() => route.params.id as string);

const report = ref<MonthlyReport | null>(null);
const finalContent = ref('');
const saving = ref(false);
const publishing = ref(false);
const msg = ref<{ tone: 'ok' | 'err'; text: string } | null>(null);

async function load() {
  const res = await reportsApi.get(id.value);
  report.value = res.data;
  finalContent.value = res.data.finalContent;
}

onMounted(load);

const readOnly = computed(() =>
  report.value?.status === 'sent' || report.value?.status === 'read',
);

async function save() {
  saving.value = true;
  msg.value = null;
  try {
    await reportsApi.update(id.value, { finalContent: finalContent.value });
    msg.value = { tone: 'ok', text: '已保存' };
    await load();
  } catch (e) {
    const ex = e as AxiosError<{ error: { message: string } }>;
    msg.value = { tone: 'err', text: ex.response?.data?.error?.message ?? '保存失败' };
  } finally {
    saving.value = false;
  }
}

async function publish() {
  if (!confirm('推送月报给客户？推送后不可再编辑。')) return;
  publishing.value = true;
  try {
    await save(); // 先保存
    await reportsApi.publish(id.value);
    await load();
    msg.value = { tone: 'ok', text: '已推送' };
  } catch (e) {
    const ex = e as AxiosError<{ error: { message: string } }>;
    msg.value = { tone: 'err', text: ex.response?.data?.error?.message ?? '推送失败' };
  } finally {
    publishing.value = false;
  }
}

const statusLabel = {
  drafting: '草稿', pending_review: '待审', sent: '已推送', read: '已读',
} as const;
</script>

<template>
  <div class="page" v-if="report">
    <header class="topbar">
      <RouterLink to="/reports" class="back">← 月报列表</RouterLink>
      <h1 class="title">{{ report.month }} · 月度报告</h1>
      <MStatusTag :tone="report.status === 'read' ? 'green' : report.status === 'sent' ? 'cyan' : 'amber'">
        {{ statusLabel[report.status] }}
      </MStatusTag>
    </header>

    <div class="body">
      <aside class="side">
        <MCard padded>
          <template #header><h3 class="h">说明</h3></template>
          <p class="hint">
            本页是所见即所得的月报编辑器。AI 已基于客户本月 metrics 生成 6 段式初稿，
            PM 可直接修改后点"保存"。推送后进入<strong>只读</strong>状态。
          </p>
          <div class="info">
            <div><span>客户</span> {{ report.customerId.slice(0, 8) }}…</div>
            <div><span>推送时间</span> {{ report.pushedAt ? new Date(report.pushedAt).toLocaleString() : '—' }}</div>
            <div><span>阅读时间</span> {{ report.readAt ? new Date(report.readAt).toLocaleString() : '—' }}</div>
          </div>
          <div v-if="msg" :class="['msg', `msg--${msg.tone}`]">{{ msg.text }}</div>
          <div class="actions">
            <MButton :disabled="readOnly" :loading="saving" block @click="save">保存</MButton>
            <MButton
              :disabled="readOnly"
              :loading="publishing"
              variant="secondary"
              block
              @click="publish"
              style="margin-top: 8px;"
            >
              保存并推送给客户
            </MButton>
          </div>
        </MCard>
      </aside>

      <section class="main">
        <MCard padded>
          <template #header><h3 class="h">月报正文（Markdown）</h3></template>
          <textarea
            v-model="finalContent"
            class="editor"
            rows="28"
            :disabled="readOnly"
          />
        </MCard>
      </section>
    </div>
  </div>
  <div v-else class="loading">加载中…</div>
</template>

<style scoped>
.page { background: #F3F5FA; min-height: 100vh; }
.topbar {
  display: flex; align-items: center; gap: 20px;
  padding: 16px 32px; background: white;
  border-bottom: 1px solid var(--card-border);
}
.back { color: var(--text-muted); font-size: 12px; text-decoration: none; }
.back:hover { color: var(--cyan); }
.title { margin: 0; font-size: 18px; font-weight: 700; color: var(--text-dark); flex: 1; }

.body { display: grid; grid-template-columns: 320px 1fr; gap: 20px; padding: 20px 32px 40px; }
.h { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-dark); }

.hint { font-size: 13px; color: var(--text-body); line-height: 1.8; margin: 0 0 16px; }
.hint strong { color: var(--red); }
.info { display: flex; flex-direction: column; gap: 8px; font-size: 12px; color: var(--text-body); margin-bottom: 16px; padding: 12px; background: var(--card-bg); border-radius: 6px; }
.info span { color: var(--text-muted); margin-right: 8px; }
.msg { padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 12px; }
.msg--ok { background: rgba(16, 185, 129, 0.1); color: var(--green); }
.msg--err { background: rgba(239, 68, 68, 0.1); color: var(--red); }

.editor {
  width: 100%; padding: 16px;
  border: 1px solid var(--card-border); border-radius: 8px;
  font-family: 'Consolas', monospace; font-size: 13px;
  line-height: 1.8; resize: vertical;
  min-height: 500px;
}
.editor:focus { outline: none; border-color: var(--cyan); }

.loading { padding: 60px; text-align: center; color: var(--text-muted); }
</style>
