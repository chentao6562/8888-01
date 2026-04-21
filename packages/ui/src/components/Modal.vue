<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    width?: string;
    closable?: boolean;
  }>(),
  { width: '480px', closable: true },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  close: [];
}>();

function close() {
  emit('update:modelValue', false);
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="m-modal">
      <div v-if="modelValue" class="m-modal__mask" @click.self="closable && close()">
        <div class="m-modal__panel" :style="{ width }">
          <header v-if="title || $slots.header" class="m-modal__header">
            <slot name="header">
              <h3 class="m-modal__title">{{ title }}</h3>
            </slot>
            <button v-if="closable" class="m-modal__close" type="button" @click="close">×</button>
          </header>
          <div class="m-modal__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="m-modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.m-modal__mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 27, 60, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.m-modal__panel {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 48px rgba(15, 27, 60, 0.16);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.m-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--card-border);
}
.m-modal__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-dark);
}
.m-modal__close {
  background: transparent;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
}
.m-modal__body {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}
.m-modal__footer {
  padding: 16px 24px;
  border-top: 1px solid var(--card-border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.m-modal-enter-active,
.m-modal-leave-active {
  transition: opacity 150ms ease-out;
}
.m-modal-enter-from,
.m-modal-leave-to {
  opacity: 0;
}
</style>
