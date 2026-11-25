import React from 'react';
import { X } from 'lucide-react';
import type {
  CenterSettings,
  LessonMode,
  NewStudentInput,
  PaymentMethod,
  SubscriptionPlan,
  TutoringGroup,
} from '../types/tutoring';
import {
  CURRENCY_META,
  getSuggestedPlanFee,
  LESSON_MODE_LABELS_AR,
  PAYMENT_METHOD_LABELS_AR,
  PLAN_LABELS_AR,
  validateStudentInput,
} from '../utils/tutoringLogic';

interface StudentModalProps {
  open: boolean;
  groups: TutoringGroup[];
  settings: CenterSettings;
  onClose: () => void;
  onSubmit: (input: NewStudentInput) => void;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  open,
  groups,
  settings,
  onClose,
  onSubmit,
}) => {
  const defaultGroup = groups[0];

  const [form, setForm] = React.useState<NewStudentInput>({
    fullName: '',
    studentPhone: '',
    guardianName: '',
    guardianPhone: '',
    gradeLevel: defaultGroup?.gradeLevel ?? '',
    subject: defaultGroup?.subject ?? '',
    groupId: defaultGroup?.id ?? '',
    lessonMode: defaultGroup?.lessonMode ?? 'center',
    plan: 'monthly',
    monthlyFee: defaultGroup?.defaultFee ?? 400,
    paymentMethod: 'cash',
    startDate: settings.referenceDate,
    notes: '',
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      const grp = groups[0];
      setForm({
        fullName: '',
        studentPhone: '',
        guardianName: '',
        guardianPhone: '',
        gradeLevel: grp?.gradeLevel ?? '',
        subject: grp?.subject ?? '',
        groupId: grp?.id ?? '',
        lessonMode: grp?.lessonMode ?? 'center',
        plan: 'monthly',
        monthlyFee: grp?.defaultFee ?? 400,
        paymentMethod: 'cash',
        startDate: settings.referenceDate,
        notes: '',
      });
      setErrors({});
    }
    wasOpenRef.current = open;
  }, [open, groups, settings.referenceDate]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleGroupChange = (groupId: string) => {
    const selected = groups.find((g) => g.id === groupId);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        groupId: selected.id,
        subject: selected.subject,
        gradeLevel: selected.gradeLevel,
        lessonMode: selected.lessonMode,
        monthlyFee: getSuggestedPlanFee(selected.defaultFee, 'monthly', prev.plan),
      }));
    } else {
      setForm((prev) => ({ ...prev, groupId }));
    }
  };

  const handlePlanChange = (nextPlan: SubscriptionPlan) => {
    setForm((prev) => ({
      ...prev,
      plan: nextPlan,
      monthlyFee: getSuggestedPlanFee(prev.monthlyFee, prev.plan, nextPlan),
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateStudentInput(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(form);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-student-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="sm:hidden w-10 h-1 bg-black/15 dark:bg-white/20 rounded-full mx-auto mt-2.5 shrink-0" />
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div>
            <h2
              id="new-student-modal-title"
              className="text-lg font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]"
            >
              تسجيل طالب جديد
            </h2>
            <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
              تفعيل الملف الأكاديمي وربط الاشتراك بالمجموعة أو الدرس الخصوصي
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة تسجيل طالب"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#6E6E73] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 pb-safe">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="st-fullName"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                اسم الطالب الثلاثي *
              </label>
              <input
                id="st-fullName"
                type="text"
                value={form.fullName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
                placeholder="مثال: عمر شريف عبد العزيز"
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
              />
              {errors.fullName && (
                <p className="text-xs text-[#DC2626] dark:text-[#F87171] mt-1">
                  {errors.fullName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="st-phone"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                رقم موبايل الطالب *
              </label>
              <input
                id="st-phone"
                type="tel"
                dir="ltr"
                value={form.studentPhone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, studentPhone: e.target.value }))
                }
                placeholder="01012345678"
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm tabular-nums text-right bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
              />
              {errors.studentPhone && (
                <p className="text-xs text-[#DC2626] dark:text-[#F87171] mt-1">
                  {errors.studentPhone}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="st-guardianName"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                اسم ولي الأمر *
              </label>
              <input
                id="st-guardianName"
                type="text"
                value={form.guardianName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, guardianName: e.target.value }))
                }
                placeholder="مثال: م. شريف عبد العزيز"
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
              />
              {errors.guardianName && (
                <p className="text-xs text-[#DC2626] dark:text-[#F87171] mt-1">
                  {errors.guardianName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="st-guardianPhone"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                موبايل ولي الأمر *
              </label>
              <input
                id="st-guardianPhone"
                type="tel"
                dir="ltr"
                value={form.guardianPhone}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    guardianPhone: e.target.value,
                  }))
                }
                placeholder="01198765432"
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm tabular-nums text-right bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
              />
              {errors.guardianPhone && (
                <p className="text-xs text-[#DC2626] dark:text-[#F87171] mt-1">
                  {errors.guardianPhone}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="st-group"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                المجموعة / المسار الدراسي
              </label>
              <select
                id="st-group"
                value={form.groupId}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
              >
                <option value="">تسجيل مباشر (بدون مجموعة مسبقة)</option>
                {groups.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    {grp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="st-mode"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                نمط الدراسة
              </label>
              <select
                id="st-mode"
                value={form.lessonMode}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    lessonMode: e.target.value as LessonMode,
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
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

            <div>
              <label
                htmlFor="st-gradeLevel"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                الصف / المرحلة الدراسية *
              </label>
              <input
                id="st-gradeLevel"
                type="text"
                value={form.gradeLevel}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, gradeLevel: e.target.value }))
                }
                placeholder="مثال: الصف الثالث الثانوي (علمي رياضة)"
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
              />
              {errors.gradeLevel && (
                <p className="text-xs text-[#DC2626] dark:text-[#F87171] mt-1">
                  {errors.gradeLevel}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="st-subject"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                المادة الدراسية *
              </label>
              <input
                id="st-subject"
                type="text"
                value={form.subject}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, subject: e.target.value }))
                }
                placeholder="مثال: الرياضيات البحتة"
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
              />
              {errors.subject && (
                <p className="text-xs text-[#DC2626] dark:text-[#F87171] mt-1">
                  {errors.subject}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="st-plan"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                باقة الاشتراك
              </label>
              <select
                id="st-plan"
                value={form.plan}
                onChange={(e) =>
                  handlePlanChange(e.target.value as SubscriptionPlan)
                }
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
              >
                {(Object.keys(PLAN_LABELS_AR) as SubscriptionPlan[]).map(
                  (planKey) => (
                    <option key={planKey} value={planKey}>
                      {PLAN_LABELS_AR[planKey]}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="st-fee"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                الرسوم ({CURRENCY_META[settings.currency].symbol}) *
              </label>
              <input
                id="st-fee"
                type="number"
                min={1}
                value={form.monthlyFee}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    monthlyFee: Number(e.target.value),
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
              />
              {errors.monthlyFee && (
                <p className="text-xs text-[#DC2626] dark:text-[#F87171] mt-1">
                  {errors.monthlyFee}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="st-method"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                وسيلة السداد الأولي
              </label>
              <select
                id="st-method"
                value={form.paymentMethod ?? 'cash'}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value as PaymentMethod,
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
              >
                {(Object.keys(PAYMENT_METHOD_LABELS_AR) as PaymentMethod[]).map(
                  (m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS_AR[m]}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="st-startDate"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                تاريخ بدء الاشتراك *
              </label>
              <input
                id="st-startDate"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
              />
              {errors.startDate && (
                <p className="text-xs text-[#DC2626] dark:text-[#F87171] mt-1">
                  {errors.startDate}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="st-notes"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                ملاحظات أولية (اختياري)
              </label>
              <input
                id="st-notes"
                type="text"
                value={form.notes || ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="نقاط القوة أو أهداف الطالب"
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium text-[#424245] dark:text-[#C7C7CC] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] active:scale-[0.98] transition-all"
            >
              حفظ وتسجيل الطالب
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
