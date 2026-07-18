import axios, { AxiosError } from "axios";

const TOKEN_KEY = "admin-token";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GATEWAY_URL,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: attach Bearer token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: unwrap ApiResponse
api.interceptors.response.use(
  (response) => {
    // If the response has the ApiResponse wrapper, unwrap it
    if (response.data && typeof response.data.success === "boolean") {
      if (response.data.success) {
        return { ...response, data: response.data.data };
      }
      // Business logic failure - not an HTTP error
      return Promise.reject(new Error(response.data.message ?? "Request failed"));
    }
    return response;
  },
  (error: AxiosError<{ success?: boolean; message?: string }>) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export { api, TOKEN_KEY };
