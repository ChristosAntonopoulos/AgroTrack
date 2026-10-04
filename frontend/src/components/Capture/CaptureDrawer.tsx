import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, FileText, Mic, X } from 'lucide-react';
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
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';
import { getHarvestCapabilities } from '../../harvestCampaign/harvestCapabilities';
import { millKgNeedingOil, pendingSackTotal } from '../../harvestCampaign/chain';
import type { HarvestCaptureKind } from '../../harvestCampaign/types';
import { buildCaptureMenu, type CaptureMove } from '../../capture/menu';
import { buildQuickAddMoves } from '../../capture/quickAdd';
import { resolveCaptureFieldId } from '../../capture/fieldContext';
import {
  readLastCaptureFieldId,
  readRecentCaptureMoves,
  rememberCaptureMove,
  rememberLastCaptureFieldId,
} from '../../capture/recentActions';
import { harvestPath, myOilPath, taskFormPath } from '../../navigation/intents';
import { dayKeyFromOccurredAt } from '../../capture/openContext';
import CaptureQuickAdd from './CaptureQuickAdd';
import CaptureCatalog from './CaptureCatalog';
import CaptureContextChips from './CaptureContextChips';
import { readLastMoneyFieldId } from '../../finance/lastField';
import { templateTitle } from '../../data/fieldWorkCatalogueLabels';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import MoneyCaptureForm from './MoneyCaptureForm';
import PhotoCaptureForm from './PhotoCaptureForm';
import './Capture.css';
import '../../harvestCampaign/HarvestSheets.css';

const MAX_PHOTOS = 5;

const WORK_CHOICES = ['T06', 'T05', 'T09', 'T14', 'T15', 'T08', 'T17', 'T21'] as const;

type Props = {
  open: boolean;
  context: CaptureContext;
  onClose: () => void;
  onContextChange: (ctx: CaptureContext) => void;
  onSaved: (detail: CaptureSavedDetail, message: string, options?: CaptureSavedOptions) => void;
};

type PhotoItem = { id: string; file: File; preview: string; url?: string };

/** Chooser stages before a concrete form. */
type ChooserStep = 'quick' | 'catalog';
type DrawerStep = ChooserStep | CaptureType;

const isChooserStep = (step: DrawerStep): step is ChooserStep =>
  step === 'quick' || step === 'catalog';

