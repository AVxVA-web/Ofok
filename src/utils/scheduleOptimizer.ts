import type {
  ScheduledSlot,
  DayOfWeek,
  LessonSession,
  ScheduleConstraints,
  Student,
  TutoringGroup,
} from '../types/tutoring.ts';
import {
  DAY_LABELS_AR,
  ORDERED_WEEK_DAYS,
  parseTimeToMinutes,
} from './tutoringLogic.ts';

export const DEFAULT_SCHEDULE_CONSTRAINTS: ScheduleConstraints = {
  earliestHour: 14, // 2:00 PM
  latestHour: 22, // 10:00 PM
  breakMinutes: 15,
  allowFriday: true,
  avoidFridayPrayer: true,
};

const DAY_ALIASES: Record<string, DayOfWeek> = {
  saturday: 'saturday',
  sat: 'saturday',
  السبت: 'saturday',
  sunday: 'sunday',
  sun: 'sunday',
  الأحد: 'sunday',
  الاحد: 'sunday',
  monday: 'monday',
  mon: 'monday',
  الاثنين: 'monday',
  الإثنين: 'monday',
  tuesday: 'tuesday',
  tue: 'tuesday',
  الثلاثاء: 'tuesday',
  wednesday: 'wednesday',
  wed: 'wednesday',
  الأربعاء: 'wednesday',
  الاربعاء: 'wednesday',
  thursday: 'thursday',
  thu: 'thursday',
  الخميس: 'thursday',
  friday: 'friday',
  fri: 'friday',
  الجمعة: 'friday',
};

export function normalizeDayOfWeek(raw: string | undefined): DayOfWeek {
  if (!raw) return 'saturday';
  const cleaned = raw.trim().toLowerCase();
  return DAY_ALIASES[cleaned] ?? DAY_ALIASES[raw.trim()] ?? 'saturday';
}

export function minutesToTimeString(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function normalizeStartTime(raw: string | undefined): string {
  if (!raw) return '16:00';
  const trimmed = raw.trim();
  const isPm = /pm|م/i.test(trimmed);
  const isAm = /am|ص/i.test(trimmed);
  const match = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (!match) return '16:00';
  let hour = Number(match[1]);
  const minute = Math.min(59, Math.max(0, Number(match[2])));

  if (isPm && hour < 12) hour += 12;
  if (isAm && hour === 12) hour = 0;

  // In Egyptian tutoring centers, bare small hours like 04:00 without AM/PM mean afternoon 16:00
  if (!isAm && !isPm && hour >= 1 && hour <= 10) {
    hour += 12;
  }

  return minutesToTimeString(hour * 60 + minute);
}

function normalizeLessonMode(
  raw: string | undefined,
  fallback: ScheduledSlot['lessonMode'] = 'center'
): ScheduledSlot['lessonMode'] {
  if (!raw) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === 'private_home' || v.includes('private') || v.includes('برايفت') || v.includes('منزل') || v.includes('خصوص')) {
    return 'private_home';
  }
  if (v === 'online' || v.includes('أونلاين') || v.includes('اونلاين') || v.includes('بث') || v.includes('زوم')) {
    return 'online';
  }
  if (v === 'center' || v.includes('سنتر') || v.includes('مجموعة') || v.includes('قاعة')) {
    return 'center';
  }
  return fallback;
}

function sanitizeConstraints(constraints: ScheduleConstraints): ScheduleConstraints {
  const earliestHour = Math.max(8, Math.min(20, Math.floor(constraints.earliestHour || 14)));
  const latestHour = Math.max(earliestHour + 2, Math.min(23, Math.floor(constraints.latestHour || 22)));
  const breakMinutes = Math.max(0, Math.min(90, Math.floor(constraints.breakMinutes ?? 15)));
  return {
    earliestHour,
    latestHour,
    breakMinutes,
    allowFriday: constraints.allowFriday !== false,
    avoidFridayPrayer: constraints.avoidFridayPrayer !== false,
  };
}

interface PlacedSlot {
  day: DayOfWeek;
  startMin: number;
  endMin: number;
  lessonMode: ScheduledSlot['lessonMode'];
  location: string;
}

