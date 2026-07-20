"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// 경로가 바뀔 때마다 key가 바뀌어 진입 애니메이션 재생
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-in h-full">
      {children}
    </div>
  );
}
