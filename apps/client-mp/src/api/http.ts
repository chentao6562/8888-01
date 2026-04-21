const TOKEN_KEY = 'mindlink.client.token';
const BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE) ||
  'http://localhost:3000/api/v1';

export function getToken(): string | null {
  try {
    return uni.getStorageSync(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (token) uni.setStorageSync(TOKEN_KEY, token);
  else uni.removeStorageSync(TOKEN_KEY);
}

export interface ApiResponse<T> {
  data: T;
  code?: string;
  message?: string;
}

export async function request<T = unknown>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: object; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${path}`,
      method,
      data: body,
      header: headers,
      success(res) {
        const payload = res.data as ApiResponse<T> | { code?: string; message?: string };
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve((payload as ApiResponse<T>).data);
        } else {
          reject({
            status: res.statusCode,
            code: (payload as { code?: string }).code,
            message: (payload as { message?: string }).message ?? `HTTP ${res.statusCode}`,
          });
        }
      },
      fail(err) {
        reject({ status: 0, code: 'NETWORK_ERROR', message: err.errMsg });
      },
    });
  });
}
