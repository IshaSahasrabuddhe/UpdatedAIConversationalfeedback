import api from "./client";
import type { AdminLoginResponse, AuthResponse } from "../types";

export async function signup(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/signup", { email, password });
  return response.data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/login", { email, password });
  return response.data;
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const response = await api.post<AdminLoginResponse>("/admin/login", { email, password });
  return response.data;
}
