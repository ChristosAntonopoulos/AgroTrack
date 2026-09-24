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
import { capturePermissionsFromCapabilities } from '../../utils/fieldGates';
import { pickCapturePhotoUris, uploadCapturePhotoUris } from '../../capture/photos';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useOfflineMode } from '../../context/OfflineContext';
import { useFamilyMembershipModules, useActiveFieldAccessLevel } from '../../hooks/useFamilyMembershipModules';
import Button from '../ui/Button';
import { HarvestNumberInput } from '../../harvestCampaign/components/HarvestNumberInput';
import Sheet from '../ui/Sheet';
import FormDateField from '../forms/FormDateField';
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const recordingRef = useRef<Audio.Recording | null>(null);

  const [step, setStep] = useState<'choose' | CaptureType>('choose');
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldId, setFieldId] = useState(context.fieldId || '');
  const [occurredAt, setOccurredAt] = useState(context.occurredAt || new Date().toISOString());
  const [submitting, setSubmitting] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const [body, setBody] = useState('');
  const [workTemplate, setWorkTemplate] = useState('');
  const [oliveKg, setOliveKg] = useState('');
  const [oilKg, setOilKg] = useState('');
  const [harvestBeat, setHarvestBeat] = useState<'olives' | 'oil'>('olives');
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

  useEffect(() => {
    if (!open) return;
    const moneyStep =
      context.preferredType === 'expense' ||
      context.preferredType === 'income' ||
      context.preferredType === 'money'
        ? context.preferredType
        : null;
    setStep(moneyStep || context.preferredType || 'choose');
    setFieldId(context.fieldId || '');
    setOccurredAt(context.occurredAt || new Date().toISOString());
    setBody(context.description || '');
    setPhotos([]);
    setWorkTemplate('');
    setOliveKg('');
    setOilKg('');
    setHarvestBeat('olives');
    setHarvestNotes('');
    setMoreOpen(false);
    setRecording(false);
    setVoiceUri(null);
    setDocumentName('');
    setDocumentFile(null);
    if (!context.fieldId) {
      void readLastMoneyFieldId().then((id) => {
        if (id) setFieldId((current) => current || id);
      });
    }
    if (user?.id) {
      void getFieldService()
        .getFields(user.id, user.role || '')
        .then(setFields)
        .catch(() => setFields([]));
    } else {
      setFields([]);
    }
  }, [open, context.preferredType, context.fieldId, context.harvestId, context.category, context.description, context.occurredAt, user?.id, user?.role]);

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
        onSaved({
          type: 'observation',
          fieldId,
          sourceId: note.id,
          description: body.trim() || undefined,
          harvestCampaignLink: context.harvestCampaignLink,
        }, t('capture:observation.saved'));
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
        onSaved({ type: 'harvest', fieldId, sourceId: harvest.id }, t('capture:harvest.saved'));
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
        onSaved({ type: 'voice', fieldId, sourceId: note.id }, t('capture:voice.saved'));
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
        onSaved({ type: 'document', fieldId, sourceId: note.id }, t('capture:document.saved'));
      }
    } catch {
      Alert.alert('', t('capture:errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const typeCards: Array<{ type: CaptureType; icon: keyof typeof Ionicons.glyphMap; enabled: boolean }> = [
    { type: 'work', icon: 'checkmark-done-outline', enabled: permissions.canRecordWork },
    { type: 'money', icon: 'wallet-outline', enabled: permissions.canRecordMoney },
    { type: 'harvest', icon: 'leaf-outline', enabled: permissions.canRecordHarvest },
    { type: 'photo', icon: 'camera-outline', enabled: permissions.canRecordPhoto },
    { type: 'observation', icon: 'eye-outline', enabled: permissions.canRecordObservation },
    { type: 'voice', icon: 'mic-outline', enabled: permissions.canRecordVoice },
    { type: 'document', icon: 'document-text-outline', enabled: permissions.canRecordDocument },
  ];

  useEffect(() => {
    if (fieldId || fields.length !== 1) return;
    setFieldId(fields[0].id);
  }, [fieldId, fields]);

  const fieldLocked = Boolean(context.fieldId);
  const askField = !fieldLocked && fields.length > 1 && !fieldId;
  const isMoneyStep = step === 'money' || step === 'expense' || step === 'income';
  const isPhotoStep = step === 'photo';
  const selectedFieldName = fields.find((f) => f.id === fieldId)?.name;

  const sheetTitle =
    step === 'choose'
      ? t('capture:newEntry', { defaultValue: t('capture:title') })
      : isMoneyStep
        ? t('capture:types.money.title')
        : t(`capture:types.${step}.title`);

  return (
    <Sheet
      open={open}
      onClose={
        step === 'choose'
          ? onClose
          : step === 'harvest' && harvestBeat === 'oil'
            ? () => setHarvestBeat('olives')
            : () => setStep('choose')
      }
      edge="end"
      title={sheetTitle}
      maxHeightPercent={step === 'choose' ? 70 : 92}
      scrollable={false}
      footer={
        step !== 'choose' && !isMoneyStep && !isPhotoStep && !askField ? (
          <Button
            title={
              submitting
                ? t('capture:saving')
                : step === 'harvest' && harvestBeat === 'olives'
                  ? t('common:next')
                  : t('capture:save')
            }
            onPress={() => {
              if (step === 'harvest' && harvestBeat === 'olives') {
                const olives = Number(oliveKg.replace(',', '.'));
                if (!olives || Number.isNaN(olives)) {
                  Alert.alert('', t('capture:errors.oliveRequired'));
                  return;
                }
                setHarvestBeat('oil');
                return;
              }
              void save();
            }}
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
            fieldId: context.fieldId || fieldId || undefined,
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
          context={context}
          fields={fields}
          fieldId={fieldId}
          fieldLocked={fieldLocked}
          onFieldChange={(id) => {
            setFieldId(id);
            onContextChange({ ...context, fieldId: id });
          }}
          onSaved={onSaved}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 'choose' ? (
            <>
              <Text style={[styles.prompt, { color: colors.textSecondary }]}>
                {t('capture:whatToRecord', { defaultValue: 'New entry' })}
              </Text>
              <View style={styles.typeGrid}>
                {typeCards
                  .filter(c => c.enabled)
                  .map(card => {
                    const soft =
                      card.type === 'work'
                        ? colors.eventWorkSoft
                        : card.type === 'observation' ||
                            card.type === 'photo' ||
                            card.type === 'voice' ||
                            card.type === 'document'
                          ? colors.eventObservationSoft
                          : card.type === 'money'
                            ? colors.eventExpenseSoft
                            : card.type === 'harvest'
                              ? colors.eventHarvestSoft
                              : colors.primaryLight;
                    const accent =
                      card.type === 'work'
                        ? colors.eventWork
                        : card.type === 'observation' ||
                            card.type === 'photo' ||
                            card.type === 'voice' ||
                            card.type === 'document'
                          ? colors.eventObservation
                          : card.type === 'money'
                            ? colors.eventExpense
                            : card.type === 'harvest'
                              ? colors.eventHarvest
                              : colors.primary;
                    return (
                      <Pressable
                        key={card.type}
                        style={({ pressed }) => [
                          styles.typeTile,
                          {
                            backgroundColor: soft,
                            borderColor: colors.borderLight,
                            minHeight: Math.max(96, tapMin + 40),
                            opacity: pressed ? 0.88 : 1,
                          },
                        ]}
                        onPress={() => setStep(card.type)}
                      >
                        <View style={[styles.typeIcon, { backgroundColor: colors.surface }]}>
                          <Ionicons name={card.icon} size={22} color={accent} />
                        </View>
                        <Text style={[styles.typeTitle, { color: colors.textPrimary }]}>
                          {t(`capture:types.${card.type}.title`)}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            </>
          ) : (
            <>
              {askField ? (
                <>
                  <Text style={[styles.prompt, { color: colors.textPrimary }]}>{t('capture:money.whichField')}</Text>
                  <View style={styles.chipRow}>
                    {fields.map(f => (
                      <Pressable
                        key={f.id}
                        style={[
                          styles.chip,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                            minHeight: tapMin,
                          },
                        ]}
                        onPress={() => {
                          setFieldId(f.id);
                          onContextChange({ ...context, fieldId: f.id });
                        }}
                      >
                        <FieldColorMark color={f.color} fieldId={f.id} size={10} />
                        <Text style={{ color: colors.textPrimary }}>{f.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : (
              <>
              {selectedFieldName ? (
                <View style={[styles.lockedField, { borderColor: colors.border }]}>
                  <FieldColorMark
                    color={fields.find(f => f.id === fieldId)?.color}
                    fieldId={fieldId}
                    size={12}
                  />
                  <Text style={{ color: colors.textPrimary, fontWeight: '700', flex: 1 }}>
                    {selectedFieldName}
                  </Text>
                </View>
              ) : null}

              {step === 'observation' ? (
                <>
                  {context.harvestCampaignLink ? (
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                      {t('fields:harvestCampaign.note.chronologioHint', {
                        defaultValue: t('capture:photo.harvestHint'),
                      })}
                    </Text>
                  ) : null}
                  <TextInput
                    style={[
                      styles.input,
                      styles.textarea,
                      { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                    placeholder={t('capture:observation.placeholder')}
                    placeholderTextColor={colors.textTertiary}
                    multiline
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

              {step === 'harvest' && harvestBeat === 'olives' ? (
                <HarvestNumberInput
                  label={t('capture:harvest.olivesQuestion')}
                  value={oliveKg}
                  onChange={setOliveKg}
                  suffix="kg"
                  autoFocus
                />
              ) : null}

              {step === 'harvest' && harvestBeat === 'oil' ? (
                <>
                  <HarvestNumberInput
                    label={t('capture:harvest.oilQuestion')}
                    value={oilKg}
                    onChange={setOilKg}
                    suffix="kg"
                    autoFocus
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

              {step === 'harvest' && harvestBeat === 'olives' ? null : (
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
              )}

              {(step === 'observation' || (step === 'harvest' && harvestBeat === 'oil')) && (
                <View style={{ marginTop: 12, gap: 8 }}>
                  <View style={styles.photoRow}>
                    {photos.map(uri => (
                      <Image key={uri} source={{ uri }} style={styles.thumb} />
                    ))}
                  </View>
                  <View style={styles.photoActions}>
                    <Button title={t('capture:takePhoto')} onPress={() => void pickPhoto(true)} variant="outline" size="large" />
                    <Button title={t('capture:chooseLibrary')} onPress={() => void pickPhoto(false)} variant="outline" size="large" />
                  </View>
                </View>
              )}
              </>
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
  prompt: { fontSize: 15, fontWeight: '500', marginBottom: 14 },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeTile: {
    width: '48%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: 14,
    gap: 10,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: 14,
    marginBottom: 10,
  },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  typeTitle: { fontSize: 15, fontWeight: '650' as '600' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 8 },
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
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: radii.lg },
  photoActions: { gap: 8 },
});

export default CaptureSheet;
