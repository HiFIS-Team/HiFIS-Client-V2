"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

/**
 * 목 인증 (백엔드 전).
 *
 * ⚠️ 게이팅 안 함 (사용자 결정): 기본은 로그인된 목 사용자로 앱이 그대로 열림.
 * 로그아웃하면 user=null + /login으로. 로그인/회원가입 화면은 만들어두고 동작만.
 * 백엔드(NestJS) 붙으면 login/signup을 실제 API로, 역할(role)로 화면 분기.
 */

export type Role = "ADMIN" | "MANAGER" | "MEMBER";
export type AuthUser = { name: string; email: string; role: Role };

// 기본 로그인 사용자 (앱 전반이 은후 기준)
const DEFAULT_USER: AuthUser = { name: "김은후", email: "eunhoo0903@naver.com", role: "MEMBER" };

type Ctx = {
  user: AuthUser | null;
  login: (email: string, password: string) => void;
  logout: () => void;
};
const AuthContext = createContext<Ctx | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(DEFAULT_USER);

  // 목: 아무 값이나 로그인 성공 → 기본 사용자로 (이메일만 반영)
  const login = (email: string) => setUser({ ...DEFAULT_USER, email: email || DEFAULT_USER.email });
  const logout = () => setUser(null);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
