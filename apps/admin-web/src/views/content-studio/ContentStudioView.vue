<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { MButton, MCard, MFormField } from '@mindlink/ui';
import {
  aiApi,
  type CopyFramework,
  type CopywritingResult,
  type Dialect,
  type LlmUsage,
  type TitleCandidate,
} from '@/api/ai.api';
import type { AxiosError } from 'axios';

type Tab = 'copy' | 'titles' | 'tags' | 'dialect';
const tab = ref<Tab>('copy');

const dialect = ref<Dialect>('standard');
const usage = ref<LlmUsage | null>(null);

async function loadUsage() {
  try { usage.value = (await aiApi.usage()).data; } catch { /* ignore */ }
}
onMounted(loadUsage);

// ==== 文案 ====
const copy = {
  sellingPoint: ref(''),
  evidence: ref(''), // 一行一条
  framework: ref<CopyFramework>('story'),
  result: ref<CopywritingResult | null>(null),
  loading: ref(false),
  err: ref<string | null>(null),
};

async function runCopywriting() {
  copy.loading.value = true;
  copy.err.value = null;
  copy.result.value = null;
  try {
    const res = await aiApi.copywriting({
      sellingPoint: copy.sellingPoint.value,
      evidence: copy.evidence.value.split('\n').filter(Boolean),
      framework: copy.framework.value,
      dialect: dialect.value,
    });
    copy.result.value = res.data;
    await loadUsage();
  } catch (e) {
    const err = e as AxiosError<{ error: { code: string; message: string } }>;
    copy.err.value = err.response?.data?.error?.message ?? '生成失败';
  } finally {
    copy.loading.value = false;
  }
}

// ==== 标题 ====
const title = {
  summary: ref(''),
  result: ref<TitleCandidate[]>([]),
  loading: ref(false),
  err: ref<string | null>(null),
};

async function runTitles() {
  title.loading.value = true;
  title.err.value = null;
  title.result.value = [];
  try {
    const res = await aiApi.titles({ summary: title.summary.value, dialect: dialect.value });
    title.result.value = res.data;
    await loadUsage();
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    title.err.value = err.response?.data?.error?.message ?? '生成失败';
  } finally {
    title.loading.value = false;
  }
}

// ==== 标签 ====
const tag = {
  platform: ref('抖音'),
  content: ref(''),
  industry: ref(''),
  result: ref<string[]>([]),
  loading: ref(false),
  err: ref<string | null>(null),
};

async function runTags() {
  tag.loading.value = true;
  tag.err.value = null;
  tag.result.value = [];
  try {
    const res = await aiApi.tags({
      platform: tag.platform.value,
      content: tag.content.value,
      industry: tag.industry.value,
    });
    tag.result.value = res.data;
    await loadUsage();
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    tag.err.value = err.response?.data?.error?.message ?? '生成失败';
  } finally {
    tag.loading.value = false;
  }
}

// ==== 方言 ====
const dlg = {
  input: ref(''),
  target: ref<Dialect>('hohhot'),
  result: ref<string | null>(null),
  loading: ref(false),
  err: ref<string | null>(null),
};

async function runDialect() {
  dlg.loading.value = true;
  dlg.err.value = null;
  dlg.result.value = null;
  try {
    const res = await aiApi.dialectAdapt({ text: dlg.input.value, dialect: dlg.target.value });
    dlg.result.value = res.data.text;
    await loadUsage();
  } catch (e) {
    const err = e as AxiosError<{ error: { message: string } }>;
    dlg.err.value = err.response?.data?.error?.message ?? '生成失败';
  } finally {
    dlg.loading.value = false;
  }
}

// ==== 敏感词实时提示 ====
const sensitiveHits = ref<string[]>([]);
let sensitiveTimer: ReturnType<typeof setTimeout> | null = null;
function onInputCheck(text: string) {
  if (sensitiveTimer) clearTimeout(sensitiveTimer);
  if (!text) { sensitiveHits.value = []; return; }
  sensitiveTimer = setTimeout(async () => {
    try {
      const res = await aiApi.sensitiveCheck(text);
      sensitiveHits.value = res.data.hits;
    } catch {
      sensitiveHits.value = [];
    }
  }, 500);
}

const usageLabel = computed(() => {
  if (!usage.value) return '加载中…';
  const pct = Math.min(100, Math.round((usage.value.used / usage.value.limit) * 100));
  return `${usage.value.used} / ${usage.value.limit} · ${pct}% · ${usage.value.provider}`;
});
</script>

