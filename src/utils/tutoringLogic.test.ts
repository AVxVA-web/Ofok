import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAttendanceBatchToStudents,
  calculateDashboardKPIs,
  calculateRenewalExpiry,
  classifyStudentTier,
  computeStudentProgressScore,
  detectSessionConflict,
  formatArabicDaysCount,
  formatArabicSessionsCount,
  formatArabicStudentsCount,
  formatEgyptianWhatsAppUrl,
  formatSessionTimeRangeArabic,
  formatSubscriptionRemainingText,
  formatTelHref,
  getDaysRemaining,
  getEffectiveSubscriptionStatus,
  getNextReceiptNumber,
  getSubscriptionStatus,
  getSuggestedPlanFee,
  isValidPhoneNumber,
  sortSessionsFromReferenceDate,
  sortUrgentRenewalStudents,
  validateStudentInput,
} from './tutoringLogic';
import type { LessonSession, PaymentRecord, Student } from '../types/tutoring';

const REF_DATE = '2026-11-23';

function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: 'st-1',
    fullName: 'يوسف أحمد المنصور',
    studentPhone: '0551234567',
    guardianName: 'أحمد المنصور',
    guardianPhone: '0507654321',
    gradeLevel: 'الثالث الثانوي',
    subject: 'الرياضيات المتقدمة',
    groupId: 'grp-1',
    groupName: 'مجموعة النخبة',
    lessonMode: 'center',
    plan: 'monthly',
    monthlyFee: 600,
    sessionsRemaining: 6,
    enrolledAt: '2026-10-25',
    expiresAt: '2026-12-10',
    attendanceRate: 92,
    homeworkRate: 90,
    grades: [
      { id: 'g-1', title: 'اختبار التفاضل', score: 45, maxScore: 50, date: '2026-11-10' },
      { id: 'g-2', title: 'اختبار التكامل', score: 48, maxScore: 50, date: '2026-11-18' },
    ],
    attendanceHistory: [],
    ...overrides,
  };
}

test('subscription status classifies active, expiring_soon, and expired accurately', () => {
  assert.equal(getSubscriptionStatus('2026-12-01', REF_DATE), 'active');
  assert.equal(getSubscriptionStatus('2026-11-28', REF_DATE), 'expiring_soon');
  assert.equal(getSubscriptionStatus('2026-11-23', REF_DATE), 'expiring_soon');
  assert.equal(getSubscriptionStatus('2026-11-22', REF_DATE), 'expired');
  assert.equal(getDaysRemaining('2026-11-26', REF_DATE), 3);
});

test('getEffectiveSubscriptionStatus flags depleted or low session balances even before expiry date', () => {
  assert.equal(
    getEffectiveSubscriptionStatus({ expiresAt: '2026-12-20', sessionsRemaining: 4 }, REF_DATE),
    'active'
  );
  assert.equal(
    getEffectiveSubscriptionStatus({ expiresAt: '2026-12-20', sessionsRemaining: 1 }, REF_DATE),
    'expiring_soon'
  );
  assert.equal(
    getEffectiveSubscriptionStatus({ expiresAt: '2026-12-20', sessionsRemaining: 0 }, REF_DATE),
    'expired'
  );
});

test('renewal expiry extends from current expiry when active, or from today when expired', () => {
  // Active subscription expiring in 5 days -> adds 30 days to 2026-11-28 = 2026-12-28
  assert.equal(calculateRenewalExpiry('2026-11-28', 'monthly', REF_DATE), '2026-12-28');
  // Expired subscription -> adds 30 days to reference date 2026-11-23 = 2026-12-23
  assert.equal(calculateRenewalExpiry('2026-11-10', 'monthly', REF_DATE), '2026-12-23');
  // Quarterly plan on expired -> adds 90 days to 2026-11-23 = 2027-02-21
  assert.equal(calculateRenewalExpiry('2026-11-10', 'quarterly', REF_DATE), '2027-02-21');
});

test('student progress score and tier classification reflect exam, attendance, and homework weights', () => {
  const highStudent = makeStudent();
  const score = computeStudentProgressScore(highStudent);
  // Exam avg = (90 + 96)/2 = 93 -> 93*0.55 + 92*0.25 + 90*0.2 = 51.15 + 23 + 18 = 92.15 -> 92
  assert.equal(score, 92);
  assert.equal(classifyStudentTier(score, highStudent.attendanceRate), 'excellent');

  const strugglingStudent = makeStudent({
    attendanceRate: 65,
    homeworkRate: 50,
    grades: [{ id: 'g-1', title: 'اختبار', score: 25, maxScore: 50, date: '2026-11-15' }],
  });
  const lowScore = computeStudentProgressScore(strugglingStudent);
  assert.equal(classifyStudentTier(lowScore, strugglingStudent.attendanceRate), 'needs_attention');
});

