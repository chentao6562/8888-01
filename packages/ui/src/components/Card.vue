<script setup lang="ts">
defineProps<{
  title?: string;
  action?: string;
  padded?: boolean;
}>();
</script>

<template>
  <section class="m-card">
    <header v-if="title || $slots.header" class="m-card__header">
      <slot name="header">
        <h3 class="m-card__title">{{ title }}</h3>
      </slot>
      <slot name="action">
        <span v-if="action" class="m-card__action">{{ action }}</span>
      </slot>
    </header>
    <div :class="['m-card__body', { 'm-card__body--padded': padded !== false }]">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.m-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  overflow: hidden;
}
.m-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--card-border);
  background: #fff;
}
.m-card__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-dark);
  margin: 0;
}
.m-card__action {
  font-size: 12px;
  color: var(--cyan);
  cursor: pointer;
}
.m-card__body--padded {
  padding: 20px;
}
</style>
