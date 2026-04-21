<script setup lang="ts" generic="T">
export interface Column<T> {
  key: string;
  title: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => string | number;
}

defineProps<{
  columns: Column<T>[];
  rows: T[];
  rowKey?: keyof T | ((row: T) => string);
  loading?: boolean;
  emptyText?: string;
}>();
</script>

<template>
  <div class="m-table-wrap">
    <table class="m-table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="{ width: col.width, textAlign: col.align ?? 'left' }"
          >
            {{ col.title }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" class="m-table__empty">加载中…</td>
        </tr>
        <tr v-else-if="rows.length === 0">
          <td :colspan="columns.length" class="m-table__empty">
            {{ emptyText ?? '暂无数据' }}
          </td>
        </tr>
        <tr v-for="(row, idx) in rows" v-else :key="idx">
          <td
            v-for="col in columns"
            :key="col.key"
            :style="{ textAlign: col.align ?? 'left' }"
          >
            <slot :name="`cell-${col.key}`" :row="row">
              {{ col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.m-table-wrap {
  width: 100%;
  overflow-x: auto;
  background: #fff;
  border: 1px solid var(--card-border);
  border-radius: 12px;
}
.m-table {
  width: 100%;
  border-collapse: collapse;
}
.m-table thead {
  background: var(--card-bg);
}
.m-table th {
  height: 48px;
  padding: 0 16px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}
.m-table td {
  height: 56px;
  padding: 0 16px;
  font-size: 14px;
  color: var(--text-body);
  border-top: 1px solid var(--card-border);
}
.m-table tbody tr:hover {
  background: #f1f5f9;
}
.m-table__empty {
  text-align: center;
  color: var(--text-muted);
  padding: 48px 0;
}
</style>