<template>
  <div class="page">
    <header class="topbar">
      <div>
        <h1 class="title">内容生产工作台</h1>
        <div class="sub">AI 文案 / 标题 / 标签 / 方言适配 · 本月用量 {{ usageLabel }}</div>
      </div>
      <div class="ctl">
        <label>方言</label>
        <select v-model="dialect" class="input input--sm">
          <option value="standard">标准话术</option>
          <option value="hohhot">呼市话</option>
          <option value="dongbei">东北话</option>
        </select>
      </div>
    </header>

    <nav class="tabs">
      <button
        v-for="t in (['copy','titles','tags','dialect'] as Tab[])"
        :key="t"
        :class="['tab', { 'tab--active': tab === t }]"
        @click="tab = t"
      >
        {{ ({copy:'AI 文案',titles:'AI 标题',tags:'AI 标签',dialect:'方言适配'} as Record<Tab,string>)[t] }}
      </button>
    </nav>

    <!-- 文案 -->
    <div v-if="tab === 'copy'" class="grid">
      <MCard padded>
        <template #header><h3 class="h">输入</h3></template>
        <MFormField label="卖点 / 主题" required>
          <textarea v-model="copy.sellingPoint.value" class="input" rows="3" @input="onInputCheck(copy.sellingPoint.value)" />
        </MFormField>
        <MFormField label="证据（一行一条）">
          <textarea v-model="copy.evidence.value" class="input" rows="3" placeholder="数据 / 客户反馈" />
        </MFormField>
        <MFormField label="框架">
          <select v-model="copy.framework.value" class="input">
            <option value="story">故事型</option>
            <option value="contrast">对比型</option>
            <option value="dryGoods">干货型</option>
          </select>
        </MFormField>
        <div v-if="sensitiveHits.length" class="sensitive">
          ⚠ 疑似敏感词：{{ sensitiveHits.join(' · ') }}
        </div>
        <MButton :loading="copy.loading.value" :disabled="copy.sellingPoint.value.length < 2" @click="runCopywriting" block>
          生成文案（钩子 · 主体 · CTA）
        </MButton>
      </MCard>

      <MCard padded>
        <template #header><h3 class="h">AI 输出</h3></template>
        <div v-if="copy.err.value" class="err">{{ copy.err.value }}</div>
        <div v-if="copy.result.value" class="three-parts">
          <section><label>钩子</label><p>{{ copy.result.value.hook }}</p></section>
          <section><label>主体</label><p>{{ copy.result.value.body }}</p></section>
          <section><label>CTA</label><p>{{ copy.result.value.cta }}</p></section>
          <div class="meta">provider={{ copy.result.value.provider }} · {{ copy.result.value.latencyMs }}ms</div>
        </div>
        <div v-else-if="!copy.err.value" class="empty">填入卖点 + 证据，点击左侧按钮生成</div>
      </MCard>
    </div>

    <!-- 标题 -->
    <div v-else-if="tab === 'titles'" class="grid">
      <MCard padded>
        <template #header><h3 class="h">输入</h3></template>
        <MFormField label="视频内容简介" required>
          <textarea v-model="title.summary.value" class="input" rows="4" @input="onInputCheck(title.summary.value)" />
        </MFormField>
        <div v-if="sensitiveHits.length" class="sensitive">⚠ {{ sensitiveHits.join(' · ') }}</div>
        <MButton :loading="title.loading.value" :disabled="title.summary.value.length < 5" @click="runTitles" block>
          生成 5 个标题候选
        </MButton>
      </MCard>

      <MCard padded>
        <template #header><h3 class="h">候选（按预期点击率排序）</h3></template>
        <div v-if="title.err.value" class="err">{{ title.err.value }}</div>
        <ol v-if="title.result.value.length" class="titles">
          <li v-for="(c, i) in title.result.value" :key="i">
            <span class="titles__rank">{{ i + 1 }}</span>
            <span class="titles__text">{{ c.title }}</span>
            <span class="titles__score">{{ c.ctrScore }}%</span>
          </li>
        </ol>
        <div v-else-if="!title.err.value" class="empty">输入内容简介点击生成</div>
      </MCard>
    </div>

    <!-- 标签 -->
    <div v-else-if="tab === 'tags'" class="grid">
      <MCard padded>
        <template #header><h3 class="h">输入</h3></template>
        <div class="row">
          <MFormField label="平台">
            <select v-model="tag.platform.value" class="input">
              <option value="抖音">抖音</option>
              <option value="视频号">视频号</option>
              <option value="小红书">小红书</option>
              <option value="快手">快手</option>
            </select>
          </MFormField>
          <MFormField label="行业">
            <input v-model="tag.industry.value" class="input" placeholder="餐饮 / 教培 / 美业" />
          </MFormField>
        </div>
        <MFormField label="视频内容" required>
          <textarea v-model="tag.content.value" class="input" rows="4" />
        </MFormField>
        <MButton :loading="tag.loading.value" :disabled="tag.content.value.length < 2" @click="runTags" block>
          推荐 15 个标签
        </MButton>
      </MCard>

      <MCard padded>
        <template #header><h3 class="h">推荐标签</h3></template>
        <div v-if="tag.err.value" class="err">{{ tag.err.value }}</div>
        <div v-if="tag.result.value.length" class="tags">
          <span v-for="t in tag.result.value" :key="t" class="chip">#{{ t }}</span>
        </div>
        <div v-else-if="!tag.err.value" class="empty">输入视频内容点击生成</div>
      </MCard>
    </div>

    <!-- 方言 -->
    <div v-else-if="tab === 'dialect'" class="grid">
      <MCard padded>
        <template #header><h3 class="h">输入（标准话术）</h3></template>
        <textarea v-model="dlg.input.value" class="input" rows="8" placeholder="把想转换成方言的文案贴在这里" />
        <MFormField label="目标方言" style="margin-top: 12px;">
          <select v-model="dlg.target.value" class="input">
            <option value="hohhot">呼市话</option>
            <option value="dongbei">东北话</option>
            <option value="standard">标准（去方言化）</option>
          </select>
        </MFormField>
        <MButton :loading="dlg.loading.value" :disabled="dlg.input.value.length < 2" @click="runDialect" block>
          切换方言
        </MButton>
      </MCard>

      <MCard padded>
        <template #header><h3 class="h">输出</h3></template>
        <div v-if="dlg.err.value" class="err">{{ dlg.err.value }}</div>
        <pre v-if="dlg.result.value" class="out">{{ dlg.result.value }}</pre>
        <div v-else-if="!dlg.err.value" class="empty">输入后点击切换</div>
      </MCard>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 24px 32px 40px; background: #F3F5FA; min-height: 100vh; }
