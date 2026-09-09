import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  Camera,
  CheckSquare,
  StickyNote,
  Wallet,
  Wheat,
  X,
} from 'lucide-react';
import type { CaptureContext, CaptureSavedDetail, CaptureType } from '../../capture/types';
import { getAvailableCaptureActions } from '../../capture/permissions';
import { getFieldService } from '../../services/serviceFactory';
import { noteService } from '../../services/noteService';
import { financialEntryService } from '../../services/financialEntryService';
import { harvestService } from '../../services/harvestService';
import { fileUploadService } from '../../services/fileUploadService';
import { taskService } from '../../services/taskService';
import type { Field } from '../../services/fieldService';
import { OLIVE_TASK_TEMPLATES } from '../../data/oliveTaskTemplates';
import { useAuth } from '../../context/AuthContext';
import { useLocalizedTemplates } from '../../hooks/useLocalizedTaskTemplate';
import { buildCreateTaskUrl } from '../../utils/taskTemplateUtils';
import './Capture.css';

const MAX_PHOTOS = 5;

const WORK_TEMPLATE_IDS = [
  'main_pruning',
  'irrigation_event',
  'nitrogen_application',
  'olive_fruit_fly_monitoring',
  'weed_control_mowing',
  'disease_scouting',
  'equipment_maintenance',
];

const EXPENSE_CATEGORIES = [
  'labor',
  'fertilizers',
  'treatments',
  'electricity_fuel',
  'equipment',
  'transport',
  'mill_cost',
  'other',
] as const;

type Props = {
  open: boolean;
  context: CaptureContext;
  onClose: () => void;
  onContextChange: (ctx: CaptureContext) => void;
  onSaved: (detail: CaptureSavedDetail, message: string) => void;
};

type PhotoItem = { id: string; file: File; preview: string; url?: string };

const toDateTimeLocal = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDateTimeLocal = (value: string) => new Date(value).toISOString();

