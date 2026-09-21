import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CheckSquare,
  FileText,
  Mic,
  StickyNote,
  Wallet,
  Wheat,
  X,
} from 'lucide-react';
import RightDrawer from '../Common/RightDrawer';
import type { CaptureContext, CaptureSavedDetail, CaptureSavedOptions, CaptureType } from '../../capture/types';
import { getAvailableCaptureActions } from '../../capture/permissions';
import { getFieldService } from '../../services/serviceFactory';
import { noteService } from '../../services/noteService';
import { harvestService } from '../../services/harvestService';
import { fileUploadService } from '../../services/fileUploadService';
import type { Field } from '../../services/fieldService';
import { useAuth } from '../../context/AuthContext';
import { useActiveFieldAccess } from '../../hooks/useActiveFieldAccess';
import { readLastMoneyFieldId } from '../../finance/lastField';
import MoneyCaptureForm from './MoneyCaptureForm';
import './Capture.css';

const MAX_PHOTOS = 5;

type Props = {
  open: boolean;
  context: CaptureContext;
  onClose: () => void;
  onContextChange: (ctx: CaptureContext) => void;
  onSaved: (detail: CaptureSavedDetail, message: string, options?: CaptureSavedOptions) => void;
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
  const { t } = useTranslation(['capture', 'fields', 'common', 'chronologio']);
  const { user } = useAuth();
  const activeField = useActiveFieldAccess();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const [step, setStep] = useState<'choose' | CaptureType>(context.preferredType || 'choose');
  const wasOpenRef = useRef(open);
  if (open && !wasOpenRef.current) {
    setStep(context.preferredType || 'choose');
  }
  wasOpenRef.current = open;
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

  // Voice
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);

  // Document
  const [documentName, setDocumentName] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  // Harvest
  const [oliveKg, setOliveKg] = useState('');
  const [oilKg, setOilKg] = useState('');
  const [harvestNotes, setHarvestNotes] = useState('');

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
        familyModules: activeField.modules,
        accessLevel: activeField.accessLevel,
      }),
    [fields, user, activeField.modules, activeField.accessLevel]
  );

  const yieldPct = useMemo(() => {
    const olives = Number(oliveKg.replace(',', '.'));
    const oil = Number(oilKg.replace(',', '.'));
    if (!olives || !oil || olives <= 0) return null;
    return Math.round((oil / olives) * 1000) / 10;
  }, [oliveKg, oilKg]);

  useEffect(() => {
    if (!open) return;
    const moneyStep =
      context.preferredType === 'expense' ||
      context.preferredType === 'income' ||
      context.preferredType === 'money'
        ? context.preferredType
        : null;
    setStep(moneyStep || context.preferredType || 'choose');
    setFieldId(context.fieldId || readLastMoneyFieldId() || '');
    setOccurredAt(toDateTimeLocal(context.occurredAt));
    setDirty(false);
    setError(null);
    setMoreOpen(false);
    setBody('');
    setPhotos([]);
    setRecording(false);
    setRecordingSeconds(0);
    setVoiceBlob(null);
    setVoicePreviewUrl(null);
    setDocumentName('');
    setDocumentFile(null);
    setOliveKg('');
    setOilKg('');
    setHarvestNotes('');
    void getFieldService()
      .getFields()
      .then(setFields)
      .catch(() => setFields([]));
  }, [
    open,
    context.preferredType,
    context.fieldId,
    context.occurredAt,
    context.dateDefaultedToToday,
    context.taskId,
    context.harvestId,
    context.category,
    context.description,
  ]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current != null) window.clearInterval(recordingTimerRef.current);
      voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
    };
  }, [voicePreviewUrl]);

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

  const clearVoice = () => {
    if (recordingTimerRef.current != null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceStreamRef.current = null;
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecordingSeconds(0);
    setVoiceBlob(null);
    setVoicePreviewUrl(null);
  };

  const startVoiceRecording = async () => {
    setError(null);
    try {
      clearVoice();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      voiceChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(voiceChunksRef.current, { type });
        setVoiceBlob(blob);
        setVoicePreviewUrl(URL.createObjectURL(blob));
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
        voiceStreamRef.current = null;
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
      markDirty();
    } catch {
      setError(t('capture:errors.micDenied'));
    }
  };

  const stopVoiceRecording = () => {
    if (recordingTimerRef.current != null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
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
          {
            type: 'observation',
            fieldId,
            sourceId: note.id,
            description: body.trim() || undefined,
            harvestCampaignLink: context.harvestCampaignLink,
          },
          t('capture:observation.saved')
        );
      } else if (step === 'work') {
        if (!ensureField()) return;
        const q = new URLSearchParams();
        q.set('fieldId', fieldId);
        onClose();
        navigate(`/tasks/new?${q.toString()}`);
        return;
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
          notes: harvestNotes.trim() || undefined,
          mediaUrls,
        });
        onSaved({ type: 'harvest', fieldId, sourceId: harvest.id }, t('capture:harvest.saved'));
      } else if (step === 'voice') {
        let blob = voiceBlob;
        if (recording || (!blob && mediaRecorderRef.current?.state === 'recording')) {
          blob = await new Promise<Blob | null>((resolve) => {
            const recorder = mediaRecorderRef.current;
            if (!recorder || recorder.state === 'inactive') {
              resolve(voiceBlob);
              return;
            }
            recorder.onstop = () => {
              const type = recorder.mimeType || 'audio/webm';
              const next = new Blob(voiceChunksRef.current, { type });
              setVoiceBlob(next);
              setVoicePreviewUrl(URL.createObjectURL(next));
              voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
              voiceStreamRef.current = null;
              resolve(next);
            };
            stopVoiceRecording();
          });
        }
        if (!blob) {
          setError(t('capture:errors.voiceEmpty'));
          setSubmitting(false);
          return;
        }
        const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([blob], `voice-${Date.now()}.${ext}`, {
          type: blob.type || 'audio/webm',
        });
        const mediaUrl = await fileUploadService.uploadFile(file);
        const note = await noteService.createNote({
          body: t('capture:voice.noteBody'),
          fieldId,
          pinned: true,
          occurredAt: when,
          mediaUrls: [mediaUrl],
        });
        onSaved({ type: 'voice', fieldId, sourceId: note.id }, t('capture:voice.saved'));
      } else if (step === 'document') {
        if (!documentName.trim()) {
          setError(t('capture:errors.documentNameRequired'));
          setSubmitting(false);
          return;
        }
        if (!documentFile) {
          setError(t('capture:errors.documentFileRequired'));
          setSubmitting(false);
          return;
        }
        const mediaUrl = await fileUploadService.uploadFile(documentFile);
        const note = await noteService.createNote({
          body: documentName.trim(),
          fieldId,
          pinned: true,
          occurredAt: when,
          mediaUrls: [mediaUrl],
        });
        onSaved({ type: 'document', fieldId, sourceId: note.id }, t('capture:document.saved'));
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
    { type: 'money', icon: <Wallet size={22} />, enabled: permissions.canRecordMoney },
    { type: 'harvest', icon: <Wheat size={22} />, enabled: permissions.canRecordHarvest },
    { type: 'voice', icon: <Mic size={22} />, enabled: permissions.canRecordVoice },
    { type: 'document', icon: <FileText size={22} />, enabled: permissions.canRecordDocument },
  ];

  const isMoneyStep = step === 'money' || step === 'expense' || step === 'income';
  const fieldLocked = Boolean(context.fieldId);
  const selectedFieldName = fields.find((f) => f.id === fieldId)?.name;

  return (
    <RightDrawer
      open={open}
      onClose={requestClose}
      resetKey={`${step}:${context.fieldId || ''}`}
      size={isMoneyStep ? 'lg' : 'md'}
      title={
        isMoneyStep
          ? t('capture:money.cta')
          : step === 'choose'
            ? t('capture:title')
            : t(`capture:types.${step}.title`)
      }
      subtitle={!isMoneyStep && step !== 'choose' ? selectedFieldName : undefined}
      hideClose={!isMoneyStep}
      leading={
        isMoneyStep ? undefined : (
          <button
            type="button"
            className="oa-drawer-icon-btn"
            onClick={goBack}
            aria-label={step === 'choose' ? t('capture:cancel') : t('capture:back')}
          >
            {step === 'choose' ? <X size={18} aria-hidden /> : <ArrowLeft size={18} aria-hidden />}
          </button>
        )
      }
      bodyClassName={isMoneyStep ? 'oa-drawer-body--flush' : undefined}
      footer={
        step !== 'choose' && !isMoneyStep ? (
          <button
            type="button"
            className="capture-save-btn"
            disabled={submitting}
            onClick={() => void handleSave()}
          >
            {submitting ? t('capture:saving') : t('capture:save')}
          </button>
        ) : undefined
      }
    >
            {isMoneyStep ? (
              <MoneyCaptureForm
                context={{
                  ...context,
                  fieldId: context.fieldId || fieldId || undefined,
                  preferredType: step === 'money' ? 'money' : step,
                }}
                fields={fields}
                canRecordIncome={permissions.canRecordIncome}
                canRecordExpense={permissions.canRecordExpense}
                onSaved={onSaved}
              />
            ) : (
              <>
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
                  {context.dateDefaultedToToday ? (
                    <p className="capture-hint">{t('chronologio:captureDateUsesToday')}</p>
                  ) : null}

                  {step === 'observation' ? (
                    <>
                      {context.harvestCampaignLink ? (
                        <p className="capture-hint">
                          {t('fields:harvestCampaign.note.chronologioHint')}
                        </p>
                      ) : null}
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

                  {step === 'voice' ? (
                    <div className="capture-label">
                      <p>{t('capture:voice.hint')}</p>
                      <div className="capture-voice-row">
                        <button
                          type="button"
                          className={`capture-voice-btn${recording ? ' is-recording' : ''}`}
                          onClick={() => {
                            if (recording) stopVoiceRecording();
                            else void startVoiceRecording();
                          }}
                        >
                          <Mic size={18} />
                          {recording
                            ? t('capture:voice.stop', {
                                time: `${Math.floor(recordingSeconds / 60)}:${String(
                                  recordingSeconds % 60
                                ).padStart(2, '0')}`,
                              })
                            : voiceBlob
                              ? t('capture:voice.rerecord')
                              : t('capture:voice.record')}
                        </button>
                        {voiceBlob ? (
                          <button
                            type="button"
                            className="capture-voice-btn"
                            onClick={() => {
                              clearVoice();
                              markDirty();
                            }}
                          >
                            <X size={16} />
                            {t('capture:voice.clear')}
                          </button>
                        ) : null}
                      </div>
                      {voicePreviewUrl ? (
                        <audio className="capture-voice-preview" controls src={voicePreviewUrl} />
                      ) : null}
                    </div>
                  ) : null}

                  {step === 'document' ? (
                    <>
                      <label className="capture-label">
                        {t('capture:document.nameLabel')}
                        <input
                          value={documentName}
                          placeholder={t('capture:document.namePlaceholder')}
                          onChange={(e) => {
                            setDocumentName(e.target.value);
                            markDirty();
                          }}
                        />
                      </label>
                      <div className="capture-document-row">
                        <button
                          type="button"
                          className="capture-document-btn"
                          onClick={() => docFileRef.current?.click()}
                        >
                          <FileText size={18} />
                          {documentFile
                            ? documentFile.name
                            : t('capture:document.chooseFile')}
                        </button>
                        <input
                          ref={docFileRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,application/pdf,text/plain"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setDocumentFile(file);
                            if (file && !documentName.trim()) {
                              setDocumentName(file.name.replace(/\.[^.]+$/, ''));
                            }
                            markDirty();
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </>
                  ) : null}

                  {step === 'work' ? (
                    <div className="capture-label">
                      <p>{t('capture:work.whatWork')}</p>
                      <p className="capture-hint">
                        {t('capture:scheduleLater', { defaultValue: 'Continue to create a field task.' })}
                      </p>
                    </div>
                  ) : null}

                  {step === 'harvest' ? (
                    <>
                      <label className="capture-label">
                        {t('capture:harvest.olivesKg')}
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
                        {t('capture:harvest.oilKg')}
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
              </>
            )}
    </RightDrawer>
  );
};

export default CaptureDrawer;