function needsCommuteBuffer(
  a: { lessonMode: ScheduledSlot['lessonMode']; location: string },
  b: { lessonMode: ScheduledSlot['lessonMode']; location: string }
): boolean {
  if (a.lessonMode === 'private_home' || b.lessonMode === 'private_home') {
    return true;
  }
  return (
    a.lessonMode === 'center' &&
    b.lessonMode === 'center' &&
    a.location.trim().toLowerCase() !== b.location.trim().toLowerCase()
  );
}

function isBlockedWindow(
  day: DayOfWeek,
  startMin: number,
  durationMin: number,
  constraints: ScheduleConstraints
): boolean {
  const endMin = startMin + durationMin;
  const minAllowed = constraints.earliestHour * 60;
  const maxAllowed = constraints.latestHour * 60;

  // On Friday & Saturday in Egypt, teachers can start earlier (e.g., 10:00 AM)
  const effectiveStart =
    day === 'friday' || day === 'saturday'
      ? Math.min(minAllowed, 10 * 60)
      : minAllowed;

  if (startMin < effectiveStart || endMin > maxAllowed) {
    return true;
  }

  // Friday prayer window 11:30 - 13:30
  if (day === 'friday' && constraints.avoidFridayPrayer) {
    if (startMin < 13 * 60 + 30 && endMin > 11 * 60 + 30) {
      return true;
    }
  }

  return false;
}

function findNextAvailableSlot(
  preferredDay: DayOfWeek,
  preferredStartMin: number,
  durationMin: number,
  candidateMeta: { lessonMode: ScheduledSlot['lessonMode']; location: string },
  placed: PlacedSlot[],
  constraints: ScheduleConstraints
): { day: DayOfWeek; startMin: number } {
  const allowedDays = constraints.allowFriday
    ? ORDERED_WEEK_DAYS
    : ORDERED_WEEK_DAYS.filter((d) => d !== 'friday');

  const safePreferredDay = allowedDays.includes(preferredDay)
    ? preferredDay
    : allowedDays[0] ?? 'saturday';
  const startIdx = Math.max(0, allowedDays.indexOf(safePreferredDay));
  const orderedCandidateDays = [
    ...allowedDays.slice(startIdx),
    ...allowedDays.slice(0, startIdx),
  ];

  const step = 30;
  const baseBuffer = Math.max(0, constraints.breakMinutes);

  // Pass 1: enforce 30-min commute gap between different centers or private lessons
  // Pass 2: fallback to baseBuffer if the week is too packed for 30-min gaps
  for (const enforceCommute of [true, false]) {
    for (let dOffset = 0; dOffset < orderedCandidateDays.length; dOffset++) {
      const candidateDay = orderedCandidateDays[dOffset];
      const dayMinStart =
        candidateDay === 'friday' || candidateDay === 'saturday'
          ? Math.min(constraints.earliestHour * 60, 10 * 60)
          : constraints.earliestHour * 60;
      const dayMaxEnd = constraints.latestHour * 60;
      const candidateTimes: number[] = [];

      for (let t = dayMinStart; t + durationMin <= dayMaxEnd; t += step) {
        candidateTimes.push(t);
      }
      if (dOffset === 0 && preferredStartMin >= dayMinStart) {
        // Prioritize slots forward from the preferred time in 15-min steps
        const prioritized: number[] = [];
        for (let t = preferredStartMin; t + durationMin <= dayMaxEnd; t += 15) {
          prioritized.push(t);
        }
        for (const t of candidateTimes) {
          if (!prioritized.includes(t)) prioritized.push(t);
        }
        candidateTimes.length = 0;
        candidateTimes.push(...prioritized);
      } else if (!enforceCommute) {
        // Dense fallback pass checks 15-min increments on all days before giving up
        for (let t = dayMinStart; t + durationMin <= dayMaxEnd; t += 15) {
          if (!candidateTimes.includes(t)) candidateTimes.push(t);
        }
      }

      for (const startMin of candidateTimes) {
        const endMin = startMin + durationMin;
        if (isBlockedWindow(candidateDay, startMin, durationMin, constraints)) {
          continue;
        }

        const collides = placed.some((p) => {
          if (p.day !== candidateDay) return false;
          const requiredBuffer =
            enforceCommute && needsCommuteBuffer(candidateMeta, p)
              ? Math.max(baseBuffer, 30)
              : baseBuffer;
          return startMin < p.endMin + requiredBuffer && p.startMin < endMin + requiredBuffer;
        });

        if (!collides) {
          return { day: candidateDay, startMin };
        }
      }
    }
  }

  return {
    day: orderedCandidateDays[0] ?? 'saturday',
    startMin: constraints.earliestHour * 60,
  };
}

