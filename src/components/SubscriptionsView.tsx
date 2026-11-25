import React from 'react';
import { Check, Copy, Download, MessageCircle, Receipt, Search } from 'lucide-react';
import type {
  CenterSettings,
  PaymentRecord,
  Student,
  SubscriptionStatus,
} from '../types/tutoring';
import {
  calculateDashboardKPIs,
  formatArabicDate,
  formatCurrency,
  formatEgyptianWhatsAppUrl,
  formatSubscriptionRemainingText,
  getDaysRemaining,
  getEffectiveSubscriptionStatus,
  PAYMENT_METHOD_LABELS_AR,
  PLAN_LABELS_AR,
  STATUS_LABELS_AR,
} from '../utils/tutoringLogic';
import { buildPaymentsCsv, downloadTextFile } from '../utils/dataExport';

interface SubscriptionsViewProps {
  students: Student[];
  payments: PaymentRecord[];
  settings: CenterSettings;
  onOpenRenewal: (student: Student) => void;
  onSelectStudent: (student: Student) => void;
}

type StatusFilter = 'all' | SubscriptionStatus;

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  students,
  payments,
  settings,
  onOpenRenewal,
  onSelectStudent,
}) => {
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [search, setSearch] = React.useState('');
  const [receiptSearch, setReceiptSearch] = React.useState('');
  const [showAllReceipts, setShowAllReceipts] = React.useState(false);
  const [copiedReceiptId, setCopiedReceiptId] = React.useState<string | null>(null);

  const kpis = React.useMemo(
    () => calculateDashboardKPIs(students, payments, [], settings.referenceDate),
    [students, payments, settings.referenceDate]
  );

  const expectedRenewalAmount = React.useMemo(() => {
    return students
      .filter((s) => {
        const st = getEffectiveSubscriptionStatus(s, settings.referenceDate);
        return st === 'expiring_soon' || st === 'expired';
      })
      .reduce((sum, s) => sum + s.monthlyFee, 0);
  }, [students, settings.referenceDate]);

  const filteredStudents = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => {
        const st = getEffectiveSubscriptionStatus(s, settings.referenceDate);
        if (statusFilter !== 'all' && st !== statusFilter) return false;
        if (q && !`${s.fullName} ${s.subject}`.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          getDaysRemaining(a.expiresAt, settings.referenceDate) -
          getDaysRemaining(b.expiresAt, settings.referenceDate)
      );
  }, [students, statusFilter, search, settings.referenceDate]);

  const filteredPayments = React.useMemo(() => {
    const q = receiptSearch.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) =>
      `${p.studentName} ${p.receiptNumber}`.toLowerCase().includes(q)
    );
  }, [payments, receiptSearch]);

  const displayedPayments = showAllReceipts
    ? filteredPayments
    : filteredPayments.slice(0, 8);

  const buildReceiptText = (p: PaymentRecord) =>
    [
      `إيصال سداد اشتراك — ${settings.centerName}`,
      `رقم الإيصال: ${p.receiptNumber}`,
      `الطالب: ${p.studentName}`,
      `الباقة: ${PLAN_LABELS_AR[p.plan]}`,
      `المبلغ: ${formatCurrency(p.amount, settings.currency)}`,
      `وسيلة الدفع: ${PAYMENT_METHOD_LABELS_AR[p.method]}`,
      `تاريخ السداد: ${formatArabicDate(p.paidAt)}`,
      `صالح حتى: ${formatArabicDate(p.newExpiresAt)}`,
    ].join('\n');

  const handleCopyReceipt = async (p: PaymentRecord) => {
    try {
      await navigator.clipboard.writeText(buildReceiptText(p));
      setCopiedReceiptId(p.id);
      setTimeout(() => setCopiedReceiptId((prev) => (prev === p.id ? null : prev)), 2000);
    } catch {
      // Ignore clipboard restriction
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
          الاشتراكات وتجديد الباقات
        </h1>
        <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-1">
          إدارة التحصيل الشهري، تواريخ الانتهاء، وتجديد الباقات بضغطة واحدة مع فواتير فورية
        </p>
      </div>

      {/* 3-Column Financial Strip (2+1 on Phone) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-3.5 sm:p-5">
          <div className="text-[11px] sm:text-xs text-[#6E6E73] dark:text-[#98989D]">
            المحصّل خلال الشهر الحالي
          </div>
          <div className="text-xl sm:text-2xl font-display font-bold tabular-nums mt-1.5 text-[#059669] dark:text-[#34D399]">
            {formatCurrency(kpis.monthlyRevenue, settings.currency)}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-3.5 sm:p-5">
          <div className="text-[11px] sm:text-xs text-[#6E6E73] dark:text-[#98989D]">
            مبالغ التجديد المتوقعة
          </div>
          <div className="text-xl sm:text-2xl font-display font-bold tabular-nums mt-1.5 text-[#D97706] dark:text-[#FBBF24]">
            {formatCurrency(expectedRenewalAmount, settings.currency)}
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-3.5 sm:p-5">
          <div className="text-[11px] sm:text-xs text-[#6E6E73] dark:text-[#98989D]">
            الاشتراكات النشطة مقابل المستحقة
          </div>
          <div className="text-xl sm:text-2xl font-display font-bold tabular-nums mt-1.5 text-[#1D1D1F] dark:text-[#F5F5F7]">
            {kpis.activeSubscriptions} نشط ·{' '}
            <span className="text-[#DC2626] dark:text-[#F87171]">
              {kpis.renewalsDueCount + kpis.expiredCount} مستحق
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div
          role="tablist"
          aria-label="تصفية حالة الاشتراك"
          className="flex items-center gap-1 p-1 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] overflow-x-auto no-scrollbar max-w-full"
        >
          {(
            [
              { id: 'all', label: 'جميع الاشتراكات' },
              { id: 'expiring_soon', label: 'ينتهي قريباً' },
              { id: 'expired', label: 'منتهي' },
              { id: 'active', label: 'نشط' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`min-h-[38px] sm:min-h-0 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-[#2C2F3A] text-[#1D1D1F] dark:text-white shadow-xs'
                  : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#6E6E73] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم الطالب..."
            aria-label="بحث في الاشتراكات"
            className="w-full pr-10 pl-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
          />
        </div>
      </div>

      {/* Subscription Ledger */}
      <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="py-12 px-6 text-center text-sm text-[#6E6E73] dark:text-[#98989D]">
            {students.length === 0
              ? 'لا توجد اشتراكات مسجلة بعد. عند تسجيل طالب جديد سيظهر اشتراكه وإيصال الدفع هنا تلقائياً.'
              : 'لا توجد اشتراكات تطابق التصفية الحالية.'}
          </div>
        ) : (
          <>
            {/* Mobile Subscription Cards */}
            <div className="md:hidden divide-y divide-black/[0.05] dark:divide-white/[0.06]">
              {filteredStudents.map((s) => {
                const st = getEffectiveSubscriptionStatus(
                  s,
                  settings.referenceDate
                );
                const remainingLabel = formatSubscriptionRemainingText(
                  s,
                  settings.referenceDate
                );
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
                        <div className="text-xs text-[#6E6E73] dark:text-[#98989D] truncate">
                          {s.groupName} · {PLAN_LABELS_AR[s.plan]}
                        </div>
                      </button>
                      <span
                        className={`text-xs font-semibold shrink-0 ${
                          st === 'active'
                            ? 'text-[#059669] dark:text-[#34D399]'
                            : st === 'expiring_soon'
                            ? 'text-[#D97706] dark:text-[#FBBF24]'
                            : 'text-[#DC2626] dark:text-[#F87171]'
                        }`}
                      >
                        {STATUS_LABELS_AR[st]}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#424245] dark:text-[#C7C7CC] tabular-nums">
                      <span className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {formatCurrency(s.monthlyFee, settings.currency)}
                      </span>
                      <span>
                        {formatArabicDate(s.expiresAt)} · {remainingLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenRenewal(s)}
                        aria-label={`تجديد اشتراك ${s.fullName}`}
                        className="flex-1 min-h-[44px] rounded-xl text-xs font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] active:scale-[0.98] transition-all"
                      >
                        تجديد الاشتراك
                      </button>
                      {st !== 'active' && (() => {
                        const waUrl = formatEgyptianWhatsAppUrl(
                          s.guardianPhone,
                          `أهلاً بحضرتك ولي أمر الطالب ${s.fullName}، نذكّركم بلطف بموعد تجديد اشتراك ${s.subject} (${formatCurrency(s.monthlyFee, settings.currency)}). شكراً لحضرتك.`
                        );
                        return waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`تذكير واتساب لولي أمر ${s.fullName}`}
                            className="min-h-[44px] px-3.5 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-medium bg-emerald-500/12 text-[#059669] dark:text-[#34D399]"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>تذكير</span>
                          </a>
                        ) : null;
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Subscription Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-[#6E6E73] dark:text-[#98989D]">
                    <th className="py-3.5 px-5 text-right">الطالب</th>
                    <th className="py-3.5 px-4 text-right">الباقة</th>
                    <th className="py-3.5 px-4 text-right">الرسوم</th>
                    <th className="py-3.5 px-4 text-right">تاريخ الانتهاء</th>
                    <th className="py-3.5 px-4 text-right">الحالة</th>
                    <th className="py-3.5 px-5 text-left">تجديد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06] text-sm">
                {filteredStudents.map((s) => {
                  const st = getEffectiveSubscriptionStatus(
                    s,
                    settings.referenceDate
                  );
                  const remainingLabel = formatSubscriptionRemainingText(
                    s,
                    settings.referenceDate
                  );

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    >
                      <td className="py-3.5 px-5">
                        <button
                          type="button"
                          onClick={() => onSelectStudent(s)}
                          className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] hover:text-[#0071E3] text-right block"
                        >
                          {s.fullName}
                        </button>
                        <div className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                          {s.groupName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#424245] dark:text-[#C7C7CC]">
                        {PLAN_LABELS_AR[s.plan]}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {formatCurrency(s.monthlyFee, settings.currency)}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-xs text-[#424245] dark:text-[#C7C7CC]">
                        <div>{formatArabicDate(s.expiresAt)}</div>
                        <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D]">
                          {remainingLabel} · {s.sessionsRemaining} حصص
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-semibold ${
                            st === 'active'
                              ? 'text-[#059669] dark:text-[#34D399]'
                              : st === 'expiring_soon'
                              ? 'text-[#D97706] dark:text-[#FBBF24]'
                              : 'text-[#DC2626] dark:text-[#F87171]'
                          }`}
                        >
                          {STATUS_LABELS_AR[st]}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-left">
                        <button
                          type="button"
                          onClick={() => onOpenRenewal(s)}
                          aria-label={`تجديد اشتراك ${s.fullName}`}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] transition-colors whitespace-nowrap"
                        >
                          تجديد الاشتراك
                        </button>
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

      {/* Payment Receipts History */}
      <section
        aria-label="سجل المدفوعات والفواتير"
        className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-4 sm:p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-4 h-4 text-[#0071E3]" />
            <h2 className="text-base font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
              سجل الإيصالات والمدفوعات
            </h2>
          </div>

          {payments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-[#6E6E73] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={receiptSearch}
                  onChange={(e) => setReceiptSearch(e.target.value)}
                  placeholder="بحث برقم الإيصال أو الطالب..."
                  aria-label="بحث في الإيصالات"
                  className="w-full pr-9 pl-3 py-2 min-h-[40px] sm:min-h-0 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  downloadTextFile(
                    `ofok-payments-${settings.referenceDate}.csv`,
                    buildPaymentsCsv(filteredPayments, settings.currency),
                    'text/csv;charset=utf-8;'
                  )
                }
                className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير CSV</span>
              </button>
            </div>
          )}
        </div>

        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
          {filteredPayments.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#6E6E73] dark:text-[#98989D]">
              {payments.length === 0
                ? 'لا توجد إيصالات مدفوعات مسجلة بعد.'
                : 'لا توجد إيصالات تطابق البحث الحالي.'}
            </div>
          ) : (
            displayedPayments.map((p) => {
              const linkedStudent = students.find((s) => s.id === p.studentId);
              const waReceiptUrl = linkedStudent
                ? formatEgyptianWhatsAppUrl(
                    linkedStudent.guardianPhone,
                    buildReceiptText(p)
                  )
                : null;
              return (
              <div
                key={p.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                    {p.studentName}
                  </div>
                  <div className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                    <span className="font-mono">{p.receiptNumber}</span> ·{' '}
                    {PAYMENT_METHOD_LABELS_AR[p.method]} ·{' '}
                    {PLAN_LABELS_AR[p.plan]}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2.5">
                  <div className="sm:text-left">
                    <div className="font-display font-bold tabular-nums text-[#059669] dark:text-[#34D399]">
                      +{formatCurrency(p.amount, settings.currency)}
                    </div>
                    <div className="text-xs text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                      {formatArabicDate(p.paidAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {waReceiptUrl && (
                      <a
                        href={waReceiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`إرسال إيصال ${p.receiptNumber} عبر واتساب`}
                        className="min-h-[38px] sm:min-h-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/12 text-[#059669] dark:text-[#34D399] hover:bg-emerald-500/20 whitespace-nowrap"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>واتساب</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopyReceipt(p)}
                      aria-label={`نسخ إيصال ${p.receiptNumber}`}
                      className="min-h-[38px] sm:min-h-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#424245] dark:text-[#C7C7CC] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] whitespace-nowrap"
                    >
                      {copiedReceiptId === p.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#059669]" />
                          <span>نُسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>

        {filteredPayments.length > 8 && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowAllReceipts((v) => !v)}
              className="min-h-[40px] sm:min-h-0 px-4 py-1.5 rounded-xl text-xs font-medium text-[#0071E3] dark:text-[#2997FF] hover:bg-[#0071E3]/10"
            >
              {showAllReceipts
                ? 'عرض أحدث 8 إيصالات فقط'
                : `عرض جميع الإيصالات (${filteredPayments.length})`}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
