import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Settings,
  UserPlus,
  X,
} from 'lucide-react';
import {
  clampTutorialStepIndex,
  TUTORIAL_STEPS,
  type TutorialActionTarget,
} from '../utils/onboardingTutorial';

interface OnboardingTutorialModalProps {
  open: boolean;
  onClose: () => void;
  onTriggerAction: (target: TutorialActionTarget) => void;
}

const STEP_ICONS: Record<TutorialActionTarget, React.ComponentType<{ className?: string }>> = {
  settings: Settings,
  new_student: UserPlus,
  schedule: CalendarDays,
  attendance: ClipboardCheck,
};

export const OnboardingTutorialModal: React.FC<OnboardingTutorialModalProps> = ({
  open,
  onClose,
  onTriggerAction,
}) => {
  const [stepIndex, setStepIndex] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const totalSteps = TUTORIAL_STEPS.length;
  const safeIndex = clampTutorialStepIndex(stepIndex, totalSteps);
  const currentStep = TUTORIAL_STEPS[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === totalSteps - 1;
  const StepIcon = STEP_ICONS[currentStep.actionTarget];

  const handlePrev = () => {
    setStepIndex((prev) => clampTutorialStepIndex(prev - 1, totalSteps));
  };

  const handleNext = () => {
    if (isLast) {
      onClose();
      return;
    }
    setStepIndex((prev) => clampTutorialStepIndex(prev + 1, totalSteps));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-tutorial-title"
      data-testid="onboarding-tutorial-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Mobile drag handle */}
        <div className="sm:hidden w-10 h-1 bg-black/15 dark:bg-white/20 rounded-full mx-auto mt-2.5 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="onboarding-tutorial-title"
                className="text-base sm:text-lg font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate"
              >
                دليل البدء السريع في أُفق
              </h2>
              <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                أربع خطوات واضحة لتنظيم مجموعاتك وطلابك وجدولك من أول دقيقة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق دليل البدء السريع"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#6E6E73] dark:text-[#98989D] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clickable Step Rail */}
        <nav
          aria-label="خطوات الدليل التعريفي"
          className="px-5 sm:px-6 py-3 bg-[#F5F5F7] dark:bg-[#1C1F26] border-b border-black/[0.06] dark:border-white/[0.08]"
        >
          <div className="grid grid-cols-4 gap-2">
            {TUTORIAL_STEPS.map((step, index) => {
              const active = index === safeIndex;
              const visited = index < safeIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setStepIndex(index)}
                  aria-current={active ? 'step' : undefined}
                  aria-label={`الخطوة ${step.stepNumber}: ${step.title}`}
                  className={`min-h-[44px] px-2.5 py-2 rounded-xl text-right transition-colors flex items-center justify-center sm:justify-start gap-2 border ${
                    active
                      ? 'bg-white dark:bg-[#14161C] border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]'
                      : visited
                      ? 'bg-white/60 dark:bg-[#14161C]/60 border-black/[0.06] dark:border-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7]'
                      : 'bg-transparent border-transparent text-[#6E6E73] dark:text-[#98989D] hover:bg-white/50 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-bold tabular-nums flex items-center justify-center shrink-0 ${
                      active
                        ? 'bg-[#0071E3] text-white'
                        : visited
                        ? 'bg-[#059669]/15 text-[#059669] dark:text-[#34D399]'
                        : 'bg-black/[0.07] dark:bg-white/[0.08] text-[#6E6E73] dark:text-[#98989D]'
                    }`}
                  >
                    {step.stepNumber}
                  </span>
                  <span className="hidden sm:block text-xs font-medium whitespace-nowrap">
                    {step.shortTitle}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Scrollable Step Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="text-xs font-semibold text-[#0071E3] dark:text-[#2997FF] tabular-nums">
                الخطوة {currentStep.stepNumber} من {totalSteps}
              </div>
              <h3 className="text-lg sm:text-xl font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {currentStep.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#424245] dark:text-[#C7C7CC]">
                {currentStep.summary}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] border border-black/[0.06] dark:border-white/[0.08] text-[#0071E3] dark:text-[#2997FF] flex items-center justify-center shrink-0">
              <StepIcon className="w-5 h-5" />
            </div>
          </div>

          {/* What to do checklist */}
          <div className="rounded-xl bg-[#F5F5F7] dark:bg-[#1C1F26] p-4 sm:p-5 space-y-3">
            <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              ماذا تفعل في هذه الخطوة؟
            </div>
            <ul className="space-y-2.5">
              {currentStep.checklist.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-[#1D1D1F] dark:text-[#E5E5EA]"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-[#34D399] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Outcome + Direct Jump Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-[#6E6E73] dark:text-[#98989D] leading-relaxed">
              <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                النتيجة:{' '}
              </span>
              {currentStep.outcome}
            </p>
            <button
              type="button"
              onClick={() => onTriggerAction(currentStep.actionTarget)}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] hover:bg-[#0071E3]/15 active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
            >
              {currentStep.actionLabel}
            </button>
          </div>
        </div>

        {/* Sticky Footer Controls */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#14161C] pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-[#6E6E73] dark:text-[#98989D] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] whitespace-nowrap"
          >
            تخطي الدليل
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] active:scale-[0.98] transition-all whitespace-nowrap"
              >
                <ArrowRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <span>{isLast ? 'ابدأ العمل الآن' : 'التالي'}</span>
              {!isLast && <ArrowLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
