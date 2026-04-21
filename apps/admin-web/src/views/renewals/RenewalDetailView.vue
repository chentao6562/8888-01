<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { MButton, MCard, MFormField, MStatusTag } from '@mindlink/ui';
import { renewalsApi, type Renewal } from '@/api/dashboard.api';
import type { AxiosError } from 'axios';

const route = useRoute();
const router = useRouter();
const id = computed(() => route.params.id as string);

const renewal = ref<Renewal | null>(null);
const notes = ref<Array<{ id: string; channel: string; notes: string; createdAt: string }>>([]);
const loading = ref(false);
const busy = ref(false);
const newNoteChannel = ref('phone');
const newNoteText = ref('');
const lostReason = ref('effect');
const lostAnalysis = ref('');

async function load() {
  loading.value = true;
  try {
    renewal.value = (await renewalsApi.get(id.value)).data;
    notes.value = (await renewalsApi.listNotes(id.value)).data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function generate() {
  busy.value = true;
  try {
    await renewalsApi.generateProposal(id.value);
    await load();
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '生成失败');
  } finally {
    busy.value = false;
  }
}

async function addNote() {
  if (newNoteText.value.trim().length < 2) return;
  busy.value = true;
  try {
    await renewalsApi.addNote(id.value, { channel: newNoteChannel.value, notes: newNoteText.value.trim() });
    newNoteText.value = '';
    await load();
  } finally {
    busy.value = false;
  }
}

async function markWon() {
  if (!confirm('确认续约成功？客户将回到"交付中"阶段。')) return;
  try {
    await renewalsApi.won(id.value);
    alert('续约成功！');
    router.push('/renewals');
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '操作失败');
  }
}

async function markLost() {
  if (!confirm('确认续约失败？将进入流失归档。')) return;
  try {
    await renewalsApi.lost(id.value, lostReason.value, lostAnalysis.value);
    alert('已标为流失');
    router.push('/renewals');
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    alert(err.response?.data?.error?.message ?? '操作失败');
  }
}

const stageLabel = {
  warning: '⚠ 预警', negotiating: '🗣 谈判中', won: '✅ 成功', lost: '❌ 流失',
} as const;
function tone(s: Renewal['stage']) {
  if (s === 'won') return 'green';
  if (s === 'lost') return 'red';
  if (s === 'negotiating') return 'cyan';
  return 'amber';
}
</script>

