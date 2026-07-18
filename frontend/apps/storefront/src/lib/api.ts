import axios from "axios";

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GATEWAY_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
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

// Request interceptor: attach JWT from localStorage
client.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && token !== "null" && token !== "undefined") {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: unwrap ApiResponse + handle 401 with token refresh
client.interceptors.response.use(
  (response) => response.data.data,
  async (error) => {
    const originalRequest = error.config;

    // Attempt token refresh on 401 (only once, not on login/refresh endpoints)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/identity/login") &&
      !originalRequest.url?.includes("/identity/refresh") &&
      typeof window !== "undefined"
    ) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/account/login";
        return Promise.reject(new Error("Session expired. Please log in again."));
      }

      if (isRefreshing) {
        // Queue this request until the refresh completes
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
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/identity/refresh`,
          { refreshToken }
        );
        const { accessToken, refreshToken: newRefreshToken } = res.data.data;
        localStorage.setItem("token", accessToken);
        if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);
        client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/account/login";
        return Promise.reject(new Error("Session expired. Please log in again."));
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      window.location.href = "/account/login";
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
