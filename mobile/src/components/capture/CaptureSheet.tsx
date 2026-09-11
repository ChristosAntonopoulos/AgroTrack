import React, { useEffect, useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CaptureContext, CaptureSavedDetail, CaptureSavedOptions, CaptureType } from '../../capture/types';
import { getAvailableCaptureActions } from '../../capture/permissions';
import { pickCapturePhotoUris, uploadCapturePhotoUris } from '../../capture/photos';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useOfflineMode } from '../../context/OfflineContext';
import { usePreferences } from '../../context/PreferencesContext';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import MoneyCaptureForm from './MoneyCaptureForm';
import {
  getFieldService,
  getHarvestService,
  getNoteService,
  getFieldWorkService,
} from '../../services/serviceFactory';
import type { Field } from '../../services/fieldService';
import type { RootStackParamList } from '../../navigation/types';
import { spacing, typography, radii } from '../../theme';
import { readLastMoneyFieldId } from '../../finance/lastField';

const MAX_PHOTOS = 5;

const FALLBACK_WORK = [
  { id: 'pruning', type: 'pruning', title: 'Κλάδεμα' },
  { id: 'spraying', type: 'spraying', title: 'Ψεκασμός' },
  { id: 'fertilization', type: 'fertilization', title: 'Λίπανση' },
  { id: 'irrigation', type: 'irrigation', title: 'Άρδευση' },
  { id: 'cleaning', type: 'cleaning', title: 'Καθαρισμός' },
];

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
  const { t } = useTranslation(['capture', 'fields', 'common']);
  const { colors, tapMin } = useTheme();
  const { user, isFieldOwner } = useAuth();
  const { isOnline } = useOfflineMode();
  const { isFullPicture } = usePreferences();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [step, setStep] = useState<'choose' | CaptureType>('choose');
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldId, setFieldId] = useState(context.fieldId || '');
  const [occurredAt] = useState(new Date().toISOString());
  const [submitting, setSubmitting] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const [body, setBody] = useState('');
  const [workId, setWorkId] = useState('');
  const [workCost, setWorkCost] = useState('');
  const [workNote, setWorkNote] = useState('');
  const [oliveKg, setOliveKg] = useState('');
  const [oilKg, setOilKg] = useState('');
  const [mill, setMill] = useState('');
  const [harvestNotes, setHarvestNotes] = useState('');

  const permissions = useMemo(
    () =>
      getAvailableCaptureActions({
        hasAnyFieldAccess: fields.length > 0,
        canOwn: isFieldOwner() || fields.some((f) => f.ownerId === user?.id),
        canWork: true,
      }),
    [fields, isFieldOwner, user?.id]
  );

  const workOptions = useMemo(
    () => FALLBACK_WORK.map((w) => ({ ...w, templateId: w.type as string | undefined })),
    []
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
    setFieldId(context.fieldId || '');
    setBody('');
    setPhotos([]);
    setWorkId('');
    setWorkCost('');
    setWorkNote('');
    setOliveKg('');
    setOilKg('');
    setMill('');
    setHarvestNotes('');
    setMoreOpen(false);
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
  }, [open, context.preferredType, context.fieldId, user?.id, user?.role]);

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
          pinned: true,
          occurredAt,
          mediaUrls,
        });
        onSaved({ type: 'observation', fieldId, sourceId: note.id }, t('capture:observation.saved'));
      } else if (step === 'work') {
        const work = workOptions.find((w) => w.id === workId);
        if (!work) {
          Alert.alert('', t('capture:errors.workTypeRequired'));
          setSubmitting(false);
          return;
        }
        const cost = workCost.trim() ? Number(workCost.replace(',', '.')) : undefined;
        const now = new Date();
        const task = await getFieldWorkService().createFieldTask({
          fieldId,
          title: work.title,
          description: workNote.trim() || undefined,
          templateCode: work.templateId || work.type,
          plannedStart: occurredAt || now.toISOString(),
          plannedEnd: occurredAt || now.toISOString(),
          notes: workNote.trim() || undefined,
          estimatedCost: cost && !Number.isNaN(cost) ? cost : undefined,
        });
        onSaved({ type: 'work', fieldId, sourceId: task.id }, t('capture:work.saved'));
        onClose();
        navigation.navigate('TaskDetail', { taskId: task.id });
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
          millName: mill.trim() || undefined,
          notes: harvestNotes.trim() || undefined,
          mediaUrls,
        });
        onSaved({ type: 'harvest', fieldId, sourceId: harvest.id }, t('capture:harvest.saved'));
      }
    } catch {
      Alert.alert('', t('capture:errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const typeCards: Array<{ type: CaptureType; icon: keyof typeof Ionicons.glyphMap; enabled: boolean }> = [
    { type: 'observation', icon: 'eye-outline', enabled: permissions.canRecordObservation },
    { type: 'work', icon: 'checkmark-done-outline', enabled: permissions.canRecordWork },
    { type: 'money', icon: 'wallet-outline', enabled: permissions.canRecordMoney },
    { type: 'harvest', icon: 'leaf-outline', enabled: permissions.canRecordHarvest },
  ];

  const fieldLocked = Boolean(context.fieldId);
  const isMoneyStep = step === 'money' || step === 'expense' || step === 'income';

  const sheetTitle =
    step === 'choose'
      ? t('capture:title')
      : isMoneyStep
        ? t('capture:types.money.title')
        : t(`capture:types.${step}.title`);

  return (
    <Sheet
      open={open}
      onClose={step === 'choose' ? onClose : () => setStep('choose')}
      edge="end"
      title={sheetTitle}
      maxHeightPercent={step === 'choose' ? 70 : 92}
      scrollable={false}
      footer={
        step !== 'choose' && !isMoneyStep ? (
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
            fieldId: context.fieldId || fieldId || undefined,
            preferredType: step === 'money' ? 'money' : step,
          }}
          fields={fields}
          canRecordIncome={permissions.canRecordIncome}
          canRecordExpense={permissions.canRecordExpense}
          isFullPicture={isFullPicture}
          onSaved={onSaved}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 'choose' ? (
            <>
              <Text style={[styles.prompt, { color: colors.textSecondary }]}>{t('capture:whatToRecord')}</Text>
              {typeCards
                .filter(c => c.enabled)
                .map(card => (
                  <Pressable
                    key={card.type}
                    style={[
                      styles.typeCard,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        minHeight: Math.max(72, tapMin + 24),
                      },
                    ]}
                    onPress={() => setStep(card.type)}
                  >
                    <View style={[styles.typeIcon, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name={card.icon} size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.typeTitle, { color: colors.textPrimary }]}>
                        {t(`capture:types.${card.type}.title`)}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                        {t(`capture:types.${card.type}.description`)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('capture:fieldLabel')}</Text>
              {fieldLocked ? (
                <Text style={[styles.lockedField, { color: colors.textPrimary, borderColor: colors.border }]}>
                  {fields.find(f => f.id === fieldId)?.name || fieldId}
                </Text>
              ) : (
                <View style={styles.chipRow}>
                  {fields.map(f => (
                    <Pressable
                      key={f.id}
                      style={[
                        styles.chip,
                        {
                          borderColor: fieldId === f.id ? colors.oliveBorder : colors.border,
                          backgroundColor: fieldId === f.id ? colors.primaryLight : colors.surface,
                          minHeight: tapMin,
                        },
                      ]}
                      onPress={() => {
                        setFieldId(f.id);
                        onContextChange({ ...context, fieldId: f.id });
                      }}
                    >
                      <Text style={{ color: fieldId === f.id ? colors.primary : colors.textPrimary }}>{f.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {step === 'observation' ? (
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
              ) : null}

              {step === 'work' ? (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('capture:work.whatWork')}</Text>
                  <View style={styles.chipRow}>
                    {workOptions.map(w => (
                      <Pressable
                        key={w.id}
                        style={[
                          styles.chip,
                          {
                            borderColor: workId === w.id ? colors.oliveBorder : colors.border,
                            backgroundColor: workId === w.id ? colors.primaryLight : colors.surface,
                            minHeight: tapMin,
                          },
                        ]}
                        onPress={() => setWorkId(w.id)}
                      >
                        <Text style={{ color: workId === w.id ? colors.primary : colors.textPrimary }}>{w.title}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                    placeholder={t('capture:work.optionalCost')}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={workCost}
                    onChangeText={setWorkCost}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      styles.textarea,
                      { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                    placeholder={t('capture:work.optionalNote')}
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    value={workNote}
                    onChangeText={setWorkNote}
                  />
                  <Pressable
                    onPress={() => {
                      onClose();
                      navigation.navigate('CreateTask', { fieldId: fieldId || undefined });
                    }}
                  >
                    <Text style={{ color: colors.link, fontWeight: '700', marginTop: 8 }}>
                      {t('capture:scheduleLater')}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {step === 'harvest' ? (
                <>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                    placeholder={t('capture:harvest.olives')}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={oliveKg}
                    onChangeText={setOliveKg}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                    placeholder={t('capture:harvest.oil')}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={oilKg}
                    onChangeText={setOilKg}
                  />
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
                    <>
                      <TextInput
                        style={[
                          styles.input,
                          { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
                        ]}
                        placeholder={t('capture:harvest.mill')}
                        placeholderTextColor={colors.textTertiary}
                        value={mill}
                        onChangeText={setMill}
                      />
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
                    </>
                  ) : null}
                </>
              ) : null}

              {(step === 'observation' || step === 'work' || step === 'harvest') && (
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
        </ScrollView>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  body: { paddingBottom: 24 },
  prompt: { fontSize: 16, marginBottom: 12 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: 14,
    marginBottom: 10,
  },
  typeIcon: { width: 44, height: 44, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  typeTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  lockedField: { borderWidth: 1, borderRadius: radii.lg, padding: 12, fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: radii.lg, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10, fontSize: 16 },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: radii.lg },
  photoActions: { gap: 8 },
});

export default CaptureSheet;