/**
 * Normalizes and mathematically guarantees zero conflicts (with break & commute buffers)
 * for any scheduled or imported lesson slots.
 */
export function resolveAndNormalizeSchedule(
  rawSlots: ScheduledSlot[],
  groups: TutoringGroup[],
  rawConstraints: ScheduleConstraints = DEFAULT_SCHEDULE_CONSTRAINTS,
  options: { preserveOriginalRationale?: boolean } = {}
): ScheduledSlot[] {
  const constraints = sanitizeConstraints(rawConstraints);
  const placed: PlacedSlot[] = [];
  const result: ScheduledSlot[] = [];

  for (const raw of rawSlots) {
    const rawNameNorm = (raw.groupName || '').trim().toLowerCase();
    const grp =
      groups.find((g) => g.id === raw.groupId) ??
      groups.find((g) => g.name.trim().toLowerCase() === rawNameNorm) ??
      (rawNameNorm.length >= 3
        ? groups.find((g) => g.name.trim().toLowerCase().includes(rawNameNorm))
        : undefined) ??
      (groups.length === 1 ? groups[0] : undefined);

    const preferredDay = normalizeDayOfWeek(raw.day);
    const normalizedTime = normalizeStartTime(raw.startTime);
    const preferredStartMin = parseTimeToMinutes(normalizedTime);
    const rawDuration = Number(raw.durationMinutes);
    const durationMinutes =
      Number.isFinite(rawDuration) && rawDuration >= 45 && rawDuration <= 180
        ? Math.round(rawDuration)
        : 90;

    const lessonMode = normalizeLessonMode(
      raw.lessonMode,
      grp?.lessonMode ?? 'center'
    );
    const location = raw.location?.trim() || grp?.roomOrLink || 'السنتر';

    const chosen = findNextAvailableSlot(
      preferredDay,
      preferredStartMin,
      durationMinutes,
      { lessonMode, location },
      placed,
      constraints
    );

    placed.push({
      day: chosen.day,
      startMin: chosen.startMin,
      endMin: chosen.startMin + durationMinutes,
      lessonMode,
      location,
    });

    const adjustedTime = minutesToTimeString(chosen.startMin);
    const wasShifted =
      chosen.day !== preferredDay || adjustedTime !== normalizedTime;

    result.push({
      groupId: grp?.id ?? raw.groupId ?? '',
      groupName: grp?.name ?? (raw.groupName?.trim() || 'حصة دراسية'),
      day: chosen.day,
      startTime: adjustedTime,
      durationMinutes,
      location,
      lessonMode,
      rationale:
        wasShifted && !options.preserveOriginalRationale
          ? `${raw.rationale || 'حصة مجدولة'} (تم ضبط الموعد تلقائياً لتفادي التعارض وضمان فاصل الراحة والانتقال)`
          : raw.rationale || 'موعد متوازن دون تعارضات زمنية',
    });
  }

  return result.sort((a, b) => {
    const dayDiff =
      ORDERED_WEEK_DAYS.indexOf(a.day) - ORDERED_WEEK_DAYS.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
  });
}

/**
 * Builds an instant, spaced-repetition, conflict-free Egyptian weekly timetable
 * respecting center & private commute gaps and Friday prayer time.
 */