test('schedule conflict detector catches overlapping time slots on the same day', () => {
  const existing: LessonSession[] = [
    {
      id: 'ses-1',
      groupId: 'grp-1',
      title: 'حصة التفاضل',
      subject: 'الرياضيات',
      gradeLevel: 'الثالث الثانوي',
      day: 'monday',
      startTime: '16:00',
      durationMinutes: 90,
      lessonMode: 'center',
      location: 'قاعة 1',
      studentCount: 12,
    },
  ];

  // Overlapping 17:00 - 18:00 on monday
  const conflict = detectSessionConflict(
    {
      groupId: 'grp-2',
      title: 'حصة الفيزياء',
      subject: 'الفيزياء',
      gradeLevel: 'الثالث الثانوي',
      day: 'monday',
      startTime: '17:00',
      durationMinutes: 60,
      lessonMode: 'online',
      location: 'زوم',
      studentCount: 8,
    },
    existing
  );
  assert.ok(conflict);
  assert.equal(conflict.id, 'ses-1');

  // Back-to-back 17:30 - 18:30 on monday should NOT conflict
  const noConflict = detectSessionConflict(
    {
      groupId: 'grp-2',
      title: 'حصة الفيزياء',
      subject: 'الفيزياء',
      gradeLevel: 'الثالث الثانوي',
      day: 'monday',
      startTime: '17:30',
      durationMinutes: 60,
      lessonMode: 'online',
      location: 'زوم',
      studentCount: 8,
    },
    existing
  );
  assert.equal(noConflict, null);
});

test('dashboard KPIs aggregate revenue, counts, and averages accurately', () => {
  const students = [
    makeStudent({ id: '1', expiresAt: '2026-12-10', attendanceRate: 90 }),
    makeStudent({ id: '2', expiresAt: '2026-11-25', attendanceRate: 80 }),
    makeStudent({ id: '3', expiresAt: '2026-11-15', attendanceRate: 70 }),
  ];
  const payments: PaymentRecord[] = [
    {
      id: 'p-1',
      studentId: '1',
      studentName: 'يوسف',
      amount: 600,
      plan: 'monthly',
      method: 'cash',
      paidAt: '2026-11-05',
      newExpiresAt: '2026-12-10',
      receiptNumber: 'INV-101',
    },
    {
      id: 'p-2',
      studentId: '2',
      studentName: 'سارة',
      amount: 1500,
      plan: 'quarterly',
      method: 'bank_transfer',
      paidAt: '2026-10-15', // prior month, excluded from Nov revenue
      newExpiresAt: '2026-11-25',
      receiptNumber: 'INV-099',
    },
  ];
  const kpis = calculateDashboardKPIs(students, payments, [], REF_DATE);
  assert.equal(kpis.totalStudents, 3);
  assert.equal(kpis.activeSubscriptions, 1);
  assert.equal(kpis.renewalsDueCount, 1);
  assert.equal(kpis.expiredCount, 1);
  assert.equal(kpis.monthlyRevenue, 600);
  assert.equal(kpis.averageAttendanceRate, 80);
});

test('student registration validator enforces required fields in Arabic', () => {
  const errors = validateStudentInput({
    fullName: 'أ',
    studentPhone: '123',
    guardianName: '',
    guardianPhone: '',
    gradeLevel: '',
    subject: '',
    groupId: 'grp-1',
    lessonMode: 'center',
    plan: 'monthly',
    monthlyFee: 0,
    startDate: '',
  });
  assert.ok(errors.fullName);
  assert.ok(errors.studentPhone);
  assert.ok(errors.guardianName);
  assert.ok(errors.guardianPhone);
  assert.ok(errors.monthlyFee);
});

test('Arabic pluralization helpers format singular, dual, and plural counts cleanly', () => {
  assert.equal(formatArabicStudentsCount(1), 'طالب واحد');
  assert.equal(formatArabicStudentsCount(2), 'طالبان');
  assert.equal(formatArabicStudentsCount(8), '8 طلاب');
  assert.equal(formatArabicStudentsCount(12), '12 طالباً');
  assert.equal(formatArabicSessionsCount(0), 'لا توجد حصص');
  assert.equal(formatArabicSessionsCount(1), 'حصة واحدة');
  assert.equal(formatArabicSessionsCount(2), 'حصتان');
  assert.equal(formatArabicDaysCount(2), 'يومان');
  assert.equal(formatArabicDaysCount(5), '5 أيام');
});

