import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const BASE_URL =
  Capacitor.isNativePlatform()
    ? 'https://boss-backend-glek.onrender.com'
    : (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== '/'
        ? import.meta.env.VITE_API_URL
        : (import.meta.env.DEV ? '/' : 'https://boss-backend-glek.onrender.com'));

const IS_DEV = import.meta.env.DEV;

// Max times to retry a failed request (network errors / 5xx only)
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

// ─── Create instance ───────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000, // 15 s – fail fast on slow network
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// FormData uploads uchun alohida instance (timeout yo'q, Content-Type yo'q)
export const uploadApi = axios.create({
  baseURL: BASE_URL,
  timeout: 0, // Katta fayllar uchun timeout yo'q
  headers: {
    Accept: 'application/json',
  },
});

// ─── Helpers ───────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token');
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

/** Translate common HTTP status codes to Uzbek user-friendly messages */
function translateError(error) {
  const status = error?.response?.status;
  const serverMsg = error?.response?.data?.message;

  if (!status) {
    // Network / timeout
    if (error?.code === 'ECONNABORTED') {
      return "So'rov muddati tugadi. Internet aloqangizni tekshiring.";
    }
    return "Server bilan ulanib bo'lmadi. Internet aloqangizni tekshiring.";
  }

  switch (status) {
    case 400:
      return serverMsg || "Noto'g'ri so'rov. Ma'lumotlarni tekshiring.";
    case 401:
      return "Sessiya muddati tugadi. Qayta kiring.";
    case 403:
      return "Bu amalni bajarishga ruxsatingiz yo'q.";
    case 404:
      return serverMsg || "So'ralgan ma'lumot topilmadi.";
    case 409:
      return serverMsg || "Bunday ma'lumot allaqachon mavjud.";
    case 422:
      return serverMsg || "Kiritilgan ma'lumotlar noto'g'ri.";
    case 429:
      return "Juda ko'p so'rov yuborildi. Biroz kuting.";
    case 500:
      return "Server xatosi yuz berdi. Keyinroq urinib ko'ring.";
    case 502:
    case 503:
    case 504:
      return "Server vaqtincha ishlamayapti. Keyinroq urinib ko'ring.";
    default:
      return serverMsg || `Xatolik yuz berdi (${status}).`;
  }
}

/** Exponential-ish back-off before retry */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Request interceptor (shared logic) ───────────────────────────────────
function requestInterceptor(config) {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // FormData bo'lsa Content-Type ni o'chirish (axios o'zi to'g'ri qo'yadi)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  config._retryCount = config._retryCount ?? 0;

  if (IS_DEV) {
    const { method, url, params, data } = config;
    console.groupCollapsed(
      `%c⬆ ${method?.toUpperCase()} ${url}`,
      'color:#3b82f6;font-weight:700;'
    );
    if (params) console.log('params', params);
    if (data) console.log('body', data);
    console.groupEnd();
  }

  return config;
}

api.interceptors.request.use(requestInterceptor, (error) => Promise.reject(error));
uploadApi.interceptors.request.use(
  (config) => {
    config._isUpload = true;
    return requestInterceptor(config);
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor (shared) ───────────────────────────────────────
function responseSuccess(response) {
  if (IS_DEV) {
    console.log(
      `%c⬇ ${response.status} ${response.config.url}`,
      'color:#10b981;font-weight:700;',
      response.data
    );
  }
  return response;
}

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

async function responseError(error) {
  const config = error.config;
  const status = error?.response?.status;

  // ── Dev logging ────────────────────────────────────────────────────────
  if (IS_DEV) {
    console.groupCollapsed(
      `%c✖ ${status ?? 'NET'} ${config?.url ?? ''}`,
      'color:#ef4444;font-weight:700;'
    );
    console.error(error?.response?.data ?? error.message);
    console.groupEnd();
  }

  // ── Auto-retry faqat asosiy api uchun (upload retry kerak emas) ───────
  const isNetworkError = !error.response;
  const isServerError = status >= 500 && status < 600;
  const canRetry =
    config &&
    (isNetworkError || isServerError) &&
    config._retryCount < MAX_RETRIES &&
    !config._isUpload; // Upload request larni retry qilmaymiz

  if (canRetry) {
    config._retryCount += 1;
    const wait = RETRY_DELAY_MS * config._retryCount;
    if (IS_DEV) {
      console.warn(`↩ Retrying (${config._retryCount}/${MAX_RETRIES}) in ${wait}ms…`);
    }
    await delay(wait);
    const instance = config._isUpload ? uploadApi : api;
    return instance(config);
  }

  // ── 401 → refresh token or clear session & redirect ───────────────────
  if (status === 401 && config && !config._retry) {
    if (config.url?.includes('auth/refresh')) {
      clearSession();
      if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
        window.location.href = '/';
      }
      return Promise.reject(error);
    }

    config._retry = true;
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      clearSession();
      if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
        window.location.href = '/';
      }
      error.userMessage = translateError(error);
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          config.headers.Authorization = `Bearer ${token}`;
          const instance = config._isUpload ? uploadApi : api;
          return instance(config);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    isRefreshing = true;

    try {
      const response = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
        refreshToken,
      });

      const { accessToken } = response.data;
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        config.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        isRefreshing = false;

        const instance = config._isUpload ? uploadApi : api;
        return instance(config);
      } else {
        throw new Error('No access token returned');
      }
    } catch (refreshError) {
      processQueue(refreshError, null);
      isRefreshing = false;
      clearSession();
      if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
        window.location.href = '/';
      }
      return Promise.reject(refreshError);
    }
  }

  // ── Attach translated message ──────────────────────────────────────────
  error.userMessage = translateError(error);

  return Promise.reject(error);
}

api.interceptors.response.use(responseSuccess, responseError);
uploadApi.interceptors.response.use(responseSuccess, responseError);

// ─── Convenience wrappers ──────────────────────────────────────────────────
// These propagate error.userMessage so callers can do:
//   } catch (e) { setError(e.userMessage); }

export const get = (url, config) => api.get(url, config);
export const post = (url, data, config) => api.post(url, data, config);
export const put = (url, data, config) => api.put(url, data, config);
export const patch = (url, data, config) => api.patch(url, data, config);
export const del = (url, config) => api.delete(url, config);

export default api;