const initialStepFromContext = (preferredType?: CaptureType): DrawerStep => {
  if (preferredType === 'expense' || preferredType === 'income') return preferredType;
  if (preferredType && preferredType !== 'harvest' && preferredType !== 'money') {
    return preferredType;
  }
  return 'quick';
};

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
  const { t, i18n } = useTranslation(['capture', 'fields', 'common', 'chronologio', 'money']);
  const { user } = useAuth();
  const activeField = useActiveFieldAccess();
  const harvestCampaign = useHarvestCampaignOptional();
  const navigate = useNavigate();
  const location = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const [step, setStep] = useState<DrawerStep>(() => initialStepFromContext(context.preferredType));
  const [returnTo, setReturnTo] = useState<ChooserStep>('quick');
  const wasOpenRef = useRef(open);
  if (open && !wasOpenRef.current) {
    setStep(initialStepFromContext(context.preferredType));
    setReturnTo('quick');
  }
  wasOpenRef.current = open;
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldId, setFieldId] = useState(context.fieldId || '');
  const [occurredAt, setOccurredAt] = useState(toDateTimeLocal(context.occurredAt));
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const moneyLeaveRef = useRef<{
    saveDraft: () => Promise<'saved' | 'kept-local' | 'failed'>;
    discardLocal: () => void;
  } | null>(null);
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
  const [workTemplate, setWorkTemplate] = useState('');

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

  // Full form reset only when the drawer opens (or preferred type jumps to a form).
  const openSessionKey = `${open ? '1' : '0'}|${context.preferredType || ''}|${context.description || ''}|${context.category || ''}`;
  const openSessionRef = useRef('');
  useEffect(() => {
    if (!open) {
      openSessionRef.current = '';
      return;
    }
    const sessionChanged = openSessionRef.current !== openSessionKey;
    openSessionRef.current = openSessionKey;
    if (!sessionChanged) return;

    setStep(initialStepFromContext(context.preferredType));
    setReturnTo('quick');
    setOccurredAt(toDateTimeLocal(context.occurredAt));
    setDirty(false);
    setLeaveOpen(false);
    setError(null);
    setMoreOpen(false);
    setBody(context.description || '');
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
    setWorkTemplate('');
    void getFieldService()
      .getFields()
      .then((list) => {
        setFields(list);
        const resolved = resolveCaptureFieldId({
          contextFieldId: context.fieldId,
          pathname: location.pathname,
          activeFieldId: activeField.fieldId,
          lastCaptureFieldId: readLastCaptureFieldId(),
          lastMoneyFieldId: readLastMoneyFieldId(),
          availableIds: list.map((f) => f.id),
        });
        setFieldId(resolved);
      })
      .catch(() => {
        setFields([]);
        setFieldId(
          resolveCaptureFieldId({
            contextFieldId: context.fieldId,
            pathname: location.pathname,
            activeFieldId: activeField.fieldId,
            lastCaptureFieldId: readLastCaptureFieldId(),
            lastMoneyFieldId: readLastMoneyFieldId(),
            availableIds: [],
          })
        );
      });
  }, [
    open,
    openSessionKey,
    context.preferredType,
    context.occurredAt,
    context.fieldId,
    context.description,
    context.category,
    location.pathname,
    activeField.fieldId,
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

  const moneyStepOpen = step === 'money' || step === 'expense' || step === 'income';

  const requestClose = () => {
    if (leaveOpen) return;
    if (dirty && moneyStepOpen) {
      setLeaveOpen(true);
      return;
    }
    if (dirty) {
      const ok = window.confirm(t('capture:discardTitle'));
      if (!ok) return;
    }
    onClose();
  };

  const keepEditing = () => setLeaveOpen(false);

  const discardMoney = () => {
    moneyLeaveRef.current?.discardLocal();
    setDirty(false);
    setLeaveOpen(false);
    onClose();
  };

  const saveMoneyDraft = async () => {
    const actions = moneyLeaveRef.current;
    if (!actions) {
      setLeaveOpen(false);
      onClose();
      return;
    }
    setLeaveBusy(true);
    try {
      const result = await actions.saveDraft();
      if (result === 'failed') return;
      setLeaveOpen(false);
      if (result === 'kept-local') onClose();
    } finally {
      setLeaveBusy(false);
    }
  };

  const selectType = (type: CaptureType) => {
    setReturnTo(isChooserStep(step) ? step : returnTo);
    setStep(type);
    setError(null);
  };

  const goBack = () => {
    if (step === 'quick') {
      requestClose();
      return;
    }
    if (step === 'catalog') {
      setStep('quick');
      setError(null);
      return;
    }
    setStep(returnTo);
    setError(null);
  };

  const onFieldChange = (id: string) => {
    setFieldId(id);
    rememberLastCaptureFieldId(id || undefined);
    onContextChange({ ...context, fieldId: id || undefined });
  };

  const onOccurredAtChange = (localDateTime: string) => {
    setOccurredAt(localDateTime);
    onContextChange({
      ...context,
      occurredAt: fromDateTimeLocal(localDateTime),
      dateDefaultedToToday: false,
      dateNeedsChoice: false,
    });
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

  /** Reopen Quick Add with the same field/date — not the just-saved form. */
  const reopenQuickContext = (): CaptureContext => ({
    fieldId: fieldId || context.fieldId,
    occurredAt: fromDateTimeLocal(occurredAt),
    sourcePage: context.sourcePage,
    harvestId: context.harvestId,
    taskId: context.taskId,
    harvestCampaignLink: context.harvestCampaignLink,
    periodLabel: context.periodLabel,
  });

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
          pinned: false,
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
          t('capture:observation.saved'),
          { reopen: reopenQuickContext() }
        );
      } else if (step === 'work') {
        if (!ensureField()) return;
        if (!workTemplate) {
          setError(t('capture:work.chooseType'));
          setSubmitting(false);
          return;
        }
        onClose();
        navigate(taskFormPath({ fieldId, templateCode: workTemplate }));
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
        onSaved(
          { type: 'harvest', fieldId, sourceId: harvest.id },
          t('capture:harvest.saved'),
          { reopen: reopenQuickContext() }
        );
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
          pinned: false,
          occurredAt: when,
          mediaUrls: [mediaUrl],
        });
        onSaved(
          { type: 'voice', fieldId, sourceId: note.id },
          t('capture:voice.saved'),
          { reopen: reopenQuickContext() }
        );
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
          pinned: false,
          occurredAt: when,
          mediaUrls: [mediaUrl],
        });
        onSaved(
          { type: 'document', fieldId, sourceId: note.id },
          t('capture:document.saved'),
          { reopen: reopenQuickContext() }
        );
      }
    } catch {
      setError(t('capture:errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const captureModeLive = Boolean(harvestCampaign?.isLive);
  const harvestCaps = useMemo(
    () =>
      getHarvestCapabilities({
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
  const openSacks = harvestCampaign ? pendingSackTotal(harvestCampaign.campaign) : 0;
  const openMillKg = harvestCampaign ? millKgNeedingOil(harvestCampaign.campaign) : 0;
  const menuGroups = useMemo(
    () =>
      buildCaptureMenu({
        permissions,
        harvestKinds: harvestCaps.captureKinds,
        isHarvestLive: captureModeLive,
        canUseWarehouse: permissions.canRecordMoney,
        openSacks,
        openMillKg,
      }),
    [permissions, harvestCaps.captureKinds, captureModeLive, openSacks, openMillKg]
  );
  const harvestHint = useMemo(() => {
    const hint: Partial<Record<HarvestCaptureKind, string>> = {};
    if (openSacks > 0) {
      hint.mill = t('fields:harvestCampaign.addMenu.sacksWaiting', { count: openSacks });
    }
    if (openMillKg > 0) {
      hint.oil = t('fields:harvestCampaign.addMenu.fruitWaiting', { kg: Math.round(openMillKg) });
    }
    return hint;
  }, [openMillKg, openSacks, t]);

  const quickMoves = useMemo(
    () =>
      buildQuickAddMoves({
        pathname: location.pathname,
        isHarvestLive: captureModeLive,
        sourcePage: context.sourcePage,
        groups: menuGroups,
        recentIds: readRecentCaptureMoves(),
      }),
    [location.pathname, captureModeLive, menuGroups, context.sourcePage]
  );

  const pickMove = (move: CaptureMove) => {
    rememberCaptureMove(move.id);
    if (fieldId) rememberLastCaptureFieldId(fieldId);

    if (move.surface === 'capture') {
      if (move.id === 'oil_sale') {
        onContextChange({
          ...context,
          fieldId: fieldId || context.fieldId,
          preferredType: 'income',
          category: 'olive_oil_sale',
          occurredAt: fromDateTimeLocal(occurredAt),
        });
        selectType('income');
        return;
      }
      if (move.id === 'payment') {
        onContextChange({
          ...context,
          fieldId: fieldId || context.fieldId,
          preferredType: 'expense',
          category: 'labor',
          occurredAt: fromDateTimeLocal(occurredAt),
        });
        selectType('expense');
        return;
      }
      onContextChange({
        ...context,
        fieldId: fieldId || context.fieldId,
        occurredAt: fromDateTimeLocal(occurredAt),
      });
      selectType(move.type);
      return;
    }
    if (move.surface === 'money') {
      selectType('money');
      return;
    }

    const groveId = fieldId || context.fieldId;
    if (move.surface === 'warehouse') {
      onClose();
      navigate(myOilPath({ field: groveId || undefined, do: move.action }));
      return;
    }
    if (!groveId) {
      setError(t('capture:errors.fieldRequired'));
      return;
    }

    onClose();
    navigate(
      harvestPath({
        add: true,
        kind: move.kind,
        fieldId: groveId,
        day: dayKeyFromOccurredAt(context.occurredAt || fromDateTimeLocal(occurredAt)),
        harvestId: context.harvestId,
      })
    );
  };

  const isMoneyStep = step === 'money' || step === 'expense' || step === 'income';
  const isPhotoStep = step === 'photo';
  const isChoosing = isChooserStep(step);
  const selectedFieldName = fields.find((f) => f.id === fieldId)?.name;

  const quickHints = useMemo(() => {
    const hints: Partial<Record<string, string>> = {};
    if (harvestHint?.mill) hints.mill = harvestHint.mill;
    if (harvestHint?.oil) hints.oil = harvestHint.oil;
    if (harvestHint?.sacks) hints.sacks = harvestHint.sacks;
    return hints;
  }, [harvestHint]);

  const drawerTitle = (() => {
    if (isMoneyStep) return t('capture:money.cta');
    if (step === 'quick') return t('capture:newRecord');
    if (step === 'catalog') return t('capture:allRecords');
    return t(`capture:types.${step}.title`);
  })();

  return (
    <RightDrawer
      open={open}
      onClose={requestClose}
      resetKey={`${step}:${fieldId || ''}:${context.fieldId || ''}`}
      size={isMoneyStep ? 'lg' : 'md'}
      title={drawerTitle}
      subtitle={
        !isMoneyStep && !isPhotoStep && !isChoosing
          ? friendlyFieldLabel(selectedFieldName || fieldId) || undefined
          : undefined
      }
      hideClose={!isMoneyStep && !isPhotoStep}
      leading={
        isMoneyStep ? undefined : (
          <button
            type="button"
            className="oa-drawer-icon-btn"
            onClick={goBack}
            aria-label={step === 'quick' ? t('capture:cancel') : t('capture:back')}
          >
            {step === 'quick' ? <X size={18} aria-hidden /> : <ArrowLeft size={18} aria-hidden />}
          </button>
        )
      }
      bodyClassName={isMoneyStep ? 'oa-drawer-body--flush' : undefined}
      footer={
        !isChoosing && !isMoneyStep && !isPhotoStep ? (
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
      <div className="capture-with-tabs">
        {error && isChoosing ? <p className="capture-error">{error}</p> : null}
        {step === 'quick' ? (
          <CaptureQuickAdd
            moves={quickMoves}
            fields={fields}
            fieldId={fieldId}
            occurredAtLocal={occurredAt}
            onFieldChange={onFieldChange}
            onOccurredAtChange={onOccurredAtChange}
            onPick={pickMove}
            onMore={() => {
              setError(null);
              setStep('catalog');
            }}
            hints={quickHints}
          />
        ) : null}
        {step === 'catalog' ? (
          <CaptureCatalog
            groups={menuGroups}
            isHarvestLive={captureModeLive}
            harvestHint={harvestHint}
            fields={fields}
            fieldId={fieldId}
            occurredAtLocal={occurredAt}
            recentIds={readRecentCaptureMoves()}
            onFieldChange={onFieldChange}
            onOccurredAtChange={onOccurredAtChange}
            onPick={pickMove}
          />
        ) : null}
            {isMoneyStep ? (
              <>
              <MoneyCaptureForm
                context={{
                  ...context,
                  fieldId: fieldId || context.fieldId || undefined,
                  preferredType: step === 'money' ? 'money' : step,
                  occurredAt: fromDateTimeLocal(occurredAt),
                }}
                fields={fields}
                canRecordIncome={permissions.canRecordIncome}
                canRecordExpense={permissions.canRecordExpense}
                onSaved={onSaved}
                onDirtyChange={(next) => {
                  if (next) markDirty();
                  else setDirty(false);
                }}
                onBindLeave={(actions) => {
                  moneyLeaveRef.current = actions;
                }}
              />
              {leaveOpen ? (
                <div className="capture-leave" role="dialog" aria-modal="true" aria-labelledby="capture-leave-title">
                  <div className="capture-leave__card">
                    <h2 id="capture-leave-title">{t('money:leaveTitle')}</h2>
                    <p>{t('money:leaveBody')}</p>
                    <div className="capture-leave__actions">
                      <button type="button" className="money-primary-action" disabled={leaveBusy} onClick={() => void saveMoneyDraft()}>
                        {t('money:leaveSaveDraft')}
                      </button>
                      <button type="button" className="capture-leave__discard" disabled={leaveBusy} onClick={discardMoney}>
                        {t('money:leaveDiscard')}
                      </button>
                      <button type="button" className="capture-leave__keep" disabled={leaveBusy} onClick={keepEditing}>
                        {t('money:leaveKeep')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              </>
            ) : isPhotoStep ? (
              <PhotoCaptureForm
                context={{
                  ...context,
                  fieldId: fieldId || context.fieldId,
                  occurredAt: fromDateTimeLocal(occurredAt),
                }}
                fields={fields}
                fieldId={fieldId}
                fieldLocked={false}
                onFieldChange={onFieldChange}
                onSaved={onSaved}
                onDirty={markDirty}
              />
            ) : !isChoosing ? (
                <div className={`capture-form${step === 'observation' ? ' capture-form--observation' : ''}`}>
                  {context.periodLabel ? (
                    <p className="capture-context">{context.periodLabel}</p>
                  ) : null}

                  <CaptureContextChips
                    fields={fields}
                    fieldId={fieldId}
                    occurredAtLocal={occurredAt}
                    onFieldChange={onFieldChange}
                    onOccurredAtChange={onOccurredAtChange}
                    compact
                  />
                  {context.dateNeedsChoice ? (
                    <p className="capture-hint">
                      {t('chronologio:captureDateChoose', { period: context.periodLabel || '' })}
                    </p>
                  ) : context.dateDefaultedToToday ? (
                    <p className="capture-hint">{t('chronologio:captureDateUsesToday')}</p>
                  ) : null}

                  {step === 'observation' ? (
                    <>
                      {context.harvestCampaignLink ? (
                        <p className="capture-hint">
                          {t('fields:harvestCampaign.note.chronologioHint')}
                        </p>
                      ) : null}
                      <label className="capture-write" htmlFor="capture-observation-body">
                        <span className="capture-legend">{t('capture:types.observation.title')}</span>
                        <textarea
                          id="capture-observation-body"
                          rows={6}
                          maxLength={4000}
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
                      <div className="capture-work-choices" role="listbox" aria-label={t('capture:work.whatWork')}>
                        {WORK_CHOICES.map((code) => (
                          <button
                            key={code}
                            type="button"
                            role="option"
                            aria-selected={workTemplate === code}
                            className={`capture-work-choice${workTemplate === code ? ' is-selected' : ''}`}
                            onClick={() => {
                              setWorkTemplate(code);
                              markDirty();
                            }}
                          >
                            {templateTitle(code, i18n.language)}
                          </button>
                        ))}
                      </div>
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

                  {(step === 'observation' || step === 'harvest') && (
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
                            <Camera size={20} />
                            <span>{t('capture:observation.addPhoto')}</span>
                            <small>{t('capture:photos.limit', { count: MAX_PHOTOS })}</small>
                          </button>
                        ) : null}
                      </div>
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
            ) : null}
      </div>
    </RightDrawer>
  );
};

export default CaptureDrawer;
