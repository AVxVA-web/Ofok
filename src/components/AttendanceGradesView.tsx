import React from 'react';
import { Check, Award, Search } from 'lucide-react';
import type {
  AttendanceStatus,
  CenterSettings,
  Student,
  TutoringGroup,
} from '../types/tutoring';
import {
  computeStudentProgressScore,
  formatArabicSessionsCount,
  type AttendanceBatchRecordInput,
} from '../utils/tutoringLogic';

interface AttendanceGradesViewProps {
  students: Student[];
  groups: TutoringGroup[];
  settings: CenterSettings;
  preselectedGroupId?: string;
  preselectedSessionTitle?: string;
  onSaveAttendanceBatch: (params: {
    date: string;
    sessionTitle: string;
    records: AttendanceBatchRecordInput[];
    replaceExisting?: boolean;
  }) => void;
  onAddGrade: (
    studentId: string,
    grade: { title: string; score: number; maxScore: number }
  ) => void;
  onSelectStudent?: (student: Student) => void;
}

export const AttendanceGradesView: React.FC<AttendanceGradesViewProps> = ({
  students,
  groups,
  settings,
  preselectedGroupId,
  preselectedSessionTitle,
  onSaveAttendanceBatch,
  onAddGrade,
  onSelectStudent,
}) => {
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>(
    preselectedGroupId || 'all'
  );
  const [sessionTitle, setSessionTitle] = React.useState(
    preselectedSessionTitle || 'الحصة الأساسية — شرح وحل شيتات'
  );
  const [attendanceDate, setAttendanceDate] = React.useState(
    settings.referenceDate
  );
  const [studentSearch, setStudentSearch] = React.useState('');
  const [attendanceMap, setAttendanceMap] = React.useState<
    Record<string, AttendanceStatus>
  >({});
  const [homeworkMap, setHomeworkMap] = React.useState<Record<string, boolean>>(
    {}
  );
  const [savedNotice, setSavedNotice] = React.useState<string | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = React.useState(false);

  React.useEffect(() => {
    if (preselectedGroupId) setSelectedGroupId(preselectedGroupId);
    if (preselectedSessionTitle) setSessionTitle(preselectedSessionTitle);
  }, [preselectedGroupId, preselectedSessionTitle]);

  // Quick Grade Form
  const [gradeStudentId, setGradeStudentId] = React.useState(
    students[0]?.id ?? ''
  );
  const [gradeTitle, setGradeTitle] = React.useState('');
  const [gradeScore, setGradeScore] = React.useState('46');
  const [gradeMax, setGradeMax] = React.useState('50');
  const [gradeMsg, setGradeMsg] = React.useState('');

  React.useEffect(() => {
    if (!students.some((s) => s.id === gradeStudentId)) {
      setGradeStudentId(students[0]?.id ?? '');
    }
  }, [students, gradeStudentId]);

  const normalizedSessionTitle =
    sessionTitle.trim() || `حصة ${attendanceDate || settings.referenceDate}`;

  const groupStudents = React.useMemo(() => {
    if (selectedGroupId === 'all') return students;
    return students.filter((s) => s.groupId === selectedGroupId);
  }, [students, selectedGroupId]);

  const visibleStudents = React.useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return groupStudents;
    return groupStudents.filter((s) =>
      `${s.fullName} ${s.subject}`.toLowerCase().includes(q)
    );
  }, [groupStudents, studentSearch]);

  const groupIdsKey = React.useMemo(
    () => groupStudents.map((s) => s.id).join(','),
    [groupStudents]
  );

  React.useEffect(() => {
    setAttendanceMap((prev) => {
      const next: Record<string, AttendanceStatus> = {};
      for (const s of groupStudents) {
        const existing = s.attendanceHistory.find(
          (h) =>
            h.date === attendanceDate &&
            h.sessionTitle.trim() === normalizedSessionTitle
        );
        next[s.id] = existing?.status ?? prev[s.id] ?? 'present';
      }
      return next;
    });
    setHomeworkMap((prev) => {
      const next: Record<string, boolean> = {};
      for (const s of groupStudents) {
        const existing = s.attendanceHistory.find(
          (h) =>
            h.date === attendanceDate &&
            h.sessionTitle.trim() === normalizedSessionTitle
        );
        next[s.id] =
          existing?.homeworkDone !== undefined
            ? existing.homeworkDone
            : prev[s.id] ?? true;
      }
      return next;
    });
  }, [groupIdsKey, groupStudents, attendanceDate, normalizedSessionTitle]);

  const batchSummary = React.useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    for (const s of groupStudents) {
      const st = attendanceMap[s.id] ?? 'present';
      if (st === 'present') present++;
      else if (st === 'late') late++;
      else absent++;
    }
    return { present, late, absent };
  }, [groupStudents, attendanceMap]);

  const alreadyLoggedCount = React.useMemo(() => {
    return groupStudents.filter((s) =>
      s.attendanceHistory.some(
        (h) =>
          h.date === attendanceDate &&
          h.sessionTitle.trim() === normalizedSessionTitle
      )
    ).length;
  }, [groupStudents, attendanceDate, normalizedSessionTitle]);

  React.useEffect(() => {
    setConfirmDuplicate(false);
  }, [normalizedSessionTitle, selectedGroupId, attendanceDate]);

  const commitSaveAttendance = (replaceExisting: boolean) => {
    const records = groupStudents.map((s) => ({
      studentId: s.id,
      status: attendanceMap[s.id] ?? 'present',
      homeworkDone: homeworkMap[s.id] ?? true,
    }));
    onSaveAttendanceBatch({
      date: attendanceDate || settings.referenceDate,
      sessionTitle: normalizedSessionTitle,
      records,
      replaceExisting,
    });
    setConfirmDuplicate(false);
    setSavedNotice(
      replaceExisting
        ? 'تم تحديث سجل الحضور والواجبات لهذا التاريخ دون خصم حصص إضافية.'
        : 'تم حفظ الحضور والواجبات وتحديث نسب الالتزام وعدد الحصص المتبقية.'
    );
    setTimeout(() => setSavedNotice(null), 3200);
  };

  const handleSaveAttendance = () => {
    if (alreadyLoggedCount > 0 && !confirmDuplicate) {
      setConfirmDuplicate(true);
      return;
    }
    commitSaveAttendance(false);
  };

  const handleMarkAllPresent = () => {
    const next: Record<string, AttendanceStatus> = { ...attendanceMap };
    for (const s of visibleStudents) next[s.id] = 'present';
    setAttendanceMap(next);
  };

  const handleMarkAllHomeworkDone = () => {
    const next: Record<string, boolean> = { ...homeworkMap };
    for (const s of visibleStudents) next[s.id] = true;
    setHomeworkMap(next);
  };

  const handleAddGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = Number(gradeScore);
    const m = Number(gradeMax);
    if (!gradeStudentId || !gradeTitle.trim()) {
      setGradeMsg('يرجى اختيار الطالب وكتابة عنوان الامتحان.');
      return;
    }
    if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0 || s < 0 || s > m) {
      setGradeMsg('يرجى التحقق من صحة الدرجة المدخلة.');
      return;
    }
    onAddGrade(gradeStudentId, {
      title: gradeTitle.trim(),
      score: s,
      maxScore: m,
    });
    setGradeTitle('');
    setGradeMsg('تم رصد الدرجة وتحديث مؤشر تقدم الطالب بنجاح.');
    setTimeout(() => setGradeMsg(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
          تسجيل الحضور والواجبات ورصد الدرجات
        </h1>
        <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-1">
          تحديث حضور الحصة والتزام الشيتات ورصد درجات الامتحانات مع احتساب فوري لمؤشر الأداء
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Attendance & Homework Sheet */}
        <section
          aria-label="كشف حضور الحصة"
          className="xl:col-span-2 rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-4 sm:p-6 space-y-4"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 flex-1 min-w-0">
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                aria-label="اختيار المجموعة"
                className="sm:col-span-4 min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                <option value="all">جميع الطلاب</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                aria-label="عنوان الحصة"
                className="sm:col-span-5 min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />

              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                aria-label="تاريخ الحصة"
                className="sm:col-span-3 min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={groupStudents.length === 0}
              className="w-full lg:w-auto min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 disabled:opacity-45"
            >
              <Check className="w-4 h-4" />
              <span>حفظ الكشف</span>
            </button>
          </div>

          {groupStudents.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums text-[#6E6E73] dark:text-[#98989D]">
                <span className="text-[#059669] dark:text-[#34D399] font-medium">
                  حاضر: {batchSummary.present}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[#D97706] dark:text-[#FBBF24] font-medium">
                  متأخر: {batchSummary.late}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[#DC2626] dark:text-[#F87171] font-medium">
                  غائب: {batchSummary.absent}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:w-44">
                  <Search className="w-3.5 h-3.5 text-[#6E6E73] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="بحث سريع..."
                    aria-label="بحث داخل كشف الحضور"
                    className="w-full pr-8 pl-2.5 py-1.5 min-h-[36px] sm:min-h-0 rounded-lg text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="min-h-[36px] sm:min-h-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] whitespace-nowrap"
                >
                  تحديد الكل حاضر
                </button>
                <button
                  type="button"
                  onClick={handleMarkAllHomeworkDone}
                  className="min-h-[36px] sm:min-h-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] whitespace-nowrap"
                >
                  الكل أدى الواجب
                </button>
              </div>
            </div>
          )}

          {confirmDuplicate && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#92400E] dark:text-[#FCD34D]">
              <span>
                تم تسجيل كشف «{normalizedSessionTitle}» بهذا التاريخ لـ {alreadyLoggedCount} من الطلاب. اختر تحديث السجل لتصحيح الحضور دون خصم حصة إضافية.
              </span>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmDuplicate(false)}
                  className="min-h-[36px] sm:min-h-0 px-3 py-1 rounded-lg bg-white/70 dark:bg-black/20 text-[#1D1D1F] dark:text-[#F5F5F7]"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={() => commitSaveAttendance(true)}
                  className="min-h-[36px] sm:min-h-0 px-3 py-1 rounded-lg font-medium bg-[#0071E3] text-white"
                >
                  تحديث السجل الحالي
                </button>
                <button
                  type="button"
                  onClick={() => commitSaveAttendance(false)}
                  className="min-h-[36px] sm:min-h-0 px-3 py-1 rounded-lg font-medium bg-[#D97706] text-white"
                >
                  حفظ كحصة جديدة
                </button>
              </div>
            </div>
          )}

          {savedNotice && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs font-medium text-[#059669] dark:text-[#34D399]">
              {savedNotice}
            </div>
          )}

          <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
            {visibleStudents.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#6E6E73] dark:text-[#98989D]">
                {students.length === 0
                  ? 'لا يوجد طلاب مسجلون بعد. سجّل طلابك أولاً ليظهروا في كشف الحضور والواجبات.'
                  : 'لا يوجد طلاب يطابقون التصفية الحالية.'}
              </div>
            ) : (
              visibleStudents.map((s) => {
                const current = attendanceMap[s.id] ?? 'present';
                const hwDone = homeworkMap[s.id] ?? true;
                return (
                  <div
                    key={s.id}
                    className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {onSelectStudent ? (
                          <button
                            type="button"
                            onClick={() => onSelectStudent(s)}
                            className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] hover:text-[#0071E3] text-right"
                          >
                            {s.fullName}
                          </button>
                        ) : (
                          <span className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {s.fullName}
                          </span>
                        )}
                        {s.sessionsRemaining <= 1 && (
                          <span className="text-[11px] font-medium text-[#DC2626] dark:text-[#F87171]">
                            {s.sessionsRemaining === 0
                              ? '· انتهى الرصيد'
                              : '· متبقية حصة واحدة'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                        {s.groupName} · حضور {s.attendanceRate}% · واجب {s.homeworkRate}% · تقدم {computeStudentProgressScore(s)}% · {formatArabicSessionsCount(s.sessionsRemaining)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setHomeworkMap((prev) => ({
                            ...prev,
                            [s.id]: !hwDone,
                          }))
                        }
                        className={`min-h-[42px] sm:min-h-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                          hwDone
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-[#059669] dark:text-[#34D399]'
                            : 'border-amber-500/30 bg-amber-500/10 text-[#D97706] dark:text-[#FBBF24]'
                        }`}
                      >
                        {hwDone ? 'أدى الواجب' : 'ناقص واجب'}
                      </button>

                      <div
                        role="group"
                        aria-label={`حالة حضور ${s.fullName}`}
                        className="flex flex-1 sm:flex-none items-center gap-1 p-1 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26]"
                      >
                        {(
                          [
                            { id: 'present', label: 'حاضر' },
                            { id: 'late', label: 'متأخر' },
                            { id: 'absent', label: 'غائب' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              setAttendanceMap((prev) => ({
                                ...prev,
                                [s.id]: opt.id,
                              }))
                            }
                            className={`flex-1 sm:flex-none min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              current === opt.id
                                ? opt.id === 'present'
                                  ? 'bg-[#059669] text-white'
                                  : opt.id === 'late'
                                  ? 'bg-[#D97706] text-white'
                                  : 'bg-[#DC2626] text-white'
                                : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Quick Grade Entry */}
        <section
          aria-label="رصد درجة امتحان"
          className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
            <Award className="w-5 h-5 text-[#0071E3]" />
            <h2 className="text-base font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
              رصد درجة امتحان سريع
            </h2>
          </div>

          <form onSubmit={handleAddGradeSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="gr-student"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                الطالب
              </label>
              <select
                id="gr-student"
                value={gradeStudentId}
                onChange={(e) => setGradeStudentId(e.target.value)}
                disabled={students.length === 0}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] disabled:opacity-60"
              >
                {students.length === 0 ? (
                  <option value="">لا يوجد طلاب مسجلون بعد</option>
                ) : (
                  students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="gr-title"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                عنوان الامتحان / الكويز
              </label>
              <input
                id="gr-title"
                type="text"
                value={gradeTitle}
                onChange={(e) => setGradeTitle(e.target.value)}
                placeholder="مثال: كويز شامل على الفصل الثاني"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="gr-score"
                  className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
                >
                  الدرجة
                </label>
                <input
                  id="gr-score"
                  type="number"
                  value={gradeScore}
                  onChange={(e) => setGradeScore(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>
              <div>
                <label
                  htmlFor="gr-max"
                  className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
                >
                  من (العظمى)
                </label>
                <input
                  id="gr-max"
                  type="number"
                  value={gradeMax}
                  onChange={(e) => setGradeMax(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-base sm:text-sm tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={students.length === 0}
              className="w-full min-h-[44px] py-2.5 rounded-xl text-sm font-medium bg-[#1D1D1F] dark:bg-[#0071E3] text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-45"
            >
              اعتماد الدرجة
            </button>

            {gradeMsg && (
              <p className="text-xs font-medium text-[#0071E3] dark:text-[#2997FF]">
                {gradeMsg}
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
};
