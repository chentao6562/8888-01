import { type AxiosRequestConfig } from 'axios';
/** axios 拦截器返回的是 response.data，此处类型反映该行为：`http.get<T>()` 直接拿到 T。 */
export declare const http: {
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
    patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
    put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
    delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
};
export type ApiEnvelope<T> = {
    data: T;
};
