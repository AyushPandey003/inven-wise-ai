import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  type AuthUser,
  type AuthTenant,
  getToken,
  getStoredUser,
  getStoredTenant,
  clearAuth,
  getMe,
  login as apiLogin,
  register as apiRegister,
  updateCompanyInfo as apiUpdateCompany,
  updateBusinessConfig as apiUpdateBusiness,
  skipOnboarding as apiSkipOnboarding,
  setStoredTenant,
} from "@/lib/auth-api";

interface AuthContextType {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
  updateCompanyInfo: (data: { companyName: string; industry?: string; companySize?: string; country?: string; phone?: string }) => Promise<void>;
  updateBusinessConfig: (data: { currency?: string; timezone?: string; settings?: Record<string, unknown> }) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  isOnboardingComplete: boolean;
  onboardingStatus: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [tenant, setTenant] = useState<AuthTenant | null>(getStoredTenant);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!getToken();
  const onboardingStatus = tenant?.onboardingStatus || "pending";
  const isOnboardingComplete = onboardingStatus === "completed";

  // Verify auth on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      getMe()
        .then(({ user: u, tenant: t }) => {
          setUser(u);
          setTenant(t);
        })
        .catch(() => {
          clearAuth();
          setUser(null);
          setTenant(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin({ email, password });
    setUser(result.user);
    setTenant(result.tenant);
  }, []);

  const register = useCallback(async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    const result = await apiRegister(data);
    setUser(result.user);
    setTenant(result.tenant);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setTenant(null);
    window.location.href = "/login";
  }, []);

  const updateCompanyInfo = useCallback(async (data: { companyName: string; industry?: string; companySize?: string; country?: string; phone?: string }) => {
    const result = await apiUpdateCompany(data);
    setTenant((prev) => prev ? { ...prev, ...result.tenant } : null);
  }, []);

  const updateBusinessConfig = useCallback(async (data: { currency?: string; timezone?: string; settings?: Record<string, unknown> }) => {
    const result = await apiUpdateBusiness(data);
    setTenant((prev) => prev ? { ...prev, ...result.tenant } : null);
  }, []);

  const skipOnboarding = useCallback(async () => {
    const result = await apiSkipOnboarding();
    setTenant((prev) => prev ? { ...prev, ...result.tenant } : null);
  }, []);

  const refreshAuth = useCallback(async () => {
    const { user: u, tenant: t } = await getMe();
    setUser(u);
    setTenant(t);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        updateCompanyInfo,
        updateBusinessConfig,
        skipOnboarding,
        refreshAuth,
        isOnboardingComplete,
        onboardingStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
