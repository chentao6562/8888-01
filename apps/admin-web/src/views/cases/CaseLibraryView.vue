<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { MButton, MCard, MStatusTag } from '@mindlink/ui';
import { casesApi, type Case, type CaseCategory } from '@/api/ai.api';
import type { AxiosError } from 'axios';

const CATEGORIES: Array<{ key: CaseCategory | 'all'; label: string; enabled: boolean }> = [
  { key: 'all', label: '全部', enabled: true },
  { key: 'copy', label: '文案库', enabled: true },
  { key: 'title', label: '标题库', enabled: true },
  { key: 'scene', label: '画面库', enabled: false },
  { key: 'bgm', label: 'BGM 库', enabled: false },
  { key: 'tag', label: '标签库', enabled: false },
  { key: 'campaign', label: '投放库', enabled: false },
];

const category = ref<CaseCategory | 'all'>('all');
const search = ref('');
const rows = ref<Case[]>([]);
const loading = ref(false);
const detail = ref<Case | null>(null);

// 新建
const showNew = ref(false);
const nu = {
  category: ref<CaseCategory>('copy'),
  title: ref(''),
  content: ref(''),
  industry: ref(''),
  tags: ref(''),
  err: ref<string | null>(null),
  saving: ref(false),
};

async function load() {
  loading.value = true;
  try {
    const cat = category.value === 'all' ? undefined : category.value;
    rows.value = (await casesApi.list({ category: cat, search: search.value || undefined })).data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(category, load);
let st: ReturnType<typeof setTimeout> | null = null;
watch(search, () => {
  if (st) clearTimeout(st);
  st = setTimeout(load, 300);
});

async function openDetail(c: Case) {
  try {
    const res = await casesApi.get(c.id);
    detail.value = res.data;
    await load();
  } catch {
    detail.value = c;
  }
}

async function createCase() {
  nu.saving.value = true;
  nu.err.value = null;
  try {
    await casesApi.create({
      category: nu.category.value,
      title: nu.title.value,
      content: nu.content.value,
      industry: nu.industry.value || undefined,
      tags: nu.tags.value ? nu.tags.value.split(/[,，\s]+/).filter(Boolean) : undefined,
    });
    showNew.value = false;
    nu.title.value = '';
    nu.content.value = '';
    nu.industry.value = '';
    nu.tags.value = '';
    await load();
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    nu.err.value = err.response?.data?.error?.message ?? '新建失败';
  } finally {
    nu.saving.value = false;
  }
}

const categoryLabel: Record<CaseCategory, string> = {
  copy: '文案',
  title: '标题',
  scene: '画面',
  bgm: 'BGM',
  tag: '标签',
  campaign: '投放',
};

const stats = computed(() => {
  const own = rows.value.filter((c) => c.tenantId !== null).length;
  const official = rows.value.filter((c) => c.tenantId === null).length;
  return { own, official, total: rows.value.length };
});
</script>

<template>
  <div class="page">
    <header class="topbar">
      <div>
        <h1 class="title">案例库</h1>
        <div class="sub">
          私库 {{ stats.own }} · 官方 {{ stats.official }} · 共 {{ stats.total }} 条
        </div>
      </div>
      <MButton @click="showNew = true">+ 手动入库</MButton>
    </header>

    <div class="tabs">
      <button
        v-for="cat in CATEGORIES"
        :key="cat.key"
        :class="['tab', { 'tab--active': category === cat.key, 'tab--disabled': !cat.enabled }]"
        :disabled="!cat.enabled"
        @click="cat.enabled && (category = cat.key)"
      >
        {{ cat.label }}
        <span v-if="!cat.enabled" class="tab__lock">V2</span>
      </button>
    </div>

    <MCard padded>
      <div style="margin-bottom: 12px;">
        <input
          v-model="search"
          class="input"
          placeholder="🔍 搜索标题 / 内容 / 行业"
          maxlength="60"
        />
      </div>
      <div v-if="loading">加载中…</div>
      <div v-else-if="rows.length === 0" class="empty">暂无案例</div>
      <ul v-else class="list">
        <li
          v-for="c in rows"
          :key="c.id"
          class="item"
          @click="openDetail(c)"
        >
          <div class="item__left">
            <div class="item__title">{{ c.title }}</div>
            <div class="item__meta">
              <MStatusTag size="sm" :tone="c.tenantId === null ? 'cyan' : 'green'">
                {{ c.tenantId === null ? '官方' : '私库' }}
              </MStatusTag>
              <span>· {{ categoryLabel[c.category] }}</span>
              <span v-if="c.industry">· {{ c.industry }}</span>
              <span>· 调用 {{ c.callCount }} 次</span>
            </div>
          </div>
          <div class="item__right">
            {{ new Date(c.updatedAt).toLocaleDateString() }}
          </div>
        </li>
      </ul>
    </MCard>

    <!-- 详情抽屉 -->
    <transition name="fade">
      <div v-if="detail" class="drawer-mask" @click.self="detail = null">
        <div class="drawer">
          <header class="drawer__head">
            <div>
              <h3 class="drawer__title">{{ detail.title }}</h3>
              <div class="drawer__meta">
                {{ categoryLabel[detail.category] }} · 调用 {{ detail.callCount }} 次 ·
                {{ detail.industry ?? '' }}
              </div>
            </div>
            <button class="drawer__close" @click="detail = null">×</button>
          </header>
          <pre class="drawer__content">{{ detail.content }}</pre>
        </div>
      </div>
    </transition>

    <!-- 新建弹窗 -->
    <transition name="fade">
      <div v-if="showNew" class="drawer-mask" @click.self="showNew = false">
        <div class="drawer drawer--form">
          <h3 class="drawer__title">手动入库</h3>
          <div class="field">
            <label>分类</label>
            <select v-model="nu.category.value" class="input">
              <option value="copy">文案</option>
              <option value="title">标题</option>
            </select>
          </div>
          <div class="field">
            <label>标题</label>
            <input v-model="nu.title.value" class="input" maxlength="200" />
          </div>
          <div class="field">
            <label>内容</label>
            <textarea v-model="nu.content.value" class="input" rows="6" />
          </div>
          <div class="field">
            <label>行业（可选）</label>
            <input v-model="nu.industry.value" class="input" />
          </div>
          <div class="field">
            <label>标签（逗号分隔）</label>
            <input v-model="nu.tags.value" class="input" placeholder="老板IP, 故事型" />
          </div>
          <div v-if="nu.err.value" class="err">{{ nu.err.value }}</div>
          <div class="actions">
            <MButton variant="ghost" @click="showNew = false">取消</MButton>
            <MButton
              :loading="nu.saving.value"
              :disabled="nu.title.value.length < 2 || nu.content.value.length < 2"
              @click="createCase"
            >
              保存
            </MButton>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.page { padding: 24px 32px 40px; background: #F3F5FA; min-height: 100vh; }
.topbar { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
.title { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-dark); }
.sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.tabs {
  display: flex; gap: 4px;
  background: white; border: 1px solid var(--card-border);
  border-radius: 10px; padding: 4px;
  margin-bottom: 16px;
  width: fit-content;
}
.tab {
  background: none; border: none; padding: 8px 16px;
  border-radius: 6px; font-size: 13px; cursor: pointer;
  color: var(--text-body); font-family: inherit;
  display: inline-flex; align-items: center; gap: 6px;
}
.tab:hover:not(.tab--disabled) { background: var(--card-bg); }
.tab--active { background: var(--dark-bg); color: white; font-weight: 600; }
.tab--disabled { opacity: 0.5; cursor: not-allowed; }
.tab__lock {
  font-size: 9px; padding: 1px 4px;
  background: var(--card-bg); color: var(--text-muted);
  border-radius: 3px;
}

.input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
}
.input:focus { outline: none; border-color: var(--cyan); }
textarea.input { resize: vertical; line-height: 1.7; }

.list { list-style: none; padding: 0; margin: 0; }
.item {
  display: flex; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--card-border);
  cursor: pointer;
}
.item:last-child { border-bottom: none; }
.item:hover { background: #F0F9FF; }
.item__title { font-size: 14px; font-weight: 500; color: var(--text-dark); margin-bottom: 4px; }
.item__meta {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--text-muted);
}
.item__right { font-size: 11px; color: var(--text-muted); }

.empty { padding: 40px 0; text-align: center; color: var(--text-muted); }

.drawer-mask {
  position: fixed; inset: 0;
  background: rgba(15, 27, 60, 0.5);
  display: flex; justify-content: flex-end;
  z-index: 9999;
}
.drawer {
  width: 520px; max-width: 100vw; height: 100vh;
  background: white; padding: 24px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 12px;
}
.drawer--form { gap: 14px; }
.drawer__head {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 8px;
}
.drawer__title { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-dark); }
.drawer__meta { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.drawer__close {
  background: none; border: none; font-size: 24px;
  color: var(--text-muted); cursor: pointer;
}
.drawer__content {
  padding: 16px; background: var(--card-bg);
  border-radius: 8px; font-family: inherit;
  font-size: 14px; line-height: 1.8;
  white-space: pre-wrap; color: var(--text-body);
}
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 12px; color: var(--text-muted); }
.err {
  padding: 8px 12px; background: rgba(239, 68, 68, 0.1);
  color: var(--red); border-radius: 6px; font-size: 12px;
}
.actions {
  display: flex; gap: 8px; justify-content: flex-end;
  margin-top: 8px;
}

.fade-enter-active, .fade-leave-active { transition: opacity 150ms; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
