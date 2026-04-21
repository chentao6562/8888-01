import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

const baseURL = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:3000/api/v1';

const instance = axios.create({
  baseURL,
  timeout: 30000,
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('mindlink.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ error?: { code: string; message: string } }>) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem('mindlink.token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/** axios 拦截器返回的是 response.data，此处类型反映该行为：`http.get<T>()` 直接拿到 T。 */
export const http = {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.get(url, config) as unknown as Promise<T>;
  },
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.post(url, data, config) as unknown as Promise<T>;
  },
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.patch(url, data, config) as unknown as Promise<T>;
  },
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.put(url, data, config) as unknown as Promise<T>;
  },
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.delete(url, config) as unknown as Promise<T>;
  },
};

export type ApiEnvelope<T> = { data: T };
