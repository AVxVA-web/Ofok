import React from 'react';
import { X } from 'lucide-react';
import type {
  CenterSettings,
  PaymentMethod,
  Student,
  SubscriptionPlan,
} from '../types/tutoring';
import {
  calculateRenewalExpiry,
  CURRENCY_META,
  formatArabicDate,
  formatArabicSessionsCount,
  getPlanSessionsCount,
  getSuggestedPlanFee,
  PAYMENT_METHOD_LABELS_AR,
  PLAN_LABELS_AR,
} from '../utils/tutoringLogic';

interface RenewalModalProps {
  student: Student | null;
  settings: CenterSettings;
  onClose: () => void;
  onConfirmRenewal: (payload: {
    studentId: string;
    plan: SubscriptionPlan;
    method: PaymentMethod;
    amount: number;
  }) => void;
}

export const RenewalModal: React.FC<RenewalModalProps> = ({
  student,
  settings,
  onClose,
  onConfirmRenewal,
}) => {
  const [plan, setPlan] = React.useState<SubscriptionPlan>('monthly');
  const [method, setMethod] = React.useState<PaymentMethod>('cash');
  const [amount, setAmount] = React.useState<number>(600);
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    if (student) {
      setPlan(student.plan);
      setMethod('bank_transfer');
      setAmount(student.monthlyFee);
      setError('');
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

  const handlePlanChange = (nextPlan: SubscriptionPlan) => {
    setPlan(nextPlan);
    setAmount(getSuggestedPlanFee(student.monthlyFee, student.plan, nextPlan));
  };

  const previewNewExpiry = calculateRenewalExpiry(
    student.expiresAt,
    plan,
    settings.referenceDate
  );
  const addedSessions = getPlanSessionsCount(plan);
  const totalSessionsAfter = student.sessionsRemaining + addedSessions;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من صفر.');
      return;
    }
    onConfirmRenewal({
      studentId: student.id,
      plan,
      method,
      amount,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="renewal-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="sm:hidden w-10 h-1 bg-black/15 dark:bg-white/20 rounded-full mx-auto mt-2.5 shrink-0" />
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div>
            <h2
              id="renewal-modal-title"
              className="text-lg font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]"
            >
              تجديد اشتراك الطالب
            </h2>
            <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
              {student.fullName} · {student.subject}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة التجديد"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#6E6E73] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 pb-safe">
          <div>
            <label
              htmlFor="ren-plan"
              className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
            >
              خطة التجديد
            </label>
            <select
              id="ren-plan"
              value={plan}
              onChange={(e) =>
                handlePlanChange(e.target.value as SubscriptionPlan)
              }
              className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
            >
              {(Object.keys(PLAN_LABELS_AR) as SubscriptionPlan[]).map((k) => (
                <option key={k} value={k}>
                  {PLAN_LABELS_AR[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="ren-method"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                وسيلة الدفع
              </label>
              <select
                id="ren-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
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
                htmlFor="ren-amount"
                className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
              >
                المبلغ المحصّل ({CURRENCY_META[settings.currency].symbol})
              </label>
              <input
                id="ren-amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => {
                  setAmount(Number(e.target.value));
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] border border-transparent focus:border-[#0071E3] focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#DC2626] dark:text-[#F87171]">{error}</p>
          )}

          <div className="rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#6E6E73] dark:text-[#98989D]">
                تاريخ الانتهاء الجديد بعد التجديد:
              </span>
              <span className="font-semibold text-[#059669] dark:text-[#34D399] tabular-nums">
                {formatArabicDate(previewNewExpiry)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
              <span className="text-[#6E6E73] dark:text-[#98989D]">
                رصيد الحصص بعد التجديد (+{addedSessions}):
              </span>
              <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                {formatArabicSessionsCount(totalSessionsAfter)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
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
              تأكيد التجديد وإصدار الإيصال
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
