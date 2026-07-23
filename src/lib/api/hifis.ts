/**
 * HiFIS 도메인 API 함수 (Phase 2~: 회원·등록·세션).
 * 타입은 백엔드 응답 shape 그대로(camelCase). 참고: `.claude/backend-api.md`.
 */
import { api } from "./client";

/* ── 회원 · 등록 · 세션 (Phase 2) ── */
export type RegType = "NEW" | "RENEWAL";

export type MemberDTO = {
  id: string;
  name: string;
  phone: string;
  branchId: string;
  ownerTrainerId: string;
  referrerMemberId?: string | null;
  registeredAt: string;
  memo?: string | null;
};

export type RegistrationDTO = {
  id: string;
  memberId: string;
  trainerId: string;
  type: RegType;
  totalSessions: number;
  usedSessions: number;
  pricePaid: number;
  sessionUnitPrice: number;
  status: "ACTIVE" | "EXPIRED";
  purchasedAt: string;
};

export type SessionSignDTO = {
  id: string;
  registrationId: string;
  memberId: string;
  performedByTrainerId: string;
  sessionNo: number;
  signatureUrl: string;
  signedAt: string;
};

export type SessionSignResult = { sign: SessionSignDTO; registration: RegistrationDTO };

function qs(params: Record<string, string | undefined>): string {
  const p = Object.entries(params)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`);
  return p.length ? `?${p.join("&")}` : "";
}

export const listMembers = (params: { branchId?: string; ownerTrainerId?: string; q?: string } = {}) =>
  api.get<MemberDTO[]>(`/members${qs(params)}`);

export const memberRegistrations = (memberId: string) => api.get<RegistrationDTO[]>(`/members/${memberId}/registrations`);

export const listRegistrations = (params: { trainerId?: string; type?: string; period?: string } = {}) =>
  api.get<RegistrationDTO[]>(`/registrations${qs(params)}`);

export const listSessionSigns = (params: { trainerId?: string; memberId?: string; period?: string } = {}) =>
  api.get<SessionSignDTO[]>(`/session-signs${qs(params)}`);

export const createSessionSign = (body: { registrationId: string; signatureBase64: string; performedByTrainerId?: string }) =>
  api.post<SessionSignResult>(`/session-signs`, body);

/* ── 점수 엔진 (Phase 3) ── */
export type ScoreCategory = "ENV" | "PEER" | "KINDNESS" | "CLASS" | "CONTRIB" | "OPERATOR";

// 직원 (기여도 부여 대상 등 — GET /employees 는 ADMIN·MANAGER만)
export type EmployeeLite = {
  id: string;
  name: string;
  email: string;
  branchId: string;
  rank: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  team?: string | null;
  status: string;
  avatarColor: string;
};
export const listEmployees = (params: { branchId?: string; role?: string; q?: string } = {}) =>
  api.get<EmployeeLite[]>(`/employees${qs(params)}`);

// 환경정비
export type EnvItemDTO = { id: string; branchId: string; name: string; points: number; editable: boolean };
export type EnvLogDTO = {
  id: string;
  employeeId: string;
  branchId: string;
  envItemId: string;
  itemName: string;
  points: number;
  note?: string | null;
  createdAt: string;
};
export const listEnvItems = (branchId: string) => api.get<EnvItemDTO[]>(`/env-items?branchId=${encodeURIComponent(branchId)}`);
export const listEnvLogs = (params: { branchId?: string; employeeId?: string } = {}) => api.get<EnvLogDTO[]>(`/env-logs${qs(params)}`);
export const createEnvLog = (body: { envItemId: string; note?: string }) => api.post<EnvLogDTO>(`/env-logs`, body);
export const deleteEnvLog = (id: string) => api.del<void>(`/env-logs/${id}`);

// 센터 기여도
export type ContribType = "IDEA" | "GOAL" | "EXTRA_WORK" | "SALES";
export type ContributionDTO = {
  id: string;
  employeeId: string;
  type: ContribType;
  hours?: number | null;
  points: number;
  reason: string;
  grantedById: string;
  createdAt: string;
};
export const listContributions = (params: { employeeId?: string } = {}) => api.get<ContributionDTO[]>(`/contributions${qs(params)}`);

// 동료평가
export type PeerScores = { competency: number; collaboration: number; contribution: number; attitude: number; leadership: number };
export type PeerScoreKey = keyof PeerScores;
export type PeerReviewDTO = {
  id: string;
  reviewerId: string;
  revieweeId: string;
  isSelf: boolean;
  period: string;
  scores: PeerScores;
  reasons: Partial<Record<PeerScoreKey, string>>;
  total: number;
  submittedAt: string;
};
export const listPeerReviews = (params: { reviewerId?: string; revieweeId?: string; period?: string } = {}) =>
  api.get<PeerReviewDTO[]>(`/peer-reviews${qs(params)}`);
export const createPeerReview = (body: { revieweeId: string; period: string; scores: PeerScores; reasons: Partial<Record<PeerScoreKey, string>> }) =>
  api.post<PeerReviewDTO>(`/peer-reviews`, body);
export const createContribution = (body: { employeeId: string; type: ContribType; hours?: number; reason: string }) =>
  api.post<ContributionDTO>(`/contributions`, body);

// 회원 친절도 (외부 QR 설문 수신 — 읽기 전용)
export type KindnessSurveyDTO = {
  id: string;
  motivation: string;
  praisedEmployeeId: string;
  praiseComment: string;
  improvement: string;
  memberName: string;
  memberPhone: string;
  consent: boolean;
  submittedAt: string;
};
export const listKindnessSurveys = (params: { praisedEmployeeId?: string } = {}) => api.get<KindnessSurveyDTO[]>(`/kindness-surveys${qs(params)}`);

// 랭킹 (category 생략 = 종합 / period "2026-07" 생략 = 전체)
export type RankingItem = { rank: number; employeeId: string; name: string; points: number };
export const getRanking = (params: { category?: ScoreCategory; period?: string } = {}) =>
  api.get<RankingItem[]>(`/scores/ranking${qs(params)}`);

/* ── 공지 · 이모지 반응 (Phase 5) ── */
export type ReactionAgg = { emoji: string; employeeIds: string[] };
export type NoticeDTO = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  authorId: string;
  createdAt: string;
  reactions: ReactionAgg[];
};
export const listNotices = () => api.get<NoticeDTO[]>(`/notices`);
export const createNotice = (body: { title: string; body: string; pinned?: boolean }) => api.post<NoticeDTO>(`/notices`, body);
export const deleteNotice = (id: string) => api.del<void>(`/notices/${id}`);

export type ReactionTargetType = "NOTICE" | "MEETING" | "MESSAGE";
export const toggleReaction = (body: { targetType: ReactionTargetType; targetId: string; emoji: string }) =>
  api.post<{ added: boolean; reactions: ReactionAgg[] }>(`/reactions`, body);

/* ── 프로젝트 (Phase 5) ── */
export type ProjectStatus = "WAITING" | "IN_PROGRESS" | "DONE" | "MISSED";
export type ProjectDTO = {
  id: string;
  title: string;
  purpose: string;
  steps: string; // 절차 (프론트 라벨은 "절차")
  due: string; // ISO date-time (예: "2026-07-30T00:00:00Z")
  progress: number;
  assigneeIds: string[];
  extensionReason?: string | null;
  status: ProjectStatus; // 서버 파생 (progress+due) — 프론트는 progress+dday로 자체 도출도 함
  createdById: string;
  createdAt: string;
};
export type ProjectPatch = Partial<{
  title: string;
  purpose: string;
  steps: string;
  due: string;
  progress: number;
  assigneeIds: string[];
  extensionReason: string;
}>;
export const listProjects = (params: { status?: string; assigneeId?: string; q?: string } = {}) =>
  api.get<ProjectDTO[]>(`/projects${qs(params)}`);
export const createProject = (body: { title: string; purpose?: string; steps?: string; due: string; progress?: number; assigneeIds?: string[] }) =>
  api.post<ProjectDTO>(`/projects`, body);
export const updateProject = (id: string, body: ProjectPatch) => api.patch<ProjectDTO>(`/projects/${id}`, body);
export const deleteProject = (id: string) => api.del<void>(`/projects/${id}`);

/* ── 회의록 (Phase 5) ── */
export type MeetingScope = "COMPANY" | "PROJECT" | "PEOPLE";
export type MeetingDTO = {
  id: string;
  title: string;
  blocks: unknown[]; // 자유 JSON (프론트 Block 유니온으로 캐스팅)
  scope: MeetingScope;
  attendeeIds: string[];
  projectId?: string | null;
  authorId: string;
  meetingAt: string; // ISO
  createdAt: string; // ISO (수정/생성 시각)
  reactions: ReactionAgg[];
};
export const listMeetings = (params: { scope?: string; q?: string; sort?: string } = {}) =>
  api.get<MeetingDTO[]>(`/meetings${qs(params)}`);
export const createMeeting = (body: {
  title: string;
  blocks?: unknown[];
  scope: MeetingScope;
  attendeeIds?: string[];
  projectId?: string;
  meetingAt: string;
}) => api.post<MeetingDTO>(`/meetings`, body);
export const deleteMeeting = (id: string) => api.del<void>(`/meetings/${id}`);
