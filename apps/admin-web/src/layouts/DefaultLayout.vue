<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { visibleItemsFor } from '@/config/menu';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const menu = computed(() => visibleItemsFor(auth.role));
const currentPath = computed(() => route.path);

function isActive(path?: string) {
  if (!path) return false;
  if (path === '/app') return currentPath.value === '/app';
  return currentPath.value.startsWith(path);
}

async function onLogout() {
  await auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <RouterLink to="/app" class="sidebar__logo">
        <div class="sidebar__logo-main">MINDLINK</div>
        <div class="sidebar__logo-sub">代运营协同</div>
      </RouterLink>

      <div class="sidebar__tenant">
        <div class="sidebar__tenant-name">{{ auth.currentUser?.name ?? '—' }}</div>
        <div class="sidebar__tenant-role">{{ auth.currentUser?.role ?? '' }}</div>
      </div>

      <nav class="sidebar__nav">
        <template v-for="item in menu" :key="item.key">
          <RouterLink
            v-if="item.path && !item.disabled"
            :to="item.path"
            :class="['sidebar__item', { 'sidebar__item--active': isActive(item.path) }]"
          >
            <span class="sidebar__icon">{{ item.icon }}</span>
            <span class="sidebar__label">{{ item.title }}</span>
          </RouterLink>
          <div v-else :class="['sidebar__item', 'sidebar__item--disabled']">
            <span class="sidebar__icon">{{ item.icon }}</span>
            <span class="sidebar__label">{{ item.title }}</span>
            <span class="sidebar__badge">待建</span>
          </div>
        </template>
      </nav>

      <div class="sidebar__footer">
        <button class="sidebar__logout" @click="onLogout">退出登录</button>
      </div>
    </aside>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
  background: #0A1228;
}
.sidebar {
  background: var(--dark-bg);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  padding: 24px 0 0;
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.sidebar__logo {
  display: block;
  padding: 0 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  text-decoration: none;
}
.sidebar__logo-main {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 3px;
}
.sidebar__logo-sub {
  font-size: 10px;
  color: var(--cyan);
  letter-spacing: 4px;
  margin-top: 4px;
}
.sidebar__tenant {
  padding: 14px 24px;
}
.sidebar__tenant-name {
  color: #fff;
  font-size: 13px;
  font-weight: 500;
}
.sidebar__tenant-role {
  color: var(--cyan);
  font-size: 11px;
  margin-top: 2px;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.sidebar__nav {
  flex: 1;
  padding: 4px 12px;
  overflow-y: auto;
}
.sidebar__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 2px;
  color: var(--text-light);
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  text-decoration: none;
  transition: all 150ms ease-out;
  position: relative;
}
.sidebar__item:hover:not(.sidebar__item--disabled) {
  background: var(--dark-bg-2);
  color: #fff;
}
.sidebar__item--active {
  background: var(--dark-bg-2);
  color: #fff;
  box-shadow: inset 2px 0 0 var(--cyan);
}
.sidebar__item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.sidebar__label {
  flex: 1;
}
.sidebar__icon {
  font-size: 14px;
}
.sidebar__badge {
  margin-left: auto;
  padding: 1px 6px;
  font-size: 10px;
  color: var(--cyan);
  background: rgba(56, 189, 248, 0.1);
  border-radius: 4px;
}
.sidebar__footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.sidebar__logout {
  background: none;
  border: none;
  color: var(--text-light);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.sidebar__logout:hover {
  color: var(--red);
}
.content {
  background: var(--light-bg);
  overflow-y: auto;
}
</style>
