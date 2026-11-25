import React from 'react';
import {
  CalendarClock,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  X,
  Pencil,
  SlidersHorizontal,
  Sparkles,
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react';
import type {
  DayOfWeek,
  LessonMode,
  LessonSession,
  ScheduleConstraints,
  ScheduleSuggestion,
  Student,
  TutoringGroup,
} from '../types/tutoring';
import {
  DAY_LABELS_AR,
  detectSessionConflict,
  formatArabicSessionsCount,
  formatArabicStudentsCount,
  formatSessionTimeRangeArabic,
  formatTimeArabic,
  LESSON_MODE_LABELS_AR,
  ORDERED_WEEK_DAYS,
  parseTimeToMinutes,
} from '../utils/tutoringLogic';
import {
  buildDeterministicSmartSchedule,
  DEFAULT_SCHEDULE_CONSTRAINTS,
  findTravelBufferWarnings,
} from '../utils/scheduleOptimizer';

interface ScheduleViewProps {
  sessions: LessonSession[];
  groups: TutoringGroup[];
  students: Student[];
  onAddSession: (session: Omit<LessonSession, 'id'>) => void;
  onUpdateSession: (sessionId: string, updated: Omit<LessonSession, 'id'>) => void;
  onDeleteSession: (sessionId: string) => void;
  onApplyBalancedSchedule: (slots: Omit<LessonSession, 'id'>[]) => void;
  onTakeSessionAttendance: (session: LessonSession) => void;
  onNavigateToSettings: () => void;
}

type ViewMode = 'cards' | 'timeline';
type ModeFilter = 'all' | LessonMode;

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  sessions,
  groups,
  students,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  onApplyBalancedSchedule,
  onTakeSessionAttendance,
  onNavigateToSettings,
}) => {
  const [viewMode, setViewMode] = React.useState<ViewMode>('cards');
  const [modeFilter, setModeFilter] = React.useState<ModeFilter>('all');
  const [constraints, setConstraints] = React.useState<ScheduleConstraints>(
    DEFAULT_SCHEDULE_CONSTRAINTS
  );
  const [showConstraints, setShowConstraints] = React.useState(false);

  const [proposedSchedule, setProposedSchedule] =
    React.useState<ScheduleSuggestion | null>(null);
  const [scheduleNotice, setScheduleNotice] = React.useState<string | null>(null);

  // Add / Edit Session Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingSessionId, setEditingSessionId] = React.useState<string | null>(
    null
  );
  const defaultGroup = groups[0];
  const [title, setTitle] = React.useState('');
  const [groupId, setGroupId] = React.useState(defaultGroup?.id ?? '');
  const [day, setDay] = React.useState<DayOfWeek>('sunday');
  const [startTime, setStartTime] = React.useState('17:00');
  const [durationMinutes, setDurationMinutes] = React.useState(90);
  const [location, setLocation] = React.useState(
    defaultGroup?.roomOrLink ?? ''
  );
  const [lessonMode, setLessonMode] = React.useState<LessonMode>(
    defaultGroup?.lessonMode ?? 'center'
  );
  const [formError, setFormError] = React.useState('');

  React.useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen]);

  const travelWarnings = React.useMemo(
    () => findTravelBufferWarnings(sessions),
    [sessions]
  );

  const openAddModal = () => {
    const grp = groups[0];
    setEditingSessionId(null);
    setGroupId(grp?.id ?? '');
    setTitle('');
    setDay('sunday');
    setStartTime('17:00');
    setDurationMinutes(90);
    setLocation(grp?.roomOrLink ?? '');
    setLessonMode(grp?.lessonMode ?? 'center');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (ses: LessonSession) => {
    setEditingSessionId(ses.id);
    setGroupId(ses.groupId);
    setTitle(ses.title);
    setDay(ses.day);
    setStartTime(ses.startTime);
    setDurationMinutes(ses.durationMinutes);
    setLocation(ses.location);
    setLessonMode(ses.lessonMode);
    setFormError('');
    setModalOpen(true);
  };

  const handleGroupPick = (id: string) => {
    setGroupId(id);
    const grp = groups.find((g) => g.id === id);
    if (grp) {
      setLocation(grp.roomOrLink);
      setLessonMode(grp.lessonMode);
    }
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('يرجى إدخال عنوان الحصة أو موضوع الدرس.');
      return;
    }
    const grp = groups.find((g) => g.id === groupId);
    const candidate: Omit<LessonSession, 'id'> = {
      groupId,
      title: title.trim(),
      subject: grp?.subject ?? 'مادة دراسية',
      gradeLevel: grp?.gradeLevel ?? 'عام',
      day,
      startTime,
      durationMinutes,
      lessonMode,
      location: location.trim() || 'السنتر',
      studentCount:
        groupId
          ? students.filter((s) => s.groupId === groupId).length || 1
          : 1,
    };

    const conflict = detectSessionConflict(
      candidate,
      sessions,
      editingSessionId ?? undefined
    );
    if (conflict) {
      setFormError(
        `يوجد تعارض زمني مع حصة «${conflict.title}» يوم ${DAY_LABELS_AR[conflict.day]} الساعة ${formatTimeArabic(conflict.startTime)}.`
      );
      return;
    }

    if (editingSessionId) {
      onUpdateSession(editingSessionId, candidate);
    } else {
      onAddSession(candidate);
    }
    setModalOpen(false);
  };

  const effectiveGroups = React.useMemo<TutoringGroup[]>(() => {
    const groupIds = new Set(groups.map((g) => g.id));
    const standaloneAsGroups: TutoringGroup[] = sessions
      .filter((ses) => !ses.groupId || !groupIds.has(ses.groupId))
      .map((ses) => ({
        id: ses.groupId || ses.id,
        name: ses.title,
        subject: ses.subject,
        gradeLevel: ses.gradeLevel,
        lessonMode: ses.lessonMode,
        roomOrLink: ses.location,
        capacity: Math.max(1, ses.studentCount),
        defaultFee: 400,
      }));
    return [...groups, ...standaloneAsGroups];
  }, [groups, sessions]);

  const handleInstantBalancedSchedule = () => {
    if (effectiveGroups.length === 0) {
      setScheduleNotice('أضف مجموعة دراسية من إعدادات المركز أو أضف حصة أولاً لتنظيم الجدول.');
      return;
    }
    setScheduleNotice(null);
    const plan = buildDeterministicSmartSchedule(
      effectiveGroups,
      students,
      constraints
    );
    setProposedSchedule({
      generatedAt: new Date().toISOString(),
      strategySummary: plan.strategySummary,
      efficiencyGain: plan.efficiencyGain,
      slots: plan.slots,
    });
  };

  const handleRemoveProposedSlot = (index: number) => {
    if (!proposedSchedule) return;
    setProposedSchedule({
      ...proposedSchedule,
      slots: proposedSchedule.slots.filter((_, i) => i !== index),
    });
  };

  const handleConfirmSchedule = () => {
    if (!proposedSchedule?.slots?.length) return;
    const realGroupIds = new Set(groups.map((g) => g.id));
    const mapped: Omit<LessonSession, 'id'>[] = proposedSchedule.slots.map((slot) => {
      const grp =
        effectiveGroups.find((g) => g.id === slot.groupId) ??
        effectiveGroups.find((g) => g.name === slot.groupName);
      const isRealGroup = Boolean(grp?.id && realGroupIds.has(grp.id));
      const baseName = grp?.name ?? slot.groupName;
      const title =
        isRealGroup && grp?.subject && grp.subject !== 'مادة دراسية' && !baseName.includes(grp.subject)
          ? `${grp.subject} — ${baseName}`
          : baseName;

      return {
        groupId: isRealGroup && grp ? grp.id : '',
        title,
        subject: grp?.subject ?? 'مادة دراسية',
        gradeLevel: grp?.gradeLevel ?? 'عام',
        day: slot.day,
        startTime: slot.startTime,
        durationMinutes: slot.durationMinutes || 90,
        lessonMode: slot.lessonMode || grp?.lessonMode || 'center',
        location: slot.location || grp?.roomOrLink || 'السنتر',
        studentCount: isRealGroup && grp
          ? students.filter((s) => s.groupId === grp.id).length || 1
          : grp?.capacity || 1,
      };
    });
    onApplyBalancedSchedule(mapped);
    setProposedSchedule(null);
  };

  const filteredSessions = React.useMemo(() => {
    if (modeFilter === 'all') return sessions;
    return sessions.filter((s) => s.lessonMode === modeFilter);
  }, [sessions, modeFilter]);

  const weeklySummary = React.useMemo(() => {
    const totalMinutes = filteredSessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );
    const hours = Math.round((totalMinutes / 60) * 10) / 10;
    const centerCount = filteredSessions.filter((s) => s.lessonMode === 'center').length;
    const privateCount = filteredSessions.filter((s) => s.lessonMode === 'private_home').length;
    const onlineCount = filteredSessions.filter((s) => s.lessonMode === 'online').length;
    return {
      total: filteredSessions.length,
      hours,
      centerCount,
      privateCount,
      onlineCount,
    };
  }, [filteredSessions]);

  const getLiveSessionStudentCount = (ses: LessonSession): number => {
    if (ses.groupId) {
      return students.filter((s) => s.groupId === ses.groupId).length;
    }
    return ses.studentCount;
  };

  const timelineHours = React.useMemo(() => {
    const sessionHours = filteredSessions.map((s) =>
      Math.floor(parseTimeToMinutes(s.startTime) / 60)
    );
    const minSessionHour = sessionHours.length
      ? Math.min(...sessionHours)
      : constraints.earliestHour;
    const maxSessionHour = sessionHours.length
      ? Math.max(...sessionHours)
      : constraints.latestHour;
    const startH = Math.min(constraints.earliestHour, minSessionHour);
    const endH = Math.max(constraints.latestHour, maxSessionHour);
    const hours: number[] = [];
    for (let h = startH; h <= endH; h++) hours.push(h);
    return hours;
  }, [filteredSessions, constraints.earliestHour, constraints.latestHour]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
            الجدول الأسبوعي وتنسيق المواعيد
          </h1>
          <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-1">
            تنظيم مواعيد السناتر والأونلاين والدروس البرايفت من السبت للجمعة مع منع التعارضات وحساب فواصل الانتقال
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div
            role="tablist"
            aria-label="طريقة عرض الجدول"
            className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'cards'}
              onClick={() => setViewMode('cards')}
              className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                viewMode === 'cards'
                  ? 'bg-[#0071E3] text-white'
                  : 'text-[#6E6E73] dark:text-[#98989D]'
              }`}
            >
              بطاقات الأيام
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'timeline'}
              onClick={() => setViewMode('timeline')}
              className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                viewMode === 'timeline'
                  ? 'bg-[#0071E3] text-white'
                  : 'text-[#6E6E73] dark:text-[#98989D]'
              }`}
            >
              الخط الزمني
            </button>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حصة</span>
          </button>
        </div>
      </div>

      {/* Automatic Timetable Organizer & Constraints Control Panel */}
      <section
        aria-label="منسق الجدول التلقائي"
        className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-4 sm:p-6 space-y-4"
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                منسق جدول السناتر والبرايفت التلقائي
              </h2>
              <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                ضمان 0 تعارضات زمنية، احترام وقت صلاة الجمعة، وتوفير فاصل انتقال بين السناتر
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowConstraints((v) => !v)}
              aria-expanded={showConstraints}
              className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>ضوابط التوقيت</span>
            </button>

            <button
              type="button"
              onClick={handleInstantBalancedSchedule}
              className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ترتيب متوازن فوري</span>
            </button>
          </div>
        </div>

        {/* Collapsible Constraints Grid */}
        {showConstraints && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <div>
              <label
                htmlFor="c-start-hr"
                className="block text-[11px] font-medium text-[#6E6E73] dark:text-[#98989D] mb-1"
              >
                بداية ساعات العمل (أيام الدراسة)
              </label>
              <select
                id="c-start-hr"
                value={constraints.earliestHour}
                onChange={(e) =>
                  setConstraints((prev) => ({
                    ...prev,
                    earliestHour: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 rounded-xl text-xs bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                <option value={12}>12:00 ظهراً</option>
                <option value={13}>1:00 ظهراً</option>
                <option value={14}>2:00 عصراً</option>
                <option value={15}>3:00 عصراً</option>
                <option value={16}>4:00 عصراً</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="c-end-hr"
                className="block text-[11px] font-medium text-[#6E6E73] dark:text-[#98989D] mb-1"
              >
                نهاية اليوم التدريسي
              </label>
              <select
                id="c-end-hr"
                value={constraints.latestHour}
                onChange={(e) =>
                  setConstraints((prev) => ({
                    ...prev,
                    latestHour: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 rounded-xl text-xs bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                <option value={20}>8:00 مساءً</option>
                <option value={21}>9:00 مساءً</option>
                <option value={22}>10:00 مساءً</option>
                <option value={23}>11:00 مساءً</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="c-break"
                className="block text-[11px] font-medium text-[#6E6E73] dark:text-[#98989D] mb-1"
              >
                الفاصل الزمني بين الحصص
              </label>
              <select
                id="c-break"
                value={constraints.breakMinutes}
                onChange={(e) =>
                  setConstraints((prev) => ({
                    ...prev,
                    breakMinutes: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 rounded-xl text-xs bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                <option value={0}>بدون فاصل إلزامي</option>
                <option value={15}>15 دقيقة راحة</option>
                <option value={30}>30 دقيقة انتقال وراحة</option>
                <option value={45}>45 دقيقة</option>
              </select>
            </div>

            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-xs text-[#1D1D1F] dark:text-[#E5E5EA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={constraints.allowFriday}
                  onChange={(e) =>
                    setConstraints((prev) => ({
                      ...prev,
                      allowFriday: e.target.checked,
                    }))
                  }
                  className="rounded accent-[#0071E3]"
                />
                <span>تضمين يوم الجمعة في الجدول</span>
              </label>
              {constraints.allowFriday && (
                <label className="flex items-center gap-2 text-xs text-[#6E6E73] dark:text-[#98989D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={constraints.avoidFridayPrayer}
                    onChange={(e) =>
                      setConstraints((prev) => ({
                        ...prev,
                        avoidFridayPrayer: e.target.checked,
                      }))
                    }
                    className="rounded accent-[#0071E3]"
                  />
                  <span>تفادي وقت صلاة الجمعة (11:30–1:30)</span>
                </label>
              )}
            </div>
          </div>
        )}

        {scheduleNotice && (
          <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#92400E] dark:text-[#FCD34D]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{scheduleNotice}</span>
            </div>
            {groups.length === 0 && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="min-h-[36px] sm:min-h-0 px-3 py-1.5 rounded-lg font-medium bg-[#0071E3] text-white whitespace-nowrap self-start sm:self-auto"
              >
                فتح إعدادات المركز
              </button>
            )}
          </div>
        )}

        {/* Proposed Schedule Preview */}
        {proposedSchedule && (
          <div className="rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  الجدول المقترح ({formatArabicSessionsCount(proposedSchedule.slots.length)}) ·{' '}
                  <span className="text-[#059669] dark:text-[#34D399]">
                    {proposedSchedule.efficiencyGain}
                  </span>
                </div>
                <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
                  {proposedSchedule.strategySummary}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setProposedSchedule(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-white"
                >
                  تجاهل
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSchedule}
                  disabled={proposedSchedule.slots.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#059669] text-white hover:bg-[#047857] disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>اعتماد وتطبيق الجدول</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {proposedSchedule.slots.map((slot, i) => (
                <div
                  key={`${slot.day}-${slot.startTime}-${i}`}
                  className="rounded-xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-3.5 flex items-start justify-between gap-2"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#0071E3] dark:text-[#2997FF]">
                      <span>{DAY_LABELS_AR[slot.day]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {formatTimeArabic(slot.startTime)} · {slot.durationMinutes} د
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                      {slot.groupName}
                    </div>
                    <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D]">
                      {slot.location} · {slot.rationale}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveProposedSlot(i)}
                    aria-label={`استبعاد مقترح ${slot.groupName}`}
                    className="p-1 rounded-lg text-[#6E6E73] hover:text-[#DC2626] shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Commute / Travel Buffer Warnings */}
      {travelWarnings.length > 0 && (
        <div className="rounded-2xl bg-amber-500/8 border border-amber-500/20 px-5 py-3.5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24] shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-[#92400E] dark:text-[#FCD34D]">
            <div className="font-semibold">تنبيه هامش الانتقال بين السناتر والبرايفت:</div>
            {travelWarnings.map((w, idx) => (
              <div key={idx}>{w.message}</div>
            ))}
          </div>
        </div>
      )}

      {/* Mode Filter & Weekly Summary Strip */}
      <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="تصفية الحصص حسب النمط"
          className="flex flex-wrap items-center gap-1.5"
        >
          {(
            [
              { id: 'all', label: 'كل الأنماط', count: sessions.length },
              {
                id: 'center',
                label: 'السنتر',
                count: sessions.filter((s) => s.lessonMode === 'center').length,
              },
              {
                id: 'private_home',
                label: 'برايفت',
                count: sessions.filter((s) => s.lessonMode === 'private_home').length,
              },
              {
                id: 'online',
                label: 'أونلاين',
                count: sessions.filter((s) => s.lessonMode === 'online').length,
              },
            ] as const
          ).map((tab) => {
            const active = modeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setModeFilter(tab.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors tabular-nums ${
                  active
                    ? 'bg-[#0071E3] text-white'
                    : 'bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[#6E6E73] dark:text-[#98989D] tabular-nums">
          <span>
            المعروض:{' '}
            <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">
              {formatArabicSessionsCount(weeklySummary.total)}
            </strong>
          </span>
          <span>
            إجمالي التدريس:{' '}
            <strong className="text-[#0071E3] dark:text-[#2997FF]">
              {weeklySummary.hours} ساعة / أسبوع
            </strong>
          </span>
        </div>
      </div>

      {/* Weekly Calendar: Cards View OR Hourly Timeline View */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ORDERED_WEEK_DAYS.map((dayKey) => {
            const daySessions = filteredSessions
              .filter((s) => s.day === dayKey)
              .sort(
                (a, b) =>
                  parseTimeToMinutes(a.startTime) -
                  parseTimeToMinutes(b.startTime)
              );

            return (
              <section
                key={dayKey}
                aria-label={`جدول يوم ${DAY_LABELS_AR[dayKey]}`}
                className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-5 flex flex-col"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <h2 className="text-base font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {DAY_LABELS_AR[dayKey]}
                  </h2>
                  <span className="text-xs text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                    {formatArabicSessionsCount(daySessions.length)}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {daySessions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#86868B]">
                      لا توجد حصص مجدولة في هذا اليوم
                    </div>
                  ) : (
                    daySessions.map((ses) => {
                      const liveCount = getLiveSessionStudentCount(ses);
                      return (
                        <div
                          key={ses.id}
                          className="rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] p-3.5 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <div className="text-xs font-semibold text-[#0071E3] dark:text-[#2997FF] tabular-nums">
                                {formatSessionTimeRangeArabic(
                                  ses.startTime,
                                  ses.durationMinutes
                                )}{' '}
                                · {ses.durationMinutes} دقيقة
                              </div>
                              <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                                {ses.title}
                              </div>
                              <div className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                                {LESSON_MODE_LABELS_AR[ses.lessonMode]} · {ses.location}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditModal(ses)}
                                aria-label={`تعديل حصة ${ses.title}`}
                                className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                              >
                                <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteSession(ses.id)}
                                aria-label={`حذف حصة ${ses.title}`}
                                className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg text-[#6E6E73] hover:text-[#DC2626] hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-[#6E6E73] dark:text-[#98989D] truncate tabular-nums">
                              {ses.gradeLevel} · {formatArabicStudentsCount(liveCount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onTakeSessionAttendance(ses)}
                              className="inline-flex items-center gap-1 font-medium text-[#0071E3] dark:text-[#2997FF] hover:underline whitespace-nowrap"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              <span>تسجيل الحضور</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* Hourly Timeline Grid View */
        <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] overflow-x-auto">
          <div className="min-w-[920px] p-4">
            <div className="grid grid-cols-8 gap-2 pb-3 border-b border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-[#6E6E73] dark:text-[#98989D]">
              <div className="px-2">الساعة</div>
              {ORDERED_WEEK_DAYS.map((d) => (
                <div key={d} className="text-center text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {DAY_LABELS_AR[d]}
                </div>
              ))}
            </div>

            <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
              {timelineHours.map((hour) => {
                const hourStr = `${String(hour).padStart(2, '0')}:00`;
                return (
                  <div key={hour} className="grid grid-cols-8 gap-2 py-2.5 items-stretch">
                    <div className="px-2 text-xs tabular-nums font-medium text-[#6E6E73] dark:text-[#98989D] flex items-center">
                      {formatTimeArabic(hourStr)}
                    </div>
                    {ORDERED_WEEK_DAYS.map((d) => {
                      const matching = filteredSessions.filter((s) => {
                        if (s.day !== d) return false;
                        const sHour = Math.floor(parseTimeToMinutes(s.startTime) / 60);
                        return sHour === hour;
                      });
                      return (
                        <div key={d} className="min-h-[48px] space-y-1">
                          {matching.map((ses) => (
                            <button
                              key={ses.id}
                              type="button"
                              onClick={() => openEditModal(ses)}
                              className="w-full text-right p-2 rounded-xl bg-[#0071E3]/10 dark:bg-[#0071E3]/20 border border-[#0071E3]/25 hover:bg-[#0071E3]/15 transition-colors"
                            >
                              <div className="text-[11px] font-bold text-[#0071E3] dark:text-[#60A5FA] tabular-nums">
                                {formatSessionTimeRangeArabic(ses.startTime, ses.durationMinutes)}
                              </div>
                              <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                                {ses.title}
                              </div>
                              <div className="text-[10px] text-[#6E6E73] dark:text-[#98989D] truncate">
                                {ses.location}
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Session Modal (Bottom Sheet on Mobile) */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-session-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
            <div className="sm:hidden w-10 h-1 bg-black/15 dark:bg-white/20 rounded-full mx-auto mt-2.5 shrink-0" />
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <h2
                id="add-session-title"
                className="text-lg font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                {editingSessionId ? 'تعديل موعد الحصة' : 'إضافة حصة إلى الجدول'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="إغلاق نافذة الحصة"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#6E6E73] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="p-5 sm:p-6 overflow-y-auto space-y-4 pb-safe">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="ses-group"
                    className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
                  >
                    المجموعة / السنتر
                  </label>
                  <select
                    id="ses-group"
                    value={groupId}
                    onChange={(e) => handleGroupPick(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
                  >
                    <option value="">حصة مستقلة (بدون مجموعة مسبقة)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ses-mode"
                    className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
                  >
                    نمط الحصة
                  </label>
                  <select
                    id="ses-mode"
                    value={lessonMode}
                    onChange={(e) => setLessonMode(e.target.value as LessonMode)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
                  >
                    {(Object.keys(LESSON_MODE_LABELS_AR) as LessonMode[]).map(
                      (mode) => (
                        <option key={mode} value={mode}>
                          {LESSON_MODE_LABELS_AR[mode]}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="ses-title"
                  className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
                >
                  عنوان الدرس *
                </label>
                <input
                  id="ses-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFormError('');
                  }}
                  placeholder="مثال: حل مسائل كتاب الامتحان على كيرشوف"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="ses-day"
                    className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
                  >
                    اليوم
                  </label>
                  <select
                    id="ses-day"
                    value={day}
                    onChange={(e) => {
                      setDay(e.target.value as DayOfWeek);
                      setFormError('');
                    }}
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
                  >
                    {ORDERED_WEEK_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {DAY_LABELS_AR[d]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ses-time"
                    className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
                  >
                    الوقت
                  </label>
                  <input
                    id="ses-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setFormError('');
                    }}
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl text-base sm:text-sm tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ses-duration"
                    className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
                  >
                    المدة
                  </label>
                  <select
                    id="ses-duration"
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(Number(e.target.value))
                    }
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl text-base sm:text-sm tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
                  >
                    <option value={60}>60 دقيقة</option>
                    <option value={75}>75 دقيقة</option>
                    <option value={90}>90 دقيقة</option>
                    <option value={120}>120 دقيقة</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="ses-location"
                  className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
                >
                  السنتر / القاعة / رابط البث
                </label>
                <input
                  id="ses-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>

              {formError && (
                <div className="rounded-xl bg-red-500/8 border border-red-500/20 p-3 text-xs text-[#DC2626] dark:text-[#F87171]">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium text-[#424245] dark:text-[#C7C7CC]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-medium bg-[#0071E3] text-white hover:bg-[#0077ED]"
                >
                  {editingSessionId ? 'حفظ التعديلات' : 'إضافة الحصة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
