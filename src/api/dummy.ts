/**
 * Static mock adapter for the YourShikshak mobile app.
 * When BASE_URL === "static" (IS_STATIC = true), every axios request
 * is intercepted here and resolved with realistic dummy data —
 * no network calls are made.
 *
 * Wire-up: call installMockAdapter(apiClient) once at app start
 * (done automatically in client.ts when IS_STATIC = true).
 */

import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";

// ─── Shared IDs ───────────────────────────────────────────────────────────────
const USER_ID = "u_tutor_001";
const TUTOR_ID = "t_001";
const PARENT_ID = "p_001";
const COORD_ID = "c_001";
const CLASS_1 = "cls_001";
const CLASS_2 = "cls_002";
const ANN_1 = "ann_001";
const ANN_2 = "ann_002";
const ANN_3 = "ann_003";

// ─── Seed data ────────────────────────────────────────────────────────────────

const DUMMY_USER = {
  id: USER_ID,
  name: "Amit Verma",
  email: "amit.verma@example.com",
  role: "TUTOR",
  phone: "+91 98765 43210",
  city: "Delhi",
  isActive: true,
};

const DUMMY_TUTOR_PROFILE = {
  _id: TUTOR_ID,
  teacherId: "YSDLM001",
  user: DUMMY_USER,
  documents: [
    {
      documentType: "AADHAR",
      documentUrl: "https://placehold.co/400x300/png?text=Aadhar",
      uploadedAt: "2024-01-15T10:00:00Z",
    },
    {
      documentType: "DEGREE",
      documentUrl: "https://placehold.co/400x300/png?text=Degree",
      uploadedAt: "2024-01-15T10:05:00Z",
    },
  ],
  verificationStatus: "VERIFIED",
  verificationFeeStatus: "PAID",
  isAvailable: true,
  preferredMode: "HYBRID",
  preferredLocations: ["Dwarka", "Rohini"],
  preferredCities: ["Delhi"],
  experienceHours: 480,
  yearsOfExperience: 4,
  ratings: 4.6,
  classesAssigned: 8,
  demosTaken: 22,
  demosApproved: 18,
  approvalRatio: 81.8,
  totalRatings: 14,
  classesCompleted: 5,
  interestCount: 3,
  bio: "Passionate mathematics and physics tutor with 4 years of experience in CBSE curriculum.",
  languagesKnown: ["English", "Hindi"],
  skills: ["Teaching", "Communication", "Lesson Planning"],
  qualifications: ["B.Sc Physics (Delhi University)", "M.Sc Mathematics (JNU)"],
  whatsappCommunityJoined: true,
  publicProfileEnabled: true,
  tier: "SILVER",
  settings: {
    availabilityPreferences: {
      daysAvailable: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      timeSlots: [
        "8:00 AM - 10:00 AM",
        "4:00 PM - 6:00 PM",
        "6:00 PM - 8:00 PM",
      ],
    },
  },
  createdAt: "2024-01-10T08:00:00Z",
  updatedAt: "2025-06-01T12:00:00Z",
};

const DUMMY_EDIT_PROFILE = {
  fullName: "Amit Verma",
  gender: "MALE",
  phoneNumber: "9876543210",
  email: "amit.verma@example.com",
  qualification: "M.Sc Mathematics",
  experience: "3-5 Years",
  subjects: [],
  extracurricularActivities: ["Cricket", "Chess"],
  city: "Delhi",
  preferredAreas: ["Dwarka", "Rohini"],
  preferredMode: "HYBRID",
  permanentAddress: "12, Sector 7, Dwarka, New Delhi - 110075",
  residentialAddress: "",
  alternatePhone: "",
  bio: "Passionate mathematics and physics tutor with 4 years of experience in CBSE curriculum.",
  languagesKnown: ["English", "Hindi"],
  skills: ["Teaching", "Communication", "Lesson Planning"],
  verificationStatus: "VERIFIED",
};

