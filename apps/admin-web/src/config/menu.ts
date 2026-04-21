import type { StaffRole } from '@/api/types';

export interface MenuItem {
  key: string;
  title: string;
  icon: string;
  path?: string;
  roles?: StaffRole[]; // 未指定 = 全员可见
  disabled?: boolean;
}

/**
 * 管理端侧栏菜单。每 phase 完工解锁一组菜单项。
 * 规则：项有 path 且未 disabled 才能点击。
 */
export const menuItems: MenuItem[] = [
  // phase 6 启用
  { key: 'dashboard', title: '管理驾驶舱', icon: '📊', path: '/dashboard', roles: ['admin'] },
  { key: 'renewals', title: '续约预警', icon: '🔁', path: '/renewals', roles: ['admin', 'pm'] },
  // phase 2 启用
  { key: 'leads', title: '线索池', icon: '🎯', path: '/leads', roles: ['admin', 'pm', 'strategist'] },
  { key: 'customers', title: '客户管理', icon: '👥', path: '/customers', roles: ['admin', 'pm', 'strategist'] },
  // phase 3 启用
  { key: 'contracts', title: '合同', icon: '📄', path: '/contracts', roles: ['admin', 'pm'] },
  { key: 'projects', title: '项目', icon: '🎬', path: '/projects', roles: ['admin', 'pm', 'strategist'] },
  { key: 'videos', title: '视频', icon: '🎞️', path: '/videos', roles: ['admin', 'pm', 'strategist', 'creator', 'adops'] },
  { key: 'tasks', title: '我的任务', icon: '✅', path: '/tasks/mine' },
  // phase 4 启用
  { key: 'content', title: '内容生产', icon: '✍️', path: '/content-studio', roles: ['admin', 'pm', 'strategist', 'creator', 'adops'] },
  { key: 'cases', title: '案例库', icon: '📚', path: '/cases' },
  // phase 5 启用
  { key: 'metrics', title: '数据录入', icon: '📈', path: '/metrics', roles: ['admin', 'pm', 'adops'] },
  { key: 'reports', title: '月度报告', icon: '📰', path: '/reports', roles: ['admin', 'pm', 'strategist'] },
  { key: 'analytics', title: '公司分析', icon: '🧭', path: '/analytics/company', roles: ['admin'] },
  // phase 1 启用
  { key: 'staff', title: '员工管理', icon: '⚙️', path: '/staff', roles: ['admin'] },
  { key: 'tenant', title: '公司设置', icon: '🏢', path: '/tenant', roles: ['admin'] },
];

export function visibleItemsFor(role: StaffRole | null): MenuItem[] {
  if (!role) return [];
  return menuItems.filter((item) => !item.roles || item.roles.includes(role));
}
