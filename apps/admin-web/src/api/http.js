import axios from 'axios';
const baseURL = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api/v1';
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
instance.interceptors.response.use((response) => response.data, (error) => {
    const status = error.response?.status;
    if (status === 401) {
        localStorage.removeItem('mindlink.token');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});
/** axios 拦截器返回的是 response.data，此处类型反映该行为：`http.get<T>()` 直接拿到 T。 */
export const http = {
    get(url, config) {
        return instance.get(url, config);
    },
    post(url, data, config) {
        return instance.post(url, data, config);
    },
    patch(url, data, config) {
        return instance.patch(url, data, config);
    },
    put(url, data, config) {
        return instance.put(url, data, config);
    },
    delete(url, config) {
        return instance.delete(url, config);
    },
};
//# sourceMappingURL=http.js.map