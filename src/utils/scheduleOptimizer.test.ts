import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeterministicSmartSchedule,
  DEFAULT_SCHEDULE_CONSTRAINTS,
  findTravelBufferWarnings,
  normalizeDayOfWeek,
  normalizeStartTime,
  resolveAndNormalizeSchedule,
} from './scheduleOptimizer';
import type { ScheduledSlot, LessonSession, TutoringGroup } from '../types/tutoring';
import { parseTimeToMinutes } from './tutoringLogic';

const SAMPLE_GROUPS: TutoringGroup[] = [
  {
    id: 'g-1',
    name: 'مجموعة سنتر النخبة — مدينة نصر',
    subject: 'الرياضيات البحتة',
    gradeLevel: 'الصف الثالث الثانوي',
    lessonMode: 'center',
    roomOrLink: 'سنتر النخبة · قاعة 1',
    capacity: 25,
    defaultFee: 450,
  },
  {
    id: 'g-2',
    name: 'مجموعة سنتر المعادي',
    subject: 'الفيزياء',
    gradeLevel: 'الصف الثالث الثانوي',
    lessonMode: 'center',
    roomOrLink: 'سنتر المعادي · قاعة 3',
    capacity: 20,
    defaultFee: 450,
  },
  {
    id: 'g-3',
    name: 'درس خصوصي (برايفت)',
    subject: 'التفاضل والتكامل',
    gradeLevel: 'الصف الثالث الثانوي',
    lessonMode: 'private_home',
    roomOrLink: 'الزمالك — منزل الطالب',
    capacity: 1,
    defaultFee: 1400,
  },
];

test('normalizeDayOfWeek and normalizeStartTime handle English, Arabic, and 12h inputs', () => {
  assert.equal(normalizeDayOfWeek('الجمعة'), 'friday');
  assert.equal(normalizeDayOfWeek('Friday'), 'friday');
  assert.equal(normalizeDayOfWeek('الأحد'), 'sunday');
  assert.equal(normalizeStartTime('4:30 PM'), '16:30');
  assert.equal(normalizeStartTime('4:00'), '16:00');
  assert.equal(normalizeStartTime('18:45'), '18:45');
});

test('resolveAndNormalizeSchedule eliminates overlapping slots and enforces break buffers', () => {
  const collidingAiOutput: ScheduledSlot[] = [
    {
      groupId: 'g-1',
      groupName: 'مجموعة 1',
      day: 'saturday',
      startTime: '16:00',
      durationMinutes: 90,
      location: 'قاعة 1',
      lessonMode: 'center',
      rationale: 'حصة 1',
    },
    {
      groupId: 'g-2',
      groupName: 'مجموعة 2',
      day: 'saturday',
      startTime: '16:30', // Overlaps!
      durationMinutes: 90,
      location: 'قاعة 3',
      lessonMode: 'center',
      rationale: 'حصة 2',
    },
  ];

  const resolved = resolveAndNormalizeSchedule(collidingAiOutput, SAMPLE_GROUPS, {
    ...DEFAULT_SCHEDULE_CONSTRAINTS,
    breakMinutes: 15,
  });

  assert.equal(resolved.length, 2);
  if (resolved[0].day === resolved[1].day) {
    const end0 = parseTimeToMinutes(resolved[0].startTime) + resolved[0].durationMinutes;
    const start1 = parseTimeToMinutes(resolved[1].startTime);
    assert.ok(start1 >= end0 + 15, `Expected ${start1} >= ${end0 + 15}`);
  }
});

test('resolveAndNormalizeSchedule avoids Friday prayer window 11:30-13:30 when configured', () => {
  const fridayNoonSlot: ScheduledSlot[] = [
    {
      groupId: 'g-1',
      groupName: 'مجموعة الجمعة',
      day: 'friday',
      startTime: '12:00',
      durationMinutes: 90,
      location: 'سنتر النخبة',
      lessonMode: 'center',
      rationale: 'مراجعة',
    },
  ];

  const resolved = resolveAndNormalizeSchedule(fridayNoonSlot, SAMPLE_GROUPS, {
    ...DEFAULT_SCHEDULE_CONSTRAINTS,
    allowFriday: true,
    avoidFridayPrayer: true,
  });

  const start = parseTimeToMinutes(resolved[0].startTime);
  const end = start + resolved[0].durationMinutes;
  const overlapsPrayer =
    resolved[0].day === 'friday' && start < 13 * 60 + 30 && end > 11 * 60 + 30;
  assert.equal(overlapsPrayer, false);
});

