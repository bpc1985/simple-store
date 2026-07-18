import { api } from "@/lib/api";
import { PagedResult, TokenResponse, User } from "@/types";

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/api/v1/identity/login", { email, password });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/api/v1/identity/me");
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post("/api/v1/identity/logout", { refreshToken });
}

export async function getUsers(page = 0): Promise<PagedResult<User>> {
  const { data } = await api.get<PagedResult<User>>("/api/v1/identity/admin/users", { params: { page } });
  return data;
}

export async function lockUser(id: string): Promise<void> {
  await api.post(`/api/v1/identity/admin/users/${id}/lock`);
}

export async function unlockUser(id: string): Promise<void> {
  await api.post(`/api/v1/identity/admin/users/${id}/unlock`);
}
