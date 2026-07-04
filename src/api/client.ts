import axios from "axios";
import { installMockAdapter } from "./dummy";

// Switch between real API and dummy data by changing BASE_URL:
//   "static"                        → dummy data (no network calls)
//   "https://api.yourshikshak.in/api" → live backend
// const BASE_URL: string = "http://192.168.1.5:5000/api";
const BASE_URL: string = "https://api.yourshikshak.in/api"; // production

export const IS_STATIC = BASE_URL === "static";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Install mock adapter in static mode (must run before other interceptors)
if (IS_STATIC) installMockAdapter(apiClient);

// Request interceptor — attach auth token if available
apiClient.interceptors.request.use(
  (config) => {
    // Token will be injected via setAuthToken() helper below
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — normalize errors
// Backend error shape: { success: false, error: "<real message>", message: "An error occurred" }
// The actionable text is in `error`, not `message`.
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error?.response?.data;
    const message =
      data?.error || // real backend error string (e.g. "Invalid credentials")
      data?.message || // fallback if shape differs
      error?.message || // axios network error
      "Something went wrong";
    return Promise.reject({ message, status: error?.response?.status });
  },
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common["Authorization"];
  }
};

export const AUTH_STORAGE_KEY = "@ys_auth";

// ─── Tutor Registration ──────────────────────────────────────────────────────

export interface TutorRegistrationPayload {
  fullName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  phoneNumber: string;
  alternatePhone?: string;
  email: string;
  qualification: string;
  experience: string;
  subjects: string[];
  extracurricularActivities?: string[];
  password: string;
  confirmPassword: string;
  city?: string;
  preferredAreas?: string[];
  preferredMode: "OFFLINE" | "ONLINE" | "HYBRID";
  permanentAddress?: string;
  residentialAddress?: string;
  bio?: string;
  languagesKnown?: string[];
  skills?: string[];
}

export interface TutorRegistrationResponse {
  success: boolean;
  message: string;
  teacherId?: string;
  data?: Record<string, unknown>;
}

/**
 * POST /api/v1/tutor-leads
 * Public endpoint — no auth required
 */
export const registerTutor = async (
  payload: TutorRegistrationPayload,
): Promise<TutorRegistrationResponse> => {
  return apiClient.post(
    "/v1/tutor-leads",
    payload,
  ) as Promise<TutorRegistrationResponse>;
};

// ─── Options (City, Areas, Extracurricular) ───────────────────────────────────

export interface Option {
  _id: string;
  label: string;
  value: string;
  type: string;
  parent?: string | { _id: string };
}

/**
 * GET /api/options/:type?parent=<id>
 * Returns dropdown options for a given type (CITY, BOARD, GRADE, SUBJECT, etc.)
 * Pass parentId to get child options in the hierarchy (e.g. grades for a board).
 */
export const getOptions = (type: string, parentId?: string): Promise<{ data: Option[] }> =>
  apiClient.get(`/options/${type}${parentId ? `?parent=${parentId}` : ''}`) as Promise<{ data: Option[] }>;

// ─── Subjects (curriculum tree) ───────────────────────────────────────────────

export interface Subject {
  _id: string;
  name: string;
  code?: string;
  category?: string;
  subcategory?: string;
}

/**
 * GET /api/subjects
 */
export const getSubjects = async (): Promise<{ data: Subject[] }> => {
  return apiClient.get("/subjects") as Promise<{ data: Subject[] }>;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      userType?: 'PARENT' | 'STUDENT';
      phone?: string;
      city?: string;
      isActive: boolean;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

/**
 * POST /api/auth/login
 * Returns user + tokens on success.
 */
export const loginUser = async (
  payload: LoginPayload,
): Promise<LoginResponse> => {
  return apiClient.post("/auth/login", payload) as Promise<LoginResponse>;
};

// ─── Parent Registration ──────────────────────────────────────────────────────

export interface ParentRegistrationPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  userType?: 'PARENT' | 'STUDENT';
  city?: string;
  primaryStudentName?: string;
  primaryStudentGrade?: string;
  notes?: string;
}

export interface ParentRegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
      role: string;
      userType?: 'PARENT' | 'STUDENT';
    };
    parent: {
      id: string;
      primaryStudentName?: string;
      primaryStudentGrade?: string;
    };
    accessToken: string;
  };
}

/**
 * POST /api/v1/parents/register
 * Public endpoint — creates a User (role=PARENT) + Parent profile, returns JWT.
 */
export const registerParent = async (
  payload: ParentRegistrationPayload,
): Promise<ParentRegistrationResponse> => {
  return apiClient.post(
    "/v1/parents/register",
    payload,
  ) as Promise<ParentRegistrationResponse>;
};

// ─── Tutor Dashboard ──────────────────────────────────────────────────────────

export interface TutorPerformance {
  tutor: any;
  classesAssigned: number;
  classesCompleted: number;
  totalClassHours: number;
  attendanceApprovalRate: number;
  feedbackRatings: {
    overall: number;
    teachingQuality: number;
    punctuality: number;
    communication: number;
    subjectKnowledge: number;
  };
  recommendationRate: number;
  totalFeedback: number;
}

