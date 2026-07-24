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

// 회원 생성 (담당 트레이너=ownerTrainerId, 소개자=referrerMemberId 선택)
export const createMember = (body: {
  name: string;
  phone: string;
  branchId: string;
  ownerTrainerId: string;
  referrerMemberId?: string;
  memo?: string;
}) => api.post<MemberDTO>(`/members`, body);

// 등록권 발급 (신규 NEW / 재등록 RENEWAL) — 급여 인센티브 산출 입력값
export const createRegistration = (body: {
  memberId: string;
  trainerId: string;
  type: RegType;
  totalSessions: number;
  pricePaid: number;
  sessionUnitPrice: number;
  purchasedAt?: string;
}) => api.post<RegistrationDTO>(`/registrations`, body);

/* ── 점수 엔진 (Phase 3) ── */
export type ScoreCategory = "ENV" | "PEER" | "KINDNESS" | "CLASS" | "CONTRIB" | "OPERATOR";

// 직원 (로스터 — GET /employees 는 인증 사용자에게 지점 스코프로 개방)
export type Role = "ADMIN" | "MANAGER" | "MEMBER";
export type Rank = "TRAINER" | "FC" | "TEAM_LEAD" | "STORE_MANAGER" | "DEVELOPER" | "CEO";
export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "RESIGNED";
export type EmployeeLite = {
  id: string;
  name: string;
  email: string;
  branchId: string;
  rank: string; // Rank enum (staff에서 캐스팅)
  role: Role;
  team?: string | null;
  status: string; // EmployeeStatus enum
  avatarColor: string;
  empNo?: string; // 사번 (입사연도-순번, 예 2026-0003) — 홈 바코드/출퇴근 스캔 코드 겸용
  phone?: string | null;
  joinedAt?: string;
  lastActiveAt?: string | null;
  avatarUrl?: string | null;
  statusMessage?: string | null;
};
export const listEmployees = (params: { branchId?: string; role?: string; q?: string } = {}) =>
  api.get<EmployeeLite[]>(`/employees${qs(params)}`);
// 직원 관리 (ADMIN·MANAGER)
export const updateEmployee = (
  id: string,
  body: Partial<{ rank: Rank; role: Role; status: EmployeeStatus; team: string; phone: string; branchId: string }>,
) => api.patch<EmployeeLite>(`/employees/${id}`, body);
export const deleteEmployee = (id: string) => api.del<void>(`/employees/${id}`);
// 본인 프로필 수정 (PATCH /employees/me — EmployeeMeUpdate: name·avatarColor·avatarUrl·statusMessage·workStatus)
export const updateMe = (
  patch: Partial<{ name: string; avatarColor: string; avatarUrl: string | null; statusMessage: string | null; workStatus: string }>,
) => api.patch<EmployeeLite>(`/employees/me`, patch);
// 본인 비밀번호 변경 (POST /employees/me/password → 204, 틀리면 400 INVALID_PASSWORD)
export const changeMyPassword = (body: { currentPassword: string; newPassword: string }) =>
  api.post<void>(`/employees/me/password`, body);
// 아바타 이미지 업로드 (multipart file, png/jpg/gif/webp ≤5MB) → avatarUrl 세팅된 EmployeeOut 반환(별도 PATCH 불필요)
// 에러: 비이미지 400 INVALID_IMAGE · 초과 400 IMAGE_TOO_LARGE. 이전 아바타는 서버가 자동 정리.
export const uploadMyAvatar = (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return api.upload<EmployeeLite>(`/employees/me/avatar`, fd);
};
// 본인 탈퇴 (POST /employees/me/withdraw → 204, soft-delete+익명화). 마지막 관리자면 409 LAST_ADMIN.
// 성공 후 토큰 무효 → 프론트는 로그아웃/로그인 리다이렉트.
export const withdrawMe = () => api.post<void>(`/employees/me/withdraw`);

