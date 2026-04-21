<script setup lang="ts">
const updated = '2026-04-21';
</script>

<template>
  <div class="legal">
    <h1>用户协议</h1>
    <p class="legal__meta">生效日期：{{ updated }}</p>

    <h2>1. 服务范围</h2>
    <p>MindLink 是面向本地代运营公司及其客户的双端协同 SaaS。我们提供：CLM 客户生命周期管理、内容生产辅助、月度报告、续约预警、管理驾驶舱、客户端小程序等。</p>

    <h2>2. 账号与安全</h2>
    <ul>
      <li>您应当对账号安全负责，包括但不限于密码保管、登录设备管理</li>
      <li>账号仅限授权员工使用，不得转让、共享给第三方</li>
      <li>发生异常登录或泄露应当立即修改密码并通知管理员</li>
    </ul>

    <h2>3. 您的责任</h2>
    <ul>
      <li>不上传含有违反法律法规、侵犯第三方权利的内容</li>
      <li>不利用平台从事虚假宣传、刷量、不实评价等行为</li>
      <li>对您客户的个人信息收集与处理须取得对方授权</li>
    </ul>

    <h2>4. 我们的责任</h2>
    <ul>
      <li>SLA 目标：月度可用性 ≥ 99.5%（不含计划停机）</li>
      <li>每日全量备份 + 5 分钟增量，数据保留 30 天</li>
      <li>不会查阅您的业务数据，除非您主动请求技术支持</li>
    </ul>

    <h2>5. 计费</h2>
    <ul>
      <li>Beta 期：首批客户首 3 个月免费</li>
      <li>正式订阅：基础版 ¥299 / 月、专业版 ¥999 / 月、企业版 ¥2999 / 月</li>
      <li>AI 调用、电子签、短信按量计费（具体见账单）</li>
    </ul>

    <h2>6. 终止与数据导出</h2>
    <ul>
      <li>您可以随时停用账号；最终注销后数据将在 30 天后删除</li>
      <li>注销前可联系工单导出全部业务数据（CSV + JSON）</li>
    </ul>

    <h2>7. 免责</h2>
    <p>因不可抗力、网络异常、第三方服务（云、AI、电子签）故障导致的服务中断，我们尽合理努力恢复，不承担直接或间接损失。</p>

    <h2>8. 协议变更</h2>
    <p>我们将提前 7 天在管理端公告变更内容；继续使用视为接受新版协议。</p>
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
