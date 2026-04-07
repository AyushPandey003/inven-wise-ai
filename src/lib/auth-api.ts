const API_BASE = import.meta.env.VITE_API_URL || "/api";

// ── Token Management ──────────────────────────────────

const TOKEN_KEY = "invenwise_token";
const USER_KEY = "invenwise_user";
const TENANT_KEY = "invenwise_tenant";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TENANT_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredTenant(): AuthTenant | null {
  const raw = localStorage.getItem(TENANT_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setStoredTenant(tenant: AuthTenant) {
  localStorage.setItem(TENANT_KEY, JSON.stringify(tenant));
}

// ── Types ─────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string | null;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  onboardingStatus: string;
  plan: string;
  status: string;
  logo?: string | null;
  industry?: string;
  currency?: string;
  timezone?: string;
  settings?: Record<string, unknown>;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  tenant: AuthTenant;
}

// ── Auth API Calls ────────────────────────────────────

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || "Request failed");
  }

  return res.json();
}

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResponse> {
  const result = await authRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
  setToken(result.token);
  setStoredUser(result.user);
  setStoredTenant(result.tenant);
  return result;
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const result = await authRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
  setToken(result.token);
  setStoredUser(result.user);
  setStoredTenant(result.tenant);
  return result;
}

export async function getMe(): Promise<{ user: AuthUser; tenant: AuthTenant }> {
  const result = await authRequest<{ user: AuthUser; tenant: AuthTenant }>("/auth/me");
  setStoredUser(result.user);
  setStoredTenant(result.tenant);
  return result;
}

export async function updateCompanyInfo(data: {
  companyName: string;
  industry?: string;
  companySize?: string;
  country?: string;
  phone?: string;
}): Promise<{ tenant: AuthTenant }> {
  const result = await authRequest<{ tenant: AuthTenant }>("/auth/onboarding/company", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  // Merge updated tenant
  const existing = getStoredTenant();
  if (existing) {
    setStoredTenant({ ...existing, ...result.tenant });
  }
  return result;
}

export async function updateBusinessConfig(data: {
  currency?: string;
  timezone?: string;
  settings?: Record<string, unknown>;
}): Promise<{ tenant: AuthTenant }> {
  const result = await authRequest<{ tenant: AuthTenant }>("/auth/onboarding/business-config", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const existing = getStoredTenant();
  if (existing) {
    setStoredTenant({ ...existing, ...result.tenant });
  }
  return result;
}

export async function skipOnboarding(): Promise<{ tenant: AuthTenant }> {
  const result = await authRequest<{ tenant: AuthTenant }>("/auth/onboarding/skip", {
    method: "POST",
  });
  const existing = getStoredTenant();
  if (existing) {
    setStoredTenant({ ...existing, ...result.tenant });
  }
  return result;
}

export async function inviteUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  password: string;
}): Promise<{ user: AuthUser }> {
  return authRequest<{ user: AuthUser }>("/auth/invite", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
