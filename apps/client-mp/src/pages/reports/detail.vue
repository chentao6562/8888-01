<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { ref, computed } from 'vue';
import {
  fetchReportDetail, markReportRead, submitNps, type Report,
} from '@/api/client';

const reportId = ref('');
const report = ref<Report | null>(null);
const showNps = ref(false);
const npsScore = ref(9);
const npsComment = ref('');
const loading = ref(false);
const err = ref('');

onLoad(async (opts) => {
  reportId.value = (opts as { id?: string }).id ?? '';
  if (reportId.value) await load();
});

async function load() {
  loading.value = true;
  try {
    report.value = await fetchReportDetail(reportId.value);
    if (report.value.status === 'sent') {
      await markReportRead(reportId.value);
      report.value.status = 'read';
      showNps.value = true;
    }
  } catch (e) { err.value = (e as { message?: string }).message ?? '加载失败'; }
  finally { loading.value = false; }
}

async function submit() {
  try {
    await submitNps({ reportId: reportId.value, score: npsScore.value, comment: npsComment.value });
    uni.showToast({ title: '感谢反馈', icon: 'success' });
    showNps.value = false;
  } catch (e) { err.value = (e as { message?: string }).message ?? '提交失败'; }
}

function parseSections() {
  try { return JSON.parse(report.value?.sections ?? '{}'); }
  catch { return {}; }
}

const sections = computed(() => parseSections());
</script>

<template>
  <view class="detail">
    <view v-if="report" class="detail__head">
      <text class="detail__title">{{ report.month }} 月度报告</text>
      <text class="detail__status">{{ report.status === 'read' ? '已阅读' : '未读' }}</text>
    </view>

    <view v-if="sections && sections.overview" class="sect">
      <text class="sect__title">📊 本月总览</text>
      <view class="kpi-row">
        <view class="kpi"><text class="kpi__label">播放</text><text class="kpi__value">{{ sections.overview.plays || '—' }}</text></view>
        <view class="kpi"><text class="kpi__label">到店</text><text class="kpi__value">{{ sections.overview.toStore || '—' }}</text></view>
        <view class="kpi"><text class="kpi__label">ROI</text><text class="kpi__value">{{ sections.overview.roi || '—' }}</text></view>
      </view>
    </view>

    <view v-if="sections && sections.deliverables" class="sect">
      <text class="sect__title">📦 本月交付</text>
      <view v-for="(d, idx) in sections.deliverables" :key="idx" class="sect__item">· {{ d }}</view>
    </view>

    <view v-if="sections && sections.trafficAnalysis" class="sect">
      <text class="sect__title">📈 流量分析</text>
      <text class="sect__text">{{ sections.trafficAnalysis }}</text>
    </view>

    <view v-if="sections && sections.topHits" class="sect">
      <text class="sect__title">🔥 爆款 Top</text>
      <view v-for="(h, idx) in sections.topHits" :key="idx" class="sect__item">
        {{ idx + 1 }}. {{ h.title }}（{{ (h.plays || 0).toLocaleString() }} 播放）
      </view>
    </view>

    <view v-if="sections && sections.reflections" class="sect sect--reflect">
      <text class="sect__title">🤔 未达标反思</text>
      <text class="sect__text">{{ sections.reflections }}</text>
    </view>

    <view v-if="sections && sections.nextFocus" class="sect sect--focus">
      <text class="sect__title">🎯 下月重点</text>
      <text class="sect__text">{{ sections.nextFocus }}</text>
    </view>

    <view v-if="!Object.keys(sections).length && report" class="sect">
      <text class="sect__text">{{ report.finalContent }}</text>
    </view>

    <!-- NPS 弹窗 -->
    <view v-if="showNps" class="nps-mask">
      <view class="nps">
        <text class="nps__title">本月服务还满意吗？</text>
        <text class="nps__sub">0 不满意 → 10 非常满意</text>
        <view class="nps__scores">
          <text
            v-for="n in 11" :key="n - 1"
            :class="['nps__score', { 'nps__score--sel': npsScore === n - 1 }]"
            @click="npsScore = n - 1"
          >{{ n - 1 }}</text>
        </view>
        <textarea
          v-model="npsComment"
          class="nps__comment"
          placeholder="（可选）有哪里可以做得更好？"
          :maxlength="200"
        />
        <view class="nps__actions">
          <button class="nps__btn nps__btn--skip" @click="showNps = false">跳过</button>
          <button class="nps__btn nps__btn--submit" @click="submit">提交</button>
        </view>
      </view>
    </view>

    <view v-if="err" class="detail__err">{{ err }}</view>
    <view v-if="loading" class="detail__loading">加载中…</view>
  </view>
</template>

<style lang="scss" scoped>
.detail { padding: 24rpx 24rpx 120rpx; }
.detail__head {
  background: linear-gradient(135deg, #0F1B3C, #1A2749);
  color: #fff;
  padding: 40rpx 32rpx;
  border-radius: 20rpx;
  display: flex; flex-direction: column; gap: 8rpx;
  margin-bottom: 24rpx;
}
.detail__title { font-size: 40rpx; font-weight: 700; }
.detail__status { font-size: 22rpx; color: #94A3B8; }

.sect {
  background: #fff; border-radius: 16rpx;
  padding: 28rpx; margin-bottom: 20rpx;
}
.sect--reflect { background: #FEF3C7; }
.sect--focus { background: #DBEAFE; }
.sect__title { display: block; font-size: 28rpx; font-weight: 600; color: #0F1B3C; margin-bottom: 16rpx; }
.sect__text { font-size: 26rpx; color: #334155; line-height: 1.7; }
.sect__item { font-size: 26rpx; color: #334155; line-height: 1.8; }

.kpi-row { display: flex; gap: 16rpx; }
.kpi {
  flex: 1; background: #F1F5F9; padding: 20rpx; border-radius: 12rpx;
  display: flex; flex-direction: column; align-items: center; gap: 4rpx;
}
.kpi__label { font-size: 22rpx; color: #64748B; }
.kpi__value { font-size: 36rpx; font-weight: 700; color: #0F1B3C; }

.nps-mask {
  position: fixed; inset: 0; background: rgba(15, 27, 60, 0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 0 40rpx;
}
.nps {
  background: #fff; border-radius: 20rpx; padding: 40rpx 32rpx; width: 100%;
  display: flex; flex-direction: column; gap: 20rpx;
}
.nps__title { font-size: 32rpx; font-weight: 600; color: #0F1B3C; text-align: center; }
.nps__sub { font-size: 22rpx; color: #64748B; text-align: center; }
.nps__scores { display: flex; flex-wrap: wrap; gap: 12rpx; justify-content: center; margin: 12rpx 0; }
.nps__score {
  width: 60rpx; height: 60rpx; line-height: 60rpx; text-align: center;
  border-radius: 50%; background: #F1F5F9; color: #64748B; font-size: 24rpx;
}
.nps__score--sel { background: #0F1B3C; color: #fff; }
.nps__comment {
  border: 2rpx solid #E2E8F0; border-radius: 12rpx;
  padding: 16rpx; min-height: 120rpx; font-size: 24rpx;
}
.nps__actions { display: flex; gap: 16rpx; }
.nps__btn { flex: 1; height: 80rpx; font-size: 28rpx; border-radius: 12rpx; }
.nps__btn--skip { background: #F1F5F9; color: #64748B; }
.nps__btn--submit { background: #0F1B3C; color: #fff; }

.detail__err { color: #DC2626; padding: 24rpx; }
.detail__loading { text-align: center; color: #94A3B8; padding: 40rpx; }
</style>
