import React from 'react';
import { Download, Search, UserPlus } from 'lucide-react';
import type {
  CenterSettings,
  PerformanceTier,
  Student,
  TutoringGroup,
} from '../types/tutoring';
import {
  classifyStudentTier,
  computeStudentProgressScore,
  formatArabicDate,
  formatCurrency,
  formatTelHref,
  getDaysRemaining,
  getEffectiveSubscriptionStatus,
  LESSON_MODE_LABELS_AR,
  STATUS_LABELS_AR,
  TIER_LABELS_AR,
} from '../utils/tutoringLogic';
import { buildStudentsCsv, downloadTextFile } from '../utils/dataExport';

interface StudentsViewProps {
  students: Student[];
  groups: TutoringGroup[];
  settings: CenterSettings;
  onOpenNewStudent: () => void;
  onSelectStudent: (student: Student) => void;
  onOpenRenewal: (student: Student) => void;
}

type TierFilter = 'all' | PerformanceTier;
type StudentSortBy = 'recent' | 'progress_asc' | 'expiring_soon' | 'attendance_asc' | 'name_asc';

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  groups,
  settings,
  onOpenNewStudent,
  onSelectStudent,
  onOpenRenewal,
}) => {
  const [search, setSearch] = React.useState('');
  const [tierFilter, setTierFilter] = React.useState<TierFilter>('all');
  const [gradeFilter, setGradeFilter] = React.useState<string>('all');
  const [groupFilter, setGroupFilter] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<StudentSortBy>('recent');

  const gradeOptions = React.useMemo(() => {
    return Array.from(new Set(students.map((s) => s.gradeLevel)));
  }, [students]);

  const filteredStudents = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = students.filter((s) => {
      const score = computeStudentProgressScore(s);
      const tier = classifyStudentTier(score, s.attendanceRate);

      if (tierFilter !== 'all' && tier !== tierFilter) return false;
      if (gradeFilter !== 'all' && s.gradeLevel !== gradeFilter) return false;
      if (groupFilter !== 'all' && s.groupId !== groupFilter) return false;
      if (q) {
        const hay = `${s.fullName} ${s.studentPhone} ${s.guardianPhone} ${s.subject} ${s.groupName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'progress_asc') {
      return [...list].sort(
        (a, b) => computeStudentProgressScore(a) - computeStudentProgressScore(b)
      );
    }
    if (sortBy === 'expiring_soon') {
      return [...list].sort(
        (a, b) =>
          getDaysRemaining(a.expiresAt, settings.referenceDate) -
          getDaysRemaining(b.expiresAt, settings.referenceDate)
      );
    }
    if (sortBy === 'attendance_asc') {
      return [...list].sort((a, b) => a.attendanceRate - b.attendanceRate);
    }
    if (sortBy === 'name_asc') {
      return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
    }
    return list;
  }, [students, search, tierFilter, gradeFilter, groupFilter, sortBy, settings.referenceDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
            سجل الطلاب والتسجيل
          </h1>
          <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-1">
            إدارة ملفات طلاب المجموعات والدروس الخصوصية ومتابعة الأداء الأكاديمي
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {students.length > 0 && (
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  `ofok-students-${settings.referenceDate}.csv`,
                  buildStudentsCsv(filteredStudents, settings.currency),
                  'text/csv;charset=utf-8;'
                )
              }
              className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-[#14161C] border border-black/[0.08] dark:border-white/[0.1] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير CSV</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenNewStudent}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>تسجيل طالب جديد</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="w-4 h-4 text-[#6E6E73] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الطالب، الموبايل، أو المادة..."
            aria-label="بحث في قائمة الطلاب"
            className="w-full pr-10 pl-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
          <div
            role="tablist"
            aria-label="تصفية حسب مستوى الأداء"
            className="flex items-center gap-1 p-1 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] overflow-x-auto no-scrollbar max-w-full"
          >
            {(
              [
                { id: 'all', label: 'الكل' },
                { id: 'excellent', label: 'متفوق' },
                { id: 'on_track', label: 'مستقر' },
                { id: 'needs_attention', label: 'يحتاج متابعة' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tierFilter === tab.id}
                onClick={() => setTierFilter(tab.id)}
                className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  tierFilter === tab.id
                    ? 'bg-white dark:bg-[#2C2F3A] text-[#1D1D1F] dark:text-white shadow-xs'
                    : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              aria-label="تصفية حسب المرحلة الدراسية"
              className="min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
            >
              <option value="all">كل المراحل</option>
              {gradeOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              aria-label="تصفية حسب المجموعة"
              className="min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
            >
              <option value="all">كل المجموعات</option>
              {groups.map((grp) => (
                <option key={grp.id} value={grp.id}>
                  {grp.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as StudentSortBy)}
              aria-label="ترتيب قائمة الطلاب"
              className="min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
            >
              <option value="recent">الأحدث تسجيلاً</option>
              <option value="expiring_soon">الأقرب لانتهاء الاشتراك</option>
              <option value="progress_asc">الأقل تقدماً (أولوية المتابعة)</option>
              <option value="attendance_asc">الأقل حضوراً</option>
              <option value="name_asc">الاسم (أ – ي)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Data Grid */}
      <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
        {students.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              لا يوجد طلاب مسجلون حتى الآن
            </div>
            <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
              ابدأ بتسجيل أول طالب لتفعيل متابعة الحضور والدرجات وإدارة الاشتراكات.
            </p>
            <button
              type="button"
              onClick={onOpenNewStudent}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#0071E3] text-white hover:bg-[#0077ED]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>تسجيل أول طالب</span>
            </button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              لا يوجد طلاب يطابقون معايير البحث الحالية
            </div>
            <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
              جرّب تعديل كلمات البحث أو إعادة تعيين فلاتر التصفية.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setTierFilter('all');
                setGradeFilter('all');
                setGroupFilter('all');
                setSortBy('recent');
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
            >
              مسح الفلاتر
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card List (Zero Horizontal Scroll) */}
            <div className="md:hidden divide-y divide-black/[0.05] dark:divide-white/[0.06]">
              {filteredStudents.map((s) => {
                const score = computeStudentProgressScore(s);
                const tier = classifyStudentTier(score, s.attendanceRate);
                const subStatus = getEffectiveSubscriptionStatus(
                  s,
                  settings.referenceDate
                );
                const telHref = formatTelHref(s.guardianPhone || s.studentPhone);

                return (
                  <div key={s.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onSelectStudent(s)}
                        className="text-right min-w-0 flex-1"
                      >
                        <div className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                          {s.fullName}
                        </div>
                        <div className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5 truncate">
                          {s.gradeLevel} · {s.subject} · {LESSON_MODE_LABELS_AR[s.lessonMode]}
                        </div>
                      </button>

                      <div className="text-left shrink-0">
                        <div className="text-sm font-bold tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {score}%
                        </div>
                        <div
                          className={`text-[11px] font-medium ${
                            tier === 'excellent'
                              ? 'text-[#059669] dark:text-[#34D399]'
                              : tier === 'needs_attention'
                              ? 'text-[#DC2626] dark:text-[#F87171]'
                              : 'text-[#6E6E73] dark:text-[#98989D]'
                          }`}
                        >
                          {TIER_LABELS_AR[tier]}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                      <span>
                        <span
                          className={`font-semibold ${
                            subStatus === 'active'
                              ? 'text-[#059669] dark:text-[#34D399]'
                              : subStatus === 'expiring_soon'
                              ? 'text-[#D97706] dark:text-[#FBBF24]'
                              : 'text-[#DC2626] dark:text-[#F87171]'
                          }`}
                        >
                          {STATUS_LABELS_AR[subStatus]}
                        </span>{' '}
                        · {formatArabicDate(s.expiresAt)}
                      </span>
                      <span>
                        {formatCurrency(s.monthlyFee, settings.currency)} · حضور {s.attendanceRate}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onSelectStudent(s)}
                        className="min-h-[44px] rounded-xl text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] active:scale-[0.98]"
                      >
                        فتح الملف
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenRenewal(s)}
                        className="min-h-[44px] rounded-xl text-xs font-medium bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] active:scale-[0.98]"
                      >
                        تجديد
                      </button>
                      {telHref ? (
                        <a
                          href={telHref}
                          className="min-h-[44px] rounded-xl text-xs font-medium bg-emerald-500/10 text-[#059669] dark:text-[#34D399] flex items-center justify-center active:scale-[0.98]"
                        >
                          اتصال
                        </a>
                      ) : (
                        <span className="min-h-[44px] rounded-xl text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#86868B] flex items-center justify-center">
                          بدون رقم
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-[#6E6E73] dark:text-[#98989D]">
                    <th className="py-3.5 px-5 text-right">الطالب والمسار</th>
                    <th className="py-3.5 px-4 text-right">الموبايل</th>
                    <th className="py-3.5 px-4 text-right">مؤشر التقدم</th>
                    <th className="py-3.5 px-4 text-right">الحضور</th>
                    <th className="py-3.5 px-4 text-right">الاشتراك والانتهاء</th>
                    <th className="py-3.5 px-5 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06] text-sm">
                  {filteredStudents.map((s) => {
                    const score = computeStudentProgressScore(s);
                    const tier = classifyStudentTier(score, s.attendanceRate);
                    const subStatus = getEffectiveSubscriptionStatus(
                      s,
                      settings.referenceDate
                    );

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3.5 px-5">
                          <button
                            type="button"
                            onClick={() => onSelectStudent(s)}
                            className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] hover:text-[#0071E3] text-right block"
                          >
                            {s.fullName}
                          </button>
                          <div className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
                            {s.gradeLevel} · {s.subject} ·{' '}
                            {LESSON_MODE_LABELS_AR[s.lessonMode]}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 tabular-nums text-xs text-[#424245] dark:text-[#C7C7CC]">
                          {(() => {
                            const href = formatTelHref(s.studentPhone);
                            return href ? (
                              <a href={href} className="hover:text-[#0071E3] hover:underline">
                                {s.studentPhone}
                              </a>
                            ) : (
                              <span>{s.studentPhone}</span>
                            );
                          })()}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="tabular-nums font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                              {score}%
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                tier === 'excellent'
                                  ? 'text-[#059669] dark:text-[#34D399]'
                                  : tier === 'needs_attention'
                                  ? 'text-[#DC2626] dark:text-[#F87171]'
                                  : 'text-[#6E6E73] dark:text-[#98989D]'
                              }`}
                            >
                              {TIER_LABELS_AR[tier]}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 tabular-nums text-xs text-[#1D1D1F] dark:text-[#E5E5EA]">
                          {s.attendanceRate}%
                        </td>

                        <td className="py-3.5 px-4">
                          <div
                            className={`text-xs font-semibold ${
                              subStatus === 'active'
                                ? 'text-[#059669] dark:text-[#34D399]'
                                : subStatus === 'expiring_soon'
                                ? 'text-[#D97706] dark:text-[#FBBF24]'
                                : 'text-[#DC2626] dark:text-[#F87171]'
                            }`}
                          >
                            {STATUS_LABELS_AR[subStatus]} ·{' '}
                            <span className="tabular-nums font-normal text-[#6E6E73] dark:text-[#98989D]">
                              {formatArabicDate(s.expiresAt)}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D] tabular-nums mt-0.5">
                            {formatCurrency(s.monthlyFee, settings.currency)} ·{' '}
                            <span
                              className={
                                s.sessionsRemaining <= 1
                                  ? 'text-[#DC2626] dark:text-[#F87171] font-medium'
                                  : ''
                              }
                            >
                              {s.sessionsRemaining} حصص متبقية
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-left">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectStudent(s)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] whitespace-nowrap"
                            >
                              الملف
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenRenewal(s)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#0071E3] dark:text-[#2997FF] hover:bg-[#0071E3]/10 whitespace-nowrap"
                            >
                              تجديد
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
