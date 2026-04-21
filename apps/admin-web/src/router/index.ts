import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: () => (isAuthed() ? '/app' : '/login') },
  {
    path: '/',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { public: true },
    children: [
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/views/auth/LoginView.vue'),
        meta: { title: '登录' },
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('@/views/auth/RegisterView.vue'),
        meta: { title: '注册公司' },
      },
      {
        path: 'forgot',
        name: 'Forgot',
        component: () => import('@/views/auth/ForgotPasswordView.vue'),
        meta: { title: '忘记密码' },
      },
      {
        path: 'accept-invite',
        name: 'AcceptInvite',
        component: () => import('@/views/auth/AcceptInviteView.vue'),
        meta: { title: '接受邀请' },
      },
    ],
  },
  {
    path: '/app',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Home', component: () => import('@/views/HomeView.vue'), meta: { title: '欢迎' } },
    ],
  },
  {
    path: '/leads',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'pm', 'strategist'] },
    children: [
      {
        path: '',
        name: 'LeadPool',
        component: () => import('@/views/leads/LeadPoolView.vue'),
        meta: { title: '线索池' },
      },
    ],
  },
  {
    path: '/customers',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'pm', 'strategist'] },
    children: [
      {
        path: '',
        name: 'CustomerList',
        component: () => import('@/views/customers/CustomerListView.vue'),
        meta: { title: '客户管理' },
      },
      {
        path: ':id',
        name: 'CustomerDetail',
        component: () => import('@/views/customers/CustomerDetailView.vue'),
        meta: { title: '客户详情' },
      },
    ],
  },
  {
    path: '/diagnosis',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'pm', 'strategist'] },
    children: [
      {
        path: ':customerId',
        name: 'DiagnosisWorkbench',
        component: () => import('@/views/diagnosis/DiagnosisWorkbenchView.vue'),
        meta: { title: '诊断工作台' },
      },
    ],
  },
  {
    path: '/proposals',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'pm', 'strategist'] },
    children: [
      {
        path: 'new',
        name: 'ProposalNew',
        component: () => import('@/views/proposals/ProposalEditorView.vue'),
        meta: { title: '新建方案' },
      },
      {
        path: ':id',
        name: 'ProposalEdit',
        component: () => import('@/views/proposals/ProposalEditorView.vue'),
        meta: { title: '方案编辑' },
      },
    ],
  },
  {
    path: '/contracts',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'pm'] },
    children: [
      {
        path: '',
        name: 'ContractList',
        component: () => import('@/views/contracts/ContractListView.vue'),
        meta: { title: '合同管理' },
      },
      {
        path: ':id',
        name: 'ContractDetail',
        component: () => import('@/views/contracts/ContractDetailView.vue'),
        meta: { title: '合同详情' },
      },
    ],
  },
  {
    path: '/projects',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'pm', 'strategist'] },
    children: [
      {
        path: '',
        name: 'ProjectBoard',
        component: () => import('@/views/projects/ProjectBoardView.vue'),
        meta: { title: '项目管理' },
      },
      {
        path: ':id',
        name: 'ProjectDetail',
        component: () => import('@/views/projects/ProjectDetailView.vue'),
        meta: { title: '项目详情' },
      },
    ],
  },
  {
    path: '/tasks',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'mine',
        name: 'MyTasks',
        component: () => import('@/views/tasks/MyTasksView.vue'),
        meta: { title: '我的任务' },
      },
    ],
  },
  {
    path: '/videos',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'pm', 'strategist', 'creator', 'adops'] },
    children: [
      {
        path: '',
        name: 'VideoList',
        component: () => import('@/views/videos/VideoListView.vue'),
        meta: { title: '视频列表' },
      },
    ],
  },
  {
    path: '/content-studio',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'pm', 'strategist', 'creator', 'adops'] },
    children: [
      {
        path: '',
        name: 'ContentStudio',
        component: () => import('@/views/content-studio/ContentStudioView.vue'),
        meta: { title: '内容生产' },
      },
    ],
  },
  {
    path: '/cases',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'CaseLibrary',
        component: () => import('@/views/cases/CaseLibraryView.vue'),
        meta: { title: '案例库' },
      },
    ],
  },
  {
    path: '/metrics',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'pm', 'adops'] },
    children: [
      {
        path: '',
        name: 'MetricsEntry',
        component: () => import('@/views/metrics/MetricsEntryView.vue'),
        meta: { title: '数据录入' },
      },
    ],
  },
  {
    path: '/reports',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'pm', 'strategist'] },
    children: [
      {
        path: '',
        name: 'MonthlyReportList',
        component: () => import('@/views/reports/MonthlyReportListView.vue'),
        meta: { title: '月度报告' },
      },
      {
        path: ':id',
        name: 'MonthlyReportEditor',
        component: () => import('@/views/reports/MonthlyReportEditorView.vue'),
        meta: { title: '月报编辑' },
      },
    ],
  },
  {
    path: '/analytics',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
    children: [
      {
        path: 'company',
        name: 'CompanyAnalytics',
        component: () => import('@/views/analytics/CompanyAnalyticsView.vue'),
        meta: { title: '公司分析' },
      },
    ],
  },
  {
    path: '/dashboard',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { title: '管理驾驶舱' },
      },
    ],
  },
  {
    path: '/renewals',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'pm'] },
    children: [
      {
        path: '',
        name: 'RenewalBoard',
        component: () => import('@/views/renewals/RenewalBoardView.vue'),
        meta: { title: '续约预警' },
      },
      {
        path: ':id',
        name: 'RenewalDetail',
        component: () => import('@/views/renewals/RenewalDetailView.vue'),
        meta: { title: '续约推进' },
      },
    ],
  },
  {
    path: '/staff',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
    children: [
      {
        path: '',
        name: 'StaffList',
        component: () => import('@/views/staff/StaffListView.vue'),
        meta: { title: '员工管理' },
      },
    ],
  },
  {
    path: '/tenant',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
    children: [
      {
        path: '',
        name: 'TenantSettings',
        component: () => import('@/views/tenant/TenantSettingsView.vue'),
        meta: { title: '公司设置' },
      },
    ],
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('@/views/legal/PrivacyView.vue'),
    meta: { public: true, title: '隐私政策' },
  },
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('@/views/legal/TermsView.vue'),
    meta: { public: true, title: '用户协议' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.title) document.title = `MindLink · ${to.meta.title as string}`;

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'Login', query: { redirect: to.fullPath } };
  }
  if (to.meta.public && auth.isLoggedIn && to.name === 'Login') {
    return { path: '/app' };
  }
  const allowedRoles = to.meta.roles as string[] | undefined;
  if (allowedRoles && auth.role && !allowedRoles.includes(auth.role)) {
    return { path: '/app' };
  }
  return true;
});

function isAuthed() {
  return Boolean(localStorage.getItem('mindlink.token'));
}
