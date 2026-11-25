import React from 'react';
import {
  CalendarDays,
  ArrowUpLeft,
  Users,
} from 'lucide-react';
import type {
  CenterSettings,
  LessonSession,
  PaymentRecord,
  Student,
} from '../types/tutoring';
import {
  calculateDashboardKPIs,
  classifyStudentTier,
  computeStudentProgressScore,
  CURRENCY_META,
  DAY_LABELS_AR,
  formatArabicDate,
  formatArabicStudentsCount,
  formatCurrency,
  formatSessionTimeRangeArabic,
  formatSubscriptionRemainingText,
  getEffectiveSubscriptionStatus,
  LESSON_MODE_LABELS_AR,
  sortSessionsFromReferenceDate,
  sortUrgentRenewalStudents,
  STATUS_LABELS_AR,
} from '../utils/tutoringLogic';
import type { NavTabId } from './Sidebar';

interface OverviewViewProps {
  students: Student[];
  payments: PaymentRecord[];
  sessions: LessonSession[];
  settings: CenterSettings;
  onOpenNewStudent: () => void;
  onSelectStudent: (student: Student) => void;
  onOpenRenewal: (student: Student) => void;
  onNavigate: (tab: NavTabId) => void;
  onTakeSessionAttendance: (session: LessonSession) => void;
  onOpenTutorial: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  students,
  payments,
  sessions,
  settings,
  onOpenNewStudent,
  onSelectStudent,
  onOpenRenewal,
  onNavigate,
  onTakeSessionAttendance,
  onOpenTutorial,
}) => {
  const kpis = React.useMemo(
    () =>
      calculateDashboardKPIs(
        students,
        payments,
        sessions,
        settings.referenceDate
      ),
    [students, payments, sessions, settings.referenceDate]
  );

  const tierDistribution = React.useMemo(() => {
    let excellent = 0;
    let onTrack = 0;
    let needsAttention = 0;
    for (const s of students) {
      const score = computeStudentProgressScore(s);
      const tier = classifyStudentTier(score, s.attendanceRate);
      if (tier === 'excellent') excellent++;
      else if (tier === 'needs_attention') needsAttention++;
      else onTrack++;
    }
    const total = Math.max(1, students.length);
    return {
      excellent,
      onTrack,
      needsAttention,
      excellentPct: Math.round((excellent / total) * 100),
      onTrackPct: Math.round((onTrack / total) * 100),
      needsAttentionPct: Math.round((needsAttention / total) * 100),
    };
  }, [students]);

  const urgentRenewals = React.useMemo(() => {
    const due = students.filter((s) => {
      const status = getEffectiveSubscriptionStatus(s, settings.referenceDate);
      return status === 'expiring_soon' || status === 'expired';
    });
    return sortUrgentRenewalStudents(due, settings.referenceDate).slice(0, 5);
  }, [students, settings.referenceDate]);

  const upcomingSessions = React.useMemo(
    () => sortSessionsFromReferenceDate(sessions, settings.referenceDate).slice(0, 4),
    [sessions, settings.referenceDate]
  );

  const priorityStudents = React.useMemo(() => {
    return students
      .map((s) => ({
        student: s,
        score: computeStudentProgressScore(s),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }, [students]);

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Executive Welcome Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#98989D] mb-1">
            {formatArabicDate(settings.referenceDate)} · {settings.centerName}
          </p>
          <h1 className="text-xl sm:text-3xl font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            نظرة عامة على الأداء والاشتراكات
          </h1>
        </div>
      </div>

      {/* 4-Column Tabular KPI Strip (2x2 Bento on Phone) */}
      <section
        aria-label="المؤشرات الرئيسية"
        className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
      >
        <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-3.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-[#6E6E73] dark:text-[#98989D] mb-1.5 sm:mb-2 truncate">
            إجمالي الطلاب المسجلين
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <span
              data-testid="kpi-total-students"
              className="text-2xl sm:text-3xl font-display font-bold tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
            >
              {kpis.totalStudents}
            </span>
            <span className="text-[11px] sm:text-xs text-[#059669] dark:text-[#34D399] font-medium">
              {kpis.activeSubscriptions} اشتراك نشط
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-3.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-[#6E6E73] dark:text-[#98989D] mb-1.5 sm:mb-2 truncate">
            إيرادات الشهر الحالي
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <span
              data-testid="kpi-monthly-revenue"
              className="text-2xl sm:text-3xl font-display font-bold tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
            >
              {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(kpis.monthlyRevenue)}{' '}
              <span className="text-xs sm:text-sm font-medium text-[#6E6E73] dark:text-[#98989D]">
                {CURRENCY_META[settings.currency].symbol}
              </span>
            </span>
            <span className="text-[11px] sm:text-xs text-[#6E6E73] dark:text-[#98989D] shrink-0">
              {(() => {
                const [y, m] = settings.referenceDate.split('-').map(Number);
                return new Intl.DateTimeFormat('ar-EG', {
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
                }).format(new Date(Date.UTC(y || 2026, (m || 1) - 1, 1)));
              })()}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-3.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-[#6E6E73] dark:text-[#98989D] mb-1.5 sm:mb-2 truncate">
            اشتراكات تحتاج تجديداً
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <span
              data-testid="kpi-renewals-due"
              className="text-2xl sm:text-3xl font-display font-bold tabular-nums text-[#D97706] dark:text-[#FBBF24]"
            >
              {kpis.renewalsDueCount + kpis.expiredCount}
            </span>
            <span className="text-[11px] sm:text-xs text-[#6E6E73] dark:text-[#98989D]">
              {kpis.expiredCount} منتهي · {kpis.renewalsDueCount} قريب
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-3.5 sm:p-5">
          <div className="text-[11px] sm:text-xs font-medium text-[#6E6E73] dark:text-[#98989D] mb-1.5 sm:mb-2 truncate">
            متوسط التقدم والحضور
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <span className="text-2xl sm:text-3xl font-display font-bold tabular-nums text-[#0071E3] dark:text-[#2997FF]">
              {kpis.averageProgressScore}%
            </span>
            <span className="text-[11px] sm:text-xs text-[#6E6E73] dark:text-[#98989D] tabular-nums">
              الحضور {kpis.averageAttendanceRate}%
            </span>
          </div>
        </div>
      </section>

      {/* Performance Tier Distribution Strip */}
      <section
        aria-label="توزيع مستويات الطلاب"
        className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] px-6 py-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-display font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
            توزيع المستوى الأكاديمي للمجموعات
          </span>
          <div className="flex flex-wrap items-center gap-4 tabular-nums">
            <span className="text-[#059669] dark:text-[#34D399] font-medium">
              متفوق: {tierDistribution.excellent} ({tierDistribution.excellentPct}%)
            </span>
            <span className="text-[#0071E3] dark:text-[#2997FF] font-medium">
              مسار مستقر: {tierDistribution.onTrack} ({tierDistribution.onTrackPct}%)
            </span>
            <span className="text-[#DC2626] dark:text-[#F87171] font-medium">
              يحتاج متابعة: {tierDistribution.needsAttention} ({tierDistribution.needsAttentionPct}%)
            </span>
          </div>
        </div>
        <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-black/[0.05] dark:bg-white/[0.06]">
          <div
            style={{ width: `${tierDistribution.excellentPct}%` }}
            className="bg-[#059669] transition-all duration-300"
          />
          <div
            style={{ width: `${tierDistribution.onTrackPct}%` }}
            className="bg-[#0071E3] transition-all duration-300"
          />
          <div
            style={{ width: `${tierDistribution.needsAttentionPct}%` }}
            className="bg-[#DC2626] transition-all duration-300"
          />
        </div>
      </section>

      {/* Student Follow-up & Onboarding Strip */}
      <section
        aria-label="متابعة مستوى الطلاب"
        className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-4 sm:p-6"
      >
        {students.length === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] p-5">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                النظام جاهز للعمل من الصفر
              </div>
              <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                سجّل أول طالب أو أنشئ مجموعاتك من إعدادات المركز لبدء متابعة الحضور والدرجات والاشتراكات.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onOpenTutorial}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-xl text-xs font-medium bg-white dark:bg-[#14161C] border border-black/[0.08] dark:border-white/[0.1] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-[0.98] transition-all whitespace-nowrap"
              >
                كيف أبدأ؟ (دليل سريع)
              </button>
              <button
                type="button"
                onClick={onOpenNewStudent}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-xl text-xs font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] active:scale-[0.98] transition-all whitespace-nowrap"
              >
                تسجيل أول طالب
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    متابعة مستوى الطلاب
                  </h2>
                  <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                    يستعرض النظام {formatArabicStudentsCount(students.length)} بمتوسط حضور {kpis.averageAttendanceRate}% — مرتبون حسب أولوية المتابعة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('students')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0071E3] dark:text-[#2997FF] hover:underline whitespace-nowrap"
              >
                <span>قائمة الطلاب</span>
                <ArrowUpLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {priorityStudents.map(({ student, score }) => {
                const tier = classifyStudentTier(score, student.attendanceRate);
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => onSelectStudent(student)}
                    className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors text-right"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                        {student.fullName}
                      </div>
                      <div className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
                        {student.subject} · حضور {student.attendanceRate}%
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums shrink-0 mr-3 ${
                        tier === 'needs_attention'
                          ? 'text-[#DC2626] dark:text-[#F87171]'
                          : 'text-[#059669] dark:text-[#34D399]'
                      }`}
                    >
                      {score}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Two-Column Split: Urgent Renewals & Weekly Schedule Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Urgent Subscription Renewals */}
        <section
          aria-label="الاشتراكات المستحقة للتجديد"
          className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-6 flex flex-col"
        >
          <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div>
              <h2 className="text-base font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                الاشتراكات المستحقة للتجديد
              </h2>
              <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                الطلاب المنتهية باقاتهم أو القريبة من الانتهاء خلال 5 أيام
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('subscriptions')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#0071E3] dark:text-[#2997FF] hover:underline whitespace-nowrap"
            >
              <span>عرض الكل</span>
              <ArrowUpLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06] flex-1 mt-2">
            {urgentRenewals.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#6E6E73] dark:text-[#98989D]">
                {students.length === 0
                  ? 'لا توجد اشتراكات مسجلة بعد.'
                  : 'جميع اشتراكات الطلاب نشطة ومحدثة بالكامل.'}
              </div>
            ) : (
              urgentRenewals.map((student) => {
                const status = getEffectiveSubscriptionStatus(
                  student,
                  settings.referenceDate
                );
                const remainingLabel = formatSubscriptionRemainingText(
                  student,
                  settings.referenceDate
                );
                return (
                  <div
                    key={student.id}
                    className="py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectStudent(student)}
                        className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] hover:text-[#0071E3] truncate block text-right"
                      >
                        {student.fullName}
                      </button>
                      <div className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5 flex items-center gap-1.5">
                        <span
                          className={
                            status === 'expired'
                              ? 'text-[#DC2626] dark:text-[#F87171] font-medium'
                              : 'text-[#D97706] dark:text-[#FBBF24] font-medium'
                          }
                        >
                          {STATUS_LABELS_AR[status]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{remainingLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {formatCurrency(student.monthlyFee, settings.currency)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenRenewal(student)}
                      className="min-h-[40px] sm:min-h-0 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] transition-colors whitespace-nowrap shrink-0"
                    >
                      تجديد الآن
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Upcoming Sessions Agenda */}
        <section
          aria-label="الحصص القادمة في الجدول"
          className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-6 flex flex-col"
        >
          <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div>
              <h2 className="text-base font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                جدول الحصص القادم
              </h2>
              <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                أقرب المواعيد المجدولة للسناتر والدروس البرايفت
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('schedule')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#0071E3] dark:text-[#2997FF] hover:underline whitespace-nowrap"
            >
              <span>إدارة الجدول</span>
              <ArrowUpLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06] flex-1 mt-2">
            {upcomingSessions.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-sm text-[#6E6E73] dark:text-[#98989D]">
                  لا توجد حصص مجدولة في الجدول الأسبوعي بعد.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('schedule')}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] hover:bg-[#0071E3]/15"
                >
                  إضافة حصة أو ترتيب الجدول
                </button>
              </div>
            ) : (
              upcomingSessions.map((ses) => (
                <div
                  key={ses.id}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] flex items-center justify-center shrink-0 text-[#0071E3]">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                        {ses.title}
                      </div>
                      <div className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5 truncate">
                        {DAY_LABELS_AR[ses.day]} ·{' '}
                        <span className="tabular-nums">
                          {formatSessionTimeRangeArabic(ses.startTime, ses.durationMinutes)}
                        </span>{' '}
                        · {ses.location}
                      </div>
                    </div>
                  </div>
                  <div className="text-left shrink-0 flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => onTakeSessionAttendance(ses)}
                      className="text-xs font-medium text-[#0071E3] dark:text-[#2997FF] hover:underline whitespace-nowrap"
                    >
                      تسجيل الحضور
                    </button>
                    <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                      {LESSON_MODE_LABELS_AR[ses.lessonMode]} · {ses.durationMinutes} د
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