test('formatEgyptianWhatsAppUrl, formatTelHref, and getNextReceiptNumber behave safely', () => {
  assert.equal(formatEgyptianWhatsAppUrl('01012345678'), 'https://wa.me/201012345678');
  assert.equal(
    formatEgyptianWhatsAppUrl('011-9876-5432', 'أهلاً بحضرتك'),
    'https://wa.me/201198765432?text=%D8%A3%D9%87%D9%84%D8%A7%D9%8B%20%D8%A8%D8%AD%D8%B6%D8%B1%D8%AA%D9%83'
  );
  assert.equal(formatEgyptianWhatsAppUrl('12345'), null);

  assert.equal(formatTelHref(' 010-1234-5678 '), 'tel:01012345678');
  assert.equal(formatTelHref('+201012345678'), 'tel:+201012345678');
  assert.equal(formatTelHref('javascript:alert(1)'), null);

  assert.equal(getNextReceiptNumber([]), 'OFK-0101');
  assert.equal(
    getNextReceiptNumber([
      { receiptNumber: 'OFK-0101' },
      { receiptNumber: 'OFK-0109' },
    ]),
    'OFK-0110'
  );
});

test('phone validation rejects non-numeric strings and accepts valid numbers', () => {
  assert.equal(isValidPhoneNumber('01012345678'), true);
  assert.equal(isValidPhoneNumber('+20 101-234-5678'), true);
  assert.equal(isValidPhoneNumber('aaaaaaaaaaaa'), false);
  assert.equal(isValidPhoneNumber('12345'), false);
});

test('subscription helpers format remaining text, suggest fees, and sort renewals accurately', () => {
  assert.equal(
    formatSubscriptionRemainingText({ expiresAt: '2026-12-20', sessionsRemaining: 0 }, REF_DATE),
    'انتهى رصيد الحصص'
  );
  assert.equal(
    formatSubscriptionRemainingText({ expiresAt: '2026-12-20', sessionsRemaining: 1 }, REF_DATE),
    'متبقية حصة واحدة'
  );
  assert.equal(
    formatSubscriptionRemainingText({ expiresAt: '2026-11-23', sessionsRemaining: 4 }, REF_DATE),
    'ينتهي اليوم'
  );

  assert.equal(getSuggestedPlanFee(400, 'monthly', 'quarterly'), 1100);
  assert.equal(getSuggestedPlanFee(1100, 'quarterly', 'monthly'), 400);
  assert.equal(getSuggestedPlanFee(400, 'monthly', 'single_session'), 100);

  const sorted = sortUrgentRenewalStudents(
    [
      makeStudent({ id: 'soon', expiresAt: '2026-11-25', sessionsRemaining: 3 }),
      makeStudent({ id: 'depleted', expiresAt: '2026-12-15', sessionsRemaining: 0 }),
    ],
    REF_DATE
  );
  assert.equal(sorted[0].id, 'depleted');
});

test('sortSessionsFromReferenceDate orders week starting from reference weekday and formats ranges', () => {
  assert.equal(formatSessionTimeRangeArabic('17:00', 90), '5:00 م – 6:30 م');
  // 2026-11-23 is Monday
  const ordered = sortSessionsFromReferenceDate(
    [
      {
        id: 'sat',
        groupId: 'g1',
        title: 'سبت',
        subject: 'رياضة',
        gradeLevel: '3ث',
        day: 'saturday',
        startTime: '16:00',
        durationMinutes: 90,
        lessonMode: 'center',
        location: 'قاعة 1',
        studentCount: 10,
      },
      {
        id: 'mon',
        groupId: 'g1',
        title: 'اثنين',
        subject: 'رياضة',
        gradeLevel: '3ث',
        day: 'monday',
        startTime: '18:00',
        durationMinutes: 90,
        lessonMode: 'center',
        location: 'قاعة 1',
        studentCount: 10,
      },
    ],
    REF_DATE
  );
  assert.equal(ordered[0].id, 'mon');
  assert.equal(ordered[1].id, 'sat');
});

test('applyAttendanceBatchToStudents handles fresh insert and same-day upsert without double deducting', () => {
  const initial = [makeStudent({ id: 'st-1', sessionsRemaining: 6, attendanceRate: 90, homeworkRate: 90 })];
  const afterSave = applyAttendanceBatchToStudents(initial, {
    date: REF_DATE,
    sessionTitle: 'حصة التفاضل',
    records: [{ studentId: 'st-1', status: 'present', homeworkDone: true }],
  });
  assert.equal(afterSave[0].sessionsRemaining, 5);
  assert.equal(afterSave[0].attendanceHistory.length, 1);

  // Correcting today's status from present -> absent should restore the 1 session and update in-place
  const afterCorrection = applyAttendanceBatchToStudents(afterSave, {
    date: REF_DATE,
    sessionTitle: 'حصة التفاضل',
    records: [{ studentId: 'st-1', status: 'absent', homeworkDone: false }],
    replaceExisting: true,
  });
  assert.equal(afterCorrection[0].sessionsRemaining, 6);
  assert.equal(afterCorrection[0].attendanceHistory.length, 1);
  assert.equal(afterCorrection[0].attendanceHistory[0].status, 'absent');
  assert.equal(afterCorrection[0].attendanceHistory[0].homeworkDone, false);
});

