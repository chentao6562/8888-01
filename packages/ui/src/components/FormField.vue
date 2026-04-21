<script setup lang="ts">
defineProps<{
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}>();
</script>

<template>
  <label class="m-field">
    <span v-if="label" class="m-field__label">
      {{ label }}
      <span v-if="required" class="m-field__required">*</span>
    </span>
    <slot />
    <span v-if="error" class="m-field__error">{{ error }}</span>
    <span v-else-if="hint" class="m-field__hint">{{ hint }}</span>
  </label>
</template>

<style scoped>
.m-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}
.m-field__label {
  font-weight: 500;
  color: var(--text-body);
}
.m-field__required {
  color: var(--red);
  margin-left: 2px;
}
.m-field__hint {
  font-size: 12px;
  color: var(--text-muted);
}
.m-field__error {
  font-size: 12px;
  color: var(--red);
}
</style>
