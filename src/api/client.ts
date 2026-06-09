import axios from "axios";

// Switch between real API and dummy data by changing BASE_URL:
//   "static"                        → dummy data (no network calls)
//   "https://api.yourshikshak.in/api" → live backend
const BASE_URL = "http://192.168.1.5:5000/api";

export const IS_STATIC = BASE_URL === "static";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

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
 * GET /api/options/:type
 * Returns dropdown options for a given type (CITY, AREA_*, EXTRACURRICULAR_ACTIVITY)
 */
export const getOptions = async (type: string): Promise<{ data: Option[] }> => {
  return apiClient.get(`/options/${type}`) as Promise<{ data: Option[] }>;
};

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
  interestedTutors?: Array<{ tutor: string; [key: string]: any }>;
  classLead: {
    _id: string;
    studentName: string;
    grade?: string;
    board?: string;
    mode: string;
    city?: string;
    area?: string;
    classDurationHours?: number;
    paymentAmount?: number;
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
}

export const getTutorAnnouncements = async (
  page = 1,
  limit = 10,
): Promise<AnnouncementsResponse> =>
  apiClient.get(
    `/announcements/tutor/available?page=${page}&limit=${limit}`,
  ) as Promise<AnnouncementsResponse>;

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
    `/demos/tutor/my-demos?page=${page}&limit=${limit}${status ? `&status=${status}` : ""}`,
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
  tutorId: string,
): Promise<TodayClassesResponse> => {
  if (IS_STATIC) return Promise.resolve(DUMMY_TODAY_CLASSES);

  const todayStr = new Date().toISOString().slice(0, 10);
  const DAY_NAMES = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  const todayDay = DAY_NAMES[new Date().getDay()];

  // Same as web: GET /api/final-classes/tutor/:tutorId?status=ACTIVE&page=1&limit=50
  const classRes: any = await apiClient.get(
    `/final-classes/tutor/${tutorId}?status=ACTIVE&page=1&limit=50`,
  );
  const all: any[] = classRes.data ?? classRes ?? [];

  // Same as web: fetch today's attendance to exclude already-marked classes
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  let markedClassIds = new Set<string>();
  try {
    const attRes: any = await apiClient.get(
      `/attendance?tutorId=${tutorId}&fromDate=${todayDate.toISOString()}&toDate=${tomorrowDate.toISOString()}`,
    );
    const attList: any[] = attRes.data ?? attRes ?? [];
    markedClassIds = new Set(
      attList.map((att: any) => {
        if (typeof att.finalClass === "string") return att.finalClass;
        return att.finalClass?.id ?? att.finalClass?._id ?? "";
      }),
    );
  } catch (_) {
    // attendance fetch failure shouldn't block class display
  }

  // Filter: today's day in daysOfWeek AND attendance not already marked
  const filtered = all.filter((cls: any) => {
    const id = cls._id ?? cls.id;
    if (markedClassIds.has(id)) return false;
    const days: string[] = cls.schedule?.daysOfWeek ?? [];
    if (!days.length) return true; // no schedule restriction → always show
    return days.includes(todayDay);
  });

  const mapped: TodayClass[] = filtered.map((c: any) => {
    const subjects = Array.isArray(c.subject)
      ? c.subject
          .map((s: any) => s.label ?? s.name ?? s)
          .filter(Boolean)
          .join(", ")
      : String(c.subject ?? "—");
    return {
      _id: c._id ?? c.id,
      studentName: c.studentName ?? "—",
      studentPhone: c.parent?.phone,
      subject: subjects || "—",
      grade: c.grade,
      board: c.board,
      date: todayStr,
      scheduledTime: c.schedule?.timeSlot ?? "—",
      durationHours: c.classDurationHours ?? 1,
      mode: c.mode ?? "OFFLINE",
      status: "SCHEDULED" as const,
      attendanceMarked: false,
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

export default apiClient;
