export type CurrencyCode = 'SAR' | 'EGP' | 'AED';

export type LessonMode = 'center' | 'private_home' | 'online';

export type SubscriptionPlan = 'monthly' | 'quarterly' | 'package_8' | 'single_session';

export type SubscriptionStatus = 'active' | 'expiring_soon' | 'expired';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'wallet' | 'card';

export type PerformanceTier = 'excellent' | 'on_track' | 'needs_attention';

export type AttendanceStatus = 'present' | 'absent' | 'late';

export type DayOfWeek =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday';

export interface ScheduleConstraints {
  earliestHour: number; // e.g., 14 (2 PM)
  latestHour: number; // e.g., 22 (10 PM)
  breakMinutes: number; // e.g., 15 or 30
  allowFriday: boolean;
  avoidFridayPrayer: boolean;
}

export interface GradeEntry {
  id: string;
  title: string;
  score: number;
  maxScore: number;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  sessionTitle: string;
  homeworkDone?: boolean;
}

export interface Student {
  id: string;
  fullName: string;
  studentPhone: string;
  guardianName: string;
  guardianPhone: string;
  gradeLevel: string; // e.g., "الثالث الثانوي", "الثاني الثانوي"
  subject: string; // e.g., "الرياضيات المتقدمة", "الفيزياء"
  groupId: string;
  groupName: string;
  lessonMode: LessonMode;
  plan: SubscriptionPlan;
  monthlyFee: number;
  sessionsRemaining: number;
  enrolledAt: string; // YYYY-MM-DD
  expiresAt: string; // YYYY-MM-DD
  attendanceRate: number; // 0-100
  homeworkRate: number; // 0-100
  grades: GradeEntry[];
  attendanceHistory: AttendanceRecord[];
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  plan: SubscriptionPlan;
  method: PaymentMethod;
  paidAt: string; // YYYY-MM-DD
  newExpiresAt: string; // YYYY-MM-DD
  receiptNumber: string;
}

export interface TutoringGroup {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  lessonMode: LessonMode;
  roomOrLink: string;
  capacity: number;
  defaultFee: number;
}

export interface LessonSession {
  id: string;
  groupId: string;
  title: string;
  subject: string;
  gradeLevel: string;
  day: DayOfWeek;
  startTime: string; // HH:mm (24h)
  durationMinutes: number;
  lessonMode: LessonMode;
  location: string;
  studentCount: number;
  attendanceLoggedToday?: boolean;
}

export interface CenterSettings {
  teacherName: string;
  centerName: string;
  specialty: string;
  currency: CurrencyCode;
  theme: 'light' | 'dark';
  referenceDate: string; // YYYY-MM-DD
}

export interface ScheduledSlot {
  groupId: string;
  groupName: string;
  day: DayOfWeek;
  startTime: string;
  durationMinutes: number;
  location: string;
  lessonMode: LessonMode;
  rationale: string;
}

export interface ScheduleSuggestion {
  generatedAt: string;
  strategySummary: string;
  efficiencyGain: string;
  slots: ScheduledSlot[];
}

export interface NewStudentInput {
  fullName: string;
  studentPhone: string;
  guardianName: string;
  guardianPhone: string;
  gradeLevel: string;
  subject: string;
  groupId: string;
  lessonMode: LessonMode;
  plan: SubscriptionPlan;
  monthlyFee: number;
  paymentMethod?: PaymentMethod;
  startDate: string;
  notes?: string;
}
