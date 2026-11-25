import React from 'react';
import {
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Compass,
  Pencil,
  Download,
  Upload,
} from 'lucide-react';
import type {
  CenterSettings,
  CurrencyCode,
  LessonMode,
  LessonSession,
  PaymentRecord,
  Student,
  TutoringGroup,
} from '../types/tutoring';
import {
  CURRENCY_META,
  formatArabicStudentsCount,
  formatCurrency,
  LESSON_MODE_LABELS_AR,
} from '../utils/tutoringLogic';
import {
  buildPaymentsCsv,
  buildStudentsCsv,
  createBackupJson,
  downloadTextFile,
  parseBackupPayload,
  type CenterBackupPayload,
} from '../utils/dataExport';

interface SettingsViewProps {
  settings: CenterSettings;
  groups: TutoringGroup[];
  students: Student[];
  payments: PaymentRecord[];
  sessions: LessonSession[];
  onUpdateSettings: (next: CenterSettings) => void;
  onAddGroup: (group: Omit<TutoringGroup, 'id'>) => void;
  onUpdateGroup: (groupId: string, patch: Omit<TutoringGroup, 'id'>) => void;
  onDeleteGroup: (groupId: string) => void;
  onImportBackup: (backup: CenterBackupPayload) => void;
  onResetDemoData: () => void;
  onOpenTutorial: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  groups,
  students,
  payments,
  sessions,
  onUpdateSettings,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onImportBackup,
  onResetDemoData,
  onOpenTutorial,
}) => {
  const [form, setForm] = React.useState<CenterSettings>(settings);
  const [saved, setSaved] = React.useState(false);
  const [settingsError, setSettingsError] = React.useState('');
  const [confirmReset, setConfirmReset] = React.useState(false);

  const [newGrp, setNewGrp] = React.useState({
    name: '',
    subject: 'الرياضيات البحتة',
    gradeLevel: 'الصف الثالث الثانوي',
    lessonMode: 'center' as LessonMode,
    roomOrLink: '',
    capacity: 25,
    defaultFee: 450,
  });
  const [grpError, setGrpError] = React.useState('');

  const [editingGroupId, setEditingGroupId] = React.useState<string | null>(null);
  const [editGrp, setEditGrp] = React.useState<Omit<TutoringGroup, 'id'> | null>(null);
  const [editGrpError, setEditGrpError] = React.useState('');

  const [backupFeedback, setBackupFeedback] = React.useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teacherName.trim() || !form.centerName.trim()) {
      setSettingsError('يرجى إدخال اسم المعلم واسم السنتر أو الأكاديمية.');
      return;
    }
    setSettingsError('');
    onUpdateSettings({
      ...form,
      teacherName: form.teacherName.trim(),
      centerName: form.centerName.trim(),
      specialty: form.specialty.trim() || 'التخصص والمادة الدراسية',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrp.name.trim() || !newGrp.roomOrLink.trim()) {
      setGrpError('يرجى إدخال اسم المجموعة ومكان السنتر أو رابط الأونلاين.');
      return;
    }
    if (!Number.isFinite(newGrp.defaultFee) || newGrp.defaultFee <= 0) {
      setGrpError('يرجى إدخال قيمة رسوم افتراضية صحيحة أكبر من صفر.');
      return;
    }
    if (!Number.isFinite(newGrp.capacity) || newGrp.capacity <= 0) {
      setGrpError('يرجى إدخال سعة استيعابية صحيحة للمجموعة (1 على الأقل).');
      return;
    }
    onAddGroup({
      ...newGrp,
      name: newGrp.name.trim(),
      subject: newGrp.subject.trim() || 'مادة دراسية',
      gradeLevel: newGrp.gradeLevel.trim() || 'عام',
      roomOrLink: newGrp.roomOrLink.trim(),
      capacity: Math.floor(newGrp.capacity),
    });
    setNewGrp((p) => ({ ...p, name: '', roomOrLink: '' }));
    setGrpError('');
  };

  const handleStartEditGroup = (grp: TutoringGroup) => {
    setEditingGroupId(grp.id);
    setEditGrp({
      name: grp.name,
      subject: grp.subject,
      gradeLevel: grp.gradeLevel,
      lessonMode: grp.lessonMode,
      roomOrLink: grp.roomOrLink,
      capacity: grp.capacity,
      defaultFee: grp.defaultFee,
    });
    setEditGrpError('');
  };

  const handleSaveEditGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroupId || !editGrp) return;
    if (!editGrp.name.trim() || !editGrp.roomOrLink.trim()) {
      setEditGrpError('يرجى إدخال اسم المجموعة والمكان أو الرابط.');
      return;
    }
    if (!Number.isFinite(editGrp.defaultFee) || editGrp.defaultFee <= 0) {
      setEditGrpError('يرجى إدخال رسوم صحيحة أكبر من صفر.');
      return;
    }
    if (!Number.isFinite(editGrp.capacity) || editGrp.capacity <= 0) {
      setEditGrpError('يرجى إدخال سعة صحيحة أكبر من صفر.');
      return;
    }
    onUpdateGroup(editingGroupId, {
      ...editGrp,
      name: editGrp.name.trim(),
      subject: editGrp.subject.trim() || 'مادة دراسية',
      gradeLevel: editGrp.gradeLevel.trim() || 'عام',
      roomOrLink: editGrp.roomOrLink.trim(),
      capacity: Math.floor(editGrp.capacity),
    });
    setEditingGroupId(null);
    setEditGrp(null);
    setEditGrpError('');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const content = await file.text();
      const parsed = parseBackupPayload(content);
      if (!parsed.ok) {
        setBackupFeedback({ type: 'error', text: parsed.error });
        return;
      }
      onImportBackup(parsed.data);
      setBackupFeedback({
        type: 'success',
        text: `تمت استعادة النسخة الاحتياطية بنجاح (${formatArabicStudentsCount(parsed.data.students.length)}).`,
      });
    } catch {
      setBackupFeedback({
        type: 'error',
        text: 'تعذر قراءة الملف المختار.',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
          إعدادات المعلم والسناتر التعليمية
        </h1>
        <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-1">
          تخصيص بيانات المعلم، السناتر والمجموعات، العملة، والمظهر العام
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-6 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="set-teacher"
              className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
            >
              اسم المعلم
            </label>
            <input
              id="set-teacher"
              type="text"
              value={form.teacherName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, teacherName: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
            />
          </div>

          <div>
            <label
              htmlFor="set-center"
              className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
            >
              اسم السنتر / الأكاديمية الرئيسية
            </label>
            <input
              id="set-center"
              type="text"
              value={form.centerName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, centerName: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="set-specialty"
              className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
            >
              التخصص والمراحل الدراسية
            </label>
            <input
              id="set-specialty"
              type="text"
              value={form.specialty}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, specialty: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
            />
          </div>

          <div>
            <label
              htmlFor="set-currency"
              className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
            >
              العملة المعتمدة للفواتير
            </label>
            <select
              id="set-currency"
              value={form.currency}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  currency: e.target.value as CurrencyCode,
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
            >
              {(Object.keys(CURRENCY_META) as CurrencyCode[]).map((code) => (
                <option key={code} value={code}>
                  {CURRENCY_META[code].name} ({CURRENCY_META[code].symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="set-theme"
              className="block text-xs font-medium text-[#1D1D1F] dark:text-[#E5E5EA] mb-1.5"
            >
              مظهر الواجهة
            </label>
            <select
              id="set-theme"
              value={form.theme}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  theme: e.target.value as 'light' | 'dark',
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-sm bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7]"
            >
              <option value="light">الوضع النهاري (تيتانيوم فاتح)</option>
              <option value="dark">الوضع الليلي (أوبسيديان داكن)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
          {settingsError ? (
            <span className="text-xs font-medium text-[#DC2626] dark:text-[#F87171]">
              {settingsError}
            </span>
          ) : saved ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#059669] dark:text-[#34D399]">
              <Check className="w-4 h-4" />
              <span>تم حفظ الإعدادات بنجاح</span>
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            className="min-h-[44px] sm:min-h-0 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] active:scale-[0.98] transition-all shrink-0"
          >
            حفظ التغييرات
          </button>
        </div>
      </form>

      {/* Centers & Groups Management */}
      <section
        aria-label="إدارة السناتر والمجموعات"
        className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-6 space-y-5"
      >
        <div>
          <h2 className="text-base font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
            السناتر والمجموعات الدراسية
          </h2>
          <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
            أضف مجموعات جديدة في السناتر أو الأونلاين أو البرايفت ليتم تضمينها في التسجيل والجدول الأسبوعي
          </p>
        </div>

        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
          {groups.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#6E6E73] dark:text-[#98989D]">
              لا توجد مجموعات أو سناتر مضافة بعد. أضف أول مجموعة من النموذج أدناه.
            </div>
          ) : (
            groups.map((grp) => {
              const enrolledCount = students.filter(
                (s) => s.groupId === grp.id
              ).length;
              const isEditingThis = editingGroupId === grp.id && editGrp;

              if (isEditingThis) {
                return (
                  <form
                    key={grp.id}
                    onSubmit={handleSaveEditGroup}
                    className="py-3.5 space-y-2.5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        value={editGrp.name}
                        onChange={(e) => {
                          setEditGrp((p) => (p ? { ...p, name: e.target.value } : p));
                          setEditGrpError('');
                        }}
                        aria-label="تعديل اسم المجموعة"
                        className="min-h-[40px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26]"
                      />
                      <input
                        type="text"
                        value={editGrp.subject}
                        onChange={(e) =>
                          setEditGrp((p) => (p ? { ...p, subject: e.target.value } : p))
                        }
                        aria-label="تعديل المادة"
                        className="min-h-[40px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26]"
                      />
                      <input
                        type="text"
                        value={editGrp.gradeLevel}
                        onChange={(e) =>
                          setEditGrp((p) =>
                            p ? { ...p, gradeLevel: e.target.value } : p
                          )
                        }
                        aria-label="تعديل الصف الدراسي"
                        className="min-h-[40px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26]"
                      />
                      <select
                        value={editGrp.lessonMode}
                        onChange={(e) =>
                          setEditGrp((p) =>
                            p ? { ...p, lessonMode: e.target.value as LessonMode } : p
                          )
                        }
                        aria-label="تعديل نمط الحصة"
                        className="min-h-[40px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26]"
                      >
                        {(Object.keys(LESSON_MODE_LABELS_AR) as LessonMode[]).map(
                          (m) => (
                            <option key={m} value={m}>
                              {LESSON_MODE_LABELS_AR[m]}
                            </option>
                          )
                        )}
                      </select>
                      <input
                        type="text"
                        value={editGrp.roomOrLink}
                        onChange={(e) => {
                          setEditGrp((p) =>
                            p ? { ...p, roomOrLink: e.target.value } : p
                          );
                          setEditGrpError('');
                        }}
                        aria-label="تعديل المكان أو الرابط"
                        className="min-h-[40px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={1}
                          value={editGrp.defaultFee}
                          onChange={(e) => {
                            setEditGrp((p) =>
                              p
                                ? { ...p, defaultFee: Number(e.target.value) }
                                : p
                            );
                            setEditGrpError('');
                          }}
                          placeholder="الرسوم"
                          aria-label="تعديل الرسوم الافتراضية"
                          className="min-h-[40px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26]"
                        />
                        <input
                          type="number"
                          min={1}
                          value={editGrp.capacity}
                          onChange={(e) => {
                            setEditGrp((p) =>
                              p
                                ? { ...p, capacity: Number(e.target.value) }
                                : p
                            );
                            setEditGrpError('');
                          }}
                          placeholder="السعة"
                          aria-label="تعديل سعة المجموعة"
                          className="min-h-[40px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26]"
                        />
                      </div>
                    </div>
                    {editGrpError && (
                      <p className="text-xs text-[#DC2626] dark:text-[#F87171]">
                        {editGrpError}
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGroupId(null);
                          setEditGrp(null);
                          setEditGrpError('');
                        }}
                        className="min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs text-[#6E6E73]"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="min-h-[38px] sm:min-h-0 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#0071E3] text-white"
                      >
                        حفظ المجموعة
                      </button>
                    </div>
                  </form>
                );
              }

              const isFull = grp.capacity > 0 && enrolledCount >= grp.capacity;
              return (
                <div
                  key={grp.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                      {grp.name}
                    </div>
                    <div className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                      {grp.gradeLevel} · {LESSON_MODE_LABELS_AR[grp.lessonMode]} ·{' '}
                      {grp.roomOrLink} ·{' '}
                      <span className="tabular-nums font-medium">
                        {formatCurrency(grp.defaultFee, settings.currency)}
                      </span>{' '}
                      ·{' '}
                      <span
                        className={`tabular-nums ${
                          isFull
                            ? 'text-[#D97706] dark:text-[#FBBF24] font-semibold'
                            : ''
                        }`}
                      >
                        {enrolledCount}/{grp.capacity} طالب{isFull ? ' (مكتملة)' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditGroup(grp)}
                      aria-label={`تعديل مجموعة ${grp.name}`}
                      className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-2 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteGroup(grp.id)}
                      aria-label={`حذف مجموعة ${grp.name}`}
                      className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-2 rounded-lg text-[#6E6E73] hover:text-[#DC2626] hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={handleCreateGroup}
          className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          <input
            type="text"
            value={newGrp.name}
            onChange={(e) => {
              setNewGrp((p) => ({ ...p, name: e.target.value }));
              setGrpError('');
            }}
            placeholder="اسم المجموعة (مثال: سنتر المهندسين)"
            aria-label="اسم المجموعة الجديدة"
            className="min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26]"
          />
          <input
            type="text"
            value={newGrp.subject}
            onChange={(e) =>
              setNewGrp((p) => ({ ...p, subject: e.target.value }))
            }
            placeholder="المادة الدراسية"
            aria-label="المادة الدراسية"
            className="min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26]"
          />
          <input
            type="text"
            value={newGrp.gradeLevel}
            onChange={(e) =>
              setNewGrp((p) => ({ ...p, gradeLevel: e.target.value }))
            }
            placeholder="الصف الدراسي"
            aria-label="الصف الدراسي"
            className="min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26]"
          />
          <select
            value={newGrp.lessonMode}
            onChange={(e) =>
              setNewGrp((p) => ({
                ...p,
                lessonMode: e.target.value as LessonMode,
              }))
            }
            aria-label="نمط الحصة"
            className="min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26]"
          >
            {(Object.keys(LESSON_MODE_LABELS_AR) as LessonMode[]).map((m) => (
              <option key={m} value={m}>
                {LESSON_MODE_LABELS_AR[m]}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newGrp.roomOrLink}
            onChange={(e) => {
              setNewGrp((p) => ({ ...p, roomOrLink: e.target.value }));
              setGrpError('');
            }}
            placeholder="اسم السنتر والقاعة أو رابط البث"
            aria-label="مكان السنتر أو الرابط"
            className="min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-xl text-base sm:text-xs bg-[#F5F5F7] dark:bg-[#1C1F26]"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={newGrp.defaultFee}
              onChange={(e) => {
                setNewGrp((p) => ({
                  ...p,
                  defaultFee: Number(e.target.value),
                }));
                setGrpError('');
              }}
              placeholder="الرسوم"
              aria-label="الرسوم الافتراضية"
              className="w-24 min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26]"
            />
            <input
              type="number"
              min={1}
              value={newGrp.capacity}
              onChange={(e) => {
                setNewGrp((p) => ({
                  ...p,
                  capacity: Number(e.target.value),
                }));
                setGrpError('');
              }}
              placeholder="السعة"
              aria-label="سعة المجموعة"
              className="w-20 min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl text-base sm:text-xs tabular-nums bg-[#F5F5F7] dark:bg-[#1C1F26]"
            />
            <button
              type="submit"
              className="flex-1 min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-[#1D1D1F] dark:bg-[#0071E3] text-white active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مجموعة</span>
            </button>
          </div>
          {grpError && (
            <p className="sm:col-span-2 lg:col-span-3 text-xs text-[#DC2626] dark:text-[#F87171]">
              {grpError}
            </p>
          )}
        </form>
      </section>

      {/* Backup & Data Export */}
      <section
        aria-label="النسخ الاحتياطي وتصدير البيانات"
        className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-6 space-y-4"
      >
        <div>
          <h2 className="text-base font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
            النسخ الاحتياطي وتصدير الجداول
          </h2>
          <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
            احتفظ بنسخة احتياطية كاملة من بيانات المركز أو صدّر سجلات الطلاب والمدفوعات بصيغة Excel (CSV)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                `ofok-backup-${settings.referenceDate}.json`,
                createBackupJson({
                  students,
                  payments,
                  sessions,
                  groups,
                  settings,
                }),
                'application/json;charset=utf-8;'
              )
            }
            className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير نسخة احتياطية (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>استيراد نسخة احتياطية</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            aria-label="ملف النسخة الاحتياطية"
            className="hidden"
          />

          <button
            type="button"
            disabled={students.length === 0}
            onClick={() =>
              downloadTextFile(
                `ofok-students-${settings.referenceDate}.csv`,
                buildStudentsCsv(students, settings.currency),
                'text/csv;charset=utf-8;'
              )
            }
            className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] disabled:opacity-45 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير الطلاب (CSV)</span>
          </button>

          <button
            type="button"
            disabled={payments.length === 0}
            onClick={() =>
              downloadTextFile(
                `ofok-payments-${settings.referenceDate}.csv`,
                buildPaymentsCsv(payments, settings.currency),
                'text/csv;charset=utf-8;'
              )
            }
            className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1F26] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] disabled:opacity-45 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير المدفوعات (CSV)</span>
          </button>
        </div>

        {backupFeedback && (
          <div
            className={`rounded-xl px-4 py-2.5 text-xs font-medium ${
              backupFeedback.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-[#059669] dark:text-[#34D399]'
                : 'bg-red-500/10 border border-red-500/20 text-[#DC2626] dark:text-[#F87171]'
            }`}
          >
            {backupFeedback.text}
          </div>
        )}
      </section>

      {/* Onboarding Tutorial Replay */}
      <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
            جولة التعريف ودليل البدء السريع
          </h2>
          <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
            مراجعة الخطوات الأساسية لإعداد المجموعات، تسجيل الطلاب، بناء الجدول، ورصد الحضور
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenTutorial}
          className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] hover:bg-[#0071E3]/15 active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>عرض جولة التعريف</span>
        </button>
      </div>

      {/* Reset to Zero */}
      <div className="rounded-2xl bg-white dark:bg-[#14161C] border border-black/[0.06] dark:border-white/[0.08] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-display font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
            تصفير بيانات البرنامج
          </h2>
          <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
            مسح جميع الطلاب والمدفوعات والحصص والمجموعات والبدء من الصفر
          </p>
        </div>
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-[#DC2626] dark:text-[#F87171] bg-red-500/8 hover:bg-red-500/15 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تصفير البيانات</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="min-h-[44px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs text-[#6E6E73]"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => {
                onResetDemoData();
                setConfirmReset(false);
              }}
              className="min-h-[44px] sm:min-h-0 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#DC2626] text-white"
            >
              تأكيد التصفير
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
