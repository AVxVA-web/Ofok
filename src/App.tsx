import React from 'react';
import { Menu, UserPlus } from 'lucide-react';
import type {
  AttendanceStatus,
  CenterSettings,
  LessonSession,
  NewStudentInput,
  PaymentMethod,
  PaymentRecord,
  Student,
  SubscriptionPlan,
  TutoringGroup,
} from './types/tutoring';
import {
  getTodayIsoDate,
  INITIAL_GROUPS,
  INITIAL_PAYMENTS,
  INITIAL_SESSIONS,
  INITIAL_SETTINGS,
  INITIAL_STUDENTS,
} from './data/seedData';
import {
  addDaysToIsoDate,
  applyAttendanceBatchToStudents,
  calculateRenewalExpiry,
  getEffectiveSubscriptionStatus,
  getNextReceiptNumber,
  getPlanDurationDays,
  getPlanSessionsCount,
  type AttendanceBatchRecordInput,
} from './utils/tutoringLogic';
import type { CenterBackupPayload } from './utils/dataExport';
import {
  markTutorialCompleted,
  readTutorialCompleted,
  resetTutorialCompleted,
  shouldAutoShowTutorial,
  type TutorialActionTarget,
} from './utils/onboardingTutorial';
import { Sidebar, MobileTabBar, type NavTabId } from './components/Sidebar';
import { OverviewView } from './components/OverviewView';

const StudentsView = React.lazy(() =>
  import('./components/StudentsView').then((m) => ({ default: m.StudentsView }))
);
const SubscriptionsView = React.lazy(() =>
  import('./components/SubscriptionsView').then((m) => ({
    default: m.SubscriptionsView,
  }))
);
const ScheduleView = React.lazy(() =>
  import('./components/ScheduleView').then((m) => ({ default: m.ScheduleView }))
);
const AttendanceGradesView = React.lazy(() =>
  import('./components/AttendanceGradesView').then((m) => ({
    default: m.AttendanceGradesView,
  }))
);
const SettingsView = React.lazy(() =>
  import('./components/SettingsView').then((m) => ({ default: m.SettingsView }))
);
const StudentModal = React.lazy(() =>
  import('./components/StudentModal').then((m) => ({ default: m.StudentModal }))
);
const RenewalModal = React.lazy(() =>
  import('./components/RenewalModal').then((m) => ({ default: m.RenewalModal }))
);
const StudentDetailDrawer = React.lazy(() =>
  import('./components/StudentDetailDrawer').then((m) => ({
    default: m.StudentDetailDrawer,
  }))
);
const OnboardingTutorialModal = React.lazy(() =>
  import('./components/OnboardingTutorialModal').then((m) => ({
    default: m.OnboardingTutorialModal,
  }))
);

const ViewFallback: React.FC = () => (
  <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="جاري التحميل">
    <div className="h-8 w-48 rounded-xl bg-black/[0.06] dark:bg-white/[0.06]" />
    <div className="h-44 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05]" />
    <div className="h-44 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05]" />
  </div>
);

const STORAGE_KEY = 'ruwaq_eg_dashboard_v3';

interface PersistedState {
  students: Student[];
  payments: PaymentRecord[];
  sessions: LessonSession[];
  groups: TutoringGroup[];
  settings: CenterSettings;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (
        Array.isArray(parsed.students) &&
        Array.isArray(parsed.payments) &&
        Array.isArray(parsed.sessions) &&
        parsed.settings
      ) {
        return {
          students: parsed.students,
          payments: parsed.payments,
          sessions: parsed.sessions,
          groups: Array.isArray(parsed.groups) ? parsed.groups : INITIAL_GROUPS,
          settings: {
            ...INITIAL_SETTINGS,
            ...parsed.settings,
            referenceDate: getTodayIsoDate(),
          },
        };
      }
    }
  } catch {
    // Fallback to clean zero state
  }
  return {
    students: INITIAL_STUDENTS,
    payments: INITIAL_PAYMENTS,
    sessions: INITIAL_SESSIONS,
    groups: INITIAL_GROUPS,
    settings: INITIAL_SETTINGS,
  };
}

