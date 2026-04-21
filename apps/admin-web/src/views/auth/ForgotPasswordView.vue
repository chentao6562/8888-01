<script setup lang="ts">
import { MButton, MCard } from '@mindlink/ui';
import { RouterLink } from 'vue-router';
</script>

<template>
  <MCard padded>
    <template #header>
      <h2 class="auth__title">忘记密码</h2>
    </template>
    <div class="auth__hint">
      <p>手机号 + 短信验证码 + 重置密码 流程由 <strong>phase 8</strong> 接入真实短信服务时完成。</p>
      <p>MVP 开发期：请联系公司管理员在员工管理页中重置。</p>
    </div>
    <RouterLink to="/login">
      <MButton variant="ghost" block>← 返回登录</MButton>
    </RouterLink>
  </MCard>
</template>

<style scoped>
.auth__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-dark);
}
.auth__hint {
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.7;
}
.auth__hint strong {
  color: var(--cyan);
}
</style>