// 초대키 (ADMIN·MANAGER — MEMBER는 403)
export type InviteStatus = "UNUSED" | "USED" | "EXPIRED";
export type InviteKeyDTO = {
  id: string;
  code: string;
  branchId: string;
  role: Role;
  rank: Rank;
  team?: string | null;
  status: InviteStatus;
  issuedById: string;
  expiresAt: string;
  createdAt: string;
};
export const listInviteKeys = () => api.get<InviteKeyDTO[]>(`/invite-keys`);
export const createInviteKey = (body: { branchId: string; role: Role; rank: Rank; team?: string; expiresAt?: string }) =>
  api.post<InviteKeyDTO>(`/invite-keys`, body);
export const deleteInviteKey = (id: string) => api.del<void>(`/invite-keys/${id}`);

/* ── 계정 관리 (Phase 5) — 비번은 응답에 없음, 열람은 별도 /secret(작성자·ADMIN) ── */
export type AccountDTO = {
  id: string;
  name: string;
  cat: string; // 자유 문자열
  scope: string; // 전사|팀|프로젝트
  loginId: string;
  url?: string | null;
  ownerId: string; // 서버가 생성자 = 작성자로 설정
  memo?: string | null;
  active: boolean;
};
export const listAccounts = (params: { scope?: string; cat?: string; q?: string } = {}) => api.get<AccountDTO[]>(`/accounts${qs(params)}`);
export const getAccountSecret = (id: string) => api.get<{ password: string }>(`/accounts/${id}/secret`);
export const createAccount = (body: { name: string; cat: string; scope: string; loginId: string; password: string; url?: string; memo?: string; active?: boolean }) =>
  api.post<AccountDTO>(`/accounts`, body);
export const updateAccount = (
  id: string,
  body: Partial<{ name: string; cat: string; scope: string; loginId: string; password: string; url: string; memo: string; active: boolean }>,
) => api.patch<AccountDTO>(`/accounts/${id}`, body);
export const deleteAccount = (id: string) => api.del<void>(`/accounts/${id}`); // ⚠️ 백엔드 500 (미구현/버그) — 고쳐지면 동작

/* ── 대시보드 (Phase 5) — ADMIN·MANAGER 전용 ── */
export type DashboardDTO = {
  branchId?: string | null;
  period: string; // "YYYY-MM"
  headcount: number;
  scores: { total: number; byCategory: Record<string, number> };
  sales: { total: number; count: number; new: number; renewal: number };
  checkedInToday: number;
  leavesPending: number;
};
export const getDashboard = (params: { branchId?: string; period?: string } = {}) => api.get<DashboardDTO>(`/dashboard${qs(params)}`);

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
export const createEnvItem = (body: { branchId: string; name: string; points: number; editable?: boolean }) =>
  api.post<EnvItemDTO>(`/env-items`, body);
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

// 랭킹 (kind 생략 = 종합/OVERALL · category 는 하위호환 · period "2026-07" 생략 = 전체)
// kind: SALES(매출성과만)·CLASS(수업 개수)·KINDNESS(회원 친절도)·PEER(동료평가). ⚠️ 매출왕은 CONTRIB가 아니라 kind=SALES(아이디어·목표 제외).
export type RankingKind = "SALES" | "CLASS" | "KINDNESS" | "PEER";
export type RankingItem = { rank: number; employeeId: string; name: string; points: number };
export const getRanking = (params: { category?: ScoreCategory; kind?: RankingKind; period?: string } = {}) =>
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

/* ── 알림함 (개인 알림 — 승인/휴가/본사 등이 트리거. 공지와 별개) ── */
export type NotificationDTO = {
  id: string;
  employeeId: string;
  type: string; // APPROVAL·LEAVE·HQ 등 자유 문자열
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
};
export const listNotifications = (params: { read?: boolean } = {}) =>
  api.get<NotificationDTO[]>(`/notifications${qs({ read: params.read == null ? undefined : String(params.read) })}`);