const TAB_TITLES: Record<NavTabId, string> = {
  overview: 'لوحة القيادة',
  students: 'الطلاب والتسجيل',
  subscriptions: 'الاشتراكات والتجديد',
  schedule: 'الجدول الأسبوعي',
  attendance: 'الحضور والدرجات',
  settings: 'إعدادات المركز',
};

export default function App() {
  const initial = React.useMemo(() => loadInitialState(), []);

  const [students, setStudents] = React.useState<Student[]>(initial.students);
  const [payments, setPayments] = React.useState<PaymentRecord[]>(
    initial.payments
  );
  const [sessions, setSessions] = React.useState<LessonSession[]>(
    initial.sessions
  );
  const [groups, setGroups] = React.useState<TutoringGroup[]>(initial.groups);
  const [settings, setSettings] = React.useState<CenterSettings>(
    initial.settings
  );

  const [activeTab, setActiveTab] = React.useState<NavTabId>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const [attendancePreselect, setAttendancePreselect] = React.useState<{
    groupId?: string;
    sessionTitle?: string;
  }>({});

  const [newStudentOpen, setNewStudentOpen] = React.useState(false);
  const [renewalStudentId, setRenewalStudentId] = React.useState<string | null>(
    null
  );
  const [selectedStudentId, setSelectedStudentId] = React.useState<
    string | null
  >(null);
  const [tutorialOpen, setTutorialOpen] = React.useState<boolean>(() =>
    shouldAutoShowTutorial({
      hasCompletedTutorial: readTutorialCompleted(),
      studentsCount: initial.students.length,
      groupsCount: initial.groups.length,
      sessionsCount: initial.sessions.length,
      search: typeof window !== 'undefined' ? window.location.search : '',
    })
  );

  // Persist to localStorage
  React.useEffect(() => {
    try {
      const payload: PersistedState = {
        students,
        payments,
        sessions,
        groups,
        settings,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota issues
    }
  }, [students, payments, sessions, groups, settings]);

  // Sync Tailwind dark class on <html>
  React.useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      settings.theme === 'dark'
    );
  }, [settings.theme]);

  const renewalsBadgeCount = React.useMemo(() => {
    return students.filter((s) => {
      const st = getEffectiveSubscriptionStatus(s, settings.referenceDate);
      return st === 'expiring_soon' || st === 'expired';
    }).length;
  }, [students, settings.referenceDate]);

  const selectedStudent = React.useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  const renewalStudent = React.useMemo(
    () => students.find((s) => s.id === renewalStudentId) ?? null,
    [students, renewalStudentId]
  );

  // Handlers
  const handleToggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const handleRegisterStudent = (input: NewStudentInput) => {
    const grp = groups.find((g) => g.id === input.groupId);
    const durationDays = getPlanDurationDays(input.plan);
    const expiresAt = addDaysToIsoDate(input.startDate, durationDays);
    const sessionsCount = getPlanSessionsCount(input.plan);
    const newId = `st-${Date.now()}`;

    const created: Student = {
      id: newId,
      fullName: input.fullName.trim(),
      studentPhone: input.studentPhone.trim(),
      guardianName: input.guardianName.trim(),
      guardianPhone: input.guardianPhone.trim(),
      gradeLevel: input.gradeLevel.trim(),
      subject: input.subject.trim(),
      groupId: input.groupId,
      groupName:
        grp?.name ??
        (input.lessonMode === 'private_home'
          ? 'درس خصوصي (برايفت)'
          : input.lessonMode === 'online'
          ? 'حصة أونلاين'
          : 'تسجيل مباشر بالسنتر'),
      lessonMode: input.lessonMode,
      plan: input.plan,
      monthlyFee: input.monthlyFee,
      sessionsRemaining: sessionsCount,
      enrolledAt: input.startDate,
      expiresAt,
      attendanceRate: 100,
      homeworkRate: 100,
      grades: [],
      attendanceHistory: [],
      notes: input.notes?.trim() || undefined,
    };

    const initialPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      studentId: newId,
      studentName: created.fullName,
      amount: input.monthlyFee,
      plan: input.plan,
      method: input.paymentMethod ?? 'cash',
      paidAt: input.startDate,
      newExpiresAt: expiresAt,
      receiptNumber: getNextReceiptNumber(payments),
    };

    setStudents((prev) => [created, ...prev]);
    setPayments((prev) => [initialPayment, ...prev]);
  };

  const handleUpdateStudent = (
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
  ) => {
    const grp = groups.find((g) => g.id === patch.groupId);
    const trimmedName = patch.fullName.trim();
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              fullName: trimmedName,
              studentPhone: patch.studentPhone.trim(),
              guardianName: patch.guardianName.trim(),
              guardianPhone: patch.guardianPhone.trim(),
              gradeLevel: patch.gradeLevel.trim(),
              subject: patch.subject.trim(),
              groupId: patch.groupId,
              groupName:
                grp?.name ??
                (patch.groupId === ''
                  ? s.lessonMode === 'private_home'
                    ? 'درس خصوصي (برايفت)'
                    : s.lessonMode === 'online'
                    ? 'حصة أونلاين'
                    : 'تسجيل مباشر بالسنتر'
                  : s.groupName),
              lessonMode: grp?.lessonMode ?? s.lessonMode,
              monthlyFee: patch.monthlyFee,
              sessionsRemaining: Math.max(0, Math.floor(patch.sessionsRemaining)),
              notes: patch.notes?.trim() || undefined,
            }
          : s
      )
    );
    setPayments((prev) =>
      prev.map((p) =>
        p.studentId === studentId ? { ...p, studentName: trimmedName } : p
      )
    );
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setSelectedStudentId((prev) => (prev === studentId ? null : prev));
    setRenewalStudentId((prev) => (prev === studentId ? null : prev));
  };

  const handleConfirmRenewal = ({
    studentId,
    plan,
    method,
    amount,
  }: {
    studentId: string;
    plan: SubscriptionPlan;
    method: PaymentMethod;
    amount: number;
  }) => {
    const target = students.find((s) => s.id === studentId);
    if (!target) return;

    const newExpiresAt = calculateRenewalExpiry(
      target.expiresAt,
      plan,
      settings.referenceDate
    );
    const addedSessions = getPlanSessionsCount(plan);

    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              plan,
              monthlyFee: amount,
              expiresAt: newExpiresAt,
              sessionsRemaining: s.sessionsRemaining + addedSessions,
            }
          : s
      )
    );

    const receipt: PaymentRecord = {
      id: `pay-${Date.now()}`,
      studentId,
      studentName: target.fullName,
      amount,
      plan,
      method,
      paidAt: settings.referenceDate,
      newExpiresAt,
      receiptNumber: getNextReceiptNumber(payments),
    };

    setPayments((prev) => [receipt, ...prev]);
  };

  const handleAddGrade = (
    studentId: string,
    grade: { title: string; score: number; maxScore: number }
  ) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              grades: [
                ...s.grades,
                {
                  id: `g-${Date.now()}`,
                  title: grade.title,
                  score: grade.score,
                  maxScore: grade.maxScore,
                  date: settings.referenceDate,
                },
              ],
            }
          : s
      )
    );
  };

  const handleDeleteGrade = (studentId: string, gradeId: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              grades: s.grades.filter((g) => g.id !== gradeId),
            }
          : s
      )
    );
  };

  const handleSaveAttendanceBatch = (params: {
    date: string;
    sessionTitle: string;
    records: AttendanceBatchRecordInput[];
    replaceExisting?: boolean;
  }) => {
    setStudents((prev) => applyAttendanceBatchToStudents(prev, params));
  };

  const handleAddSession = (session: Omit<LessonSession, 'id'>) => {
    setSessions((prev) => [...prev, { ...session, id: `ses-${Date.now()}` }]);
  };

  const handleUpdateSession = (
    sessionId: string,
    updated: Omit<LessonSession, 'id'>
  ) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...updated, id: sessionId } : s))
    );
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const handleApplyBalancedSchedule = (slots: Omit<LessonSession, 'id'>[]) => {
    const stamped: LessonSession[] = slots.map((slot, idx) => ({
      ...slot,
      id: `ses-plan-${Date.now()}-${idx}`,
    }));
    setSessions(stamped);
  };

  const handleTakeSessionAttendance = (session: LessonSession) => {
    setAttendancePreselect({
      groupId: session.groupId,
      sessionTitle: session.title,
    });
    setActiveTab('attendance');
  };

  const handleAddGroup = (group: Omit<TutoringGroup, 'id'>) => {
    setGroups((prev) => [...prev, { ...group, id: `grp-${Date.now()}` }]);
  };

  const handleUpdateGroup = (
    groupId: string,
    patch: Omit<TutoringGroup, 'id'>
  ) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...patch, id: groupId } : g))
    );
    setStudents((prev) =>
      prev.map((s) =>
        s.groupId === groupId
          ? {
              ...s,
              groupName: patch.name,
              lessonMode: patch.lessonMode,
            }
          : s
      )
    );
    setSessions((prev) =>
      prev.map((ses) =>
        ses.groupId === groupId
          ? {
              ...ses,
              lessonMode: patch.lessonMode,
              location: patch.roomOrLink,
              subject: patch.subject,
              gradeLevel: patch.gradeLevel,
            }
          : ses
      )
    );
  };

  const handleImportBackup = (backup: CenterBackupPayload) => {
    setStudents(backup.students);
    setPayments(backup.payments);
    setSessions(backup.sessions);
    setGroups(backup.groups);
    setSettings({
      ...backup.settings,
      referenceDate: getTodayIsoDate(),
    });
    setAttendancePreselect({});
    setSelectedStudentId(null);
    setRenewalStudentId(null);
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setStudents((prev) =>
      prev.map((s) =>
        s.groupId === groupId
          ? {
              ...s,
              groupId: '',
              groupName:
                s.lessonMode === 'private_home'
                  ? 'درس خصوصي (برايفت)'
                  : s.lessonMode === 'online'
                  ? 'حصة أونلاين'
                  : 'تسجيل مباشر بالسنتر',
            }
          : s
      )
    );
    setSessions((prev) =>
      prev.map((ses) => (ses.groupId === groupId ? { ...ses, groupId: '' } : ses))
    );
  };

  const handleCloseTutorial = () => {
    markTutorialCompleted();
    setTutorialOpen(false);
  };

  const handleTutorialAction = (target: TutorialActionTarget) => {
    markTutorialCompleted();
    setTutorialOpen(false);
    if (target === 'new_student') {
      setNewStudentOpen(true);
      return;
    }
    setActiveTab(target);
  };

  const handleResetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    resetTutorialCompleted();
    setStudents(INITIAL_STUDENTS);
    setPayments(INITIAL_PAYMENTS);
    setSessions(INITIAL_SESSIONS);
    setGroups(INITIAL_GROUPS);
    setSettings(INITIAL_SETTINGS);
    setAttendancePreselect({});
    setSelectedStudentId(null);
    setRenewalStudentId(null);
  };

  return (
    <div className="min-h-screen flex bg-[#F5F5F7] dark:bg-[#0B0C10] text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors overflow-x-hidden">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        settings={settings}
        onToggleTheme={handleToggleTheme}
        renewalsBadgeCount={renewalsBadgeCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean Contextual Top Header */}
        <header className="sticky top-0 z-10 h-[52px] sm:h-auto bg-[#F5F5F7]/90 dark:bg-[#0B0C10]/90 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] px-3 sm:px-8 sm:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="فتح القائمة الجانبية"
              className="lg:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] active:scale-[0.96]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-medium text-[#6E6E73] dark:text-[#98989D] truncate">
              <span className="hidden sm:inline">أُفق</span>
              <span aria-hidden="true" className="hidden sm:inline mx-2">
                /
              </span>
              <span className="text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold">
                {TAB_TITLES[activeTab]}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNewStudentOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-0 px-3.5 py-2 rounded-xl text-xs font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>طالب جديد</span>
          </button>
        </header>

        {/* Main Workspace Viewport */}
        <main className="flex-1 px-3.5 sm:px-8 pt-5 pb-24 sm:py-8 lg:pb-8 max-w-[1380px] w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewView
              students={students}
              payments={payments}
              sessions={sessions}
              settings={settings}
              onOpenNewStudent={() => setNewStudentOpen(true)}
              onSelectStudent={(s) => setSelectedStudentId(s.id)}
              onOpenRenewal={(s) => setRenewalStudentId(s.id)}
              onNavigate={setActiveTab}
              onTakeSessionAttendance={handleTakeSessionAttendance}
              onOpenTutorial={() => setTutorialOpen(true)}
            />
          )}

          <React.Suspense fallback={<ViewFallback />}>
            {activeTab === 'students' && (
              <StudentsView
                students={students}
                groups={groups}
                settings={settings}
                onOpenNewStudent={() => setNewStudentOpen(true)}
                onSelectStudent={(s) => setSelectedStudentId(s.id)}
                onOpenRenewal={(s) => setRenewalStudentId(s.id)}
              />
            )}

            {activeTab === 'subscriptions' && (
              <SubscriptionsView
                students={students}
                payments={payments}
                settings={settings}
                onOpenRenewal={(s) => setRenewalStudentId(s.id)}
                onSelectStudent={(s) => setSelectedStudentId(s.id)}
              />
            )}

            {activeTab === 'schedule' && (
              <ScheduleView
                sessions={sessions}
                groups={groups}
                students={students}
                onAddSession={handleAddSession}
                onUpdateSession={handleUpdateSession}
                onDeleteSession={handleDeleteSession}
                onApplyBalancedSchedule={handleApplyBalancedSchedule}
                onTakeSessionAttendance={handleTakeSessionAttendance}
                onNavigateToSettings={() => setActiveTab('settings')}
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceGradesView
                students={students}
                groups={groups}
                settings={settings}
                preselectedGroupId={attendancePreselect.groupId}
                preselectedSessionTitle={attendancePreselect.sessionTitle}
                onSaveAttendanceBatch={handleSaveAttendanceBatch}
                onAddGrade={handleAddGrade}
                onSelectStudent={(s) => setSelectedStudentId(s.id)}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                settings={settings}
                groups={groups}
                students={students}
                payments={payments}
                sessions={sessions}
                onUpdateSettings={setSettings}
                onAddGroup={handleAddGroup}
                onUpdateGroup={handleUpdateGroup}
                onDeleteGroup={handleDeleteGroup}
                onImportBackup={handleImportBackup}
                onResetDemoData={handleResetDemoData}
                onOpenTutorial={() => setTutorialOpen(true)}
              />
            )}
          </React.Suspense>
        </main>
      </div>

      {/* Mobile Bottom Thumb Navigation Bar */}
      <MobileTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        renewalsBadgeCount={renewalsBadgeCount}
      />

      {/* Lazy-Loaded Modals & Drawers */}
      <React.Suspense fallback={null}>
        {newStudentOpen && (
          <StudentModal
            open={newStudentOpen}
            groups={groups}
            settings={settings}
            onClose={() => setNewStudentOpen(false)}
            onSubmit={handleRegisterStudent}
          />
        )}

        {selectedStudent && (
          <StudentDetailDrawer
            student={selectedStudent}
            groups={groups}
            payments={payments}
            settings={settings}
            onClose={() => setSelectedStudentId(null)}
            onOpenRenewal={(s) => setRenewalStudentId(s.id)}
            onAddGrade={handleAddGrade}
            onDeleteGrade={handleDeleteGrade}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
          />
        )}

        {renewalStudent && (
          <RenewalModal
            student={renewalStudent}
            settings={settings}
            onClose={() => setRenewalStudentId(null)}
            onConfirmRenewal={handleConfirmRenewal}
          />
        )}

        {tutorialOpen && (
          <OnboardingTutorialModal
            open={tutorialOpen}
            onClose={handleCloseTutorial}
            onTriggerAction={handleTutorialAction}
          />
        )}
      </React.Suspense>
    </div>
  );
}
