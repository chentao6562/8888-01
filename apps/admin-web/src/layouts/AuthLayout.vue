<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="auth-layout">
    <div class="auth-layout__bg" />
    <div class="auth-layout__content">
      <header class="auth-layout__brand">
        <div class="auth-layout__logo">MINDLINK</div>
        <div class="auth-layout__sub">代运营协同系统</div>
      </header>
      <main class="auth-layout__main">
        <RouterView />
      </main>
      <footer class="auth-layout__footer">
        © 2026 思链科技 · 八方来客 · 内蒙古呼和浩特
      </footer>
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #0F1B3C 0%, #1A2749 50%, #263459 100%);
  color: #fff;
  overflow: hidden;
}
.auth-layout__bg {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.25), transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(30, 39, 97, 0.6), transparent 50%);
  pointer-events: none;
}
.auth-layout__content {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}
.auth-layout__brand {
  text-align: center;
  margin-bottom: 32px;
}
.auth-layout__logo {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 8px;
  color: #fff;
}
.auth-layout__sub {
  margin-top: 6px;
  font-size: 12px;
  color: #38BDF8;
  letter-spacing: 4px;
}
.auth-layout__main {
  width: 100%;
  max-width: 400px;
}
.auth-layout__footer {
  margin-top: 48px;
  font-size: 12px;
  color: rgba(203, 213, 225, 0.7);
}
</style>
