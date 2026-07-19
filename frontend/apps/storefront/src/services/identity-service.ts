import api from "@/lib/api";
import type { TokenResponse, UserDto } from "@/types";

export async function login(
  email: string,
  password: string
): Promise<TokenResponse> {
  return api.post("/api/v1/identity/login", { email, password });
}

export async function register(
  email: string,
  password: string,
  fullName: string
): Promise<TokenResponse> {
  return api.post("/api/v1/identity/register", { email, password, fullName });
}

export async function logout(refreshToken: string): Promise<void> {
  return api.post("/api/v1/identity/logout", { refreshToken: refreshToken || "" });
}

export async function getMe(): Promise<UserDto> {
  return api.get("/api/v1/identity/me");
}
