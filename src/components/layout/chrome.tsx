"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageTransition } from "@/components/layout/page-transition";
import { useAuth } from "@/providers/auth";

// 인증 화면은 헤더·하단탭 없이 전체 프레임으로
const BARE = ["/login", "/signup"];

export function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useAuth();
  const bare = BARE.includes(pathname);

  // 게이트: 미인증 → 로그인 / 인증 상태로 로그인 화면 접근 → 홈
  useEffect(() => {
    if (status === "loading") return;
    if (status === "guest" && !bare) router.replace("/login");
    else if (status === "authed" && bare) router.replace("/");
  }, [status, bare, router]);

  // 로그인/회원가입 화면은 그대로 렌더
  if (bare) {
    return <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>;
  }

  // 세션 복구 중 · 리다이렉트 대기 중엔 스플래시
  if (status !== "authed") {
    return (
      <main className="grid min-h-0 flex-1 place-items-center">
        <span className="h-3 w-3 animate-pulse rounded-full bg-primary" />
      </main>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </>
  );
}
