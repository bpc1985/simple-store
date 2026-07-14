import axios from "axios";

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GATEWAY_URL,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: attach JWT from localStorage (only if token exists)
client.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && token !== "null" && token !== "undefined") {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: unwrap ApiResponse { success, message, data } -> return data
client.interceptors.response.use(
  (response) => response.data.data,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "An error occurred";
    return Promise.reject(new Error(message));
  }
);

// ponytail: typed wrapper — interceptor unwraps at runtime; this types the unwrap
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