const DUMMY_FINAL_CLASSES = [
  {
    _id: CLASS_1,
    id: CLASS_1,
    studentName: "Aarav Sharma",
    className: "Aarav - Math Class",
    grade: "Class 10",
    board: "CBSE",
    subject: [{ label: "Mathematics", value: "math" }],
    mode: "ONLINE",
    status: "ACTIVE",
    completedSessions: 14,
    totalSessions: 24,
    sheetCount: 2,
    schedule: {
      daysOfWeek: ["Monday", "Wednesday", "Friday"],
      timeSlot: "09:00 AM",
    },
    coordinator: { name: "Pooja Nair", phone: "+91 97654 32109" },
    classLead: { classesPerMonth: 12, classDurationHours: 1.5 },
  },
  {
    _id: CLASS_2,
    id: CLASS_2,
    studentName: "Priya Mehta",
    className: "Priya - Physics Class",
    grade: "Class 12",
    board: "CBSE",
    subject: [{ label: "Physics", value: "physics" }],
    mode: "OFFLINE",
    status: "ACTIVE",
    completedSessions: 8,
    totalSessions: 20,
    sheetCount: 1,
    schedule: { daysOfWeek: ["Tuesday", "Thursday"], timeSlot: "11:30 AM" },
    coordinator: { name: "Suresh Iyer", phone: "+91 96543 21098" },
    classLead: { classesPerMonth: 8, classDurationHours: 1 },
  },
];

const TODAY = new Date().toISOString().slice(0, 10);
const NOW_HOUR = new Date().getHours();

const DUMMY_SESSIONS = [
  {
    _id: "sess_001",
    sessionDate: `${TODAY}T09:00:00.000Z`,
    sessionNumber: 15,
    cycleNumber: 2,
    cycleMonth: new Date().getMonth() + 1,
    cycleYear: new Date().getFullYear(),
    status: "COMPLETED",
    timeSlot: "09:00 AM",
    finalClass: DUMMY_FINAL_CLASSES[0],
  },
  {
    _id: "sess_002",
    sessionDate: `${TODAY}T11:30:00.000Z`,
    sessionNumber: 9,
    cycleNumber: 1,
    cycleMonth: new Date().getMonth() + 1,
    cycleYear: new Date().getFullYear(),
    status: NOW_HOUR >= 11 ? "COMPLETED" : "PLANNED",
    timeSlot: "11:30 AM",
    finalClass: DUMMY_FINAL_CLASSES[1],
  },
  {
    _id: "sess_003",
    sessionDate: `${TODAY}T14:00:00.000Z`,
    sessionNumber: 16,
    cycleNumber: 2,
    cycleMonth: new Date().getMonth() + 1,
    cycleYear: new Date().getFullYear(),
    status: "PLANNED",
    timeSlot: "02:00 PM",
    finalClass: DUMMY_FINAL_CLASSES[0],
  },
];

const DUMMY_ANNOUNCEMENTS = [
  {
    _id: ANN_1,
    postedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    isActive: true,
    interestCount: 5,
    matchPercentage: 92,
    classLead: {
      _id: "lead_001",
      studentName: "Riya Kapoor",
      grade: "Class 9",
      board: "CBSE",
      mode: "ONLINE",
      city: "Delhi",
      area: "Dwarka",
      classDurationHours: 1.5,
      paymentAmount: 850,
      subject: [{ label: "Mathematics", value: "math" }],
    },
  },
  {
    _id: ANN_2,
    postedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    isActive: true,
    interestCount: 2,
    matchPercentage: 78,
    classLead: {
      _id: "lead_002",
      studentName: "Dev Malhotra",
      grade: "Class 11",
      board: "CBSE",
      mode: "OFFLINE",
      city: "Delhi",
      area: "Rohini",
      classDurationHours: 1,
      paymentAmount: 700,
      subject: [{ label: "Physics", value: "physics" }],
    },
  },
  {
    _id: ANN_3,
    postedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    isActive: true,
    interestCount: 9,
    matchPercentage: 100,
    classLead: {
      _id: "lead_003",
      studentName: "Ananya Singh",
      grade: "Class 10",
      board: "CBSE",
      mode: "HYBRID",
      city: "Delhi",
      area: "Dwarka",
      classDurationHours: 1.5,
      paymentAmount: 900,
      subject: [
        { label: "Mathematics", value: "math" },
        { label: "Science", value: "science" },
      ],
    },
  },
];