<template>
  <div class="page" v-if="renewal">
    <header class="topbar">
      <RouterLink to="/renewals" class="back">← 续约看板</RouterLink>
      <h1 class="title">续约推进</h1>
      <MStatusTag :tone="tone(renewal.stage)">{{ stageLabel[renewal.stage] }}</MStatusTag>
    </header>

    <div class="body">
      <aside class="side">
        <MCard padded>
          <template #header><h3 class="h">基本信息</h3></template>
          <dl class="dl">
            <dt>客户 ID</dt><dd class="mono">{{ renewal.customerId.slice(0, 8) }}…</dd>
            <dt>到期日</dt><dd>{{ new Date(renewal.expiresAt).toLocaleDateString() }}</dd>
            <dt>折扣</dt>
            <dd>{{ renewal.discountRatio != null ? `${(renewal.discountRatio * 100).toFixed(0)}%` : '—' }}</dd>
            <dt>创建</dt><dd>{{ new Date(renewal.createdAt).toLocaleDateString() }}</dd>
          </dl>

          <div v-if="renewal.stage === 'warning' || renewal.stage === 'negotiating'" class="actions">
            <MButton :loading="busy" block @click="generate">
              {{ renewal.proposal ? '重新生成提案' : 'AI 生成续约提案' }}
            </MButton>
            <MButton v-if="renewal.proposal" variant="secondary" block style="margin-top: 8px;" @click="markWon">
              标续约成功
            </MButton>
          </div>
        </MCard>

        <MCard v-if="renewal.proposal && renewal.stage !== 'won' && renewal.stage !== 'lost'" padded style="margin-top: 16px;">
          <template #header><h3 class="h">标流失（慎用）</h3></template>
          <MFormField label="流失原因">
            <select v-model="lostReason" class="input">
              <option value="product">产品问题</option>
              <option value="price">价格问题</option>
              <option value="effect">效果不达预期</option>
              <option value="closure">客户业务关店</option>
              <option value="other">其他</option>
            </select>
          </MFormField>
          <MFormField label="补充说明">
            <textarea v-model="lostAnalysis" class="input" rows="3" placeholder="客户具体表述" />
          </MFormField>
          <MButton variant="secondary" block @click="markLost">标流失</MButton>
        </MCard>
      </aside>

      <section class="main">
        <MCard padded>
          <template #header><h3 class="h">续约提案</h3></template>
          <pre v-if="renewal.proposal" class="proposal">{{ renewal.proposal }}</pre>
          <div v-else class="empty">点击左侧「AI 生成续约提案」生成初稿</div>
        </MCard>

        <MCard padded style="margin-top: 16px;">
          <template #header><h3 class="h">谈判记录 · {{ notes.length }} 条</h3></template>
          <form v-if="renewal.stage !== 'won' && renewal.stage !== 'lost'" class="note-form" @submit.prevent="addNote">
            <select v-model="newNoteChannel" class="input input--sm">
              <option value="phone">电话</option>
              <option value="wechat">微信</option>
              <option value="visit">上门</option>
              <option value="other">其他</option>
            </select>
            <input v-model="newNoteText" class="input" placeholder="记录沟通要点" maxlength="500" />
            <MButton size="sm" type="submit" :loading="busy" :disabled="newNoteText.trim().length < 2">记录</MButton>
          </form>
          <ul v-if="notes.length" class="notes">
            <li v-for="n in notes" :key="n.id">
              <div class="notes__head">
                <span class="notes__ch">{{ n.channel }}</span>
                <span class="notes__time">{{ new Date(n.createdAt).toLocaleString() }}</span>
              </div>
              <div>{{ n.notes }}</div>
            </li>
          </ul>
          <div v-else class="empty">暂无记录</div>
        </MCard>
      </section>
    </div>
  </div>
  <div v-else-if="loading" class="loading">加载中…</div>
</template>

<style scoped>
.page { background: #F3F5FA; min-height: 100vh; padding-bottom: 40px; }
.topbar {
  display: flex; align-items: center; gap: 20px;
  padding: 16px 32px; background: white;
  border-bottom: 1px solid var(--card-border);
}
.back { color: var(--text-muted); font-size: 12px; text-decoration: none; }
.back:hover { color: var(--cyan); }
.title { margin: 0; font-size: 18px; font-weight: 700; color: var(--text-dark); flex: 1; }
.body { display: grid; grid-template-columns: 320px 1fr; gap: 20px; padding: 20px 32px; }
.h { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-dark); }
.dl { display: grid; grid-template-columns: 80px 1fr; gap: 10px 14px; font-size: 13px; margin: 0; }
.dl dt { color: var(--text-muted); }
.dl dd { color: var(--text-body); margin: 0; }
.mono { font-family: 'Consolas', monospace; }
.actions { margin-top: 20px; }
.input {
  width: 100%; padding: 8px 12px;
  border: 1px solid var(--card-border); border-radius: 6px;
  font-size: 13px; font-family: inherit;
}
.input--sm { flex: 0 0 100px; }
textarea.input { resize: vertical; line-height: 1.6; }

.proposal {
  padding: 16px; background: var(--card-bg);
  border-radius: 8px; font-family: inherit;
  font-size: 14px; line-height: 1.8;
  white-space: pre-wrap; color: var(--text-body);
}
.empty { padding: 40px 0; text-align: center; color: var(--text-muted); font-size: 13px; }

.note-form { display: flex; gap: 8px; margin-bottom: 14px; }
.notes { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.notes li {
  padding: 12px 14px;
  background: var(--card-bg); border-radius: 6px;
  border-left: 2px solid var(--cyan);
  font-size: 13px; color: var(--text-body);
}
.notes__head {
  display: flex; justify-content: space-between;
  font-size: 11px; margin-bottom: 4px;
}
.notes__ch { color: var(--cyan); font-weight: 600; }
.notes__time { color: var(--text-muted); }

.loading { padding: 60px; text-align: center; color: var(--text-muted); }
</style>
