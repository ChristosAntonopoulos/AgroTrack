import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CaptureContext, CaptureSavedDetail, CaptureSavedOptions, CaptureType } from '../../capture/types';
import { getAvailableCaptureActions } from '../../capture/permissions';
import { buildCaptureMenu, type CaptureMove } from '../../capture/menu';
import { buildQuickAddMoves } from '../../capture/quickAdd';
import { resolveCaptureFieldId } from '../../capture/fieldContext';
import { dayKeyFromOccurredAt } from '../../capture/openContext';
import {
  readLastCaptureFieldId,
  readRecentCaptureMoves,
  rememberCaptureMove,
  rememberLastCaptureFieldId,
} from '../../capture/recentActions';
import { getHarvestCapabilities } from '../../harvestCampaign/harvestCapabilities';
import { millKgNeedingOil, pendingSackTotal } from '../../harvestCampaign/chain';
import { capturePermissionsFromCapabilities } from '../../utils/fieldGates';
import { pickCapturePhotoUris, uploadCapturePhotoUris } from '../../capture/photos';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';
import { openHarvestCampaign } from '../../navigation/intents';
import { useOfflineMode } from '../../context/OfflineContext';
import { useFamilyMembershipModules, useActiveFieldAccessLevel } from '../../hooks/useFamilyMembershipModules';
import Button from '../ui/Button';
import { HarvestNumberInput } from '../../harvestCampaign/components/HarvestNumberInput';
import Sheet from '../ui/Sheet';
import FormDateField from '../forms/FormDateField';
import CaptureQuickAdd from './CaptureQuickAdd';
import CaptureCatalog from './CaptureCatalog';
import CaptureContextChips from './CaptureContextChips';
import MoneyCaptureForm from './MoneyCaptureForm';
import PhotoCaptureForm from './PhotoCaptureForm';
import {
  getFieldService,
  getHarvestService,
  getNoteService,
  getFileService,
} from '../../services/serviceFactory';
import type { Field } from '../../services/fieldService';
import type { RootStackParamList } from '../../navigation/types';
import { radii } from '../../theme';
import { readLastMoneyFieldId } from '../../finance/lastField';
import { templateTitle } from '../../data/fieldWorkCatalogueLabels';
import { getFocusedRoute } from '../../navigation/dockRoute';
import { friendlyFieldLabel } from '../../utils/fieldLabels';

const MAX_PHOTOS = 5;

type DocPick = { uri: string; name: string; mimeType: string };

const WORK_CHOICES = ['T06', 'T05', 'T09', 'T14', 'T15', 'T08', 'T17', 'T21'] as const;

const toDateKey = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const applyDateKey = (currentIso: string, ymd: string): string => {
  const [year, month, day] = ymd.split('-').map(Number);
  const current = new Date(currentIso);
  const next = Number.isNaN(current.getTime()) ? new Date() : new Date(current);
  if (!year || !month || !day) return next.toISOString();
  next.setFullYear(year, month - 1, day);
  return next.toISOString();
};

type Props = {
  open: boolean;
  context: CaptureContext;
  onClose: () => void;
  onContextChange: (ctx: CaptureContext) => void;
  onSaved: (detail: CaptureSavedDetail, message: string, options?: CaptureSavedOptions) => void;
};