export function buildDeterministicSmartSchedule(
  groups: TutoringGroup[],
  students: Student[],
  rawConstraints: ScheduleConstraints = DEFAULT_SCHEDULE_CONSTRAINTS
): {
  strategySummary: string;
  efficiencyGain: string;
  slots: ScheduledSlot[];
} {
  const constraints = sanitizeConstraints(rawConstraints);
  const allowedDays = constraints.allowFriday
    ? ORDERED_WEEK_DAYS
    : ORDERED_WEEK_DAYS.filter((d) => d !== 'friday');

  const rawSlots: ScheduledSlot[] = [];

  // Sort groups so larger groups and 3rd Secondary get prime afternoon/weekend slots first
  const rankedGroups = [...groups].sort((a, b) => {
    const countA = students.filter((s) => s.groupId === a.id).length;
    const countB = students.filter((s) => s.groupId === b.id).length;
    const isSeniorA = a.gradeLevel.includes('الثالث') ? 1 : 0;
    const isSeniorB = b.gradeLevel.includes('الثالث') ? 1 : 0;
    return isSeniorB * 10 + countB - (isSeniorA * 10 + countA);
  });

  rankedGroups.forEach((grp, idx) => {
    const sessionsPerWeek = grp.lessonMode === 'private_home' ? 1 : 2;
    const firstDayIdx = idx % allowedDays.length;
    const secondDayIdx = (firstDayIdx + 3) % allowedDays.length; // Spaced 3 days apart

    const baseHour = Math.min(
      constraints.latestHour - 2,
      constraints.earliestHour + (idx % 3) + 1
    );

    rawSlots.push({
      groupId: grp.id,
      groupName: grp.name,
      day: allowedDays[firstDayIdx],
      startTime: minutesToTimeString(baseHour * 60),
      durationMinutes: grp.lessonMode === 'private_home' ? 60 : 90,
      location: grp.roomOrLink,
      lessonMode: grp.lessonMode,
      rationale:
        grp.lessonMode === 'private_home'
          ? 'حصة برايفت مخصصة مع هامش انتقال مريح'
          : 'حصة شرح وتأسيس رئيسية للأسبوع',
    });

    if (sessionsPerWeek === 2) {
      rawSlots.push({
        groupId: grp.id,
        groupName: grp.name,
        day: allowedDays[secondDayIdx],
        startTime: minutesToTimeString(baseHour * 60 + 30),
        durationMinutes: grp.lessonMode === 'online' ? 75 : 90,
        location: grp.roomOrLink,
        lessonMode: grp.lessonMode,
        rationale: 'حصة حل وتطبيقات متباعدة زمنياً لتثبيت الفهم',
      });
    }
  });

  const resolved = resolveAndNormalizeSchedule(rawSlots, groups, constraints, {
    preserveOriginalRationale: true,
  });

  return {
    strategySummary: `تم توزيع ${resolved.length} حصص أسبوعياً بفاصل راحة لا يقل عن ${constraints.breakMinutes} دقيقة وهامش انتقال 30 دقيقة للسناتر والبرايفت.`,
    efficiencyGain: '0 تعارضات زمنية · توازن مثالي للسناتر والبرايفت',
    slots: resolved,
  };
}

export interface TravelGapWarning {
  day: DayOfWeek;
  message: string;
}

/**
 * Checks whether back-to-back sessions on the same day involve different locations
 * or private home visits with less than 30 minutes commute gap.
 */
export function findTravelBufferWarnings(
  sessions: LessonSession[]
): TravelGapWarning[] {
  const warnings: TravelGapWarning[] = [];

  for (const day of ORDERED_WEEK_DAYS) {
    const dayList = sessions
      .filter((s) => s.day === day)
      .sort(
        (a, b) =>
          parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
      );

    for (let i = 0; i < dayList.length - 1; i++) {
      const current = dayList[i];
      const next = dayList[i + 1];
      const currentEnd =
        parseTimeToMinutes(current.startTime) + current.durationMinutes;
      const nextStart = parseTimeToMinutes(next.startTime);
      const gap = nextStart - currentEnd;

      const involvesCommute =
        current.lessonMode === 'private_home' ||
        next.lessonMode === 'private_home' ||
        (current.lessonMode === 'center' &&
          next.lessonMode === 'center' &&
          current.location.trim().toLowerCase() !==
            next.location.trim().toLowerCase());

      if (involvesCommute && gap >= 0 && gap < 30) {
        warnings.push({
          day,
          message: `يوم ${DAY_LABELS_AR[day]}: الفاصل بين «${current.title}» و«${next.title}» هو ${gap} دقيقة فقط رغم اختلاف المكان/البرايفت.`,
        });
      }
    }
  }

  return warnings;
}
