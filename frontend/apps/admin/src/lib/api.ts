import axios, { AxiosError } from "axios";

// Augment Axios config to allow _retry flag
declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

// In-memory access token store for admin. Access token is short-lived, no localStorage.
let accessToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

export function setAccessToken(token: string | null) {
  accessToken = token;
}

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GATEWAY_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
  withCredentials: true,
});

// Request interceptor: attach Bearer token from in-memory store
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor: unwrap ApiResponse + token refresh on 401
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data.success === "boolean") {
      if (response.data.success) {
        return { ...response, data: response.data.data };
      }
      return Promise.reject(new Error(response.data.message ?? "Request failed"));
    }
    return response;
  },
  async (error: AxiosError<{ success?: boolean; message?: string }>) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Attempt token refresh on 401 (once, not on login/refresh endpoints)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/identity/login") &&
      !originalRequest.url?.includes("/identity/refresh") &&
      typeof window !== "undefined"
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/identity/refresh`,
          { refreshToken: "" },
          { withCredentials: true }
        );
        const newToken = res.data?.data?.accessToken;
        if (newToken) {
          setAccessToken(newToken);
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
        throw new Error("No access token in refresh response");
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        window.location.href = "/login";
        return Promise.reject(new Error("Session expired. Please log in again."));
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401) {
      setAccessToken(null);
      window.location.href = "/login";
      return Promise.reject(error);
    }
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("Request timed out. Please try again."));
    }
    if (!error.response) {
      return Promise.reject(new Error("Network error. Please check your connection."));
    }
    const message =
      error.response?.data?.message || error.message || "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);

export { api };
