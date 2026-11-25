export const TUTORIAL_STORAGE_KEY = 'ofok_tutorial_completed_v1';

export type TutorialActionTarget =
  | 'settings'
  | 'new_student'
  | 'schedule'
  | 'attendance';

export interface TutorialStep {
  id: string;
  stepNumber: number;
  shortTitle: string;
  title: string;
  summary: string;
  checklist: string[];
  outcome: string;
  actionLabel: string;
  actionTarget: TutorialActionTarget;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'setup-center',
    stepNumber: 1,
    shortTitle: 'المجموعات',
    title: 'إعداد المركز والمجموعات الدراسية',
    summary:
      'ابدأ بتسجيل اسمك واسم السنتر والعملة، ثم أضف المجموعات أو مسارات البرايفت والأونلاين التي تدرّسها.',
    checklist: [
      'عدّل اسم المعلم، اسم السنتر، والعملة المعتمدة للفواتير.',
      'أضف مجموعاتك مع تحديد المرحلة، المادة، القاعة أو رابط البث، والرسوم الافتراضية.',
    ],
    outcome:
      'تظهر مجموعاتك تلقائياً عند تسجيل أي طالب جديد وفي بناء الجدول الأسبوعي.',
    actionLabel: 'الانتقال إلى إعدادات المركز',
    actionTarget: 'settings',
  },
  {
    id: 'register-students',
    stepNumber: 2,
    shortTitle: 'الطلاب',
    title: 'تسجيل الطلاب وربط باقة الاشتراك',
    summary:
      'أضف بيانات الطالب ورقم ولي الأمر، واختر المجموعة أو الدرس الخصوصي، ليبدأ النظام حساب الرصيد وتاريخ التجديد.',
    checklist: [
      'اضغط «طالب جديد» من الشريط العلوي في أي وقت لتسجيل طالب.',
      'سجّل رقم موبايل ولي الأمر لتتمكن من إرسال ملخص المتابعة عبر واتساب بضغطة واحدة.',
      'اختر الباقة (اشتراك شهري، باقة 8 حصص، باقة ربع سنوية، أو حصة فردية) ليصدر أول إيصال تلقائياً.',
    ],
    outcome:
      'يُنشأ ملف أكاديمي ومالي متكامل للطالب مع تتبع تلقائي لرصيد الحصص المتبقي.',
    actionLabel: 'تسجيل أول طالب الآن',
    actionTarget: 'new_student',
  },
  {
    id: 'build-schedule',
    stepNumber: 3,
    shortTitle: 'الجدول',
    title: 'تنظيم الجدول الأسبوعي بلا تعارض',
    summary:
      'أضف مواعيد حصصك يدوياً أو استخدم أداة الترتيب المتوازن لتوزيع مجموعاتك بدون تداخل في الأوقات أو الانتقال.',
    checklist: [
      'افتح «الجدول الأسبوعي» وأضف الحصص يدوياً أو أنشئ خطة أسبوعية متوازنة من مجموعاتك.',
      'يكشف النظام تلقائياً أي تعارض في المواعيد أو ضيق وقت الانتقال بين السناتر.',
    ],
    outcome:
      'تعرض لوحة القيادة أقرب حصصك القادمة مع زر مباشر لتسجيل حضور كل حصة.',
    actionLabel: 'فتح الجدول الأسبوعي',
    actionTarget: 'schedule',
  },
  {
    id: 'track-progress',
    stepNumber: 4,
    shortTitle: 'الحضور والتجديد',
    title: 'رصد الحضور والدرجات والتجديدات',
    summary:
      'خلال الحصة سجّل الحضور والواجب والاختبارات في ثوانٍ، وتابع الاشتراكات القريبة من الانتهاء.',
    checklist: [
      'من «الحضور والدرجات» اختر المجموعة وسجّل الحضور ليُخصم رصيد الحصة تلقائياً (دون خصم للغياب).',
      'أضف درجات الامتحانات، واضغط على اسم أي طالب لفتح ملفه ونسخ ملخص متابعة جاهز لولي الأمر.',
      'تابع تبويب «الاشتراكات والتجديد» لتحصيل الباقات المنتهية وإصدار إيصالات الدفع.',
    ],
    outcome:
      'لوحة متكاملة توضح الإيرادات الشهرية، نسبة الالتزام، والطلاب الأكثر احتياجاً للمتابعة.',
    actionLabel: 'فتح الحضور والدرجات',
    actionTarget: 'attendance',
  },
];

export interface AutoShowTutorialInput {
  hasCompletedTutorial: boolean;
  studentsCount: number;
  groupsCount: number;
  sessionsCount: number;
  search?: string;
}

export function shouldAutoShowTutorial(input: AutoShowTutorialInput): boolean {
  if (input.search) {
    try {
      const normalized = input.search.startsWith('?')
        ? input.search
        : `?${input.search}`;
      const params = new URLSearchParams(normalized);
      if (params.get('autostart') === '1') {
        return false;
      }
    } catch {
      // Ignore malformed query string
    }
  }

  if (input.hasCompletedTutorial) {
    return false;
  }

  if (
    input.studentsCount > 0 ||
    input.groupsCount > 0 ||
    input.sessionsCount > 0
  ) {
    return false;
  }

  return true;
}

export function clampTutorialStepIndex(
  index: number,
  totalSteps: number = TUTORIAL_STEPS.length
): number {
  if (totalSteps <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(totalSteps - 1, Math.trunc(index)));
}

export function readTutorialCompleted(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTutorialCompleted(): void {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
  } catch {
    // Ignore storage access errors
  }
}

export function resetTutorialCompleted(): void {
  try {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  } catch {
    // Ignore storage access errors
  }
}
