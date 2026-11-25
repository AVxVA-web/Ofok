import type {
  CenterSettings,
  LessonSession,
  PaymentRecord,
  Student,
  TutoringGroup,
} from '../types/tutoring';

export function getTodayIsoDate(): string {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '2026-11-23';
  }
}

export const INITIAL_SETTINGS: CenterSettings = {
  teacherName: 'المعلم',
  centerName: 'المركز التعليمي',
  specialty: 'التخصص والمادة الدراسية',
  currency: 'EGP',
  theme: 'light',
  referenceDate: getTodayIsoDate(),
};

export const INITIAL_GROUPS: TutoringGroup[] = [];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_PAYMENTS: PaymentRecord[] = [];

export const INITIAL_SESSIONS: LessonSession[] = [];