export const markNotificationRead = (id: string) => api.post<NotificationDTO>(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.post<void>(`/notifications/read-all`);

export type ReactionTargetType = "NOTICE" | "MEETING" | "MESSAGE";
export const toggleReaction = (body: { targetType: ReactionTargetType; targetId: string; emoji: string }) =>
  api.post<{ added: boolean; reactions: ReactionAgg[] }>(`/reactions`, body);

/* ── 사내톡 (WebSocket /ws/chat + REST /chat) ── */
export type MessageDTO = {
  id: string;
  roomId: string;
  senderId: string;
  body: string;
  attachments: string[];
  reactions: ReactionAgg[];
  createdAt: string; // ISO
};
export type ChatRoomDTO = {
  id: string;
  name: string | null; // 그룹방 이름 (DM 은 null → 상대 이름으로 표시)
  isGroup: boolean;
  ownerId: string;
  memberIds: string[]; // 나 포함
  lastMessage: MessageDTO | null;
  unreadCount: number;
  updatedAt: string;
};
export const listChatRooms = () => api.get<ChatRoomDTO[]>(`/chat/rooms`);
export const createChatRoom = (body: { memberIds: string[]; name?: string; isGroup?: boolean }) =>
  api.post<ChatRoomDTO>(`/chat/rooms`, body);
export const listChatMessages = (roomId: string, params: { before?: string; limit?: number } = {}) =>
  api.get<MessageDTO[]>(
    `/chat/rooms/${roomId}/messages${qs({ before: params.before, limit: params.limit != null ? String(params.limit) : undefined })}`,
  );
export const sendChatMessage = (roomId: string, body: { body: string; attachments?: string[] }) =>
  api.post<MessageDTO>(`/chat/rooms/${roomId}/messages`, body);
export const markChatRoomRead = (roomId: string) => api.post<void>(`/chat/rooms/${roomId}/read`);

/* ── 급여명세서 (개인) ── */
export type DeductionMethod = "FREELANCE" | "INSURANCE"; // 사업소득 3.3% / 4대보험
// 제출·결재 상태: 미제출 → 승인 대기 → 승인/반려
export type PayslipStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
export type PayslipDTO = {
  id: string;
  employeeId: string;
  yearMonth: string; // "YYYY-MM"
  rank: Rank;
  baseSalary: number;
  incentiveNew: number; // 신규 인센티브(신규 매출 ×40%)
  incentiveRenewal: number; // 재등록 인센티브(재등록 매출 ×50%)
  otherAllowances: number;
  gross: number;
  deductionMethod: DeductionMethod;
  deductions: { label: string; amount: number }[];
  totalDeduction: number;
  net: number;
  basis: {
    newSales: { memberName: string; pkg: string; amount: number }[];
    renewalSales: { memberName: string; pkg: string; amount: number }[];
    sessionSigns: number;
  };
  // ── 제출·결재 (백엔드 미구현 → optional, 서버가 status 내려주면 UI 노출) ──
  status?: PayslipStatus;
  rejectReason?: string | null; // 반려 사유(REJECTED일 때)
  submittedAt?: string | null; // ISO
  decidedAt?: string | null; // 승인/반려 처리 시각 ISO
  decidedById?: string | null; // 처리한 관리자 employeeId
};
// 본인 명세서 — 없으면 404 PAYSLIP_NOT_FOUND
export const getMyPayslip = (yearMonth: string) => api.get<PayslipDTO>(`/payslips/me?yearMonth=${encodeURIComponent(yearMonth)}`);
// 본인 명세서 제출(급여 신청) — DRAFT/REJECTED → SUBMITTED. 지급일 아니면 403 NOT_PAYDAY. POST /payslips/me/submit {yearMonth}
export const submitMyPayslip = (yearMonth: string) => api.post<PayslipDTO>("/payslips/me/submit", { yearMonth });
// 지급일 창 — 지급일 당일만 isOpen. GET /payslips/me/window?yearMonth
export type PaydayWindow = { yearMonth: string; payday: string; isOpen: boolean };
export const getMyPaydayWindow = (yearMonth: string) => api.get<PaydayWindow>(`/payslips/me/window?yearMonth=${encodeURIComponent(yearMonth)}`);
// (관리자) 승인 대기 명세서 목록 — GET /payslips?box=inbox&yearMonth
export const listPendingPayslips = (yearMonth?: string) =>
  api.get<PayslipDTO[]>(`/payslips?box=inbox${yearMonth ? `&yearMonth=${encodeURIComponent(yearMonth)}` : ""}`);
// (관리자) 승인 / 반려(사유 필수)
export const approvePayslip = (id: string) => api.post<PayslipDTO>(`/payslips/${id}/approve`, undefined);
export const rejectPayslip = (id: string, reason: string) => api.post<PayslipDTO>(`/payslips/${id}/reject`, { reason });

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

// 프로젝트 기한 변경 요청 (연장/누락 사유 → 어드민 승인)
export type ProjectRequestType = "EXTENSION" | "OVERDUE";
export type ProjectRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ProjectRequestDTO = {
  id: string;
  projectId: string;
  type: ProjectRequestType;
  newDue: string; // ISO
  reason: string;
  status: ProjectRequestStatus;
  requestedById: string;
  decidedById?: string | null;
  decidedAt?: string | null;
  rejectReason?: string | null;
  createdAt: string;
};
export const listProjectRequests = (params: { status?: string; projectId?: string } = {}) =>
  api.get<ProjectRequestDTO[]>(`/projects/requests${qs(params)}`);
export const createProjectRequest = (projectId: string, body: { type: ProjectRequestType; newDue: string; reason: string }) =>
  api.post<ProjectRequestDTO>(`/projects/${projectId}/requests`, body);
export const approveProjectRequest = (requestId: string) => api.post<ProjectRequestDTO>(`/projects/requests/${requestId}/approve`);
export const rejectProjectRequest = (requestId: string, reason: string) =>
  api.post<ProjectRequestDTO>(`/projects/requests/${requestId}/reject`, { reason });

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

/* ── 근태 · 휴가 (Phase 5) — 스캔·휴가 승인은 알림 트리거 ── */
export type AttendanceSource = "BARCODE" | "MANUAL";
export type AttendanceDTO = {
  id: string;
  employeeId: string;
  date: string; // "YYYY-MM-DD"
  checkIn?: string | null; // ISO datetime
  checkOut?: string | null;
  workMinutes?: number | null;
  source: AttendanceSource;
};
// 출퇴근 스캔 = 출/퇴근 토글 (당일 1회차=출근, 이후=퇴근 갱신). 스캔 코드 = **사번 empNo**(예 2026-0003).
//  - code 지정 → 지점 스캐너 단말이 그 사번을 스캔(같은 지점만, 타지점 403 OTHER_BRANCH·미등록 404 EMP_NO_NOT_FOUND). 하이픈 유무 무관.
//  - 생략 → 본인 토큰 기준 self-toggle(하위호환, 내 폰 출근 버튼)
export const scanAttendance = (code?: string) => api.post<AttendanceDTO>(`/attendance/scan`, code ? { code } : undefined);
export const listAttendance = (params: { employeeId?: string; month?: string } = {}) =>
  api.get<AttendanceDTO[]>(`/attendance${qs(params)}`);

export type LeaveType = "ANNUAL" | "HALF" | "SICK" | "FIELD" | "ETC";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type LeaveRequestDTO = {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number; // 서버 계산 (반차=0.5 등)
  reason?: string | null; // 신청 사유
  rejectReason?: string | null; // 반려 사유(관리자)
  status: LeaveStatus;
};
export const listLeaves = (params: { employeeId?: string; status?: string } = {}) =>
  api.get<LeaveRequestDTO[]>(`/leaves${qs(params)}`);
export const createLeave = (body: { type: LeaveType; startDate: string; endDate: string; reason?: string }) =>
  api.post<LeaveRequestDTO>(`/leaves`, body);
export const approveLeave = (id: string) => api.post<LeaveRequestDTO>(`/leaves/${id}/approve`);
// 반려는 사유 필수 (백엔드 min_length=1)
export const rejectLeave = (id: string, reason: string) => api.post<LeaveRequestDTO>(`/leaves/${id}/reject`, { reason });
// 신청자 본인의 PENDING 휴가 취소 → status CANCELLED (남 것/처리됨은 403/400)
export const cancelLeave = (id: string) => api.post<LeaveRequestDTO>(`/leaves/${id}/cancel`);

/* ── 전자결재 (Phase 5) — 상신/승인/반려는 알림 트리거 ── */
export type ApprovalStatus = "IN_PROGRESS" | "APPROVED" | "REJECTED" | "WITHDRAWN";
export type ApprovalStepStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ApprovalStepDTO = { approverId: string; status: ApprovalStepStatus; comment?: string | null; actedAt?: string | null };
export type ApprovalCommentDTO = { authorId: string; body: string; createdAt: string };
export type ApprovalDTO = {
  id: string;
  kind: string; // 자유 문자열 (프론트 KINDS 한글 키를 그대로 저장)
  title: string;
  content: string;
  amount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  place?: string | null;
  requesterId: string;
  approverIds: string[];
  steps: ApprovalStepDTO[];
  status: ApprovalStatus;
  currentApproverId?: string | null; // 지금 결재 차례
  comments: ApprovalCommentDTO[];
  createdAt: string;
};
export const listApprovals = (box: "mine" | "inbox") => api.get<ApprovalDTO[]>(`/approvals?box=${box}`);
export const getApproval = (id: string) => api.get<ApprovalDTO>(`/approvals/${id}`);
export const createApproval = (body: {
  kind: string;
  title: string;
  content: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  place?: string;
  approverIds: string[];
}) => api.post<ApprovalDTO>(`/approvals`, body);
export const approveApproval = (id: string, comment?: string) => api.post<ApprovalDTO>(`/approvals/${id}/approve`, comment ? { comment } : undefined);
export const rejectApproval = (id: string, comment?: string) => api.post<ApprovalDTO>(`/approvals/${id}/reject`, comment ? { comment } : undefined);
export const createApprovalComment = (id: string, body: string) => api.post<ApprovalDTO>(`/approvals/${id}/comments`, { body });
// 신청자 본인의 IN_PROGRESS 결재 회수 → status WITHDRAWN, currentApproverId=null (남 것/종결됨은 403/400)
export const withdrawApproval = (id: string) => api.post<ApprovalDTO>(`/approvals/${id}/withdraw`);

/* ── 일정 (Phase 5) — category·scope·color 는 자유 문자열(프론트 값 그대로) ── */
export type EventDTO = {
  id: string;
  title: string;
  startAt: string; // ISO
  endAt: string; // ISO
  category: string;
  scope: string;
  color: string;
  memo?: string | null;
  ownerId: string;
  createdAt: string;
};
export const listEvents = (params: { from?: string; to?: string; scope?: string } = {}) =>
  api.get<EventDTO[]>(`/events${qs(params)}`);
export const createEvent = (body: { title: string; startAt: string; endAt: string; category: string; scope: string; color: string; memo?: string }) =>
  api.post<EventDTO>(`/events`, body);
export const updateEvent = (id: string, body: Partial<{ title: string; startAt: string; endAt: string; category: string; scope: string; color: string; memo: string }>) =>
  api.patch<EventDTO>(`/events/${id}`, body);
export const deleteEvent = (id: string) => api.del<void>(`/events/${id}`);

/* ── 문서함 (Phase 5) — space·scope 자유 문자열 · 업로드는 multipart ── */
export type FolderDTO = { id: string; name: string; scope: string; space: string; parentId?: string | null; createdById: string };
export type DocumentDTO = {
  id: string;
  name: string;
  ext: string;
  sizeBytes: number;
  url: string; // 공개 서빙 경로 (/uploads/..) — assetUrl 로 절대화
  scope: string;
  space: string;
  folderId?: string | null;
  tags: string[];
  desc?: string | null;
  uploaderId: string;
};
export const listFolders = (params: { space?: string; scope?: string } = {}) => api.get<FolderDTO[]>(`/folders${qs(params)}`);
export const createFolder = (body: { name: string; scope: string; space: string; parentId?: string }) => api.post<FolderDTO>(`/folders`, body);
export const updateFolder = (id: string, body: { name?: string }) => api.patch<FolderDTO>(`/folders/${id}`, body);
export const deleteFolder = (id: string) => api.del<void>(`/folders/${id}`); // 하위 문서 함께 삭제
export const listDocuments = (params: { space?: string; scope?: string; folderId?: string; q?: string } = {}) =>
  api.get<DocumentDTO[]>(`/documents${qs(params)}`);
// 업로드 = multipart/form-data (file, scope, space, folderId?, name?, desc?, tags?[콤마])
export const uploadDocument = (form: FormData) => api.upload<DocumentDTO>(`/documents`, form);
export const updateDocument = (id: string, body: { name?: string; desc?: string }) => api.patch<DocumentDTO>(`/documents/${id}`, body);
export const deleteDocument = (id: string) => api.del<void>(`/documents/${id}`);