const CaptureSheet: React.FC<Props> = ({
  open,
  context,
  onClose,
  onContextChange,
  onSaved,
}) => {
  const { t, i18n } = useTranslation(['capture', 'fields', 'common', 'chronologio']);
  const { colors, tapMin } = useTheme();
  const { user, isFieldOwner } = useAuth();
  const familyModules = useFamilyMembershipModules();
  const accessLevel = useActiveFieldAccessLevel();
  const { isOnline } = useOfflineMode();
  const harvestCampaign = useHarvestCampaignOptional();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const recordingRef = useRef<Audio.Recording | null>(null);

  type ChooserStep = 'quick' | 'catalog';
  type DrawerStep = ChooserStep | CaptureType;

  const initialStep = (preferredType?: CaptureType): DrawerStep => {
    if (preferredType === 'expense' || preferredType === 'income') return preferredType;
    if (preferredType && preferredType !== 'harvest' && preferredType !== 'money') {
      return preferredType;
    }
    return 'quick';
  };

  const [step, setStep] = useState<DrawerStep>(() => initialStep(context.preferredType));
  const [returnTo, setReturnTo] = useState<ChooserStep>('quick');
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldId, setFieldId] = useState(context.fieldId || '');
  const [occurredAt, setOccurredAt] = useState(context.occurredAt || new Date().toISOString());
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [lastCaptureFieldId, setLastCaptureFieldId] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const openSessionRef = useRef('');

  const [body, setBody] = useState('');
  const [workTemplate, setWorkTemplate] = useState('');
  const [oliveKg, setOliveKg] = useState('');
  const [oilKg, setOilKg] = useState('');
  const [harvestNotes, setHarvestNotes] = useState('');
  const [recording, setRecording] = useState(false);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentFile, setDocumentFile] = useState<DocPick | null>(null);

  const permissions = useMemo(() => {
    const selected = fields.find((field) => field.id === fieldId);
    if (selected?.capabilities) {
      return capturePermissionsFromCapabilities(selected.capabilities, accessLevel);
    }
    return getAvailableCaptureActions({
      hasAnyFieldAccess: fields.length > 0,
      canOwn:
        user?.role === 'FieldOwner' ||
        user?.role === 'Administrator' ||
        isFieldOwner() ||
        fields.some((field) => field.ownerId === user?.id),
      canWork:
        user?.role === 'Producer' ||
        user?.role === 'FieldOwner' ||
        user?.role === 'Administrator',
      familyModules,
      accessLevel,
    });
  }, [fields, fieldId, isFieldOwner, user?.id, user?.role, familyModules, accessLevel]);

  const yieldPct = useMemo(() => {
    const olives = Number(oliveKg.replace(',', '.'));
    const oil = Number(oilKg.replace(',', '.'));
    if (!olives || !oil || olives <= 0) return null;
    return Math.round((oil / olives) * 1000) / 10;
  }, [oliveKg, oilKg]);

  const openSessionKey = `${open ? '1' : '0'}|${context.preferredType || ''}|${context.description || ''}|${context.category || ''}`;

  useEffect(() => {
    if (!open) {
      openSessionRef.current = '';
      return;
    }
    const sessionChanged = openSessionRef.current !== openSessionKey;
    openSessionRef.current = openSessionKey;
    if (!sessionChanged) return;

    setStep(initialStep(context.preferredType));
    setReturnTo('quick');
    setOccurredAt(context.occurredAt || new Date().toISOString());
    setBody(context.description || '');
    setPhotos([]);
    setWorkTemplate('');
    setOliveKg('');
    setOilKg('');
    setHarvestNotes('');
    setMoreOpen(false);
    setRecording(false);
    setVoiceUri(null);
    setDocumentName('');
    setDocumentFile(null);

    void (async () => {
      const [recent, lastCapture, lastMoney] = await Promise.all([
        readRecentCaptureMoves(),
        readLastCaptureFieldId(),
        readLastMoneyFieldId(),
      ]);
      setRecentIds(recent);
      setLastCaptureFieldId(lastCapture);
      if (!user?.id) {
        setFields([]);
        setFieldId(
          resolveCaptureFieldId({
            contextFieldId: context.fieldId,
            lastCaptureFieldId: lastCapture,
            lastMoneyFieldId: lastMoney,
            availableIds: [],
          })
        );
        return;
      }
      try {
        const list = await getFieldService().getFields(user.id, user.role || '');
        setFields(list);
        setFieldId(
          resolveCaptureFieldId({
            contextFieldId: context.fieldId,
            lastCaptureFieldId: lastCapture,
            lastMoneyFieldId: lastMoney,
            availableIds: list.map((f) => f.id),
          })
        );
      } catch {
        setFields([]);
        setFieldId(context.fieldId || '');
      }
    })();
  }, [
    open,
    openSessionKey,
    context.preferredType,
    context.fieldId,
    context.occurredAt,
    context.description,
    context.category,
    user?.id,
    user?.role,
  ]);

  useEffect(() => {
    return () => {
      void recordingRef.current?.stopAndUnloadAsync().catch(() => undefined);
      recordingRef.current = null;
    };
  }, []);

  const pickPhoto = async (camera: boolean) => {
    const uris = await pickCapturePhotoUris({
      camera,
      remainingSlots: MAX_PHOTOS - photos.length,
      isOnline,
      offlineMessage: t('common:offline.photosRequireConnection', {
        defaultValue: 'Photos need a connection.',
      }),
      permissionDeniedMessage: t('common:errors.generic', { defaultValue: 'Permission required' }),
    });
    if (uris.length) setPhotos((prev) => [...prev, ...uris]);
  };

  const uploadPhotos = async () => uploadCapturePhotoUris(photos);

  const startVoice = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('', t('capture:errors.micDenied'));
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
        recordingRef.current = null;
      }
      const next = new Audio.Recording();
      await next.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await next.startAsync();
      recordingRef.current = next;
      setRecording(true);
      setVoiceUri(null);
    } catch {
      Alert.alert('', t('capture:errors.micDenied'));
    }
  };

  const stopVoice = async (): Promise<string | null> => {
    const active = recordingRef.current;
    if (!active) return voiceUri;
    try {
      await active.stopAndUnloadAsync();
      const uri = active.getURI();
      recordingRef.current = null;
      setRecording(false);
      setVoiceUri(uri);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      return uri;
    } catch {
      recordingRef.current = null;
      setRecording(false);
      return null;
    }
  };

  const clearVoice = async () => {
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
      recordingRef.current = null;
    }
    setRecording(false);
    setVoiceUri(null);
  };

  const pickDocument = async () => {
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const pick: DocPick = {
        uri: asset.uri,
        name: asset.name || 'document.pdf',
        mimeType: asset.mimeType || 'application/pdf',
      };
      setDocumentFile(pick);
      if (!documentName.trim()) {
        setDocumentName(pick.name.replace(/\.[^.]+$/, ''));
      }
    } catch {
      Alert.alert('', t('capture:errors.saveFailed'));
    }
  };

  const save = async () => {
    if (!fieldId) {
      Alert.alert('', t('capture:errors.fieldRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const reopenQuick = (): CaptureContext => ({
        fieldId: fieldId || context.fieldId,
        occurredAt,
        sourcePage: context.sourcePage,
        harvestId: context.harvestId,
        taskId: context.taskId,
        harvestCampaignLink: context.harvestCampaignLink,
        periodLabel: context.periodLabel,
      });

      if (step === 'observation') {
        if (!body.trim() && photos.length === 0) {
          Alert.alert('', t('capture:errors.observationEmpty'));
          setSubmitting(false);
          return;
        }
        const mediaUrls = await uploadPhotos();
        const note = await getNoteService().createNote({
          body: body.trim(),
          fieldId,
          pinned: false,
          occurredAt,
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
          { reopen: reopenQuick() }
        );
      } else if (step === 'work') {
        if (!workTemplate) {
          Alert.alert('', t('capture:work.chooseType'));
          setSubmitting(false);
          return;
        }
        onClose();
        navigation.navigate('CreateTask', {
          fieldId: fieldId || undefined,
          templateCode: workTemplate,
          scheduledStart: occurredAt,
        });
        return;
      } else if (step === 'harvest') {
        const olives = Number(oliveKg.replace(',', '.'));
        if (!olives || Number.isNaN(olives)) {
          Alert.alert('', t('capture:errors.oliveRequired'));
          setSubmitting(false);
          return;
        }
        const oil = oilKg.trim() ? Number(oilKg.replace(',', '.')) : undefined;
        const mediaUrls = await uploadPhotos();
        const harvest = await getHarvestService().create({
          fieldId,
          harvestDate: occurredAt,
          oliveKg: olives,
          oilKg: oil && !Number.isNaN(oil) ? oil : undefined,
          oilYieldPercent: yieldPct ?? undefined,
          notes: harvestNotes.trim() || undefined,
          mediaUrls,
        });
        onSaved(
          { type: 'harvest', fieldId, sourceId: harvest.id },
          t('capture:harvest.saved'),
          { reopen: reopenQuick() }
        );
      } else if (step === 'voice') {
        const uri = recording ? await stopVoice() : voiceUri;
        if (!uri) {
          Alert.alert('', t('capture:errors.voiceEmpty'));
          setSubmitting(false);
          return;
        }
        const mediaUrl = await getFileService().uploadFile(uri, `voice-${Date.now()}.m4a`, 'audio/mp4');
        const note = await getNoteService().createNote({
          body: t('capture:voice.noteBody'),
          fieldId,
          pinned: false,
          occurredAt,
          mediaUrls: [mediaUrl],
        });
        onSaved(
          { type: 'voice', fieldId, sourceId: note.id },
          t('capture:voice.saved'),
          { reopen: reopenQuick() }
        );
      } else if (step === 'document') {
        if (!documentName.trim()) {
          Alert.alert('', t('capture:errors.documentNameRequired'));
          setSubmitting(false);
          return;
        }
        if (!documentFile) {
          Alert.alert('', t('capture:errors.documentFileRequired'));
          setSubmitting(false);
          return;
        }
        const mediaUrl = await getFileService().uploadFile(
          documentFile.uri,
          documentFile.name,
          documentFile.mimeType
        );
        const note = await getNoteService().createNote({
          body: documentName.trim(),
          fieldId,
          pinned: false,
          occurredAt,
          mediaUrls: [mediaUrl],
        });
        onSaved(
          { type: 'document', fieldId, sourceId: note.id },
          t('capture:document.saved'),
          { reopen: reopenQuick() }
        );
      }
    } catch {
      Alert.alert('', t('capture:errors.saveFailed'));
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
          isFieldOwner() ||
          fields.some((field) => field.ownerId === user?.id),
        canWork:
          user?.role === 'Producer' ||
          user?.role === 'FieldOwner' ||
          user?.role === 'Administrator',
        familyModules,
        accessLevel,
      }),
    [fields, user?.role, user?.id, isFieldOwner, familyModules, accessLevel]
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

  const isChooser = step === 'quick' || step === 'catalog';
  const isMoneyStep = step === 'money' || step === 'expense' || step === 'income';
  const isPhotoStep = step === 'photo';
  const selectedField = fields.find((f) => f.id === fieldId);
  const selectedFieldName = selectedField?.name
    ? friendlyFieldLabel(selectedField.name)
    : undefined;
  const focused = getFocusedRoute(navigation.getState());

  const quickMoves = useMemo(
    () =>
      buildQuickAddMoves({
        routeName: focused.name,
        isHarvestLive: captureModeLive,
        sourcePage: context.sourcePage,
        groups: menuGroups,
        recentIds,
      }),
    [focused.name, captureModeLive, context.sourcePage, menuGroups, recentIds]
  );

  const quickHints = useMemo(() => {
    const hints: Partial<Record<string, string>> = {};
    if (openSacks > 0) {
      hints.mill = t('fields:harvestCampaign.addMenu.sacksWaiting', { count: openSacks });
    }
    if (openMillKg > 0) {
      hints.oil = t('fields:harvestCampaign.addMenu.fruitWaiting', {
        kg: Math.round(openMillKg),
      });
    }
    return hints;
  }, [openMillKg, openSacks, t]);

  const sheetTitle = isChooser
    ? step === 'catalog'
      ? t('capture:allRecords', { defaultValue: t('capture:title') })
      : t('capture:newRecord', { defaultValue: t('capture:title') })
    : isMoneyStep
      ? t('capture:types.money.title')
      : t(`capture:types.${step}.title`);

  const onFieldChange = (id: string) => {
    setFieldId(id);
    void rememberLastCaptureFieldId(id || undefined);
    onContextChange({ ...context, fieldId: id || undefined });
  };

  const onOccurredAtChange = (iso: string) => {
    setOccurredAt(iso);
    onContextChange({
      ...context,
      occurredAt: iso,
      dateDefaultedToToday: false,
      dateNeedsChoice: false,
    });
  };

  const selectType = (type: CaptureType) => {
    if (type === 'harvest' && harvestCampaign?.isLive) {
      onClose();
      openHarvestCampaign(navigation, {
        add: true,
        fieldId: fieldId || context.fieldId,
        day: dayKeyFromOccurredAt(occurredAt),
      });
      return;
    }
    setReturnTo(isChooser ? step : returnTo);
    setStep(type);
  };

  const pickMove = (move: CaptureMove) => {
    void rememberCaptureMove(move.id);
    if (fieldId) void rememberLastCaptureFieldId(fieldId);
    setRecentIds((prev) => [move.id, ...prev.filter((id) => id !== move.id)].slice(0, 12));

    if (move.surface === 'capture') {
      if (move.id === 'oil_sale') {
        onContextChange({
          ...context,
          fieldId: fieldId || context.fieldId,
          preferredType: 'income',
          category: 'olive_oil_sale',
          occurredAt,
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
          occurredAt,
        });
        selectType('expense');
        return;
      }
      onContextChange({
        ...context,
        fieldId: fieldId || context.fieldId,
        occurredAt,
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
      navigation.navigate('MyOil', { do: move.action, field: groveId || undefined });
      return;
    }
    if (!groveId) {
      Alert.alert('', t('capture:errors.fieldRequired'));
      return;
    }
    onClose();
    openHarvestCampaign(navigation, {
      add: true,
      kind: move.kind,
      fieldId: groveId,
      day: dayKeyFromOccurredAt(occurredAt),
      harvestId: context.harvestId,
    });
  };

  const goBack = () => {
    if (step === 'quick') {
      onClose();
      return;
    }
    if (step === 'catalog') {
      setStep('quick');
      return;
    }
    setStep(returnTo);
  };

  return (
    <Sheet
      open={open}
      onClose={isChooser ? onClose : goBack}
      edge="end"
      title={sheetTitle}
      subtitle={isChooser ? undefined : selectedFieldName}
      maxHeightPercent={isChooser ? 90 : 92}
      scrollable={false}
      footer={
        !isChooser && !isMoneyStep && !isPhotoStep ? (
          <Button
            title={submitting ? t('capture:saving') : t('capture:save')}
            onPress={() => void save()}
            loading={submitting}
            fullWidth
            size="large"
          />
        ) : undefined
      }
    >
      {isMoneyStep ? (
        <MoneyCaptureForm
          context={{
            ...context,
            fieldId: fieldId || context.fieldId || undefined,
            preferredType: step === 'money' ? 'money' : step,
            occurredAt,
          }}
          fields={fields}
          canRecordIncome={permissions.canRecordIncome}
          canRecordExpense={permissions.canRecordExpense}
          onSaved={onSaved}
        />
      ) : isPhotoStep ? (
        <PhotoCaptureForm
          context={{
            ...context,
            fieldId: fieldId || context.fieldId,
            occurredAt,
          }}
          fields={fields}
          fieldId={fieldId}
          fieldLocked={false}
          onFieldChange={onFieldChange}
          onSaved={(detail, message, options) =>
            onSaved(detail, message, {
              ...options,
              reopen: options?.reopen || {
                fieldId: fieldId || context.fieldId,
                occurredAt,
                sourcePage: context.sourcePage,
                harvestId: context.harvestId,
                taskId: context.taskId,
                harvestCampaignLink: context.harvestCampaignLink,
              },
            })
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 'quick' ? (
            <CaptureQuickAdd
              moves={quickMoves}
              fields={fields}
              fieldId={fieldId}
              occurredAt={occurredAt}
              recentFieldId={lastCaptureFieldId}
              hints={quickHints}
              onFieldChange={onFieldChange}
              onOccurredAtChange={onOccurredAtChange}
              onPick={pickMove}
              onMore={() => setStep('catalog')}
            />
          ) : step === 'catalog' ? (
            <CaptureCatalog
              groups={menuGroups}
              isHarvestLive={captureModeLive}
              openSacks={openSacks}
              openMillKg={openMillKg}
              fields={fields}
              fieldId={fieldId}
              occurredAt={occurredAt}
              recentFieldId={lastCaptureFieldId}
              recentIds={recentIds}
              onFieldChange={onFieldChange}
              onOccurredAtChange={onOccurredAtChange}
              onPick={pickMove}
              onClose={onClose}
            />
          ) : (
            <>
              <CaptureContextChips
                fields={fields}
                fieldId={fieldId}
                occurredAt={occurredAt}
                recentFieldId={lastCaptureFieldId}
                onFieldChange={onFieldChange}
                onOccurredAtChange={onOccurredAtChange}
              />

              {step === 'observation' ? (
                <>
                  {context.periodLabel ? (
                    <Text style={[styles.hint, { color: colors.textSecondary, fontWeight: '600' }]}>
                      {context.periodLabel}
                    </Text>
                  ) : null}
                  {context.harvestCampaignLink ? (
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                      {t('fields:harvestCampaign.note.chronologioHint', {
                        defaultValue: t('capture:photo.harvestHint'),
                      })}
                    </Text>
                  ) : null}
                  <Text style={[styles.legend, { color: colors.eventObservation }]}>
                    {t('capture:types.observation.title')}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.obsTextarea,
                      {
                        color: colors.textPrimary,
                        borderColor: colors.eventObservation,
                        backgroundColor: colors.eventObservationSoft,
                      },
                    ]}
                    placeholder={t('capture:observation.placeholder')}
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    maxLength={4000}
                    value={body}
                    onChangeText={setBody}
                  />
                </>
              ) : null}

              {step === 'voice' ? (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('capture:voice.hint')}</Text>
                  <View style={styles.chipRow}>
                    <Pressable
                      style={[
                        styles.chip,
                        {
                          borderColor: recording ? colors.error : colors.border,
                          backgroundColor: recording ? colors.errorLight || colors.surface : colors.surface,
                          minHeight: tapMin,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        },
                      ]}
                      onPress={() => {
                        if (recording) void stopVoice();
                        else void startVoice();
                      }}
                    >
                      <Ionicons
                        name={recording ? 'stop-circle-outline' : 'mic-outline'}
                        size={18}
                        color={recording ? colors.error : colors.textPrimary}
                      />
                      <Text style={{ color: recording ? colors.error : colors.textPrimary }}>
                        {recording
                          ? t('capture:voice.stop')
                          : voiceUri
                            ? t('capture:voice.rerecord')
                            : t('capture:voice.record')}
                      </Text>
                    </Pressable>
                    {voiceUri ? (
                      <Pressable
                        style={[
                          styles.chip,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                            minHeight: tapMin,
                          },
                        ]}
                        onPress={() => void clearVoice()}
                      >
                        <Text style={{ color: colors.textPrimary }}>{t('capture:voice.clear')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {voiceUri ? (
                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                      {t('capture:voice.noteBody')}
                    </Text>
                  ) : null}
                </>
              ) : null}

              {step === 'document' ? (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {t('capture:document.nameLabel')}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                    placeholder={t('capture:document.namePlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    value={documentName}
                    onChangeText={setDocumentName}
                  />
                  <Pressable
                    style={[
                      styles.chip,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        minHeight: tapMin,
                        alignSelf: 'flex-start',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 10,
                      },
                    ]}
                    onPress={() => void pickDocument()}
                  >
                    <Ionicons name="document-attach-outline" size={18} color={colors.textPrimary} />
                    <Text style={{ color: colors.textPrimary }}>
                      {documentFile?.name || t('capture:document.chooseFile')}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {step === 'work' ? (
                <>
                  <Text style={[styles.prompt, { color: colors.textPrimary }]}>{t('capture:work.whatWork')}</Text>
                  <View style={{ gap: 8 }}>
                    {WORK_CHOICES.map((code) => {
                      const selected = workTemplate === code;
                      return (
                        <Pressable
                          key={code}
                          style={[
                            styles.choiceRow,
                            {
                              borderColor: selected ? colors.oliveBorder : 'transparent',
                              backgroundColor: selected ? colors.primaryLight : colors.surfaceMuted,
                              minHeight: tapMin,
                            },
                          ]}
                          onPress={() => setWorkTemplate(code)}
                        >
                          <Text style={{ flex: 1, color: colors.textPrimary, fontWeight: selected ? '800' : '600' }}>
                            {templateTitle(code, i18n.language)}
                          </Text>
                          {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {step === 'harvest' ? (
                <>
                  <HarvestNumberInput
                    label={t('capture:harvest.olivesQuestion')}
                    value={oliveKg}
                    onChange={setOliveKg}
                    suffix="kg"
                    autoFocus
                  />
                  <HarvestNumberInput
                    label={t('capture:harvest.oilQuestion')}
                    value={oilKg}
                    onChange={setOilKg}
                    suffix="kg"
                  />
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    {t('capture:harvest.oilOptional')}
                  </Text>
                  {yieldPct != null ? (
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', marginBottom: 8 }}>
                      {t('capture:harvest.yield')}: {yieldPct}%
                    </Text>
                  ) : null}
                  <Pressable onPress={() => setMoreOpen(v => !v)}>
                    <Text style={{ color: colors.link, fontWeight: '700' }}>
                      {moreOpen ? t('capture:less') : t('capture:more')}
                    </Text>
                  </Pressable>
                  {moreOpen ? (
                    <TextInput
                      style={[
                        styles.input,
                        styles.textarea,
                        { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
                      ]}
                      placeholder={t('capture:harvest.notes')}
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      value={harvestNotes}
                      onChangeText={setHarvestNotes}
                    />
                  ) : null}
                </>
              ) : null}

              {step !== 'observation' ? (
                <>
                  <FormDateField
                    label={t('capture:dateLabel')}
                    value={toDateKey(occurredAt)}
                    onValueChange={(ymd) => setOccurredAt(applyDateKey(occurredAt, ymd))}
                  />
                  {context.dateNeedsChoice ? (
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                      {t('chronologio:captureDateChoose', { period: context.periodLabel || '' })}
                    </Text>
                  ) : context.dateDefaultedToToday ? (
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                      {t('chronologio:captureDateUsesToday')}
                    </Text>
                  ) : null}
                </>
              ) : null}

              {(step === 'observation' || step === 'harvest') && (
                <View style={{ marginTop: 12, gap: 10 }}>
                  <View style={styles.photoRow}>
                    {photos.map((uri) => (
                      <Image key={uri} source={{ uri }} style={styles.thumb} />
                    ))}
                    {photos.length < MAX_PHOTOS ? (
                      <Pressable
                        onPress={() => void pickPhoto(true)}
                        style={[
                          styles.addPhoto,
                          {
                            borderColor: colors.eventObservation,
                            backgroundColor: colors.eventObservationSoft,
                            minHeight: Math.max(88, tapMin),
                          },
                        ]}
                      >
                        <Ionicons name="camera-outline" size={22} color={colors.eventObservation} />
                        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>
                          {t('capture:observation.addPhoto')}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {t('capture:photos.limit', { count: MAX_PHOTOS })}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {photos.length < MAX_PHOTOS ? (
                    <Button
                      title={t('capture:chooseLibrary')}
                      onPress={() => void pickPhoto(false)}
                      variant="outline"
                      size="large"
                    />
                  ) : null}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  body: { paddingBottom: 24 },
  prompt: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, marginBottom: 12, marginTop: 2 },
  documentRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
  },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  legend: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  hint: { fontSize: 13, marginBottom: 10 },
  lockedField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  input: { borderWidth: 1, borderRadius: radii.lg, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10, fontSize: 16 },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  obsTextarea: {
    minHeight: 132,
    textAlignVertical: 'top',
    borderRadius: 16,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 4,
  },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: radii.lg },
  addPhoto: {
    flexGrow: 1,
    minWidth: 140,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoActions: { gap: 8 },
});

export default CaptureSheet;
