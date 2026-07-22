"use client";

import { useEffect, useState } from "react";
import { listEmployees } from "@/lib/api/hifis";

/**
 * 지점 직원 id→이름 맵을 한 번 로드해 `nameOf(id)` 로 조회.
 * (로스터가 인증 사용자에게 열려서 employeeId → 이름 표시가 가능해짐)
 * async .then 으로만 setState → set-state-in-effect 아님.
 */
export function useEmployeeNames() {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    listEmployees()
      .then((emps) => {
        if (alive) setMap(Object.fromEntries(emps.map((e) => [e.id, e.name])));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (id: string, fallback = "직원") => map[id] ?? fallback;
}
