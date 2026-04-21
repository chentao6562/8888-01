<script setup lang="ts">
import { computed } from 'vue';
const updated = computed(() => '2026-04-21');
</script>

<template>
  <div class="legal">
    <h1>隐私政策</h1>
    <p class="legal__meta">生效日期：{{ updated }} · 上次更新：{{ updated }}</p>

    <h2>1. 我们收集的信息</h2>
    <ul>
      <li>账号信息：手机号、姓名、所属公司、角色</li>
      <li>业务信息：客户档案（含您的客户的联系方式与服务记录）、合同与付款记录、视频素材与发布数据</li>
      <li>使用信息：登录时间与 IP、操作日志（用于审计与故障排查）</li>
    </ul>

    <h2>2. 我们如何使用信息</h2>
    <ul>
      <li>提供 MindLink 平台的核心功能（CLM / 月报 / 续约 / 驾驶舱 / 客户端）</li>
      <li>调用第三方 AI 服务生成文案、标题、月报草稿（仅传输必要字段）</li>
      <li>在合规与审计场景下生成追溯日志</li>
    </ul>

    <h2>3. 信息共享</h2>
    <p>我们不会向第三方出售您的信息。仅在以下情形下共享：</p>
    <ul>
      <li>电子签服务商（履行合同必要）</li>
      <li>对象存储与短信服务商（履行通知与素材分发必要）</li>
      <li>AI 大模型服务商（生成内容必要 · 不会上传客户身份证件 / 银行账号）</li>
      <li>法律法规要求时</li>
    </ul>

    <h2>4. 数据存储与加密</h2>
    <ul>
      <li>所有数据存储于中国境内云服务（腾讯云 / 阿里云）</li>
      <li>敏感字段（手机号、身份证）采用 AES-256-GCM 列级加密</li>
      <li>素材文件通过签名 URL 防盗链分发，单次有效期 5 分钟</li>
      <li>每日全量备份 + 5 分钟 WAL 增量，保留 30 天</li>
    </ul>

    <h2>5. 您的权利</h2>
    <ul>
      <li>查阅、更正、删除您的个人信息</li>
      <li>撤回同意（可能影响部分功能可用性）</li>
      <li>申请数据导出（联系您所在公司管理员）</li>
      <li>注销账号</li>
    </ul>

    <h2>6. Cookie 与本地存储</h2>
    <p>仅使用必要 Cookie / localStorage 存储登录态（access token），不用于跨站追踪。</p>

    <h2>7. 联系我们</h2>
    <p>邮箱：privacy@mindlink.example.com</p>
    <p>地址：内蒙古呼和浩特市 · 思链科技 · 八方来客</p>
  </div>
</template>

<style scoped>
.legal {
  max-width: 720px; margin: 0 auto; padding: 48px 24px 80px;
  color: #334155; line-height: 1.8; font-size: 15px;
}
.legal h1 { font-size: 32px; color: #0F1B3C; margin-bottom: 8px; }
.legal h2 { font-size: 20px; color: #0F1B3C; margin-top: 32px; margin-bottom: 12px; }
.legal__meta { color: #94A3B8; font-size: 13px; margin-bottom: 32px; }
.legal ul { padding-left: 24px; margin: 8px 0; }
.legal li { margin: 6px 0; }
</style>
