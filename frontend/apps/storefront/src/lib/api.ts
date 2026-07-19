import axios from "axios";

// In-memory access token store. Access token is short-lived (15min), refresh via httpOnly cookie.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GATEWAY_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

// Request interceptor: attach JWT from in-memory store
client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor: unwrap ApiResponse + handle 401 with token refresh
client.interceptors.response.use(
  (response) => response.data.data,
  async (error) => {
    const originalRequest = error.config;

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
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token sent via httpOnly cookie (withCredentials)
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/identity/refresh`,
          { refreshToken: "" },
          { withCredentials: true }
        );
        const { accessToken: newAccessToken } = res.data.data;
        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);
        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        window.location.href = "/account/login";
        return Promise.reject(new Error("Session expired. Please log in again."));
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401) {
      setAccessToken(null);
      if (!originalRequest.url?.includes("/identity/me")) {
        window.location.href = "/account/login";
      }
      return Promise.reject(new Error("Session expired. Please log in again."));
    }
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("Request timed out. Please try again."));
    }
    if (!error.response) {
      return Promise.reject(new Error("Network error. Check your connection."));
    }
    const message =
      error.response?.data?.message || error.message || "An error occurred";
    return Promise.reject(new Error(message));
  }
);

const api = {
  get<T>(url: string, config?: Parameters<typeof client.get>[1]): Promise<T> {
    return client.get(url, config) as unknown as Promise<T>;
  },
  post<T>(url: string, data?: unknown, config?: Parameters<typeof client.post>[2]): Promise<T> {
    return client.post(url, data, config) as unknown as Promise<T>;
  },
  put<T>(url: string, data?: unknown, config?: Parameters<typeof client.put>[2]): Promise<T> {
    return client.put(url, data, config) as unknown as Promise<T>;
  },
  delete<T>(url: string, config?: Parameters<typeof client.delete>[1]): Promise<T> {
    return client.delete(url, config) as unknown as Promise<T>;
  },
};

export default api;
