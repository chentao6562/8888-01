<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { MCard } from '@mindlink/ui';
import { useAuthStore } from '@/stores/auth.store';
import { authApi, type MeSnapshot } from '@/api/auth.api';

const auth = useAuthStore();
const me = ref<MeSnapshot | null>(null);

onMounted(async () => {
  try {
    const res = await authApi.me();
    me.value = res.data;
  } catch {
    /* 401 会被拦截器处理 */
  }
});
</script>

<template>
  <div class="home">
    <header class="home__header">
      <h1>欢迎，{{ auth.currentUser?.name ?? '——' }}</h1>
      <span class="home__role">{{ auth.currentUser?.role }}</span>
    </header>

    <MCard title="当前上下文" padded>
      <dl class="home__dl">
        <dt>公司</dt><dd>{{ me?.tenant?.name ?? '加载中…' }}</dd>
        <dt>档位</dt><dd>{{ me?.tenant?.plan ?? '—' }}（上限 {{ me?.tenant?.maxStaff ?? '—' }} 人）</dd>
        <dt>我的手机</dt><dd>{{ me?.staff?.phone ?? '—' }}</dd>
        <dt>我的角色</dt><dd>{{ me?.staff?.role ?? '—' }}</dd>
      </dl>
    </MCard>

    <MCard title="Phase 1 · 已就绪" padded>
      <ul class="home__list">
        <li>✓ 多租户隔离 · RBAC 权限拦截 · JWT + Refresh</li>
        <li>✓ 注册 / 登录 / 邀请接受</li>
        <li>✓ 员工管理（仅管理员）</li>
      </ul>
      <p class="home__hint">
        接下来 phase 2 · 线索池 · 诊断 · 方案 将点亮左侧其他菜单。
      </p>
    </MCard>
  </div>
</template>

<style scoped>
.home {
  padding: 24px 32px;
  max-width: 900px;
}
.home__header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 20px;
}
.home__header h1 {
  margin: 0;
  font-size: 22px;
  color: var(--text-dark);
}
.home__role {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(56, 189, 248, 0.1);
  color: var(--cyan);
}
.home__dl {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 8px 16px;
  font-size: 13px;
  margin: 0;
}
.home__dl dt {
  color: var(--text-muted);
}
.home__dl dd {
  margin: 0;
  color: var(--text-body);
}
.home__list {
  margin: 0 0 12px;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.9;
  color: var(--text-body);
}
.home__hint {
  margin: 12px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--card-border);
  font-size: 12px;
  color: var(--text-muted);
}
.home + .m-card,
.m-card + .m-card {
  margin-top: 16px;
}
</style>
