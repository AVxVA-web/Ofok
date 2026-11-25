import React from 'react';
import {
  X,
  Phone,
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import type {
  CenterSettings,
  PaymentRecord,
  Student,
  TutoringGroup,
} from '../types/tutoring';
import {
  classifyStudentTier,
  computeAverageExamScore,
  computeStudentProgressScore,
  formatArabicDate,
  formatCurrency,
  formatEgyptianWhatsAppUrl,
  formatTelHref,
  getEffectiveSubscriptionStatus,
  isValidPhoneNumber,
  LESSON_MODE_LABELS_AR,
  PAYMENT_METHOD_LABELS_AR,
  PLAN_LABELS_AR,
  STATUS_LABELS_AR,
  TIER_LABELS_AR,
} from '../utils/tutoringLogic';

interface StudentDetailDrawerProps {
  student: Student | null;
  groups: TutoringGroup[];
  payments: PaymentRecord[];
  settings: CenterSettings;
  onClose: () => void;
  onOpenRenewal: (student: Student) => void;
  onAddGrade: (
    studentId: string,
    grade: { title: string; score: number; maxScore: number }
  ) => void;
  onDeleteGrade: (studentId: string, gradeId: string) => void;
  onUpdateStudent: (
    studentId: string,
    patch: {
      fullName: string;
      studentPhone: string;
      guardianName: string;
      guardianPhone: string;
      gradeLevel: string;
      subject: string;
      groupId: string;
      monthlyFee: number;
      sessionsRemaining: number;
      notes?: string;
    }
  ) => void;
  onDeleteStudent: (studentId: string) => void;
}

export const StudentDetailDrawer: React.FC<StudentDetailDrawerProps> = ({
  student,
  groups,
  payments,
  settings,
  onClose,
  onOpenRenewal,
  onAddGrade,
  onDeleteGrade,
  onUpdateStudent,
  onDeleteStudent,
}) => {
  const [gradeTitle, setGradeTitle] = React.useState('');
  const [gradeScore, setGradeScore] = React.useState('45');
  const [gradeMax, setGradeMax] = React.useState('50');
  const [gradeError, setGradeError] = React.useState('');

  const [copied, setCopied] = React.useState(false);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editError, setEditError] = React.useState('');
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    fullName: '',
    studentPhone: '',
    guardianName: '',
    guardianPhone: '',
    gradeLevel: '',
    subject: '',
    groupId: '',
    monthlyFee: 450,
    sessionsRemaining: 8,
    notes: '',
  });

  React.useEffect(() => {
    setGradeTitle('');
    setGradeError('');
    setCopied(false);
    setIsEditing(false);
    setEditError('');
    setConfirmDelete(false);
    if (student) {
      setEditForm({
        fullName: student.fullName,
        studentPhone: student.studentPhone,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        gradeLevel: student.gradeLevel,
        subject: student.subject,
        groupId: student.groupId,
        monthlyFee: student.monthlyFee,
        sessionsRemaining: student.sessionsRemaining,
        notes: student.notes || '',
      });
    }
  }, [student]);

  React.useEffect(() => {
    if (!student) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [student, onClose]);

  if (!student) return null;

  const progressScore = computeStudentProgressScore(student);
  const tier = classifyStudentTier(progressScore, student.attendanceRate);
  const subStatus = getEffectiveSubscriptionStatus(
    student,
    settings.referenceDate
  );
  const guardianTel = formatTelHref(student.guardianPhone);
  const studentTel = formatTelHref(student.studentPhone);

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = Number(gradeScore);
    const m = Number(gradeMax);
    if (!gradeTitle.trim()) {
      setGradeError('يرجى كتابة عنوان الامتحان أو التقييم.');
      return;
    }
    if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0 || s < 0 || s > m) {
      setGradeError('الدرجة غير صالحة مقارنة بالدرجة العظمى.');
      return;
    }
    onAddGrade(student.id, { title: gradeTitle.trim(), score: s, maxScore: m });
    setGradeTitle('');
    setGradeError('');
  };

  const studentPayments = payments.filter((p) => p.studentId === student.id);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm.fullName.trim().length < 3) {
      setEditError('يرجى إدخال اسم الطالب الثلاثي (3 أحرف على الأقل).');
      return;
    }
    if (!isValidPhoneNumber(editForm.studentPhone)) {
      setEditError('يرجى إدخال رقم موبايل صحيح للطالب (10–15 رقماً).');
      return;
    }
    if (editForm.guardianName.trim().length < 2) {
      setEditError('يرجى إدخال اسم ولي الأمر.');
      return;
    }
    if (!isValidPhoneNumber(editForm.guardianPhone)) {
      setEditError('يرجى إدخال رقم موبايل صحيح لولي الأمر (10–15 رقماً).');
      return;
    }
    if (!editForm.gradeLevel.trim() || !editForm.subject.trim()) {
      setEditError('يرجى تحديد المرحلة الدراسية والمادة.');
      return;
    }
    if (!Number.isFinite(editForm.monthlyFee) || editForm.monthlyFee <= 0) {
      setEditError('يرجى إدخال قيمة اشتراك صحيحة أكبر من صفر.');
      return;
    }
    if (!Number.isFinite(editForm.sessionsRemaining) || editForm.sessionsRemaining < 0) {
      setEditError('يرجى إدخال عدد حصص متبقية صحيح (0 أو أكثر).');
      return;
    }
    setEditError('');
    onUpdateStudent(student.id, editForm);
    setIsEditing(false);
  };

  const examAvgText = student.grades.length
    ? `${computeAverageExamScore(student)}%`
    : 'لم تُسجّل امتحانات بعد';

  const summaryMessage = [
    `السلام عليكم أستاذ/ة ${student.guardianName}،`,
    `تقرير متابعة الطالب ${student.fullName} في مادة ${student.subject}:`,
    `• مؤشر التقدم العام: ${progressScore}% (${TIER_LABELS_AR[tier]})`,
    `• نسبة الحضور: ${student.attendanceRate}% | الواجبات: ${student.homeworkRate}%`,
    `• متوسط الامتحانات: ${examAvgText}`,
    `• الحصص المتبقية بالاشتراك: ${student.sessionsRemaining} (${STATUS_LABELS_AR[subStatus]})`,
    `تحياتنا، ${settings.teacherName} — ${settings.centerName}`,
  ].join('\n');

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(summaryMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard might be restricted in embedded iframe
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-student-name"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-white dark:bg-[#14161C] h-full overflow-y-auto border-r border-black/[0.08] dark:border-white/[0.1] shadow-2xl flex flex-col pb-safe">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-start justify-between gap-3 sticky top-0 bg-white/95 dark:bg-[#14161C]/95 backdrop-blur-md z-10">
          <div className="min-w-0">
            <h2
              id="drawer-student-name"
              className="text-lg sm:text-xl font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate"
            >
              {student.fullName}
            </h2>
            <div className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-1">
              {student.gradeLevel} · {student.subject} ·{' '}
              {LESSON_MODE_LABELS_AR[student.lessonMode]}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditing((v) => !v)}
              aria-label="تعديل بيانات الطالب"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#6E6E73] hover:text-[#0071E3] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق ملف الطالب"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#6E6E73] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 flex-1">
          {isEditing && (
            <form
              onSubmit={handleSaveEdit}
              className="rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] p-4 space-y-3"
            >
              <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                تعديل بيانات الطالب
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => {
                    setEditForm((p) => ({ ...p, fullName: e.target.value }));
                    setEditError('');
                  }}
                  placeholder="اسم الطالب"
                  aria-label="اسم الطالب"
                  className="min-h-[44px] sm:min-h-0 px-3 py-2 rounded-lg text-base sm:text-xs bg-white dark:bg-[#14161C]"
                />
                <input
                  type="tel"
                  value={editForm.studentPhone}
                  onChange={(e) => {
                    setEditForm((p) => ({ ...p, studentPhone: e.target.value }));
                    setEditError('');
                  }}
                  placeholder="موبايل الطالب"
                  aria-label="موبايل الطالب"
                  className="min-h-[44px] sm:min-h-0 px-3 py-2 rounded-lg text-base sm:text-xs tabular-nums bg-white dark:bg-[#14161C]"
                />
                <input
                  type="text"
                  value={editForm.guardianName}
                  onChange={(e) => {
                    setEditForm((p) => ({ ...p, guardianName: e.target.value }));
                    setEditError('');
                  }}
                  placeholder="اسم ولي الأمر"
                  aria-label="اسم ولي الأمر"
                  className="min-h-[44px] sm:min-h-0 px-3 py-2 rounded-lg text-base sm:text-xs bg-white dark:bg-[#14161C]"
                />
                <input
                  type="tel"
                  value={editForm.guardianPhone}
                  onChange={(e) => {
                    setEditForm((p) => ({ ...p, guardianPhone: e.target.value }));
                    setEditError('');
                  }}
                  placeholder="موبايل ولي الأمر"
                  aria-label="موبايل ولي الأمر"
                  className="min-h-[44px] sm:min-h-0 px-3 py-2 rounded-lg text-base sm:text-xs tabular-nums bg-white dark:bg-[#14161C]"
                />
                <input
                  type="text"
                  value={editForm.gradeLevel}
                  onChange={(e) => {
                    setEditForm((p) => ({ ...p, gradeLevel: e.target.value }));
                    setEditError('');
                  }}
                  placeholder="المرحلة الدراسية"
                  aria-label="المرحلة الدراسية"
                  className="min-h-[44px] sm:min-h-0 px-3 py-2 rounded-lg text-base sm:text-xs bg-white dark:bg-[#14161C]"
                />
                <input
                  type="text"
                  value={editForm.subject}
                  onChange={(e) => {
                    setEditForm((p) => ({ ...p, subject: e.target.value }));
                    setEditError('');
                  }}
                  placeholder="المادة الدراسية"
                  aria-label="المادة الدراسية"
                  className="min-h-[44px] sm:min-h-0 px-3 py-2 rounded-lg text-base sm:text-xs bg-white dark:bg-[#14161C]"
                />
                <select
                  value={editForm.groupId}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, groupId: e.target.value }))
                  }
                  aria-label="المجموعة"
                  className="min-h-[44px] sm:min-h-0 px-3 py-2 rounded-lg text-base sm:text-xs bg-white dark:bg-[#14161C]"
                >
                  <option value="">تسجيل مباشر (بدون مجموعة)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={editForm.monthlyFee}
                    onChange={(e) => {
                      setEditForm((p) => ({
                        ...p,
                        monthlyFee: Number(e.target.value),
                      }));
                      setEditError('');
                    }}
                    placeholder="الرسوم"
                    aria-label="الاشتراك الشهري"
                    className="min-h-[44px] sm:min-h-0 px-3 py-2 rounded-lg text-base sm:text-xs tabular-nums bg-white dark:bg-[#14161C]"
                  />
                  <input
                    type="number"
                    min={0}
                    value={editForm.sessionsRemaining}
                    onChange={(e) => {
                      setEditForm((p) => ({
                        ...p,
                        sessionsRemaining: Number(e.target.value),
                      }));
                      setEditError('');
                    }}
                    placeholder="الحصص"
                    aria-label="الحصص المتبقية"
                    className="min-h-[44px] sm:min-h-0 px-3 py-2 rounded-lg text-base sm:text-xs tabular-nums bg-white dark:bg-[#14161C]"
                  />
                </div>
              </div>
              <input
                type="text"
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="ملاحظات المعلم..."
                aria-label="ملاحظات المعلم"
                className="min-h-[44px] sm:min-h-0 w-full px-3 py-2 rounded-lg text-base sm:text-xs bg-white dark:bg-[#14161C]"
              />
              {editError && (
                <p className="text-xs text-[#DC2626] dark:text-[#F87171]">
                  {editError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditError('');
                  }}
                  className="min-h-[44px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs text-[#6E6E73]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] sm:min-h-0 px-4 py-1.5 rounded-lg text-xs font-medium bg-[#0071E3] text-white"
                >
                  حفظ التعديل
                </button>
              </div>
            </form>
          )}

          {/* Performance & Subscription Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] p-3.5">
              <div className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                مؤشر التقدم
              </div>
              <div className="text-xl font-display font-bold tabular-nums mt-1 text-[#0071E3] dark:text-[#2997FF]">
                {progressScore}%
              </div>
              <div className="text-[11px] font-medium text-[#424245] dark:text-[#C7C7CC]">
                {TIER_LABELS_AR[tier]}
              </div>
            </div>

            <div className="rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] p-3.5">
              <div className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                الحضور والواجبات
              </div>
              <div className="text-xl font-display font-bold tabular-nums mt-1 text-[#1D1D1F] dark:text-[#F5F5F7]">
                {student.attendanceRate}%
              </div>
              <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                واجبات {student.homeworkRate}%
              </div>
            </div>

            <div className="rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] p-3.5">
              <div className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                حالة الاشتراك
              </div>
              <div
                className={`text-sm font-bold mt-1.5 ${
                  subStatus === 'active'
                    ? 'text-[#059669] dark:text-[#34D399]'
                    : subStatus === 'expiring_soon'
                    ? 'text-[#D97706] dark:text-[#FBBF24]'
                    : 'text-[#DC2626] dark:text-[#F87171]'
                }`}
              >
                {STATUS_LABELS_AR[subStatus]}
              </div>
              <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D] tabular-nums mt-0.5">
                {formatArabicDate(student.expiresAt)}
              </div>
            </div>
          </div>

          {/* Contact & Subscription Action */}
          <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <div>
                <div className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                  ولي الأمر: {student.guardianName}
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1.5 text-xs tabular-nums text-[#1D1D1F] dark:text-[#E5E5EA]">
                  {guardianTel ? (
                    <a
                      href={guardianTel}
                      className="inline-flex items-center gap-1.5 min-h-[36px] sm:min-h-0 hover:text-[#0071E3]"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#0071E3]" />
                      ولي الأمر: {student.guardianPhone}
                    </a>
                  ) : (
                    <span>ولي الأمر: {student.guardianPhone}</span>
                  )}
                  {studentTel ? (
                    <a
                      href={studentTel}
                      className="inline-flex items-center gap-1.5 min-h-[36px] sm:min-h-0 hover:text-[#0071E3]"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#6E6E73]" />
                      الطالب: {student.studentPhone}
                    </a>
                  ) : (
                    <span>الطالب: {student.studentPhone}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenRenewal(student)}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-xl text-xs font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] whitespace-nowrap active:scale-[0.98] transition-all"
              >
                تجديد الاشتراك
              </button>
            </div>
            <div className="text-xs text-[#6E6E73] dark:text-[#98989D] pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
              الباقة: {PLAN_LABELS_AR[student.plan]} · الرسوم:{' '}
              <span className="tabular-nums font-medium text-[#1D1D1F] dark:text-white">
                {formatCurrency(student.monthlyFee, settings.currency)}
              </span>{' '}
              · المتبقي{' '}
              <span className="tabular-nums font-medium">
                {student.sessionsRemaining} حصص
              </span>
            </div>
            {student.notes && (
              <div className="text-xs text-[#424245] dark:text-[#C7C7CC]">
                ملاحظة: {student.notes}
              </div>
            )}
          </div>

          {/* Instant Parent WhatsApp Summary */}
          <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#059669]" />
              <h3 className="text-sm font-display font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                ملخص متابعة لولي الأمر (واتساب)
              </h3>
            </div>
            <div className="rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] p-3.5 text-xs leading-relaxed text-[#1D1D1F] dark:text-[#E5E5EA] whitespace-pre-line">
              {summaryMessage}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {(() => {
                const waUrl = formatEgyptianWhatsAppUrl(
                  student.guardianPhone,
                  summaryMessage
                );
                return waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/12 text-[#059669] dark:text-[#34D399] hover:bg-emerald-500/20"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>إرسال عبر واتساب</span>
                  </a>
                ) : null;
              })()}
              <button
                type="button"
                onClick={handleCopyReport}
                className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#424245] dark:text-[#C7C7CC] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#059669]" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الملخص</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Grades & Quick Grade Add */}
          <div className="space-y-3">
            <h3 className="text-sm font-display font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              سجل الامتحانات والتقييمات
            </h3>
            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06] rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
              {student.grades.length === 0 ? (
                <div className="p-4 text-xs text-[#6E6E73]">
                  لا توجد درجات مسجلة بعد.
                </div>
              ) : (
                student.grades.map((g) => (
                  <div
                    key={g.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                        {g.title}
                      </div>
                      <div className="text-xs text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                        {formatArabicDate(g.date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="font-display font-bold tabular-nums text-[#0071E3] dark:text-[#2997FF]">
                        {g.score} / {g.maxScore}
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteGrade(student.id, g.id)}
                        aria-label={`حذف درجة ${g.title}`}
                        className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 p-1.5 rounded-lg text-[#6E6E73] hover:text-[#DC2626] hover:bg-red-500/10 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleGradeSubmit}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1"
            >
              <input
                type="text"
                value={gradeTitle}
                onChange={(e) => setGradeTitle(e.target.value)}
                placeholder="عنوان الامتحان الجديد..."
                aria-label="عنوان الامتحان الجديد"
                className="sm:col-span-6 min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
              />
              <div className="grid grid-cols-2 sm:contents gap-2">
                <input
                  type="number"
                  value={gradeScore}
                  onChange={(e) => setGradeScore(e.target.value)}
                  placeholder="الدرجة"
                  aria-label="الدرجة المحصلة"
                  className="sm:col-span-2 min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
                <input
                  type="number"
                  value={gradeMax}
                  onChange={(e) => setGradeMax(e.target.value)}
                  placeholder="العظمى"
                  aria-label="الدرجة العظمى"
                  className="sm:col-span-2 min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
              </div>
              <button
                type="submit"
                className="sm:col-span-2 min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-[#1D1D1F] dark:bg-[#0071E3] text-white hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة</span>
              </button>
            </form>
            {gradeError && (
              <p className="text-xs text-[#DC2626] dark:text-[#F87171]">
                {gradeError}
              </p>
            )}
          </div>

          {/* Attendance History Timeline */}
          <div className="space-y-3">
            <h3 className="text-sm font-display font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              سجل الحضور والغياب الأخير
            </h3>
            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06] rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
              {student.attendanceHistory.length === 0 ? (
                <div className="p-4 text-xs text-[#6E6E73] dark:text-[#98989D]">
                  لم تُسجّل حصص حضور لهذا الطالب بعد.
                </div>
              ) : (
                student.attendanceHistory.slice(0, 10).map((att) => (
                  <div
                    key={att.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                        {att.sessionTitle}
                      </div>
                      <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                        {formatArabicDate(att.date)}
                        {att.homeworkDone !== undefined && (
                          <span>
                            {' · '}
                            {att.homeworkDone ? 'أدى الواجب' : 'ناقص واجب'}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`font-semibold shrink-0 ${
                        att.status === 'present'
                          ? 'text-[#059669] dark:text-[#34D399]'
                          : att.status === 'late'
                          ? 'text-[#D97706] dark:text-[#FBBF24]'
                          : 'text-[#DC2626] dark:text-[#F87171]'
                      }`}
                    >
                      {att.status === 'present'
                        ? 'حاضر'
                        : att.status === 'late'
                        ? 'متأخر'
                        : 'غائب'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Student Payments & Receipts History */}
          <div className="space-y-3">
            <h3 className="text-sm font-display font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              سجل مدفوعات وإيصالات الطالب
            </h3>
            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06] rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
              {studentPayments.length === 0 ? (
                <div className="p-4 text-xs text-[#6E6E73] dark:text-[#98989D]">
                  لا توجد إيصالات مسجلة لهذا الطالب حتى الآن.
                </div>
              ) : (
                studentPayments.slice(0, 8).map((pay) => (
                  <div
                    key={pay.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                        <span className="font-mono">{pay.receiptNumber}</span> ·{' '}
                        {PLAN_LABELS_AR[pay.plan]}
                      </div>
                      <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                        {formatArabicDate(pay.paidAt)} · {PAYMENT_METHOD_LABELS_AR[pay.method]}
                      </div>
                    </div>
                    <span className="font-display font-bold tabular-nums text-[#059669] dark:text-[#34D399] shrink-0">
                      +{formatCurrency(pay.amount, settings.currency)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Delete Student Footer */}
          <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 text-xs font-medium text-[#DC2626] dark:text-[#F87171] hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف ملف الطالب</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 w-full justify-between bg-red-500/8 rounded-xl px-3.5 py-2.5">
                <span className="text-xs font-medium text-[#DC2626] dark:text-[#F87171]">
                  تأكيد حذف الطالب نهائياً؟
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="min-h-[40px] sm:min-h-0 px-2.5 py-1 rounded-lg text-xs text-[#6E6E73]"
                  >
                    تراجع
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteStudent(student.id);
                      onClose();
                    }}
                    className="min-h-[40px] sm:min-h-0 px-3 py-1 rounded-lg text-xs font-medium bg-[#DC2626] text-white"
                  >
                    حذف
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
