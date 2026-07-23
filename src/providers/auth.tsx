"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api, getRefreshToken, setAccessToken, setRefreshToken } from "@/lib/api/client";

/**
 * 실제 인증 (FastAPI 연동).
 *
 * - 부트스트랩: 마운트 시 `/auth/me` 시도(무토큰이면 client 가 refresh 로 access 재발급).
 *   성공 → authed / 실패 → guest.
 * - login: `/auth/login` → access(메모리)+refresh(localStorage) 저장 + user 세팅.
 * - logout: 토큰 폐기(+ /auth/logout 호출, 현재 서버는 no-op).
 * - 라우트 게이트는 `chrome.tsx`가 status 로 처리(guest → /login).
 */

export type Role = "ADMIN" | "MANAGER" | "MEMBER";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  branchId: string;
  rank: string;
  role: Role;
  team?: string | null;
  status: string;
  avatarColor: string;
  avatarUrl?: string | null;
  statusMessage?: string | null;
  workStatus?: string;
};

type LoginResponse = { accessToken: string; refreshToken: string; employee: AuthUser };

export type AuthStatus = "loading" | "authed" | "guest";

type Ctx = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string, keep?: boolean) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<Ctx | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  // login/logout 이 이미 상태를 확정했으면 뒤늦게 끝나는 부트스트랩이 되돌리지 못하게 막는다
  const settled = useRef(false);

  // 부트스트랩 — 저장된 refresh 가 있을 때만 세션 복구 시도.
  // (없으면 /auth/me 호출 자체를 건너뜀 → 로그아웃 상태의 불필요한 401 콘솔 에러 방지)
  // async/마이크로태스크로만 setState → set-state-in-effect 아님.
  useEffect(() => {
    let alive = true;
    const finish = (s: AuthStatus, me?: AuthUser) => {
      if (!alive || settled.current) return;
      if (me) setUser(me);
      setStatus(s);
    };
    if (!getRefreshToken()) {
      Promise.resolve().then(() => finish("guest"));
      return () => {
        alive = false;
      };
    }
    api
      .get<AuthUser>("/auth/me")
      .then((me) => finish("authed", me))
      .catch(() => finish("guest"));
    return () => {
      alive = false;
    };
  }, []);

  // keep=true → refreshToken 을 localStorage 에(14일 자동로그인) / false → sessionStorage(브라우저 닫으면 해제)
  const login = async (email: string, password: string, keep = true) => {
    const res = await api.post<LoginResponse>("/auth/login", { email, password });
    setAccessToken(res.accessToken);
    setRefreshToken(res.refreshToken, keep);
    settled.current = true;
    setUser(res.employee);
    setStatus("authed");
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* 서버 no-op — 무시 */
    }
    setAccessToken(null);
    setRefreshToken(null);
    settled.current = true;
    setUser(null);
    setStatus("guest");
  };

  return <AuthContext.Provider value={{ user, status, login, logout }}>{children}</AuthContext.Provider>;
}