test('buildDeterministicSmartSchedule produces conflict-free balanced slots across groups', () => {
  const plan = buildDeterministicSmartSchedule(SAMPLE_GROUPS, [], DEFAULT_SCHEDULE_CONSTRAINTS);
  assert.equal(plan.slots.length, 5); // 2 + 2 + 1 private

  // Verify zero pairwise overlaps
  for (let i = 0; i < plan.slots.length; i++) {
    for (let j = i + 1; j < plan.slots.length; j++) {
      const a = plan.slots[i];
      const b = plan.slots[j];
      if (a.day !== b.day) continue;
      const startA = parseTimeToMinutes(a.startTime);
      const endA = startA + a.durationMinutes;
      const startB = parseTimeToMinutes(b.startTime);
      const endB = startB + b.durationMinutes;
      assert.equal(startA < endB && startB < endA, false);
    }
  }
});

test('findTravelBufferWarnings detects tight transitions between different centers or private lessons', () => {
  const sessions: LessonSession[] = [
    {
      id: 's1',
      groupId: 'g-1',
      title: 'حصة مدينة نصر',
      subject: 'رياضيات',
      gradeLevel: '3 ثانوي',
      day: 'monday',
      startTime: '16:00',
      durationMinutes: 90,
      lessonMode: 'center',
      location: 'سنتر مدينة نصر',
      studentCount: 15,
    },
    {
      id: 's2',
      groupId: 'g-3',
      title: 'حصة الزمالك برايفت',
      subject: 'رياضيات',
      gradeLevel: '3 ثانوي',
      day: 'monday',
      startTime: '17:40', // only 10 mins after 17:30!
      durationMinutes: 60,
      lessonMode: 'private_home',
      location: 'الزمالك',
      studentCount: 1,
    },
  ];

  const warnings = findTravelBufferWarnings(sessions);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].day, 'monday');

  const sameCenterWhitespace = findTravelBufferWarnings([
    { ...sessions[0], location: 'سنتر النخبة ' },
    { ...sessions[0], id: 's3', startTime: '17:40', location: ' سنتر النخبة' },
  ]);
  assert.equal(sameCenterWhitespace.length, 0);
});

test('resolveAndNormalizeSchedule enforces 30m commute buffer for private lessons and normalizes Arabic lessonMode', () => {
  const mixedSlots: ScheduledSlot[] = [
    {
      groupId: 'g-1',
      groupName: 'مجموعة سنتر النخبة — مدينة نصر',
      day: 'saturday',
      startTime: '16:00',
      durationMinutes: 90,
      location: 'سنتر النخبة',
      lessonMode: 'سنتر' as ScheduledSlot['lessonMode'],
      rationale: 'حصة سنتر',
    },
    {
      groupId: 'g-3',
      groupName: 'درس خصوصي (برايفت)',
      day: 'saturday',
      startTime: '17:45', // only 15m after 17:30 -> must shift >= 30m!
      durationMinutes: 60,
      location: 'الزمالك',
      lessonMode: 'برايفت' as ScheduledSlot['lessonMode'],
      rationale: 'حصة منزلية',
    },
  ];

  const resolved = resolveAndNormalizeSchedule(mixedSlots, SAMPLE_GROUPS, {
    ...DEFAULT_SCHEDULE_CONSTRAINTS,
    breakMinutes: 15,
  });

  assert.equal(resolved[0].lessonMode, 'center');
  assert.equal(resolved[1].lessonMode, 'private_home');
  if (resolved[0].day === resolved[1].day) {
    const end0 = parseTimeToMinutes(resolved[0].startTime) + resolved[0].durationMinutes;
    const start1 = parseTimeToMinutes(resolved[1].startTime);
    assert.ok(start1 >= end0 + 30, `Expected commute gap >= 30m, got ${start1 - end0}m`);
  }
});