const DUMMY_DEMOS = [
  {
    _id: "demo_001",
    demoDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    demoTime: "10:00 AM",
    status: "SCHEDULED",
    assignedBy: { _id: "mgr_001", name: "Ravi Kumar", email: "ravi@ys.com" },
    assignedAt: new Date(Date.now() - 86400000).toISOString(),
    notes: "Student is weak in algebra. Focus on basics.",
    classLead: {
      _id: "lead_004",
      leadId: "YS-DEMO-004",
      studentName: "Kabir Joshi",
      studentGender: "M",
      parentName: "Mohan Joshi",
      parentPhone: "+91 99887 11223",
      grade: "Class 8",
      board: "CBSE",
      mode: "ONLINE",
      timing: "10:00 AM",
      weekdays: ["Monday", "Wednesday"],
      classesPerMonth: 8,
      classDurationHours: 1,
      paymentAmount: 650,
      tutorFees: 500,
      subject: [{ label: "Mathematics", value: "math" }],
    },
  },
  {
    _id: "demo_002",
    demoDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    demoTime: "04:00 PM",
    status: "COMPLETED",
    assignedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    completedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    feedback: "Demo went well. Student showed good interest.",
    attendanceStatus: "PRESENT",
    topicCovered: "Introduction to Quadratic Equations",
    classLead: {
      _id: "lead_005",
      leadId: "YS-DEMO-005",
      studentName: "Tanya Bose",
      studentGender: "F",
      parentName: "Arindam Bose",
      parentPhone: "+91 98765 00112",
      grade: "Class 10",
      board: "ICSE",
      mode: "OFFLINE",
      city: "Delhi",
      area: "Rohini",
      timing: "04:00 PM",
      weekdays: ["Tuesday", "Thursday"],
      classesPerMonth: 8,
      classDurationHours: 1.5,
      paymentAmount: 800,
      tutorFees: 600,
      subject: [{ label: "Mathematics", value: "math" }],
    },
  },
  {
    _id: "demo_003",
    demoDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    demoTime: "06:00 PM",
    status: "APPROVED",
    completedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    feedback: "Excellent demo. Parent approved immediately.",
    classLead: {
      _id: "lead_001",
      leadId: "YS-DEMO-001",
      studentName: "Aarav Sharma",
      grade: "Class 10",
      board: "CBSE",
      mode: "ONLINE",
      timing: "09:00 AM",
      weekdays: ["Monday", "Wednesday", "Friday"],
      classesPerMonth: 12,
      classDurationHours: 1.5,
      paymentAmount: 850,
      tutorFees: 650,
      subject: [{ label: "Mathematics", value: "math" }],
    },
  },
];

const DUMMY_ATTENDANCE: Record<string, any[]> = {
  [CLASS_1]: [
    {
      _id: "att_001",
      sessionDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      studentAttendanceStatus: "PRESENT",
      durationHours: 1.5,
      topicCovered: "Trigonometry - Sin, Cos, Tan",
      submittedAt: new Date(Date.now() - 2 * 86400000 + 5400000).toISOString(),
      _sheetCycle: 2,
    },
    {
      _id: "att_002",
      sessionDate: new Date(Date.now() - 4 * 86400000).toISOString(),
      studentAttendanceStatus: "PRESENT",
      durationHours: 1.5,
      topicCovered: "Quadratic Equations - Discriminant",
      submittedAt: new Date(Date.now() - 4 * 86400000 + 5400000).toISOString(),
      _sheetCycle: 2,
    },
    {
      _id: "att_003",
      sessionDate: new Date(Date.now() - 6 * 86400000).toISOString(),
      studentAttendanceStatus: "ABSENT",
      durationHours: 0,
      topicCovered: "",
      submittedAt: new Date(Date.now() - 6 * 86400000 + 3600000).toISOString(),
      _sheetCycle: 2,
    },
  ],
  [CLASS_2]: [
    {
      _id: "att_004",
      sessionDate: new Date(Date.now() - 3 * 86400000).toISOString(),
      studentAttendanceStatus: "PRESENT",
      durationHours: 1,
      topicCovered: "Newton's Laws of Motion",
      submittedAt: new Date(Date.now() - 3 * 86400000 + 3600000).toISOString(),
      _sheetCycle: 1,
    },
  ],
};

const DUMMY_PAYMENTS = [
  {
    _id: "pay_001",
    amount: 7800,
    status: "PAID",
    paymentType: "TUTOR_PAYOUT",
    paymentMethod: "BANK_TRANSFER",
    paymentDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    dueDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    cycleMonth: new Date().getMonth(),
    cycleYear: new Date().getFullYear(),
    transactionId: "TXN20250601001",
    finalClass: {
      _id: CLASS_1,
      studentName: "Aarav Sharma",
      className: "Aarav - Math Class",
      mode: "ONLINE",
    },
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    _id: "pay_002",
    amount: 4800,
    status: "PENDING",
    paymentType: "TUTOR_PAYOUT",
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    cycleMonth: new Date().getMonth() + 1,
    cycleYear: new Date().getFullYear(),
    finalClass: {
      _id: CLASS_2,
      studentName: "Priya Mehta",
      className: "Priya - Physics Class",
      mode: "OFFLINE",
    },
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    _id: "pay_003",
    amount: 999,
    status: "PAID",
    paymentType: "TUTOR_VERIFICATION_FEES",
    paymentMethod: "UPI",
    paymentDate: new Date(Date.now() - 60 * 86400000).toISOString(),
    dueDate: new Date(Date.now() - 60 * 86400000).toISOString(),
    transactionId: "TXN20250401VFE",
    createdAt: new Date(Date.now() - 65 * 86400000).toISOString(),
  },
];

