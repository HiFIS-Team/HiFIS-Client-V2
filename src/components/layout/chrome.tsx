"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageTransition } from "@/components/layout/page-transition";

// 인증 화면은 헤더·하단탭 없이 전체 프레임으로
const BARE = ["/login", "/signup"];

export function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (BARE.includes(pathname)) {
    return <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>;
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
