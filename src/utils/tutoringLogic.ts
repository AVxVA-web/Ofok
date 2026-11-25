import type {
  CurrencyCode,
  DayOfWeek,
  LessonMode,
  LessonSession,
  NewStudentInput,
  PaymentMethod,
  PaymentRecord,
  PerformanceTier,
  Student,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../types/tutoring.ts';

export const DEFAULT_REFERENCE_DATE = '2026-11-23';

export const DAY_LABELS_AR: Record<DayOfWeek, string> = {
  saturday: 'السبت',
  sunday: 'الأحد',
  monday: 'الاثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
};

export const ORDERED_WEEK_DAYS: DayOfWeek[] = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

export const PLAN_LABELS_AR: Record<SubscriptionPlan, string> = {
  monthly: 'اشتراك شهري (30 يوماً)',
  quarterly: 'باقة ربع سنوية (90 يوماً)',
  package_8: 'باقة 8 حصص مرنة',
  single_session: 'حصة فردية',
};

export const PAYMENT_METHOD_LABELS_AR: Record<PaymentMethod, string> = {
  cash: 'نقدي بالسنتر',
  wallet: 'فودافون كاش / محفظة إلكترونية',
  bank_transfer: 'إنستاباي (InstaPay) / تحويل بنكي',
  card: 'بطاقة بنكية',
};

export const LESSON_MODE_LABELS_AR: Record<LessonMode, string> = {
  center: 'مجموعة بالسنتر',
  private_home: 'درس خصوصي (برايفت)',
  online: 'بث مباشر أونلاين',
};

export const STATUS_LABELS_AR: Record<SubscriptionStatus, string> = {
  active: 'نشط',
  expiring_soon: 'ينتهي قريباً',
  expired: 'منتهي',
};

export const TIER_LABELS_AR: Record<PerformanceTier, string> = {
  excellent: 'متفوق',
  on_track: 'مسار مستقر',
  needs_attention: 'يحتاج متابعة',
};

export const CURRENCY_META: Record<CurrencyCode, { symbol: string; name: string }> = {
  EGP: { symbol: 'ج.م', name: 'جنيه مصري' },
  SAR: { symbol: 'ر.س', name: 'ريال سعودي' },
  AED: { symbol: 'د.إ', name: 'درهم إماراتي' },
};

function parseIsoDateUtc(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const ms = parseIsoDateUtc(isoDate) + days * 86_400_000;
  const dt = new Date(ms);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysRemaining(
  expiresAt: string,
  referenceDate: string = DEFAULT_REFERENCE_DATE
): number {
  const diffMs = parseIsoDateUtc(expiresAt) - parseIsoDateUtc(referenceDate);
  return Math.round(diffMs / 86_400_000);
}

export function getSubscriptionStatus(
  expiresAt: string,
  referenceDate: string = DEFAULT_REFERENCE_DATE
): SubscriptionStatus {
  const days = getDaysRemaining(expiresAt, referenceDate);
  if (days < 0) return 'expired';
  if (days <= 5) return 'expiring_soon';
  return 'active';
}

export function getEffectiveSubscriptionStatus(
  student: Pick<Student, 'expiresAt' | 'sessionsRemaining'>,
  referenceDate: string = DEFAULT_REFERENCE_DATE
): SubscriptionStatus {
  const dateStatus = getSubscriptionStatus(student.expiresAt, referenceDate);
  if (dateStatus === 'expired' || student.sessionsRemaining <= 0) {
    return 'expired';
  }
  if (dateStatus === 'expiring_soon' || student.sessionsRemaining === 1) {
    return 'expiring_soon';
  }
  return 'active';
}

export function getPlanDurationDays(plan: SubscriptionPlan): number {
  switch (plan) {
    case 'monthly':
      return 30;
    case 'quarterly':
      return 90;
    case 'package_8':
      return 30;
    case 'single_session':
      return 7;
  }
}

export function getPlanSessionsCount(plan: SubscriptionPlan): number {
  switch (plan) {
    case 'monthly':
      return 8;
    case 'quarterly':
      return 24;
    case 'package_8':
      return 8;
    case 'single_session':
      return 1;
  }
}

export function calculateRenewalExpiry(
  currentExpiresAt: string,
  plan: SubscriptionPlan,
  referenceDate: string = DEFAULT_REFERENCE_DATE
): string {
  const durationDays = getPlanDurationDays(plan);
  const daysLeft = getDaysRemaining(currentExpiresAt, referenceDate);
  const baseDate = daysLeft > 0 ? currentExpiresAt : referenceDate;
  return addDaysToIsoDate(baseDate, durationDays);
}

export function computeAverageExamScore(student: Student): number {
  if (!student.grades.length) return 0;
  const totalPct = student.grades.reduce((acc, g) => {
    if (g.maxScore <= 0) return acc;
    return acc + (g.score / g.maxScore) * 100;
  }, 0);
  return Math.round(totalPct / student.grades.length);
}

export function computeStudentProgressScore(student: Student): number {
  const examAvg = student.grades.length ? computeAverageExamScore(student) : 75;
  const weighted =
    examAvg * 0.55 + student.attendanceRate * 0.25 + student.homeworkRate * 0.2;
  return Math.max(0, Math.min(100, Math.round(weighted)));
}

export function classifyStudentTier(
  progressScore: number,
  attendanceRate: number
): PerformanceTier {
  if (progressScore >= 85 && attendanceRate >= 85) return 'excellent';
  if (progressScore < 70 || attendanceRate < 75) return 'needs_attention';
  return 'on_track';
}

export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function formatTimeArabic(timeStr: string): string {
  const [hRaw, mRaw] = timeStr.split(':').map(Number);
  const h = hRaw || 0;
  const m = String(mRaw || 0).padStart(2, '0');
  const period = h >= 12 ? 'م' : 'ص';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${period}`;
}

export function formatSessionTimeRangeArabic(
  startTime: string,
  durationMinutes: number
): string {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = (startMin + Math.max(15, durationMinutes)) % (24 * 60);
  const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
  const endM = String(endMin % 60).padStart(2, '0');
  return `${formatTimeArabic(startTime)} – ${formatTimeArabic(`${endH}:${endM}`)}`;
}

export function detectSessionConflict(
  candidate: Omit<LessonSession, 'id'>,
  existing: LessonSession[],
  ignoreId?: string
): LessonSession | null {
  const startA = parseTimeToMinutes(candidate.startTime);
  const endA = startA + candidate.durationMinutes;

  for (const session of existing) {
    if (ignoreId && session.id === ignoreId) continue;
    if (session.day !== candidate.day) continue;

    const startB = parseTimeToMinutes(session.startTime);
    const endB = startB + session.durationMinutes;

    if (startA < endB && startB < endA) {
      return session;
    }
  }
  return null;
}

export interface DashboardKPIs {
  totalStudents: number;
  activeSubscriptions: number;
  renewalsDueCount: number;
  expiredCount: number;
  monthlyRevenue: number;
  averageAttendanceRate: number;
  averageProgressScore: number;
  weeklySessionsCount: number;
}

export function calculateDashboardKPIs(
  students: Student[],
  payments: PaymentRecord[],
  sessions: LessonSession[],
  referenceDate: string = DEFAULT_REFERENCE_DATE
): DashboardKPIs {
  const currentMonthPrefix = referenceDate.slice(0, 7);
  let activeSubscriptions = 0;
  let renewalsDueCount = 0;
  let expiredCount = 0;
  let attendanceSum = 0;
  let progressSum = 0;

  for (const s of students) {
    const status = getEffectiveSubscriptionStatus(s, referenceDate);
    if (status === 'active') activeSubscriptions++;
    else if (status === 'expiring_soon') renewalsDueCount++;
    else expiredCount++;

    attendanceSum += s.attendanceRate;
    progressSum += computeStudentProgressScore(s);
  }

  const monthlyRevenue = payments
    .filter((p) => p.paidAt.startsWith(currentMonthPrefix))
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    totalStudents: students.length,
    activeSubscriptions,
    renewalsDueCount,
    expiredCount,
    monthlyRevenue,
    averageAttendanceRate: students.length
      ? Math.round(attendanceSum / students.length)
      : 0,
    averageProgressScore: students.length
      ? Math.round(progressSum / students.length)
      : 0,
    weeklySessionsCount: sessions.length,
  };
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${CURRENCY_META[currency].symbol}`;
}

export function formatArabicDate(isoDate: string): string {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
}

export function isValidPhoneNumber(rawPhone: string): boolean {
  const digits = rawPhone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function validateStudentInput(
  input: NewStudentInput
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.fullName || input.fullName.trim().length < 3) {
    errors.fullName = 'يرجى إدخال اسم الطالب الثلاثي (3 أحرف على الأقل).';
  }
  if (!input.studentPhone || !isValidPhoneNumber(input.studentPhone)) {
    errors.studentPhone = 'يرجى إدخال رقم موبايل صحيح (10–15 رقماً).';
  }
  if (!input.guardianName || input.guardianName.trim().length < 2) {
    errors.guardianName = 'يرجى إدخال اسم ولي الأمر.';
  }
  if (!input.guardianPhone || !isValidPhoneNumber(input.guardianPhone)) {
    errors.guardianPhone = 'يرجى إدخال رقم موبايل صحيح لولي الأمر.';
  }
  if (!input.gradeLevel.trim()) {
    errors.gradeLevel = 'يرجى تحديد المرحلة الدراسية.';
  }
  if (!input.subject.trim()) {
    errors.subject = 'يرجى تحديد المادة الدراسية.';
  }
  if (!Number.isFinite(input.monthlyFee) || input.monthlyFee <= 0) {
    errors.monthlyFee = 'يرجى إدخال قيمة اشتراك صحيحة أكبر من صفر.';
  }
  if (!input.startDate) {
    errors.startDate = 'يرجى تحديد تاريخ بدء الاشتراك.';
  }

  return errors;
}

export function formatArabicStudentsCount(count: number): string {
  if (count === 0) return '0 طلاب';
  if (count === 1) return 'طالب واحد';
  if (count === 2) return 'طالبان';
  if (count >= 3 && count <= 10) return `${count} طلاب`;
  return `${count} طالباً`;
}

export function formatArabicSessionsCount(count: number): string {
  if (count === 0) return 'لا توجد حصص';
  if (count === 1) return 'حصة واحدة';
  if (count === 2) return 'حصتان';
  if (count >= 3 && count <= 10) return `${count} حصص`;
  return `${count} حصة`;
}

export function formatArabicDaysCount(absDays: number): string {
  if (absDays === 0) return 'اليوم';
  if (absDays === 1) return 'يوم واحد';
  if (absDays === 2) return 'يومان';
  if (absDays >= 3 && absDays <= 10) return `${absDays} أيام`;
  return `${absDays} يوماً`;
}

export function formatEgyptianWhatsAppUrl(
  rawPhone: string,
  message?: string
): string | null {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 10) return null;

  let intl = digits;
  if (digits.startsWith('00')) {
    intl = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    intl = `20${digits.slice(1)}`;
  } else if (digits.startsWith('1') && digits.length === 10) {
    intl = `20${digits}`;
  }

  const base = `https://wa.me/${intl}`;
  if (!message || !message.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function formatTelHref(rawPhone: string): string | null {
  const trimmed = rawPhone.trim();
  const hasLeadingPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return `tel:${hasLeadingPlus ? '+' : ''}${digits}`;
}

export function getNextReceiptNumber(payments: Pick<PaymentRecord, 'receiptNumber'>[]): string {
  let maxNum = 100;
  for (const p of payments) {
    const match = p.receiptNumber.match(/(\d+)$/);
    if (match) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }
  return `OFK-${String(maxNum + 1).padStart(4, '0')}`;
}

export function formatSubscriptionRemainingText(
  student: Pick<Student, 'expiresAt' | 'sessionsRemaining'>,
  referenceDate: string = DEFAULT_REFERENCE_DATE
): string {
  const daysLeft = getDaysRemaining(student.expiresAt, referenceDate);
  if (student.sessionsRemaining <= 0) {
    return daysLeft < 0
      ? `انتهى منذ ${formatArabicDaysCount(Math.abs(daysLeft))} · 0 حصص`
      : 'انتهى رصيد الحصص';
  }
  if (student.sessionsRemaining === 1 && daysLeft > 5) {
    return 'متبقية حصة واحدة';
  }
  if (daysLeft < 0) return `منتهي منذ ${formatArabicDaysCount(Math.abs(daysLeft))}`;
  if (daysLeft === 0) return 'ينتهي اليوم';
  return `متبقي ${formatArabicDaysCount(daysLeft)}`;
}

export function getSuggestedPlanFee(
  currentFee: number,
  currentPlan: SubscriptionPlan,
  targetPlan: SubscriptionPlan
): number {
  const safeFee = Number.isFinite(currentFee) && currentFee > 0 ? currentFee : 400;
  if (currentPlan === targetPlan) return Math.round(safeFee);

  let monthlyBase = safeFee;
  if (currentPlan === 'quarterly') monthlyBase = safeFee / 2.75;
  else if (currentPlan === 'single_session') monthlyBase = safeFee * 4;

  if (targetPlan === 'quarterly') return Math.max(1, Math.round(monthlyBase * 2.75));
  if (targetPlan === 'single_session') return Math.max(1, Math.round(monthlyBase / 4));
  return Math.max(1, Math.round(monthlyBase));
}

export function sortUrgentRenewalStudents(
  students: Student[],
  referenceDate: string = DEFAULT_REFERENCE_DATE
): Student[] {
  const weight = (st: SubscriptionStatus): number =>
    st === 'expired' ? 0 : st === 'expiring_soon' ? 1 : 2;

  return [...students].sort((a, b) => {
    const stA = getEffectiveSubscriptionStatus(a, referenceDate);
    const stB = getEffectiveSubscriptionStatus(b, referenceDate);
    const wDiff = weight(stA) - weight(stB);
    if (wDiff !== 0) return wDiff;

    const sessDepletedDiff =
      (a.sessionsRemaining <= 0 ? 0 : 1) - (b.sessionsRemaining <= 0 ? 0 : 1);
    if (sessDepletedDiff !== 0) return sessDepletedDiff;

    return (
      getDaysRemaining(a.expiresAt, referenceDate) -
      getDaysRemaining(b.expiresAt, referenceDate)
    );
  });
}

const UTC_DAY_INDEX_TO_WEEKDAY: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function sortSessionsFromReferenceDate(
  sessions: LessonSession[],
  referenceDate: string = DEFAULT_REFERENCE_DATE
): LessonSession[] {
  const [y, m, d] = referenceDate.split('-').map(Number);
  const utcDay = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1)).getUTCDay();
  const todayKey = UTC_DAY_INDEX_TO_WEEKDAY[utcDay] ?? 'saturday';
  const todayOrderIdx = ORDERED_WEEK_DAYS.indexOf(todayKey);

  const dayOffset = (day: DayOfWeek): number => {
    const idx = ORDERED_WEEK_DAYS.indexOf(day);
    return (idx - todayOrderIdx + 7) % 7;
  };

  return [...sessions].sort((a, b) => {
    const diff = dayOffset(a.day) - dayOffset(b.day);
    if (diff !== 0) return diff;
    return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
  });
}

export interface AttendanceBatchRecordInput {
  studentId: string;
  status: 'present' | 'absent' | 'late';
  homeworkDone: boolean;
}

export function applyAttendanceBatchToStudents(
  students: Student[],
  params: {
    date: string;
    sessionTitle: string;
    records: AttendanceBatchRecordInput[];
    replaceExisting?: boolean;
  }
): Student[] {
  const { date, sessionTitle, records, replaceExisting = false } = params;
  const normalizedTitle = sessionTitle.trim();
  const map = new Map(records.map((r) => [r.studentId, r]));

  return students.map((s) => {
    const rec = map.get(s.id);
    if (!rec) return s;

    const existingIdx = replaceExisting
      ? s.attendanceHistory.findIndex(
          (h) => h.date === date && h.sessionTitle.trim() === normalizedTitle
        )
      : -1;

    const attScore =
      rec.status === 'present' ? 100 : rec.status === 'late' ? 75 : 0;
    const hwScore = rec.homeworkDone ? 100 : 20;

    if (existingIdx >= 0) {
      const prevEntry = s.attendanceHistory[existingIdx];
      const prevConsumed = prevEntry.status === 'absent' ? 0 : 1;
      const nextConsumed = rec.status === 'absent' ? 0 : 1;
      const sessionDelta = prevConsumed - nextConsumed;

      const prevAttScore =
        prevEntry.status === 'present' ? 100 : prevEntry.status === 'late' ? 75 : 0;
      const prevHwScore = prevEntry.homeworkDone === false ? 20 : 100;

      const nextAttendance = Math.max(
        30,
        Math.min(100, Math.round(s.attendanceRate + (attScore - prevAttScore) * 0.15))
      );
      const nextHomework = Math.max(
        20,
        Math.min(100, Math.round(s.homeworkRate + (hwScore - prevHwScore) * 0.15))
      );

      const updatedHistory = s.attendanceHistory.map((h, idx) =>
        idx === existingIdx
          ? {
              ...h,
              status: rec.status,
              homeworkDone: rec.homeworkDone,
            }
          : h
      );

      return {
        ...s,
        attendanceRate: nextAttendance,
        homeworkRate: nextHomework,
        sessionsRemaining: Math.max(0, s.sessionsRemaining + sessionDelta),
        attendanceHistory: updatedHistory,
      };
    }

    const nextAttendance = Math.max(
      30,
      Math.min(100, Math.round(s.attendanceRate * 0.85 + attScore * 0.15))
    );
    const nextHomework = Math.max(
      20,
      Math.min(100, Math.round(s.homeworkRate * 0.85 + hwScore * 0.15))
    );
    const nextSessions =
      rec.status === 'absent'
        ? s.sessionsRemaining
        : Math.max(0, s.sessionsRemaining - 1);

    return {
      ...s,
      attendanceRate: nextAttendance,
      homeworkRate: nextHomework,
      sessionsRemaining: nextSessions,
      attendanceHistory: [
        {
          id: `att-${Date.now()}-${s.id}`,
          date,
          status: rec.status,
          sessionTitle: normalizedTitle,
          homeworkDone: rec.homeworkDone,
        },
        ...s.attendanceHistory,
      ],
    };
  });
}
