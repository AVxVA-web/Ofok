import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPaymentsCsv,
  buildStudentsCsv,
  createBackupJson,
  escapeCsvCell,
  parseBackupPayload,
} from './dataExport';
import type { CenterSettings, PaymentRecord, Student } from '../types/tutoring';

const SETTINGS: CenterSettings = {
  teacherName: 'أ. محمد',
  centerName: 'سنتر النخبة',
  specialty: 'رياضيات',
  currency: 'EGP',
  theme: 'light',
  referenceDate: '2026-11-24',
};

const SAMPLE_STUDENT: Student = {
  id: 'st-1',
  fullName: 'يوسف أحمد',
  studentPhone: '01012345678',
  guardianName: 'أحمد علي',
  guardianPhone: '01198765432',
  gradeLevel: 'الثالث الثانوي',
  subject: 'الرياضيات',
  groupId: 'grp-1',
  groupName: 'مجموعة أ',
  lessonMode: 'center',
  plan: 'monthly',
  monthlyFee: 500,
  sessionsRemaining: 8,
  enrolledAt: '2026-11-01',
  expiresAt: '2026-12-01',
  attendanceRate: 95,
  homeworkRate: 90,
  grades: [],
  attendanceHistory: [],
};

const SAMPLE_PAYMENT: PaymentRecord = {
  id: 'pay-1',
  studentId: 'st-1',
  studentName: 'يوسف أحمد',
  amount: 500,
  plan: 'monthly',
  method: 'cash',
  paidAt: '2026-11-01',
  newExpiresAt: '2026-12-01',
  receiptNumber: 'OFK-0101',
};

test('escapeCsvCell protects against CSV formula injection and quotes commas', () => {
  assert.equal(escapeCsvCell('=CMD()'), "'=CMD()");
  assert.equal(escapeCsvCell('+123'), "'+123");
  assert.equal(escapeCsvCell('أحمد, محمد'), '"أحمد, محمد"');
});

test('buildStudentsCsv and buildPaymentsCsv include UTF-8 BOM and expected columns', () => {
  const sCsv = buildStudentsCsv([SAMPLE_STUDENT], 'EGP');
  assert.ok(sCsv.startsWith('\uFEFF'));
  assert.ok(sCsv.includes('يوسف أحمد'));
  assert.ok(sCsv.includes('ج.م'));

  const pCsv = buildPaymentsCsv([SAMPLE_PAYMENT], 'EGP');
  assert.ok(pCsv.startsWith('\uFEFF'));
  assert.ok(pCsv.includes('OFK-0101'));
  assert.ok(pCsv.includes('500'));
});

test('createBackupJson and parseBackupPayload round-trip safely and reject malformed inputs', () => {
  const json = createBackupJson({
    students: [SAMPLE_STUDENT],
    payments: [SAMPLE_PAYMENT],
    sessions: [],
    groups: [],
    settings: SETTINGS,
  });

  const parsed = parseBackupPayload(json);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.data.students.length, 1);
    assert.equal(parsed.data.payments[0].receiptNumber, 'OFK-0101');
  }

  const invalidJson = parseBackupPayload('{bad');
  assert.equal(invalidJson.ok, false);

  const incomplete = parseBackupPayload(JSON.stringify({ students: [{ wrong: true }] }));
  assert.equal(incomplete.ok, false);

  const badPayment = parseBackupPayload(
    JSON.stringify({
      students: [SAMPLE_STUDENT],
      payments: [{ id: 'p1', amount: 'not-a-number' }],
      sessions: [],
      groups: [],
      settings: SETTINGS,
    })
  );
  assert.equal(badPayment.ok, false);

  const partialNested = parseBackupPayload(
    JSON.stringify({
      students: [{ id: 's1', fullName: 'طالب تجربة', expiresAt: '2026-12-10' }],
      payments: [],
      sessions: [],
      groups: [],
      settings: SETTINGS,
    })
  );
  assert.equal(partialNested.ok, true);
  if (partialNested.ok) {
    assert.deepEqual(partialNested.data.students[0].grades, []);
    assert.deepEqual(partialNested.data.students[0].attendanceHistory, []);
  }
});
