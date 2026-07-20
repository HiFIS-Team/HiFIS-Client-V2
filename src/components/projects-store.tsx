"use client";

import { createContext, useContext, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

/**
 * 프로젝트 상태를 앱 전역에서 공유.
 * `/projects`가 읽고 쓰지만, **회의록에서도 프로젝트를 생성**하기 때문에
 * 컴포넌트 로컬 state로 두면 안 되고 Provider로 올려야 한다.
 */

export type Status = "대기" | "진행중" | "완료" | "누락";
export type Project = {
  id: string;
  title: string;
  purpose?: string;
  procedure?: string;
  assignees: string[]; // 담당자 여러 명 가능
  due: string; // 표시용 "7/22"
  dday: number; // 마감까지 남은 일수 (음수면 지남)
  progress: number; // 0-100
  extensionReason?: string; // 최근 연장 사유
  fromNote?: string; // 어느 회의록에서 만들어졌는지
};

export const STAFF = ["은후", "지민", "현우", "서연", "민준"]; // 목: 이 지점 직원
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

// 목 프로젝트 (헤더 마퀴 항목과 동일 세트) — p6은 마감 지난 누락 예시
const SEED: Project[] = [
  { id: "p1", title: "3층 시설 점검", assignees: ["현우", "지민"], due: "7/18", dday: 3, progress: 60 },
  { id: "p2", title: "여름 회원 이벤트 준비", assignees: ["민준"], due: "7/22", dday: 7, progress: 30 },
  { id: "p3", title: "신규 트레이너 온보딩", assignees: ["서연"], due: "7/27", dday: 12, progress: 0 },
  { id: "p4", title: "PT룸 장비 교체", assignees: ["지민", "은후"], due: "8/4", dday: 20, progress: 0 },
  { id: "p5", title: "회원 관리 시스템 교육", assignees: ["은후"], due: "7/10", dday: 0, progress: 100 },
  { id: "p6", title: "상반기 비품 재고 조사", assignees: ["서연"], due: "7/8", dday: -7, progress: 40 },
];

export type NewProject = {
  title: string;
  purpose?: string;
  procedure?: string;
  assignees: string[];
  dueIso: string; // "YYYY-MM-DD"
  fromNote?: string;
};

type Ctx = {
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  addProject: (p: NewProject) => void;
};
const ProjectsContext = createContext<Ctx | null>(null);

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectsProvider");
  return ctx;
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(SEED);
  const idRef = useRef(0);

  const addProject = (p: NewProject) => {
    idRef.current += 1;
    setProjects((list) => [
      {
        id: `np-${idRef.current}`,
        title: p.title,
        purpose: p.purpose,
        procedure: p.procedure,
        assignees: p.assignees,
        due: fmtDue(p.dueIso),
        dday: calcDday(p.dueIso),
        progress: 0,
        fromNote: p.fromNote,
      },
      ...list,
    ]);
  };

  return <ProjectsContext.Provider value={{ projects, setProjects, addProject }}>{children}</ProjectsContext.Provider>;
}
