import type {
  CenterSettings,
  CurrencyCode,
  LessonSession,
  PaymentRecord,
  Student,
  TutoringGroup,
} from '../types/tutoring.ts';
import {
  CURRENCY_META,
  LESSON_MODE_LABELS_AR,
  PAYMENT_METHOD_LABELS_AR,
  PLAN_LABELS_AR,
  computeStudentProgressScore,
} from './tutoringLogic.ts';

export interface CenterBackupPayload {
  version: 1;
  exportedAt: string;
  students: Student[];
  payments: PaymentRecord[];
  sessions: LessonSession[];
  groups: TutoringGroup[];
  settings: CenterSettings;
}

export function escapeCsvCell(value: string | number | undefined | null): string {
  const str = value === undefined || value === null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildStudentsCsv(students: Student[], currency: CurrencyCode): string {
  const currencyName = CURRENCY_META[currency].symbol;
  const headers = [
    'اسم الطالب',
    'موبايل الطالب',
    'اسم ولي الأمر',
    'موبايل ولي الأمر',
    'المرحلة الدراسية',
    'المادة',
    'المجموعة',
    'نمط الدراسة',
    'الباقة',
    `الرسوم (${currencyName})`,
    'الحصص المتبقية',
    'تاريخ الانتهاء',
    'نسبة الحضور %',
    'نسبة الواجبات %',
    'مؤشر التقدم %',
  ];

  const rows = students.map((s) => [
    s.fullName,
    s.studentPhone,
    s.guardianName,
    s.guardianPhone,
    s.gradeLevel,
    s.subject,
    s.groupName,
    LESSON_MODE_LABELS_AR[s.lessonMode],
    PLAN_LABELS_AR[s.plan],
    s.monthlyFee,
    s.sessionsRemaining,
    s.expiresAt,
    s.attendanceRate,
    s.homeworkRate,
    computeStudentProgressScore(s),
  ]);

  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return `\uFEFF${lines.join('\r\n')}`;
}

export function buildPaymentsCsv(
  payments: PaymentRecord[],
  currency: CurrencyCode
): string {
  const currencyName = CURRENCY_META[currency].symbol;
  const headers = [
    'رقم الإيصال',
    'اسم الطالب',
    `المبلغ (${currencyName})`,
    'الباقة',
    'وسيلة الدفع',
    'تاريخ السداد',
    'تاريخ الانتهاء الجديد',
  ];

  const rows = payments.map((p) => [
    p.receiptNumber,
    p.studentName,
    p.amount,
    PLAN_LABELS_AR[p.plan],
    PAYMENT_METHOD_LABELS_AR[p.method],
    p.paidAt,
    p.newExpiresAt,
  ]);

  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return `\uFEFF${lines.join('\r\n')}`;
}

export function createBackupJson(state: {
  students: Student[];
  payments: PaymentRecord[];
  sessions: LessonSession[];
  groups: TutoringGroup[];
  settings: CenterSettings;
}): string {
  const payload: CenterBackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    students: state.students,
    payments: state.payments,
    sessions: state.sessions,
    groups: state.groups,
    settings: state.settings,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseBackupPayload(
  rawJson: string
): { ok: true; data: CenterBackupPayload } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson) as Partial<CenterBackupPayload>;
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'ملف النسخة الاحتياطية غير صالح.' };
    }
    if (
      !Array.isArray(parsed.students) ||
      !Array.isArray(parsed.payments) ||
      !Array.isArray(parsed.sessions) ||
      !Array.isArray(parsed.groups) ||
      !parsed.settings ||
      typeof parsed.settings !== 'object'
    ) {
      return {
        ok: false,
        error: 'هيكل الملف غير مكتمل ولا يحتوي على سجلات أُفق المطلوبة.',
      };
    }

    const validStudents = parsed.students.every(
      (s) =>
        s &&
        typeof s === 'object' &&
        typeof s.id === 'string' &&
        typeof s.fullName === 'string' &&
        typeof s.expiresAt === 'string'
    );
    if (!validStudents) {
      return {
        ok: false,
        error: 'تحتوي بيانات الطلاب في الملف على حقول مفقودة أو غير صالحة.',
      };
    }

    const validPayments = parsed.payments.every(
      (p) =>
        p &&
        typeof p === 'object' &&
        typeof p.id === 'string' &&
        typeof p.studentName === 'string' &&
        typeof p.receiptNumber === 'string' &&
        typeof p.amount === 'number' &&
        Number.isFinite(p.amount)
    );
    if (!validPayments) {
      return {
        ok: false,
        error: 'تحتوي سجلات المدفوعات في الملف على بيانات غير صالحة.',
      };
    }

    const validGroups = parsed.groups.every(
      (g) =>
        g &&
        typeof g === 'object' &&
        typeof g.id === 'string' &&
        typeof g.name === 'string'
    );
    if (!validGroups) {
      return {
        ok: false,
        error: 'تحتوي بيانات المجموعات في الملف على حقول غير صالحة.',
      };
    }

    const validSessions = parsed.sessions.every(
      (ses) =>
        ses &&
        typeof ses === 'object' &&
        typeof ses.id === 'string' &&
        typeof ses.title === 'string' &&
        typeof ses.day === 'string' &&
        typeof ses.startTime === 'string'
    );
    if (!validSessions) {
      return {
        ok: false,
        error: 'تحتوي بيانات حصص الجدول في الملف على حقول غير صالحة.',
      };
    }

    const sanitizedStudents: Student[] = parsed.students.map((s) => ({
      ...s,
      studentPhone: typeof s.studentPhone === 'string' ? s.studentPhone : '',
      guardianName: typeof s.guardianName === 'string' ? s.guardianName : '',
      guardianPhone: typeof s.guardianPhone === 'string' ? s.guardianPhone : '',
      gradeLevel: typeof s.gradeLevel === 'string' ? s.gradeLevel : 'عام',
      subject: typeof s.subject === 'string' ? s.subject : 'مادة دراسية',
      groupId: typeof s.groupId === 'string' ? s.groupId : '',
      groupName: typeof s.groupName === 'string' ? s.groupName : 'تسجيل مباشر بالسنتر',
      monthlyFee: Number.isFinite(s.monthlyFee) && s.monthlyFee > 0 ? s.monthlyFee : 400,
      sessionsRemaining:
        Number.isFinite(s.sessionsRemaining) && s.sessionsRemaining >= 0
          ? Math.floor(s.sessionsRemaining)
          : 0,
      attendanceRate:
        Number.isFinite(s.attendanceRate)
          ? Math.max(0, Math.min(100, Math.round(s.attendanceRate)))
          : 100,
      homeworkRate:
        Number.isFinite(s.homeworkRate)
          ? Math.max(0, Math.min(100, Math.round(s.homeworkRate)))
          : 100,
      grades: Array.isArray(s.grades) ? s.grades : [],
      attendanceHistory: Array.isArray(s.attendanceHistory)
        ? s.attendanceHistory
        : [],
    }));

    const sanitizedSettings: CenterSettings = {
      teacherName:
        typeof parsed.settings.teacherName === 'string' &&
        parsed.settings.teacherName.trim()
          ? parsed.settings.teacherName
          : 'المعلم',
      centerName:
        typeof parsed.settings.centerName === 'string' &&
        parsed.settings.centerName.trim()
          ? parsed.settings.centerName
          : 'المركز التعليمي',
      specialty:
        typeof parsed.settings.specialty === 'string'
          ? parsed.settings.specialty
          : 'التخصص والمادة الدراسية',
      currency:
        parsed.settings.currency === 'SAR' ||
        parsed.settings.currency === 'AED' ||
        parsed.settings.currency === 'EGP'
          ? parsed.settings.currency
          : 'EGP',
      theme: parsed.settings.theme === 'dark' ? 'dark' : 'light',
      referenceDate:
        typeof parsed.settings.referenceDate === 'string'
          ? parsed.settings.referenceDate
          : new Date().toISOString().slice(0, 10),
    };

    return {
      ok: true,
      data: {
        version: 1,
        exportedAt:
          typeof parsed.exportedAt === 'string'
            ? parsed.exportedAt
            : new Date().toISOString(),
        students: sanitizedStudents,
        payments: parsed.payments,
        sessions: parsed.sessions,
        groups: parsed.groups,
        settings: sanitizedSettings,
      },
    };
  } catch {
    return { ok: false, error: 'تعذر قراءة الملف — تأكد أنه ملف JSON سليم.' };
  }
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
