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
