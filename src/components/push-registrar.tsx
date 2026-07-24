"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/auth";
import { registerPush } from "@/lib/push";

/**
 * 로그인(authed) 상태가 되면 웹푸시를 등록한다. 화면 없음(null 렌더).
 * AuthProvider 안에 마운트해야 useAuth 가 동작한다.
 */
export function PushRegistrar() {
  const { status } = useAuth();
  useEffect(() => {
    if (status !== "authed") return;
    void registerPush();
  }, [status]);
  return null;
}
