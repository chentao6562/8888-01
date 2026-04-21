<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    loading?: boolean;
    block?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    block: false,
    type: 'button',
  },
);

defineEmits<{
  click: [event: MouseEvent];
}>();

const classes = computed(() => [
  'm-btn',
  `m-btn--${props.variant}`,
  `m-btn--${props.size}`,
  { 'm-btn--block': props.block, 'm-btn--disabled': props.disabled || props.loading },
]);
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled || loading" @click="$emit('click', $event)">
    <span v-if="loading" class="m-btn__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.m-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-family: inherit;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: all 150ms ease-out;
  white-space: nowrap;
}
.m-btn--sm {
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
}
.m-btn--md {
  height: 40px;
  padding: 0 16px;
  font-size: 14px;
}
.m-btn--lg {
  height: 48px;
  padding: 0 24px;
  font-size: 16px;
}
.m-btn--block {
  display: flex;
  width: 100%;
}
.m-btn--primary {
  background: var(--navy);
  color: #fff;
}
.m-btn--primary:hover:not(:disabled) {
  background: #161d52;
}
.m-btn--secondary {
  background: #fff;
  color: var(--navy);
  border-color: var(--card-border);
}
.m-btn--secondary:hover:not(:disabled) {
  border-color: var(--cyan);
  color: var(--cyan);
}
.m-btn--danger {
  background: var(--red);
  color: #fff;
}
.m-btn--danger:hover:not(:disabled) {
  background: #dc2626;
}
.m-btn--ghost {
  background: transparent;
  color: var(--text-body);
}
.m-btn--ghost:hover:not(:disabled) {
  background: var(--card-bg);
}
.m-btn:disabled,
.m-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.m-btn__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: m-btn-spin 0.6s linear infinite;
}
@keyframes m-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
