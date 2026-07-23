"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/providers/auth";
import { createProject, listProjects, updateProject } from "@/lib/api/hifis";
import type { ProjectDTO, ProjectPatch } from "@/lib/api/hifis";

/**
 * 프로젝트 상태를 앱 전역에서 공유 (실 API 연동 — `/projects`).
 * `/projects` 화면이 읽고 쓰지만 **회의록에서도 프로젝트를 생성**하므로 Provider로 올려둔다.
 * 로그인(authed) 시 1회 로드 → 이후 세션 내 캐시. add/patch 는 서버 반영 후 로컬 갱신.
 */

export type Status = "대기" | "진행중" | "완료" | "누락";

// UI에서 쓰는 프로젝트 형태 (백엔드 ProjectOut + 표시용 파생 필드)
export type Project = {
  id: string;
  title: string;
  purpose?: string;
  steps?: string; // 절차 (백엔드 필드명 = steps)
  assigneeIds: string[]; // 담당자 employeeId (이름은 로스터로 조회)
  dueIso: string; // 원본 마감일 "YYYY-MM-DD"
  due: string; // 표시용 "M/D"
  dday: number; // 마감까지 남은 일수 (음수면 지남)
  progress: number; // 0-100
  extensionReason?: string; // 최근 연장 사유
};

// 목: notes.tsx(회의록, 아직 목)의 참석자/담당자 피커용 이름 목록. 프로젝트 API와 무관.
export const STAFF = ["은후", "지민", "현우", "서연", "민준"];
export const STATUSES: Status[] = ["대기", "진행중", "완료", "누락"];

// 진행률 + 마감으로 상태 도출: 완료(100) > 누락(마감 지남·미완료) > 대기(0) > 진행중
export function statusOf(progress: number, dday: number): Status {
  if (progress >= 100) return "완료";
  if (dday < 0) return "누락";
  if (progress <= 0) return "대기";
  return "진행중";
}

export function calcDday(iso: string) {
  const due = new Date(`${iso}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}
export function fmtDue(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

// 백엔드 ProjectOut → UI Project (dday/due 는 로드 시점 계산 — 이벤트/.then 안에서만 호출됨)
function toProject(d: ProjectDTO): Project {
  const iso = (d.due ?? "").slice(0, 10); // "2026-07-30T00:00:00Z" → "2026-07-30"
  return {
    id: d.id,
    title: d.title,
    purpose: d.purpose || undefined,
    steps: d.steps || undefined,
    assigneeIds: d.assigneeIds ?? [],
    dueIso: iso,
    due: fmtDue(iso),
    dday: calcDday(iso),
    progress: d.progress,
    extensionReason: d.extensionReason ?? undefined,
  };
}

export type NewProject = {
  title: string;
  purpose?: string;
  steps?: string;
  assigneeIds: string[];
  dueIso: string; // "YYYY-MM-DD"
};

type Ctx = {
  projects: Project[];
  loaded: boolean;
  addProject: (p: NewProject) => Promise<void>;
  patchProject: (id: string, patch: ProjectPatch) => Promise<void>;
};
const ProjectsContext = createContext<Ctx | null>(null);

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectsProvider");
  return ctx;
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 로그인되면 1회 로드 (.then 체인 → set-state-in-effect 아님)
  useEffect(() => {
    if (status !== "authed") return;
    let alive = true;
    listProjects()
      .then((rows) => {
        if (alive) {
          setProjects(rows.map(toProject));
          setLoaded(true);
        }
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [status]);

  const addProject = async (p: NewProject) => {
    const created = await createProject({
      title: p.title,
      purpose: p.purpose,
      steps: p.steps,
      due: p.dueIso,
      assigneeIds: p.assigneeIds,
    });
    setProjects((list) => [toProject(created), ...list]);
  };

  const patchProject = async (id: string, patch: ProjectPatch) => {
    const updated = await updateProject(id, patch);
    setProjects((list) => list.map((p) => (p.id === id ? toProject(updated) : p)));
  };

  return (
    <ProjectsContext.Provider value={{ projects, loaded, addProject, patchProject }}>{children}</ProjectsContext.Provider>
  );
}