export interface TutorAdvancedAnalytics {
  sessions: { completedThisWeek: number; completedThisMonth: number };
  earnings: { thisWeek: number; thisMonth: number; total: number };
  totalTeachingHours: number;
  newClassesCount: number;
  demos: {
    total: number;
    approved: number;
    removed: number;
    approvalRate: number;
    removalRate: number;
  };
  classWiseEarnings: Array<{
    className: string;
    studentName: string;
    totalAmount: number;
    count: number;
  }>;
}

// ─── Announcements ────────────────────────────────────────────────────────────

export interface LeadAnnouncement {
  _id: string;
  postedAt: string;
  isActive: boolean;
  interestCount: number;
  matchPercentage?: number;
  isInterestedByMe?: boolean;
  interestedTutors?: Array<{ tutor: string; [key: string]: any }>;
  classLead: {
    _id: string;
    leadId?: string;
    studentName: string;
    grade?: string;
    board?: string;
    mode: string;
    city?: string;
    area?: string;
    classDurationHours?: number;
    paymentAmount?: number;
    tutorFees?: number;
    timing?: string;
    weekdays?: string[];
    preferredTutorGender?: string;
    notes?: string;
    subject?: Array<{ label?: string; value?: string }>;
  };
}

export interface AnnouncementsResponse {
  data: LeadAnnouncement[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  myInterestCount?: number;
}

export const getTutorAnnouncements = async (
  page = 1,
  limit = 10,
): Promise<AnnouncementsResponse> =>
  apiClient.get(
    `/announcements/tutor/available?page=${page}&limit=${limit}`,
  ) as Promise<AnnouncementsResponse>;

export const getTutorMyInterests = async (): Promise<{ data: LeadAnnouncement[] }> =>
  apiClient.get(`/announcements/tutor/my-interests`) as Promise<{ data: LeadAnnouncement[] }>;

export const expressInterest = async (
  announcementId: string,
  notes?: string,
): Promise<any> =>
  apiClient.post(`/announcements/${announcementId}/interest`, { notes });

// ─── Demos ────────────────────────────────────────────────────────────────────

export interface TutorDemo {
  _id: string;
  // DemoHistory fields
  demoDate: string;
  demoTime: string;
  status: string;
  assignedBy?: { _id: string; name?: string; email?: string };
  assignedAt?: string;
  completedAt?: string;
  resultUpdatedAt?: string;
  feedback?: string;
  rejectionReason?: string;
  notes?: string;
  attendanceStatus?: string;
  topicCovered?: string;
  duration?: string;
  createdAt?: string;
  updatedAt?: string;
  // ClassLead (populated)
  classLead: {
    _id: string;
    leadId?: string;
    studentType?: string;
    studentName?: string;
    studentGender?: string;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
    grade?: string;
    board?: string;
    mode: string;
    location?: string;
    city?: string;
    area?: string;
    address?: string;
    timing?: string;
    weekdays?: string[];
    classesPerMonth?: number;
    classDurationHours?: number;
    paymentAmount?: number;
    tutorFees?: number;
    preferredTutorGender?: string;
    leadSource?: string;
    numberOfStudents?: number;
    subject?: Array<{ label?: string; value?: string }>;
  };
}

export const getMyDemos = async (
  page = 1,
  limit = 10,
  status?: string,
): Promise<{
  data: TutorDemo[];
  pagination: { total: number; page: number; limit: number; pages: number };
}> =>
  apiClient.get(
    `/demos/tutor/my-demos?page=${page}&limit=${limit}${status ? `&status=${status}` : —}`,
  ) as any;

export const submitDemoResult = async (
  leadId: string,
  payload: {
    status: string;
    attendanceStatus: string;
    topicCovered?: string;
    feedback?: string;
    duration?: string;
  },
): Promise<any> => apiClient.patch(`/demos/status/${leadId}`, payload);

export interface TutorProfileDocument {
  documentType: string;
  documentUrl: string;
  s3Key?: string;
}

export interface TutorProfile {
  _id: string;
  teacherId: string;
  documents: TutorProfileDocument[];
  user: { name: string; email: string; phone?: string; city?: string };
}

export const getTutorProfile = async (): Promise<{ data: TutorProfile }> =>
  apiClient.get("/tutors/my-profile") as Promise<{ data: TutorProfile }>;

export const updateTutorAvailabilitySettings = async (
  tutorId: string,
  availability: { daysAvailable: string[]; timeSlots: string[] },
): Promise<any> =>
  apiClient.patch(`/tutors/${tutorId}/settings`, {
    availabilityPreferences: availability,
  });

export const uploadTutorDocument = async (
  tutorId: string,
  documentType: string,
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<{ data: TutorProfile }> => {
  const formData = new FormData();
  formData.append("document", {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);
  formData.append("documentType", documentType);
  return apiClient.post(`/tutors/${tutorId}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }) as Promise<{ data: TutorProfile }>;
};

export const updateVerificationFee = async (
  tutorId: string,
  status: "PENDING" | "DEDUCT_FROM_FIRST_MONTH",
  fileUri?: string,
  fileName?: string,
  mimeType?: string,
) => {
  const formData = new FormData();
  formData.append("verificationFeeStatus", status);
  if (fileUri && fileName && mimeType) {
    formData.append("document", {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);
  }
  return apiClient.patch(`/tutors/${tutorId}/verification-fee`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const submitVerification = async (tutorId: string) =>
  apiClient.post(`/tutors/${tutorId}/submit-verification`);

export const getTutorPerformance = async (
  userId: string,
): Promise<{ data: TutorPerformance }> =>
  apiClient.get(`/tutors/${userId}/performance`) as Promise<{
    data: TutorPerformance;
  }>;

export const getTutorAnalytics = async (
  userId: string,
): Promise<{ data: TutorAdvancedAnalytics }> =>
  apiClient.get(`/tutors/${userId}/advanced-analytics`) as Promise<{
    data: TutorAdvancedAnalytics;
  }>;

// ─── Today's Classes ──────────────────────────────────────────────────────────

export interface TodayClass {
  _id: string;
  studentName: string;
  studentPhone?: string;
  subject: string;
  grade?: string;
  board?: string;
  date: string; // "YYYY-MM-DD" — filter by this on client
  scheduledTime: string; // "HH:MM" 24-hour local time
  durationHours: number;
  mode: "ONLINE" | "OFFLINE" | "HYBRID";
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  attendanceMarked?: boolean;
  city?: string;
  area?: string;
  paymentAmount?: number;
  meetingLink?: string;
}

export interface AttendancePayload {
  topicCovered?: string;
  studentAttendanceStatus: "PRESENT" | "ABSENT";
  sessionDate: string; // ISO string — today's date
  durationHours?: number;
}

export interface AttendanceResponse {
  success: boolean;
  message: string;
}

export interface TodayClassesResponse {
  data: TodayClass[];
  total: number;
  date: string; // "YYYY-MM-DD"
}

const TODAY = new Date().toISOString().slice(0, 10);

// Dummy data — exact shape the backend will return
const DUMMY_TODAY_CLASSES: TodayClassesResponse = {
  date: TODAY,
  total: 4,
  data: [
    {
      _id: "cls_001",
      studentName: "Aarav Sharma",
      studentPhone: "+91 98765 43210",
      subject: "Mathematics",
      grade: "Class 10",
      board: "CBSE",
      date: TODAY,
      scheduledTime: "09:00",
      durationHours: 1.5,
      mode: "ONLINE",
      status: "COMPLETED",
      attendanceMarked: true,
      paymentAmount: 800,
      meetingLink: "https://meet.google.com/abc-defg-hij",
    },
    {
      _id: "cls_002",
      studentName: "Priya Mehta",
      studentPhone: "+91 91234 56789",
      subject: "Physics",
      grade: "Class 12",
      board: "CBSE",
      date: TODAY,
      scheduledTime: "11:30",
      durationHours: 1,
      mode: "OFFLINE",
      status: "IN_PROGRESS",
      attendanceMarked: false,
      city: "Delhi",
      area: "Dwarka",
      paymentAmount: 700,
    },
    {
      _id: "cls_003",
      studentName: "Rohan Gupta",
      studentPhone: "+91 99887 76655",
      subject: "Chemistry",
      grade: "Class 11",
      board: "ICSE",
      date: TODAY,
      scheduledTime: "14:00",
      durationHours: 1.5,
      mode: "ONLINE",
      status: "SCHEDULED",
      attendanceMarked: false,
      paymentAmount: 750,
      meetingLink: "https://zoom.us/j/12345678",
    },
    {
      _id: "cls_004",
      studentName: "Sneha Patel",
      studentPhone: "+91 88776 65544",
      subject: "English",
      grade: "Class 8",
      board: "CBSE",
      date: TODAY,
      scheduledTime: "17:00",
      durationHours: 1,
      mode: "HYBRID",
      status: "SCHEDULED",
      attendanceMarked: false,
      city: "Delhi",
      area: "Rohini",
      paymentAmount: 600,
    },
  ],
};

export const getTodayClasses = async (
  _tutorId: string,
): Promise<TodayClassesResponse> => {
  if (IS_STATIC) return Promise.resolve(DUMMY_TODAY_CLASSES);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const month = now.getMonth() + 1; // 1-indexed
  const year = now.getFullYear();

  // Fetch real ClassSession documents for this month
  const sessionsRes: any = await apiClient.get(
    `/class-sessions/tutor/my?month=${month}&year=${year}`,
  );
  const sessions: any[] = sessionsRes.data ?? sessionsRes ?? [];

  // Keep only sessions whose sessionDate is today (compare YYYY-MM-DD)
  const todaySessions = sessions.filter((s: any) => {
    const d = new Date(s.sessionDate);
    return d.toISOString().slice(0, 10) === todayStr;
  });

  // Also fetch today's attendance to mark already-submitted sessions
  const todayDate = new Date(now); todayDate.setHours(0, 0, 0, 0);
  const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  let markedClassIds = new Set<string>();
  try {
    const attRes: any = await apiClient.get(
      `/attendance?fromDate=${todayDate.toISOString()}&toDate=${tomorrowDate.toISOString()}`,
    );
    const attList: any[] = attRes.data ?? attRes ?? [];
    markedClassIds = new Set(
      attList.map((att: any) => {
        if (typeof att.finalClass === "string") return att.finalClass;
        return att.finalClass?.id ?? att.finalClass?._id ?? —;
      }),
    );
  } catch (_) {
    // attendance fetch failure shouldn't block display
  }

  const mapped: TodayClass[] = todaySessions.map((s: any) => {
    const c = s.finalClass ?? {};
    const classId = c._id ?? c.id ?? s.finalClass;
    const subjects = Array.isArray(c.subject)
      ? c.subject.map((sub: any) => sub.label ?? sub.name ?? sub).filter(Boolean).join(", ")
      : String(c.subject ?? "—");
    return {
      _id: String(classId ?? s._id),
      studentName: c.studentName ?? "—",
      studentPhone: c.parent?.phone,
      subject: subjects || "—",
      grade: c.grade,
      board: c.board,
      date: todayStr,
      scheduledTime: s.timeSlot ?? c.schedule?.timeSlot ?? "—",
      durationHours: c.classDurationHours ?? 1,
      mode: c.mode ?? "OFFLINE",
      status: (s.status === "COMPLETED" ? "COMPLETED" : "SCHEDULED") as TodayClass["status"],
      attendanceMarked: s.status === "COMPLETED" || markedClassIds.has(String(classId)),
      city: c.location?.city,
      area: c.location?.area,
      paymentAmount: c.tutorRatePerSession ?? c.ratePerSession,
    };
  });

  return { data: mapped, total: mapped.length, date: todayStr };
};

export const submitAttendance = async (
  classId: string,
  payload: AttendancePayload,
): Promise<AttendanceResponse> => {
  if (IS_STATIC) {
    return Promise.resolve({
      success: true,
      message: "Attendance marked (static mode)",
    });
  }
  // Real endpoint: POST /api/attendance with finalClassId in body
  return apiClient.post("/attendance", {
    finalClassId: classId,
    ...payload,
  }) as Promise<AttendanceResponse>;
};

// ─── Registration Email OTP ──────────────────────────────────────────────────

export const sendRegistrationOtp = async (email: string): Promise<void> => {
  await apiClient.post("/auth/email-otp/send", { email });
};

export const verifyRegistrationOtp = async (email: string, otp: string): Promise<void> => {
  await apiClient.post("/auth/email-otp/verify", { email, otp });
};

// ─── Push Notifications ───────────────────────────────────────────────────────

export const registerPushToken = async (
  expoPushToken: string,
): Promise<void> => {
  if (IS_STATIC) return;
  await apiClient.post("/auth/push-token", { expoPushToken });
};

// ─── In-app Notifications ─────────────────────────────────────────────────────

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedAnnouncement?: string | null;
}

export const getMyNotifications = async (
  page = 1,
  limit = 20,
): Promise<{ data: AppNotification[]; total: number }> => {
  return apiClient.get(`/notifications?page=${page}&limit=${limit}`) as any;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await apiClient.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await apiClient.patch("/notifications/mark-all-read");
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const res: any = await apiClient.get("/notifications/unread-count");
  return res?.data?.count ?? 0;
};

// ─── Edit Profile ─────────────────────────────────────────────────────────────

export interface EditProfileData {
  fullName: string;
  gender: string;
  phoneNumber: string;
  email: string;
  qualification: string;
  experience: string;
  subjects: any[];
  extracurricularActivities: string[];
  city: string;
  preferredAreas: string[];
  preferredMode: string;
  permanentAddress: string;
  residentialAddress: string;
  alternatePhone: string;
  bio: string;
  languagesKnown: string[];
  skills: string[];
  verificationStatus: string;
}

// ─── My Classes ──────────────────────────────────────────────────────────────

export interface FinalClass {
  _id: string;
  id: string;
  studentName: string;
  className?: string;
  grade?: string;
  board?: string;
  subject: Array<string | { label?: string; name?: string; value?: string }>;
  mode: "ONLINE" | "OFFLINE" | "HYBRID";
  status: string;
  completedSessions: number;
  totalSessions?: number;
  sheetCount?: number;
  schedule?: { timeSlot?: string; daysOfWeek?: string[] };
  coordinator?: { name?: string; phone?: string };
  classLead?: { classesPerMonth?: number; classDurationHours?: number };
}

export interface ClassAttendanceRecord {
  _id: string;
  sessionDate: string;
  studentAttendanceStatus: string;
  durationHours?: number;
  topicCovered?: string;
  submittedAt?: string;
  createdAt?: string;
  _sheetCycle?: number;
}

export const getMyClasses = async (
  status = "ACTIVE",
  userId?: string,
): Promise<{ data: FinalClass[]; pagination?: any }> => {
  if (userId) {
    const res: any = await apiClient.get(
      `/final-classes/tutor/${userId}?status=${status}&page=1&limit=100`,
    );
    return { data: res.data ?? res ?? [] };
  }
  return apiClient.get(`/final-classes/tutor/my-classes?status=${status}`) as any;
};

export const getClassAttendance = async (
  classId: string,
): Promise<{ data: ClassAttendanceRecord[] }> =>
  apiClient.get(`/attendance/class/${classId}`) as any;

export const getMyProfileForEdit = async (): Promise<{
  data: EditProfileData;
}> => apiClient.get("/tutors/my-profile/for-edit") as any;

export const markWhatsappCommunityJoined = async (): Promise<void> => {
  await apiClient.put("/tutors/my-profile", { whatsappCommunityJoined: true });
};

export const updateMyProfile = async (
  payload: Partial<Omit<EditProfileData, "verificationStatus" | "email">>,
): Promise<{ data: any }> =>
  apiClient.put("/tutors/my-profile", payload) as any;

// ─── Shift Requests ───────────────────────────────────────────────────────────

export interface ShiftRequest {
  _id: string;
  finalClass: string | { _id: string; [key: string]: any };
  cycleNumber: number;
  shiftDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  createdAt: string;
}

export const createShiftRequest = async (payload: {
  finalClassId: string;
  cycleNumber: number;
  shiftDays: number;
  reason: string;
}): Promise<{ data: ShiftRequest }> =>
  apiClient.post("/shift-requests", payload) as any;

export const getMyShiftRequests = async (): Promise<{ data: ShiftRequest[]; count: number }> =>
  apiClient.get("/shift-requests/tutor/mine") as any;

export const getShiftRequestsForClass = async (
  classId: string,
): Promise<{ data: ShiftRequest[]; count: number }> =>
  apiClient.get(`/shift-requests/class/${classId}`) as any;

export interface PendingCycleClass {
  _id: string;
  className: string;
  studentName: string;
  classesPerMonth: number;
  currentCycleNumber: number;
  schedule?: { daysOfWeek?: string[]; timeSlot?: string };
}

export const getPendingCycleStarts = async (): Promise<{ data: PendingCycleClass[] }> =>
  apiClient.get("/final-classes/tutor/pending-cycle-start") as any;

export const setCycleStartDate = async (
  classId: string,
  startDate: string,
): Promise<any> =>
  apiClient.post(`/final-classes/${classId}/start-cycle`, { startDate });

// ─── Class Sessions ───────────────────────────────────────────────────────────

export interface ClassSessionItem {
  _id: string;
  sessionDate: string;
  sessionNumber: number;
  cycleNumber?: number;
  cycleMonth: number;
  cycleYear: number;
  status: "PLANNED" | "COMPLETED" | "CANCELLED";
  timeSlot: string;
  finalClass?: FinalClass;
}

export const getTutorSessions = async (
  month: number,
  year: number,
): Promise<{ data: ClassSessionItem[] }> =>
  apiClient.get(`/class-sessions/tutor/my?month=${month}&year=${year}`) as any;

export const rescheduleSession = async (
  sessionId: string,
  newDate: string,
  newTimeSlot?: string,
): Promise<any> =>
  apiClient.patch(`/class-sessions/${sessionId}/reschedule`, { newDate, newTimeSlot });

export const requestTutorReschedule = (sessionId: string, newDate: string): Promise<any> =>
  apiClient.post(`/class-sessions/${sessionId}/reschedule-request`, { newDate });

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface PaymentItem {
  _id: string;
  amount: number;
  status: "PENDING" | "PAID" | "OVERDUE";
  paymentType: string;
  paymentMethod?: string;
  paymentDate?: string;
  dueDate: string;
  cycleMonth?: number;
  cycleYear?: number;
  transactionId?: string;
  notes?: string;
  finalClass?: { _id: string; studentName: string; className: string; mode: string };
  createdAt: string;
}

export interface PaymentSummaryResponse {
  data: {
    payments: PaymentItem[];
    statistics: { totalAmount: number; paidAmount: number; pendingAmount: number };
  };
}

export const getTutorPayoutSummary = (): Promise<PaymentSummaryResponse> =>
  apiClient.get("/payments/tutor/summary?paymentType=TUTOR_PAYOUT") as any;

export const getTutorVerificationFeeSummary = (): Promise<PaymentSummaryResponse> =>
  apiClient.get("/payments/tutor/summary?paymentType=TUTOR_VERIFICATION_FEES") as any;

export const deleteAccount = (): Promise<void> =>
  apiClient.delete('/auth/account') as any;

export const restoreAccount = (email: string, password: string): Promise<any> =>
  apiClient.post('/auth/restore-account', { email, password }) as any;

export const forgotPassword = (email: string): Promise<void> =>
  apiClient.post('/auth/forgot-password', { email }) as any;

export const resetPassword = (token: string, newPassword: string): Promise<void> =>
  apiClient.post('/auth/reset-password', { token, newPassword }) as any;

// ─── Parent Dashboard ─────────────────────────────────────────────────────────

export interface ParentActiveClass {
  _id: string;
  studentName: string;
  subject: string;
  grade?: string;
  board?: string;
  mode: string;
  status: string;
  schedule?: { daysOfWeek?: string[]; timeSlot?: string };
  tutor?: { _id: string; name: string; email?: string; phone?: string; rating?: number; photoUrl?: string };
  attendanceThisMonth?: number;
  totalSessionsThisMonth?: number;
  attendancePercentage?: number;
  completedSessions?: number;
  classesPerMonth?: number;
  nextSessionDate?: string;
  nextSessionTime?: string;
}

export interface ParentLatestTest {
  _id: string;
  subject: string;
  score: number;
  totalMarks: number;
  date: string;
}

export interface ParentActivity {
  _id: string;
  type: 'ATTENDANCE' | 'TEST' | 'MESSAGE' | 'RESCHEDULE' | 'GENERAL';
  title: string;
  description: string;
  createdAt: string;
}

export interface ParentTutorRequest {
  _id: string;
  stage: 'REQUEST_RECEIVED' | 'LEAD_CREATED' | 'TEACHER_ASSIGNED_FOR_DEMO' | 'DEMO_SCHEDULED' | 'AWAITING_APPROVAL';
  subject?: string;
  grade?: string;
  createdAt: string;
}

export interface ParentDashboardData {
  hasActiveClass: boolean;
  parentName: string;
  activeClass?: ParentActiveClass;
  upcomingSessions?: Array<{
    _id: string;
    sessionDate: string;
    timeSlot: string;
    sessionNumber: number;
    status: string;
  }>;
  latestTest?: ParentLatestTest;
  recentActivity?: ParentActivity[];
  pendingRequest?: ParentTutorRequest;
}

export const getParentDashboard = (): Promise<{ data: ParentDashboardData }> =>
  apiClient.get('/v1/parents/dashboard') as any;

export interface ChildProfileData {
  primaryStudentName: string;
  notes: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  parentCity: string;
  activeClass: {
    studentName: string;
    grade: string;
    board: string;
    mode: string;
    schedule?: { daysOfWeek?: string[]; timeSlot?: string };
  } | null;
}

export const getChildProfile = (): Promise<{ data: ChildProfileData }> =>
  apiClient.get('/v1/parents/child-profile') as any;

export const updateChildProfile = (payload: {
  primaryStudentName?: string;
  notes?: string;
}): Promise<{ data: { updated: boolean } }> =>
  apiClient.patch('/v1/parents/child-profile', payload) as any;

export const submitTutorRequest = (payload: {
  subject: string;
  grade: string;
  board?: string;
  mode?: string;
  city?: string;
  notes?: string;
}): Promise<{ data: ParentTutorRequest }> =>
  apiClient.post('/v1/parents/tutor-request', payload) as any;

export const raiseParentConcern = (payload: {
  finalClassId: string;
  message: string;
}): Promise<any> =>
  apiClient.post('/v1/parents/concern', payload) as any;

// ─── Parent Sessions (Classes tab) ────────────────────────────────────────────

export interface ParentSession {
  _id: string;
  sessionDate: string;
  timeSlot: string;
  sessionNumber: number;
  status: 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'RESCHEDULED' | 'CANCELLED';
  topicsCovered?: string[];
  tutorNote?: string;
  subject?: string;
  duration?: number;
}

export interface ParentAttendanceMonth {
  month: string; // "2025-06"
  sessions: ParentSession[];
  totalSessions: number;
  attended: number;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'NOT_REQUIRED';
}

export const getParentSessions = (month?: string): Promise<{ data: ParentAttendanceMonth }> =>
  apiClient.get(`/v1/parents/sessions${month ? `?month=${month}` : ''}`) as any;

export const verifyParentAttendance = (payload: {
  month: string;
  verifiedSessions: string[];
  flaggedSessions: Array<{ sessionId: string; reason: string }>;
}): Promise<any> =>
  apiClient.post('/v1/parents/attendance/verify', payload) as any;

export const requestReschedule = (payload: {
  sessionId: string;
  preferredDate: string;
  preferredTime: string;
}): Promise<any> =>
  apiClient.post('/v1/parents/reschedule', payload) as any;

export interface ParentRescheduleHistoryItem {
  requestId: string;
  classId: string;
  studentName?: string;
  className?: string;
  subject?: string;
  fromDate: string;
  toDate: string;
  timeSlot?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  rejectionReason?: string;
}

export const getParentRescheduleHistory = (): Promise<{ data: ParentRescheduleHistoryItem[] }> =>
  apiClient.get('/v1/parents/reschedule-history') as any;

export const requestTutorChange = (payload: { reason: string }): Promise<{ data: { requested: boolean } }> =>
  apiClient.post('/v1/parents/request-tutor-change', payload) as any;

// ─── Parent Payments ──────────────────────────────────────────────────────────

export interface ParentPayment {
  _id: string;
  paymentId?: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  month: string;
  invoiceUrl?: string;
  breakdown?: Array<{ label: string; amount: number }>;
}

export interface ParentPaymentSummary {
  nextPayment?: ParentPayment;
  history: ParentPayment[];
  valueSummary?: {
    classesCompleted: number;
    subjectsActive: number;
    amountSpent: number;
    progressGain?: number;
    progressSubject?: string;
  };
  referral?: {
    code: string;
    referredCount: number;
    savedAmount: number;
    rewardBalance: number;
  };
}

export const getParentPayments = (): Promise<{ data: ParentPaymentSummary }> =>
  apiClient.get('/v1/parents/payments') as any;

// ─── Parent Progress ──────────────────────────────────────────────────────────

export interface ParentTestResult {
  _id: string;
  subject: string;
  score: number;
  totalMarks: number;
  date: string;
  type?: 'TUTOR_SET' | 'PLATFORM_STANDARD';
  topics?: string[];
  tutorRemark?: string;
  // enriched fields
  testType?: string;
  cycleNumber?: number;
  topicName?: string;
  status?: string;
  coveredChapterLabels?: string[];
  reportStrengths?: string;
  reportAreasOfImprovement?: string;
  reportRecommendations?: string;
}

export interface ParentSubjectProgress {
  subject: string;
  lastScore: number;
  lastTotalMarks: number;
  trend: 'UP' | 'DOWN' | 'STEADY';
  strongTopics: string[];
  weakTopics: string[];
  lastRemark?: string;
  tests: ParentTestResult[];
  // syllabus coverage
  totalChapters?: number;
  coveredChapters?: number;
  chapterCoverage?: Array<{ label: string; covered: boolean }>;
}

export interface ParentProgressData {
  studentName: string;
  overallTrend: 'IMPROVING' | 'STEADY' | 'NEEDS_ATTENTION';
  trendSummary: string;
  subjects: ParentSubjectProgress[];
  allTests: ParentTestResult[];
  aiInsight?: string;
  attendanceRate?: number;
  completedSessions?: number;
  totalTestsTaken?: number;
  currentCycle?: number;
}

export const getParentProgress = (): Promise<{ data: ParentProgressData }> =>
  apiClient.get('/v1/parents/progress') as any;

export const getParentTutorProfile = (): Promise<{ data: TutorProfile }> =>
  apiClient.get('/v1/parents/tutor-profile') as any;

export const getAIStudyTips = (payload: {
  topic: string;
  subject: string;
  studentName?: string;
}): Promise<{ data: { tips: string[] } }> =>
  apiClient.post('/v1/parents/ai/study-tips', payload) as any;

export const askParentAI = (payload: {
  question: string;
  context?: {
    studentName?: string;
    subjects?: string;
    trend?: string;
    attendanceRate?: string;
    currentCycle?: string;
    testHistory?: string;
    syllabusCoverage?: string;
    weakTopics?: string;
    strongTopics?: string;
    tutorRemarks?: string;
  };
}): Promise<{ data: { answer: string } }> =>
  apiClient.post('/v1/parents/ai/ask', payload) as any;

// ─── Teacher Requests ─────────────────────────────────────────────────────────

/** Alias so new code can reference OptionItem — same shape as Option */
export type OptionItem = Option;

export interface TeacherRequestPayload {
  studentName: string;
  submitterType?: 'PARENT' | 'STUDENT';
  board: string;          // Option _id
  grade: string;          // Option _id
  subjects: string[];     // Option _id[]
  mode: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  preferredDays?: string[];
  preferredTimeSlot?: string;
  address?: string;
  city?: string;
  budgetRange?: string;
  notes?: string;
}

export interface TeacherRequestResult {
  _id: string;
  requestId: string;
  studentName: string;
  board: OptionItem;
  grade: OptionItem;
  subjects: OptionItem[];
  mode: string;
  status: 'NEW' | 'CONTACTED' | 'DEMO_SCHEDULED' | 'DEMO_COMPLETED' | 'CONVERTED' | 'CLOSED';
  createdAt: string;
}

/** POST /api/v1/teacher-requests */
export const submitTeacherRequest = (
  payload: TeacherRequestPayload,
): Promise<{ data: TeacherRequestResult }> =>
  apiClient.post('/v1/teacher-requests', payload) as any;

/** GET /api/v1/teacher-requests/my */
export const getMyTeacherRequests = (): Promise<{ data: TeacherRequestResult[] }> =>
  apiClient.get('/v1/teacher-requests/my') as any;

// ─── Tickets ──────────────────────────────────────────────────────────────────

export interface Ticket {
  _id: string;
  ticketNumber: string;
  type: 'CONCERN' | 'COMPLAINT' | 'QUERY' | 'TECHNICAL' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  subject: string;
  description?: string;
  raisedByName?: string;
  studentName?: string;
  assignedToName?: string;
  resolutionNote?: string;
  resolvedAt?: string;
  createdAt: string;
  comments: Array<{
    _id: string;
    authorName: string;
    authorRole: string;
    message: string;
    createdAt: string;
  }>;
}

export const createParentTicket = (payload: {
  subject: string;
  description: string;
  type?: string;
  priority?: string;
  finalClassId?: string;
}): Promise<{ data: Ticket }> =>
  apiClient.post('/v1/tickets', payload) as any;

export const getMyTickets = (): Promise<{ data: Ticket[] }> =>
  apiClient.get('/v1/tickets/my') as any;

export const getTicket = (id: string): Promise<{ data: Ticket }> =>
  apiClient.get(`/v1/tickets/${id}`) as any;

export const addTicketComment = (id: string, message: string): Promise<{ data: Ticket }> =>
  apiClient.post(`/v1/tickets/${id}/comments`, { message }) as any;

// Staff (coordinator / admin)
export const listTickets = (params?: {
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Ticket[]; pagination: { total: number; page: number; limit: number } }> =>
  apiClient.get('/v1/tickets', { params }) as any;

export const getTicketStats = (): Promise<{ data: { open: number; inProgress: number; resolved: number; total: number } }> =>
  apiClient.get('/v1/tickets/stats') as any;

export const updateTicketStatus = (id: string, payload: {
  status?: string;
  priority?: string;
  resolutionNote?: string;
  assignedTo?: string;
}): Promise<{ data: Ticket }> =>
  apiClient.patch(`/v1/tickets/${id}/status`, payload) as any;

// ─── Tests ───────────────────────────────────────────────────────────────────

export interface TestDoc {
  _id: string;
  finalClass: string | { _id: string; studentName: string; className?: string; grade?: string; board?: string; subject: any[] };
  tutor: string | { name: string };
  testDate: string;
  testTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'REPORT_SUBMITTED';
  cycleNumber: number;
  testType?: string;
  topicName?: string;
  testSyllabus?: string;
  totalMarks?: number;
  obtainedMarks?: number;
  durationMinutes?: number;
  coveredChapters?: string[];
  questionAnalysis?: Array<{ topic: string; totalQuestions: number; correctedQuestions: number }>;
  report?: {
    feedback: string;
    strengths: string;
    areasOfImprovement: string;
    studentPerformance: string;
    recommendations: string;
  };
  notes?: string;
  createdAt: string;
}

export interface TestCompliance {
  classId: string;
  className: string;
  studentName: string;
  grade: string;
  board: string;
  currentCycle: number;
  required: number;
  scheduled: number;
  compliant: boolean;
}

export interface SyllabusCoverage {
  classId: string;
  testsPerCycleRequired: number;
  currentCycle: number;
  totalChapters: number;
  coveredChapters: number;
  subjects: Array<{ subjectId: string; label: string; total: number; covered: number }>;
  chapters: Array<{ _id: string; label: string; value: string; sortOrder: number; subjectId: string; covered: boolean; coveredInCycles: number[] }>;
  cycleTestCounts: Record<number, number>;
}

export const getTutorTests = (params?: { status?: string; page?: number; limit?: number }): Promise<{ data: TestDoc[]; pagination?: any }> =>
  apiClient.get('/tests', { params: { limit: 100, ...params } }) as any;

export const getClassTestList = (classId: string): Promise<{ data: TestDoc[] }> =>
  apiClient.get(`/tests/class/${classId}`) as any;

export const scheduleTest = (payload: {
  finalClassId: string;
  testDate: string;
  testTime: string;
  testType?: string;
  topicName?: string;
  testSyllabus?: string;
  totalMarks?: number;
  durationMinutes?: number;
  coveredChapters?: string[];
  notes?: string;
}): Promise<{ data: TestDoc }> =>
  apiClient.post('/tests', payload) as any;

export const submitTestReport = (testId: string, payload: {
  report: { feedback: string; strengths: string; areasOfImprovement: string; studentPerformance: string; recommendations: string };
  totalMarks?: number;
  obtainedMarks?: number;
  coveredChapters?: string[];
  questionAnalysis?: Array<{ topic: string; totalQuestions: number; correctedQuestions: number }>;
}): Promise<{ data: TestDoc }> =>
  apiClient.patch(`/tests/${testId}/report`, payload) as any;

export const updateTestStatus = (testId: string, status: string): Promise<{ data: TestDoc }> =>
  apiClient.patch(`/tests/${testId}/status`, { status }) as any;

export const getTutorCompliance = (): Promise<{ data: TestCompliance[] }> =>
  apiClient.get('/tests/tutor/compliance') as any;

export const getSyllabusCoverage = (classId: string): Promise<{ data: SyllabusCoverage }> =>
  apiClient.get(`/tests/class/${classId}/coverage`) as any;

// ─── Parent Shift Requests ────────────────────────────────────────────────────

export interface ParentShiftRequest {
  _id: string;
  finalClass: string;
  cycleNumber: number;
  effectiveDate: string;
  shiftDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
}

export const createParentShiftRequest = (payload: {
  effectiveDate: string;
  shiftDays: number;
  reason: string;
}): Promise<{ data: ParentShiftRequest }> =>
  apiClient.post('/v1/parents/shift-request', payload) as any;

export const getParentShiftRequests = (): Promise<{ data: ParentShiftRequest[] }> =>
  apiClient.get('/v1/parents/shift-requests') as any;

export default apiClient;