.topbar { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
.title { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-dark); }
.sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.ctl { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); }

.tabs {
  display: flex; gap: 4px;
  background: white; border: 1px solid var(--card-border);
  border-radius: 10px; padding: 4px;
  margin-bottom: 16px;
  width: fit-content;
}
.tab {
  background: none; border: none; padding: 8px 18px;
  border-radius: 6px; font-family: inherit; font-size: 13px;
  cursor: pointer; color: var(--text-body);
}
.tab:hover { background: var(--card-bg); }
.tab--active { background: var(--dark-bg); color: white; font-weight: 600; }

.grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
}
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.h { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-dark); }

.input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.7;
}
.input:focus { outline: none; border-color: var(--cyan); }
.input--sm { height: 28px; padding: 0 8px; font-size: 12px; width: auto; }
textarea.input { resize: vertical; }

.sensitive {
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.1);
  color: var(--amber);
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 12px;
}
.err {
  padding: 10px 12px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--red);
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 12px;
}
.empty { padding: 40px 0; text-align: center; color: var(--text-muted); font-size: 13px; }

.three-parts section {
  margin-bottom: 14px;
}
.three-parts label {
  display: block; font-size: 11px; color: var(--cyan);
  margin-bottom: 4px; letter-spacing: 1px; text-transform: uppercase;
}
.three-parts p {
  margin: 0; padding: 12px; background: var(--card-bg);
  border-radius: 6px; font-size: 14px; line-height: 1.7;
  color: var(--text-body); white-space: pre-wrap;
}
.meta { font-size: 11px; color: var(--text-muted); text-align: right; }

.titles { list-style: none; padding: 0; margin: 0; }
.titles li {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; background: var(--card-bg);
  border-radius: 6px; margin-bottom: 6px;
}
.titles__rank {
  width: 20px; height: 20px; border-radius: 10px;
  background: var(--navy); color: white;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
}
.titles__text { flex: 1; font-size: 13px; color: var(--text-body); }
.titles__score {
  font-family: 'Inter', sans-serif;
  font-weight: 700; color: var(--cyan); font-size: 12px;
}

.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  padding: 4px 10px; background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: var(--cyan); border-radius: 14px;
  font-size: 12px; cursor: pointer;
}
.chip:hover { background: rgba(56, 189, 248, 0.2); }

.out {
  padding: 14px; background: var(--card-bg);
  border-radius: 8px; font-family: inherit;
  font-size: 14px; line-height: 1.8;
  white-space: pre-wrap; color: var(--text-body);
}
</style>
