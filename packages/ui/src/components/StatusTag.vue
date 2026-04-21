<script setup lang="ts">
type Tone = 'green' | 'amber' | 'red' | 'cyan' | 'purple' | 'pink' | 'gray';

withDefaults(
  defineProps<{
    tone?: Tone;
    size?: 'sm' | 'md';
  }>(),
  { tone: 'gray', size: 'md' },
);
</script>

<template>
  <span :class="['m-tag', `m-tag--${tone}`, `m-tag--${size}`]">
    <slot />
  </span>
</template>

<style scoped>
.m-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 9999px;
  font-weight: 500;
  white-space: nowrap;
}
.m-tag--sm {
  height: 20px;
  padding: 0 8px;
  font-size: 11px;
}
.m-tag--md {
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
}
.m-tag--green {
  background: rgba(16, 185, 129, 0.1);
  color: var(--green);
}
.m-tag--amber {
  background: rgba(245, 158, 11, 0.1);
  color: var(--amber);
}
.m-tag--red {
  background: rgba(239, 68, 68, 0.1);
  color: var(--red);
}
.m-tag--cyan {
  background: rgba(56, 189, 248, 0.1);
  color: var(--cyan);
}
.m-tag--purple {
  background: rgba(139, 92, 246, 0.1);
  color: var(--purple);
}
.m-tag--pink {
  background: rgba(236, 72, 153, 0.1);
  color: var(--pink);
}
.m-tag--gray {
  background: rgba(100, 116, 139, 0.1);
  color: var(--text-muted);
}
</style>