const CaptureDrawer: React.FC<Props> = ({
  open,
  context,
  onClose,
  onContextChange,
  onSaved,
}) => {
  const { t } = useTranslation(['capture', 'fields', 'common']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const localized = useLocalizedTemplates(OLIVE_TASK_TEMPLATES);
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'choose' | CaptureType>('choose');
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldId, setFieldId] = useState(context.fieldId || '');
  const [occurredAt, setOccurredAt] = useState(toDateTimeLocal(context.occurredAt));
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  // Observation
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // Work
  const [templateId, setTemplateId] = useState('');
  const [workNote, setWorkNote] = useState('');
  const [workCost, setWorkCost] = useState('');

  // Expense
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('labor');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [taskId, setTaskId] = useState(context.taskId || '');

  // Harvest
  const [oliveKg, setOliveKg] = useState('');
  const [oilKg, setOilKg] = useState('');
  const [mill, setMill] = useState('');
  const [quality, setQuality] = useState('');
  const [workers, setWorkers] = useState('');
  const [method, setMethod] = useState('');
  const [harvestNotes, setHarvestNotes] = useState('');

  const workTemplates = useMemo(
    () => localized.filter((tpl) => WORK_TEMPLATE_IDS.includes(tpl.id)),
    [localized]
  );

  const permissions = useMemo(
    () =>
      getAvailableCaptureActions({
        hasAnyFieldAccess: fields.length > 0,
        canOwn:
          user?.role === 'FieldOwner' ||
          user?.role === 'Administrator' ||
          fields.some((f) => f.ownerId === user?.userId),
        canWork:
          user?.role === 'Producer' ||
          user?.role === 'FieldOwner' ||
          user?.role === 'Administrator',
      }),
    [fields, user]
  );

  const yieldPct = useMemo(() => {
    const olives = Number(oliveKg.replace(',', '.'));
    const oil = Number(oilKg.replace(',', '.'));
    if (!olives || !oil || olives <= 0) return null;
    return Math.round((oil / olives) * 1000) / 10;
  }, [oliveKg, oilKg]);

  useEffect(() => {
    if (!open) return;
    setStep(context.preferredType || 'choose');
    setFieldId(context.fieldId || '');
    setOccurredAt(toDateTimeLocal(context.occurredAt));
    setTaskId(context.taskId || '');
    setDirty(false);
    setError(null);
    setMoreOpen(false);
    setBody('');
    setPhotos([]);
    setTemplateId('');
    setWorkNote('');
    setWorkCost('');
    setAmount('');
    setCategory('labor');
    setExpenseDesc('');
    setOliveKg('');
    setOilKg('');
    setMill('');
    setQuality('');
    setWorkers('');
    setMethod('');
    setHarvestNotes('');
    void getFieldService()
      .getFields()
      .then(setFields)
      .catch(() => setFields([]));
  }, [open, context.preferredType, context.fieldId, context.occurredAt, context.taskId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dirty]);

  const markDirty = () => setDirty(true);

  const requestClose = () => {
    if (dirty) {
      const ok = window.confirm(t('capture:discardTitle'));
      if (!ok) return;
    }
    onClose();
  };

  const selectType = (type: CaptureType) => {
    setStep(type);
    setError(null);
  };

  const goBack = () => {
    if (step === 'choose') {
      requestClose();
      return;
    }
    setStep('choose');
    setError(null);
  };

  const onFieldChange = (id: string) => {
    setFieldId(id);
    onContextChange({ ...context, fieldId: id || undefined });
    markDirty();
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    const next: PhotoItem[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith('image/')) continue;
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    if (next.length) {
      setPhotos((prev) => [...prev, ...next]);
      markDirty();
    }
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const photo of photos) {
      if (photo.url) {
        urls.push(photo.url);
        continue;
      }
      const url = await fileUploadService.uploadFile(photo.file);
      urls.push(url);
    }
    return urls;
  };

  const ensureField = () => {
    if (!fieldId) {
      setError(t('capture:errors.fieldRequired'));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!ensureField()) return;
    setSubmitting(true);
    setError(null);
    try {
      const when = fromDateTimeLocal(occurredAt);
      if (step === 'observation') {
        if (!body.trim() && photos.length === 0) {
          setError(t('capture:errors.observationEmpty'));
          setSubmitting(false);
          return;
        }
        const mediaUrls = await uploadPhotos();
        const note = await noteService.createNote({
          body: body.trim(),
          fieldId,
          pinned: true,
          occurredAt: when,
          mediaUrls,
        });
        onSaved(
          { type: 'observation', fieldId, sourceId: note.id },
          t('capture:observation.saved')
        );
      } else if (step === 'work') {
        const tpl = workTemplates.find((x) => x.id === templateId);
        if (!tpl) {
          setError(t('capture:errors.workTypeRequired'));
          setSubmitting(false);
          return;
        }
        const mediaUrls = await uploadPhotos();
        const cost = workCost.trim() ? Number(workCost.replace(',', '.')) : undefined;
        const task = await taskService.recordCompletedWork({
          fieldId,
          templateId: tpl.id,
          type: tpl.category,
          title: tpl.title,
          description: workNote.trim() || undefined,
          occurredAt: when,
          costAmount: cost && !Number.isNaN(cost) ? cost : undefined,
          currency: 'EUR',
          costCategory: 'labor',
          mediaUrls,
        });
        onSaved({ type: 'work', fieldId, sourceId: task.id }, t('capture:work.saved'));
      } else if (step === 'expense') {
        const value = Number(amount.replace(',', '.'));
        if (!value || Number.isNaN(value)) {
          setError(t('capture:errors.amountRequired'));
          setSubmitting(false);
          return;
        }
        const entry = await financialEntryService.create({
          fieldId,
          amount: value,
          kind: 'expense',
          category,
          description: expenseDesc.trim() || t(`fields:financial.categories.${category}`, { defaultValue: category }),
          occurredOn: when,
          taskId: taskId || undefined,
          currency: 'EUR',
        });
        onSaved({ type: 'expense', fieldId, sourceId: entry.id }, t('capture:expense.saved'));
      } else if (step === 'harvest') {
        const olives = Number(oliveKg.replace(',', '.'));
        if (!olives || Number.isNaN(olives)) {
          setError(t('capture:errors.oliveRequired'));
          setSubmitting(false);
          return;
        }
        const oil = oilKg.trim() ? Number(oilKg.replace(',', '.')) : undefined;
        const mediaUrls = await uploadPhotos();
        const harvest = await harvestService.create({
          fieldId,
          harvestDate: when,
          oliveKg: olives,
          oilKg: oil && !Number.isNaN(oil) ? oil : undefined,
          oilYieldPercent: yieldPct ?? undefined,
          millName: mill.trim() || undefined,
          qualityGrade: quality.trim() || undefined,
          workersUsed: workers.trim() ? Number(workers) : 0,
          harvestMethod: method.trim() || undefined,
          notes: harvestNotes.trim() || undefined,
          mediaUrls,
        });
        onSaved({ type: 'harvest', fieldId, sourceId: harvest.id }, t('capture:harvest.saved'));
      }
    } catch {
      setError(t('capture:errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const typeCards: Array<{ type: CaptureType; icon: React.ReactNode; enabled: boolean }> = [
    {
      type: 'observation',
      icon: <StickyNote size={22} />,
      enabled: permissions.canRecordObservation,
    },
    { type: 'work', icon: <CheckSquare size={22} />, enabled: permissions.canRecordWork },
    { type: 'expense', icon: <Wallet size={22} />, enabled: permissions.canRecordExpense },
    { type: 'harvest', icon: <Wheat size={22} />, enabled: permissions.canRecordHarvest },
  ];

  const fieldLocked = Boolean(context.fieldId);
  const selectedFieldName = fields.find((f) => f.id === fieldId)?.name;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className="capture-backdrop"
            aria-label={t('capture:cancel')}
            onClick={requestClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          />
          <motion.aside
            className="capture-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('capture:title')}
            initial={reduceMotion ? false : { x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { x: 16, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.26, ease: 'easeOut' }}
          >
            <header className="capture-drawer-header">
              <button type="button" className="capture-icon-btn" onClick={goBack} aria-label={t('capture:back')}>
                {step === 'choose' ? <X size={20} /> : <ArrowLeft size={20} />}
              </button>
              <div>
                <h2>
                  {step === 'choose'
                    ? t('capture:title')
                    : t(`capture:types.${step}.title`)}
                </h2>
                {step !== 'choose' && selectedFieldName ? (
                  <p className="capture-header-meta">{selectedFieldName}</p>
                ) : null}
              </div>
            </header>

            <div className="capture-drawer-body">
              {step === 'choose' ? (
                <div className="capture-type-list">
                  <p className="capture-prompt">{t('capture:whatToRecord')}</p>
                  {typeCards
                    .filter((c) => c.enabled)
                    .map((card) => (
                      <button
                        key={card.type}
                        type="button"
                        className="capture-type-card"
                        onClick={() => selectType(card.type)}
                      >
                        <span className="capture-type-icon">{card.icon}</span>
                        <span>
                          <strong>{t(`capture:types.${card.type}.title`)}</strong>
                          <span>{t(`capture:types.${card.type}.description`)}</span>
                        </span>
                      </button>
                    ))}
                </div>
              ) : (
                <div className="capture-form">
                  <label className="capture-label">
                    {t('capture:fieldLabel')}
                    {fieldLocked ? (
                      <div className="capture-field-locked">{selectedFieldName || fieldId}</div>
                    ) : (
                      <select
                        value={fieldId}
                        onChange={(e) => onFieldChange(e.target.value)}
                        aria-label={t('capture:fieldPrompt')}
                      >
                        <option value="">{t('capture:fieldPrompt')}</option>
                        {fields.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>

                  <label className="capture-label">
                    {t('capture:dateLabel')}
                    <input
                      type="datetime-local"
                      value={occurredAt}
                      onChange={(e) => {
                        setOccurredAt(e.target.value);
                        markDirty();
                      }}
                    />
                  </label>

                  {step === 'observation' ? (
                    <>
                      <label className="capture-label">
                        {t('capture:types.observation.title')}
                        <textarea
                          rows={4}
                          placeholder={t('capture:observation.placeholder')}
                          value={body}
                          onChange={(e) => {
                            setBody(e.target.value);
                            markDirty();
                          }}
                        />
                      </label>
                    </>
                  ) : null}

                  {step === 'work' ? (
                    <>
                      <div className="capture-label">{t('capture:work.whatWork')}</div>
                      <div className="capture-chip-grid">
                        {workTemplates.map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            className={`capture-chip${templateId === tpl.id ? ' is-active' : ''}`}
                            onClick={() => {
                              setTemplateId(tpl.id);
                              markDirty();
                            }}
                          >
                            {tpl.title}
                          </button>
                        ))}
                      </div>
                      <label className="capture-label">
                        {t('capture:work.optionalCost')}
                        <input
                          inputMode="decimal"
                          value={workCost}
                          onChange={(e) => {
                            setWorkCost(e.target.value);
                            markDirty();
                          }}
                          placeholder="€"
                        />
                      </label>
                      <label className="capture-label">
                        {t('capture:work.optionalNote')}
                        <textarea
                          rows={2}
                          value={workNote}
                          onChange={(e) => {
                            setWorkNote(e.target.value);
                            markDirty();
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="capture-link"
                        onClick={() => {
                          onClose();
                          navigate(
                            templateId
                              ? buildCreateTaskUrl(templateId, fieldId || undefined)
                              : fieldId
                                ? `/tasks/new?fieldId=${encodeURIComponent(fieldId)}`
                                : '/tasks/new'
                          );
                        }}
                      >
                        {t('capture:scheduleLater')}
                      </button>
                    </>
                  ) : null}

                  {step === 'expense' ? (
                    <>
                      <label className="capture-label capture-amount-label">
                        {t('capture:expense.amount')}
                        <input
                          className="capture-amount-input"
                          inputMode="decimal"
                          value={amount}
                          onChange={(e) => {
                            setAmount(e.target.value);
                            markDirty();
                          }}
                          placeholder="0,00 €"
                        />
                      </label>
                      <div className="capture-label">{t('capture:expense.category')}</div>
                      <div className="capture-chip-grid">
                        {EXPENSE_CATEGORIES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`capture-chip${category === c ? ' is-active' : ''}`}
                            onClick={() => {
                              setCategory(c);
                              markDirty();
                            }}
                          >
                            {t(`fields:financial.categories.${c}`, { defaultValue: c })}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="capture-more-toggle"
                        onClick={() => setMoreOpen((v) => !v)}
                      >
                        {moreOpen ? t('capture:less') : t('capture:more')}
                      </button>
                      {moreOpen ? (
                        <label className="capture-label">
                          {t('capture:expense.description')}
                          <input
                            value={expenseDesc}
                            onChange={(e) => {
                              setExpenseDesc(e.target.value);
                              markDirty();
                            }}
                          />
                        </label>
                      ) : null}
                      {taskId ? (
                        <p className="capture-hint">
                          {t('capture:expense.relatedWork')}: {taskId}
                        </p>
                      ) : null}
                    </>
                  ) : null}

                  {step === 'harvest' ? (
                    <>
                      <label className="capture-label">
                        {t('capture:harvest.olives')} (kg)
                        <input
                          inputMode="decimal"
                          value={oliveKg}
                          onChange={(e) => {
                            setOliveKg(e.target.value);
                            markDirty();
                          }}
                        />
                      </label>
                      <label className="capture-label">
                        {t('capture:harvest.oil')} (kg)
                        <input
                          inputMode="decimal"
                          value={oilKg}
                          onChange={(e) => {
                            setOilKg(e.target.value);
                            markDirty();
                          }}
                        />
                      </label>
                      {yieldPct != null ? (
                        <div className="capture-yield">
                          {t('capture:harvest.yield')}: <strong>{yieldPct}%</strong>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        className="capture-more-toggle"
                        onClick={() => setMoreOpen((v) => !v)}
                      >
                        {moreOpen ? t('capture:less') : t('capture:more')}
                      </button>
                      {moreOpen ? (
                        <>
                          <label className="capture-label">
                            {t('capture:harvest.mill')}
                            <input value={mill} onChange={(e) => { setMill(e.target.value); markDirty(); }} />
                          </label>
                          <label className="capture-label">
                            {t('capture:harvest.quality')}
                            <input value={quality} onChange={(e) => { setQuality(e.target.value); markDirty(); }} />
                          </label>
                          <label className="capture-label">
                            {t('capture:harvest.workers')}
                            <input inputMode="numeric" value={workers} onChange={(e) => { setWorkers(e.target.value); markDirty(); }} />
                          </label>
                          <label className="capture-label">
                            {t('capture:harvest.method')}
                            <input value={method} onChange={(e) => { setMethod(e.target.value); markDirty(); }} />
                          </label>
                          <label className="capture-label">
                            {t('capture:harvest.notes')}
                            <textarea rows={2} value={harvestNotes} onChange={(e) => { setHarvestNotes(e.target.value); markDirty(); }} />
                          </label>
                        </>
                      ) : null}
                    </>
                  ) : null}

                  {(step === 'observation' || step === 'work' || step === 'harvest') && (
                    <div className="capture-photos">
                      <div className="capture-photo-row">
                        {photos.map((p) => (
                          <div key={p.id} className="capture-photo-thumb">
                            <img src={p.preview} alt="" />
                            <button
                              type="button"
                              aria-label={t('capture:photos.remove')}
                              onClick={() => {
                                URL.revokeObjectURL(p.preview);
                                setPhotos((prev) => prev.filter((x) => x.id !== p.id));
                                markDirty();
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        {photos.length < MAX_PHOTOS ? (
                          <button
                            type="button"
                            className="capture-add-photo"
                            onClick={() => fileRef.current?.click()}
                          >
                            <Camera size={18} />
                            {t('capture:observation.addPhoto')}
                          </button>
                        ) : null}
                      </div>
                      <p className="capture-hint">{t('capture:photos.limit', { count: MAX_PHOTOS })}</p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        hidden
                        onChange={(e) => {
                          void addPhotos(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  )}

                  {error ? <p className="capture-error">{error}</p> : null}
                </div>
              )}
            </div>

            {step !== 'choose' ? (
              <footer className="capture-drawer-footer">
                <button
                  type="button"
                  className="capture-save-btn"
                  disabled={submitting}
                  onClick={() => void handleSave()}
                >
                  {submitting ? t('capture:saving') : t('capture:save')}
                </button>
              </footer>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
};

export default CaptureDrawer;