const DUMMY_NOTIFICATIONS = [
  {
    _id: "notif_001",
    type: "DEMO_ASSIGNED",
    title: "New Demo Assigned",
    message:
      "You have been assigned a demo for Kabir Joshi (Class 8 - Mathematics) on upcoming Monday at 10:00 AM.",
    isRead: false,
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    relatedAnnouncement: null,
  },
  {
    _id: "notif_002",
    type: "ANNOUNCEMENT",
    title: "Perfect Match Found!",
    message:
      "A new class opportunity matches 100% with your profile — Ananya Singh (Class 10, Maths + Science, Dwarka).",
    isRead: false,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    relatedAnnouncement: ANN_3,
  },
  {
    _id: "notif_003",
    type: "PAYMENT",
    title: "Payment Received",
    message:
      "₹7,800 has been transferred to your bank account for Aarav Sharma's May cycle.",
    isRead: true,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    relatedAnnouncement: null,
  },
  {
    _id: "notif_004",
    type: "VERIFICATION",
    title: "Profile Verified ✓",
    message:
      "Your tutor profile has been verified. You are now visible to students and can receive class opportunities.",
    isRead: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    relatedAnnouncement: null,
  },
];

const DUMMY_SHIFT_REQUESTS = [
  {
    _id: "shift_001",
    finalClass: CLASS_1,
    cycleNumber: 2,
    shiftDays: 3,
    reason: "Family function on original cycle dates",
    status: "APPROVED",
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    _id: "shift_002",
    finalClass: CLASS_2,
    cycleNumber: 1,
    shiftDays: 2,
    reason: "Medical appointment",
    status: "PENDING",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

const DUMMY_OPTIONS: Record<string, any[]> = {
  CITY: [
    { _id: "opt_city_del", label: "Delhi", value: "DELHI", type: "CITY" },
    { _id: "opt_city_mum", label: "Mumbai", value: "MUMBAI", type: "CITY" },
    {
      _id: "opt_city_blr",
      label: "Bangalore",
      value: "BANGALORE",
      type: "CITY",
    },
    {
      _id: "opt_city_hyd",
      label: "Hyderabad",
      value: "HYDERABAD",
      type: "CITY",
    },
    { _id: "opt_city_pun", label: "Pune", value: "PUNE", type: "CITY" },
  ],
  AREA_DELHI: [
    {
      _id: "opt_area_dwk",
      label: "Dwarka",
      value: "DWARKA",
      type: "AREA_DELHI",
    },
    {
      _id: "opt_area_roh",
      label: "Rohini",
      value: "ROHINI",
      type: "AREA_DELHI",
    },
    {
      _id: "opt_area_jan",
      label: "Janakpuri",
      value: "JANAKPURI",
      type: "AREA_DELHI",
    },
    {
      _id: "opt_area_pat",
      label: "Patel Nagar",
      value: "PATEL_NAGAR",
      type: "AREA_DELHI",
    },
    {
      _id: "opt_area_kal",
      label: "Karol Bagh",
      value: "KAROL_BAGH",
      type: "AREA_DELHI",
    },
  ],
  BOARD: [
    { _id: "opt_cbse", label: "CBSE", value: "CBSE", type: "BOARD" },
    { _id: "opt_icse", label: "ICSE", value: "ICSE", type: "BOARD" },
    {
      _id: "opt_state",
      label: "State Board",
      value: "STATE_BOARD",
      type: "BOARD",
    },
    { _id: "opt_ib", label: "IB", value: "IB", type: "BOARD" },
  ],
  GRADE: [
    { _id: "opt_g1", label: "Class 1", value: "CLASS_1", type: "GRADE" },
    { _id: "opt_g6", label: "Class 6", value: "CLASS_6", type: "GRADE" },
    { _id: "opt_g8", label: "Class 8", value: "CLASS_8", type: "GRADE" },
    { _id: "opt_g9", label: "Class 9", value: "CLASS_9", type: "GRADE" },
    { _id: "opt_g10", label: "Class 10", value: "CLASS_10", type: "GRADE" },
    { _id: "opt_g11", label: "Class 11", value: "CLASS_11", type: "GRADE" },
    { _id: "opt_g12", label: "Class 12", value: "CLASS_12", type: "GRADE" },
  ],
  EXTRACURRICULAR_ACTIVITY: [
    {
      _id: "opt_ex1",
      label: "Cricket",
      value: "CRICKET",
      type: "EXTRACURRICULAR_ACTIVITY",
    },
    {
      _id: "opt_ex2",
      label: "Chess",
      value: "CHESS",
      type: "EXTRACURRICULAR_ACTIVITY",
    },
    {
      _id: "opt_ex3",
      label: "Drawing",
      value: "DRAWING",
      type: "EXTRACURRICULAR_ACTIVITY",
    },
    {
      _id: "opt_ex4",
      label: "Swimming",
      value: "SWIMMING",
      type: "EXTRACURRICULAR_ACTIVITY",
    },
    {
      _id: "opt_ex5",
      label: "Dance",
      value: "DANCE",
      type: "EXTRACURRICULAR_ACTIVITY",
    },
    {
      _id: "opt_ex6",
      label: "Music",
      value: "MUSIC",
      type: "EXTRACURRICULAR_ACTIVITY",
    },
  ],
};

const DUMMY_PERFORMANCE = {
  tutor: DUMMY_TUTOR_PROFILE,
  classesAssigned: 8,
  classesCompleted: 5,
  totalClassHours: 192,
  attendanceApprovalRate: 94.2,
  averageTestScore: 78.5,
  feedbackRatings: {
    overall: 4.6,
    teachingQuality: 4.7,
    punctuality: 4.5,
    communication: 4.6,
    subjectKnowledge: 4.8,
  },
  recommendationRate: 92.3,
  totalFeedback: 14,
};

const DUMMY_ANALYTICS = {
  sessions: { completedThisWeek: 6, completedThisMonth: 22 },
  earnings: { thisWeek: 3900, thisMonth: 14300, total: 98400 },
  totalTeachingHours: 328,
  newClassesCount: 2,
  demos: {
    total: 22,
    approved: 18,
    removed: 2,
    approvalRate: 81.8,
    removalRate: 9.1,
  },
  classWiseEarnings: [
    {
      className: "Aarav - Math Class",
      studentName: "Aarav Sharma",
      totalAmount: 62400,
      count: 8,
    },
    {
      className: "Priya - Physics Class",
      studentName: "Priya Mehta",
      totalAmount: 36000,
      count: 5,
    },
  ],
};

const DUMMY_PARENT_DASHBOARD = {
  hasActiveClass: true,
  parentName: "Sunita Sharma",
  activeClass: {
    _id: CLASS_1,
    studentName: "Aarav Sharma",
    subject: "Mathematics",
    grade: "Class 10",
    board: "CBSE",
    mode: "ONLINE",
    status: "ACTIVE",
    schedule: {
      daysOfWeek: ["Monday", "Wednesday", "Friday"],
      timeSlot: "09:00 AM",
    },
    tutor: {
      _id: USER_ID,
      name: "Amit Verma",
      email: "amit.verma@example.com",
      phone: "+91 98765 43210",
      rating: 4.6,
    },
    attendanceThisMonth: 10,
    totalSessionsThisMonth: 12,
    attendancePercentage: 83,
    completedSessions: 14,
    classesPerMonth: 12,
    nextSessionDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    nextSessionTime: "09:00 AM",
  },
  upcomingSessions: [
    {
      _id: "sess_up_001",
      sessionDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      timeSlot: "09:00 AM",
      sessionNumber: 16,
      status: "PLANNED",
    },
    {
      _id: "sess_up_002",
      sessionDate: new Date(Date.now() + 4 * 86400000).toISOString(),
      timeSlot: "09:00 AM",
      sessionNumber: 17,
      status: "PLANNED",
    },
  ],
  latestTest: {
    _id: "test_001",
    subject: "Mathematics",
    score: 78,
    totalMarks: 100,
    date: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  recentActivity: [
    {
      _id: "act_001",
      type: "ATTENDANCE",
      title: "Attendance Marked",
      description: "Session on Trigonometry completed — Aarav was present.",
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      _id: "act_002",
      type: "TEST",
      title: "Test Completed",
      description: "Mathematics test — Aarav scored 78/100.",
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
  ],
};

const DUMMY_TEACHER_REQUESTS = [
  {
    _id: "tr_001",
    requestId: "YS-TR-001",
    studentName: "Aarav Sharma",
    board: { _id: "opt_cbse", label: "CBSE", value: "CBSE" },
    grade: { _id: "opt_g10", label: "Class 10", value: "CLASS_10" },
    subjects: [{ _id: "opt_math", label: "Mathematics", value: "MATH" }],
    mode: "ONLINE",
    status: "CONVERTED",
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
];

// ─── Mock Router ──────────────────────────────────────────────────────────────

type MockRoute = {
  method: string;
  pattern: RegExp;
  handler: (url: string, config: InternalAxiosRequestConfig) => any;
};

const routes: MockRoute[] = [
  // Auth
  {
    method: "POST",
    pattern: /\/auth\/login/,
    handler: () => ({
      success: true,
      message: "Login successful",
      data: {
        user: { ...DUMMY_USER, userType: undefined },
        tokens: {
          accessToken: "dummy_access_token_" + Date.now(),
          refreshToken: "dummy_refresh_token_" + Date.now(),
        },
      },
    }),
  },
  {
    method: "POST",
    pattern: /\/auth\/email-otp\/(send|verify)/,
    handler: () => ({ success: true, message: "OK" }),
  },
  {
    method: "POST",
    pattern: /\/auth\/push-token/,
    handler: () => ({ success: true }),
  },
  {
    method: "DELETE",
    pattern: /\/auth\/account/,
    handler: () => ({ success: true, message: "Account deleted" }),
  },
  {
    method: "POST",
    pattern: /\/auth\/restore-account/,
    handler: () => ({ success: true, message: "Account restored" }),
  },

  // Options
  {
    method: "GET",
    pattern: /\/options\/([^?]+)/,
    handler: (url) => {
      const match = url.match(/\/options\/([^?]+)/);
      const type = (match?.[1] ?? "").toUpperCase();
      const opts =
        DUMMY_OPTIONS[type] ?? DUMMY_OPTIONS[type.replace(/%20/g, "_")] ?? [];
      return { success: true, data: opts };
    },
  },

  // Tutor Registration
  {
    method: "POST",
    pattern: /\/v1\/tutor-leads/,
    handler: () => ({
      success: true,
      message: "Registration successful",
      data: { teacherId: "YSDLM999" },
    }),
  },

  // Parent Registration
  {
    method: "POST",
    pattern: /\/v1\/parents\/register/,
    handler: () => ({
      success: true,
      message: "Parent registered successfully",
      data: {
        user: {
          id: PARENT_ID,
          name: "Sunita Sharma",
          email: "sunita@example.com",
          phone: "9988776655",
          role: "PARENT",
        },
        parent: {
          id: PARENT_ID,
          primaryStudentName: "Aarav Sharma",
          primaryStudentGrade: "Class 10",
        },
        accessToken: "dummy_parent_token_" + Date.now(),
      },
    }),
  },

  // Parent dashboard & actions
  {
    method: "GET",
    pattern: /\/v1\/parents\/dashboard/,
    handler: () => ({ success: true, data: DUMMY_PARENT_DASHBOARD }),
  },
  {
    method: "POST",
    pattern: /\/v1\/parents\/tutor-request/,
    handler: () => ({
      success: true,
      data: {
        _id: "ptr_new",
        stage: "REQUEST_RECEIVED",
        subject: "Mathematics",
        grade: "Class 10",
        createdAt: new Date().toISOString(),
      },
    }),
  },
  {
    method: "POST",
    pattern: /\/v1\/parents\/concern/,
    handler: () => ({ success: true, message: "Concern raised" }),
  },

  // Teacher requests
  {
    method: "POST",
    pattern: /\/v1\/teacher-requests$/,
    handler: (_url, config) => {
      const body =
        typeof config.data === "string"
          ? JSON.parse(config.data)
          : (config.data ?? {});
      return {
        success: true,
        data: {
          _id: "tr_new",
          requestId: "YS-TR-NEW",
          studentName: body.studentName ?? "Student",
          board: { _id: "opt_cbse", label: "CBSE", value: "CBSE" },
          grade: { _id: "opt_g10", label: "Class 10", value: "CLASS_10" },
          subjects: [],
          mode: body.mode ?? "ONLINE",
          status: "NEW",
          createdAt: new Date().toISOString(),
        },
      };
    },
  },
  {
    method: "GET",
    pattern: /\/v1\/teacher-requests\/my/,
    handler: () => ({ success: true, data: DUMMY_TEACHER_REQUESTS }),
  },

  // Tutor profile
  {
    method: "GET",
    pattern: /\/tutors\/my-profile\/for-edit/,
    handler: () => ({ success: true, data: DUMMY_EDIT_PROFILE }),
  },
  {
    method: "GET",
    pattern: /\/tutors\/my-profile/,
    handler: () => ({ success: true, data: DUMMY_TUTOR_PROFILE }),
  },
  {
    method: "PUT",
    pattern: /\/tutors\/my-profile/,
    handler: () => ({
      success: true,
      data: DUMMY_TUTOR_PROFILE,
      message: "Profile updated",
    }),
  },
  {
    method: "PATCH",
    pattern: /\/tutors\/[^/]+\/settings/,
    handler: () => ({ success: true, message: "Settings updated" }),
  },
  {
    method: "POST",
    pattern: /\/tutors\/[^/]+\/documents/,
    handler: () => ({ success: true, data: DUMMY_TUTOR_PROFILE }),
  },
  {
    method: "PATCH",
    pattern: /\/tutors\/[^/]+\/verification-fee/,
    handler: () => ({ success: true, message: "Verification fee updated" }),
  },
  {
    method: "POST",
    pattern: /\/tutors\/[^/]+\/submit-verification/,
    handler: () => ({ success: true, message: "Submitted for verification" }),
  },
  {
    method: "GET",
    pattern: /\/tutors\/[^/]+\/performance/,
    handler: () => ({ success: true, data: DUMMY_PERFORMANCE }),
  },
  {
    method: "GET",
    pattern: /\/tutors\/[^/]+\/advanced-analytics/,
    handler: () => ({ success: true, data: DUMMY_ANALYTICS }),
  },

  // Announcements
  {
    method: "GET",
    pattern: /\/announcements\/tutor\/available/,
    handler: (url) => {
      const pageMatch = url.match(/page=(\d+)/);
      const page = parseInt(pageMatch?.[1] ?? "1", 10);
      return {
        success: true,
        data: page === 1 ? DUMMY_ANNOUNCEMENTS : [],
        pagination: {
          total: DUMMY_ANNOUNCEMENTS.length,
          page,
          limit: 10,
          pages: 1,
        },
        myInterestCount: 1,
      };
    },
  },
  {
    method: "POST",
    pattern: /\/announcements\/[^/]+\/interest/,
    handler: () => ({ success: true, message: "Interest expressed" }),
  },

  // Demos
  {
    method: "GET",
    pattern: /\/demos\/tutor\/my-demos/,
    handler: (url) => {
      const statusMatch = url.match(/status=([^&]+)/);
      const status = statusMatch?.[1];
      const demos = status
        ? DUMMY_DEMOS.filter((d) => d.status === status.toUpperCase())
        : DUMMY_DEMOS;
      return {
        success: true,
        data: demos,
        pagination: { total: demos.length, page: 1, limit: 10, pages: 1 },
      };
    },
  },
  {
    method: "PATCH",
    pattern: /\/demos\/status\/[^/]+/,
    handler: () => ({ success: true, message: "Demo result submitted" }),
  },

  // Class sessions
  {
    method: "GET",
    pattern: /\/class-sessions\/tutor\/my/,
    handler: () => ({ success: true, data: DUMMY_SESSIONS }),
  },
  {
    method: "PATCH",
    pattern: /\/class-sessions\/[^/]+\/reschedule/,
    handler: () => ({ success: true, message: "Session rescheduled" }),
  },

  // Final classes
  {
    method: "GET",
    pattern: /\/final-classes\/tutor\/pending-cycle-start/,
    handler: () => ({ success: true, data: [] }),
  },
  {
    method: "POST",
    pattern: /\/final-classes\/[^/]+\/start-cycle/,
    handler: () => ({ success: true, message: "Cycle started" }),
  },
  {
    method: "GET",
    pattern: /\/final-classes\/tutor\/(my-classes|[^/]+)/,
    handler: () => ({
      success: true,
      data: DUMMY_FINAL_CLASSES,
      pagination: { total: 2, page: 1, limit: 100, pages: 1 },
    }),
  },

  // Attendance
  {
    method: "GET",
    pattern: /\/attendance\/class\/([^?/]+)/,
    handler: (url) => {
      const match = url.match(/\/attendance\/class\/([^?/]+)/);
      const classId = match?.[1] ?? "";
      const records = DUMMY_ATTENDANCE[classId] ?? [];
      return { success: true, data: records };
    },
  },
  {
    method: "GET",
    pattern: /\/attendance(\?|$)/,
    handler: () => ({ success: true, data: [] }),
  },
  {
    method: "POST",
    pattern: /\/attendance$/,
    handler: () => ({
      success: true,
      message: "Attendance marked successfully",
    }),
  },

  // Payments
  {
    method: "GET",
    pattern: /\/payments\/tutor\/summary/,
    handler: (url) => {
      const typeMatch = url.match(/paymentType=([^&]+)/);
      const type = typeMatch?.[1];
      const filtered = type
        ? DUMMY_PAYMENTS.filter((p) => p.paymentType === type)
        : DUMMY_PAYMENTS;
      const totalAmount = filtered.reduce((s, p) => s + p.amount, 0);
      const paidAmount = filtered
        .filter((p) => p.status === "PAID")
        .reduce((s, p) => s + p.amount, 0);
      return {
        success: true,
        data: {
          payments: filtered,
          statistics: {
            totalAmount,
            paidAmount,
            pendingAmount: totalAmount - paidAmount,
          },
        },
      };
    },
  },

  // Notifications
  {
    method: "GET",
    pattern: /\/notifications\/unread-count/,
    handler: () => ({
      success: true,
      data: { count: DUMMY_NOTIFICATIONS.filter((n) => !n.isRead).length },
    }),
  },
  {
    method: "PATCH",
    pattern: /\/notifications\/mark-all-read/,
    handler: () => {
      DUMMY_NOTIFICATIONS.forEach((n) => (n.isRead = true));
      return { success: true };
    },
  },
  {
    method: "PATCH",
    pattern: /\/notifications\/[^/]+\/read/,
    handler: (url) => {
      const match = url.match(/\/notifications\/([^/]+)\/read/);
      const id = match?.[1];
      const notif = DUMMY_NOTIFICATIONS.find((n) => n._id === id);
      if (notif) notif.isRead = true;
      return { success: true };
    },
  },
  {
    method: "GET",
    pattern: /\/notifications/,
    handler: () => ({
      success: true,
      data: DUMMY_NOTIFICATIONS,
      total: DUMMY_NOTIFICATIONS.length,
    }),
  },

  // Shift requests
  {
    method: "GET",
    pattern: /\/shift-requests\/tutor\/mine/,
    handler: () => ({
      success: true,
      data: DUMMY_SHIFT_REQUESTS,
      count: DUMMY_SHIFT_REQUESTS.length,
    }),
  },
  {
    method: "GET",
    pattern: /\/shift-requests\/class\/[^/]+/,
    handler: (url) => {
      const match = url.match(/\/shift-requests\/class\/([^/]+)/);
      const classId = match?.[1];
      const filtered = DUMMY_SHIFT_REQUESTS.filter((s) =>
        typeof s.finalClass === "string"
          ? s.finalClass === classId
          : (s.finalClass as any)?._id === classId,
      );
      return { success: true, data: filtered, count: filtered.length };
    },
  },
  {
    method: "POST",
    pattern: /\/shift-requests$/,
    handler: (_url, config) => {
      const body =
        typeof config.data === "string"
          ? JSON.parse(config.data)
          : (config.data ?? {});
      const newReq = {
        _id: "shift_new_" + Date.now(),
        finalClass: body.finalClassId,
        cycleNumber: body.cycleNumber,
        shiftDays: body.shiftDays,
        reason: body.reason,
        status: "PENDING" as const,
        createdAt: new Date().toISOString(),
      };
      DUMMY_SHIFT_REQUESTS.push(newReq);
      return { success: true, data: newReq };
    },
  },

  // Fallback — return empty success for any unmatched route
  {
    method: "*",
    pattern: /.*/,
    handler: (url) => {
      console.warn(`[MockAdapter] Unhandled: ${url}`);
      return { success: true, data: null, message: "Mock: no handler" };
    },
  },
];

// ─── Adapter factory ──────────────────────────────────────────────────────────

function buildMockResponse(data: any, status = 200) {
  return {
    data,
    status,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    config: {} as InternalAxiosRequestConfig,
  };
}

export function installMockAdapter(client: AxiosInstance) {
  // Intercept every request before it hits the network
  client.interceptors.request.use((config) => {
    const url = config.url ?? "";
    const method = (config.method ?? "get").toUpperCase();

    const route = routes.find(
      (r) => (r.method === "*" || r.method === method) && r.pattern.test(url),
    );

    if (route) {
      // Return a settled promise that axios treats as a completed response
      (config as any).adapter = () =>
        Promise.resolve(buildMockResponse(route.handler(url, config)));
    }

    return config;
  });

  console.log(
    "[MockAdapter] Static dummy mode active — no real network calls.",
  );
}
