import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi, type AuthSession } from '@/api/auth.api';
import type { StaffRole } from '@/api/types';

const TOKEN_KEY = 'mindlink.token';
const REFRESH_KEY = 'mindlink.refresh';
const USER_KEY = 'mindlink.user';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_KEY));
  const currentUser = ref<AuthSession['user'] | null>(loadCached());

  const isLoggedIn = computed(() => Boolean(token.value && currentUser.value));
  const role = computed<StaffRole | null>(() => currentUser.value?.role ?? null);

  function setSession(session: AuthSession) {
    token.value = session.accessToken;
    refreshToken.value = session.refreshToken;
    currentUser.value = session.user;
    localStorage.setItem(TOKEN_KEY, session.accessToken);
    localStorage.setItem(REFRESH_KEY, session.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  }

  function clear() {
    token.value = null;
    refreshToken.value = null;
    currentUser.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function login(phone: string, password: string) {
    const res = await authApi.login(phone, password);
    setSession(res.data);
  }

  async function registerTenant(body: Parameters<typeof authApi.registerTenant>[0]) {
    const res = await authApi.registerTenant(body);
    setSession(res.data);
  }

  async function acceptInvite(token: string, password: string) {
    const res = await authApi.acceptInvite(token, password);
    setSession(res.data);
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      /* stateless JWT · 失败可忽略 */
    }
    clear();
  }

  return {
    token,
    currentUser,
    role,
    isLoggedIn,
    setSession,
    clear,
    login,
    registerTenant,
    acceptInvite,
    logout,
  };
});

function loadCached(): AuthSession['user'] | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
