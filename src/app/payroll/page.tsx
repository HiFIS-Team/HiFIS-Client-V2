"use client";

import { useAuth } from "@/providers/auth";
import { Payroll } from "@/components/screens/payroll";
import { AdminPayrollPage } from "@/components/screens/admin-payroll";

export default function PayrollPage() {
  const { user } = useAuth();

  // 어드민(대표)은 본인 급여가 없음(무급) → 개인 명세서 대신 급여 결재 전용
  if (user?.role === "ADMIN") return <AdminPayrollPage />;
  return <Payroll />;
}
