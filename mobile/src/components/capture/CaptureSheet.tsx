import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
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
import type { CaptureContext, CaptureSavedDetail, CaptureType } from '../../capture/types';
import { getAvailableCaptureActions } from '../../capture/permissions';
import { pickCapturePhotoUris, uploadCapturePhotoUris } from '../../capture/photos';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useOfflineMode } from '../../context/OfflineContext';
import Button from '../ui/Button';
import {
  getFieldService,
  getFinancialEntryService,
  getHarvestService,
  getNoteService,
  getTaskService,
  getTaskTemplateService,
} from '../../services/serviceFactory';
import type { Field } from '../../services/fieldService';
import type { TaskTemplate } from '../../services/taskTemplateService';
import type { RootStackParamList } from '../../navigation/types';
import { spacing, typography } from '../../theme';

const MAX_PHOTOS = 5;
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
  onSaved: (detail: CaptureSavedDetail, message: string) => void;
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [step, setStep] = useState<'choose' | CaptureType>('choose');
  const [fields, setFields] = useState<Field[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [fieldId, setFieldId] = useState(context.fieldId || '');
  const [occurredAt] = useState(new Date().toISOString());
  const [submitting, setSubmitting] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const [body, setBody] = useState('');
  const [workId, setWorkId] = useState('');
  const [workCost, setWorkCost] = useState('');
  const [workNote, setWorkNote] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('labor');
  const [expenseDesc, setExpenseDesc] = useState('');
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

  const workOptions = useMemo(() => {
    if (templates.length > 0) {
      return templates.slice(0, 8).map((tpl) => ({
        id: tpl.id,
        type: tpl.type,
        title: tpl.title,
        templateId: tpl.id,
      }));
    }
    return FALLBACK_WORK.map((w) => ({ ...w, templateId: undefined as string | undefined }));
  }, [templates]);

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
    setBody('');
    setPhotos([]);
    setWorkId('');
    setWorkCost('');
    setWorkNote('');
    setAmount('');
    setCategory('labor');
    setExpenseDesc('');
    setOliveKg('');
    setOilKg('');
    setMill('');
    setHarvestNotes('');
    setMoreOpen(false);
    if (user?.id) {
      void getFieldService()
        .getFields(user.id, user.role || '')
        .then(setFields)
        .catch(() => setFields([]));
    } else {
      setFields([]);
    }
    void getTaskTemplateService()
      .getTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
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
        const mediaUrls = await uploadPhotos();
        const cost = workCost.trim() ? Number(workCost.replace(',', '.')) : undefined;
        const task = await getTaskService().recordCompletedWork({
          fieldId,
          templateId: work.templateId,
          type: work.type,
          title: work.title,
          description: workNote.trim() || undefined,
          occurredAt,
          costAmount: cost && !Number.isNaN(cost) ? cost : undefined,
          currency: 'EUR',
          costCategory: 'labor',
          mediaUrls,
        });
        onSaved({ type: 'work', fieldId, sourceId: task.id }, t('capture:work.saved'));
      } else if (step === 'expense') {
        const value = Number(amount.replace(',', '.'));
        if (!value || Number.isNaN(value)) {
          Alert.alert('', t('capture:errors.amountRequired'));
          setSubmitting(false);
          return;
        }
        const entry = await getFinancialEntryService().create({
          fieldId,
          amount: value,
          kind: 'expense',
          category,
          description: expenseDesc.trim() || category,
          occurredOn: occurredAt,
          taskId: context.taskId,
          currency: 'EUR',
        });
        onSaved({ type: 'expense', fieldId, sourceId: entry.id }, t('capture:expense.saved'));
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
    { type: 'expense', icon: 'wallet-outline', enabled: permissions.canRecordExpense },
    { type: 'harvest', icon: 'leaf-outline', enabled: permissions.canRecordHarvest },
  ];

  const fieldLocked = Boolean(context.fieldId);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated, maxHeight: step === 'choose' ? '70%' : '92%' }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Pressable
              onPress={() => (step === 'choose' ? onClose() : setStep('choose'))}
              style={[styles.iconBtn, { minHeight: tapMin, minWidth: tapMin }]}
            >
              <Ionicons name={step === 'choose' ? 'close' : 'arrow-back'} size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {step === 'choose' ? t('capture:title') : t(`capture:types.${step}.title`)}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {step === 'choose' ? (
              <>
                <Text style={[styles.prompt, { color: colors.textSecondary }]}>{t('capture:whatToRecord')}</Text>
                {typeCards
                  .filter((c) => c.enabled)
                  .map((card) => (
                    <Pressable
                      key={card.type}
                      style={[styles.typeCard, { borderColor: colors.border, minHeight: Math.max(72, tapMin + 24) }]}
                      onPress={() => setStep(card.type)}
                    >
                      <View style={[styles.typeIcon, { backgroundColor: colors.primary + '22' }]}>
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
                    {fields.find((f) => f.id === fieldId)?.name || fieldId}
                  </Text>
                ) : (
                  <View style={styles.chipRow}>
                    {fields.map((f) => (
                      <Pressable
                        key={f.id}
                        style={[
                          styles.chip,
                          {
                            borderColor: fieldId === f.id ? colors.primary : colors.border,
                            backgroundColor: fieldId === f.id ? colors.primary + '22' : 'transparent',
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
                    style={[styles.input, styles.textarea, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder={t('capture:observation.placeholder')}
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    value={body}
                    onChangeText={setBody}
                  />
                ) : null}

                {step === 'work' ? (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>{t('capture:work.whatWork')}</Text>
                    <View style={styles.chipRow}>
                      {workOptions.map((w) => (
                        <Pressable
                          key={w.id}
                          style={[
                            styles.chip,
                            {
                              borderColor: workId === w.id ? colors.primary : colors.border,
                              backgroundColor: workId === w.id ? colors.primary + '22' : 'transparent',
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
                      style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder={t('capture:work.optionalCost')}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      value={workCost}
                      onChangeText={setWorkCost}
                    />
                    <TextInput
                      style={[styles.input, styles.textarea, { color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder={t('capture:work.optionalNote')}
                      placeholderTextColor={colors.textSecondary}
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
                      <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 8 }}>
                        {t('capture:scheduleLater')}
                      </Text>
                    </Pressable>
                  </>
                ) : null}

                {step === 'expense' ? (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>{t('capture:expense.amount')}</Text>
                    <TextInput
                      style={[styles.input, styles.amount, { color: colors.textPrimary, borderColor: colors.border }]}
                      keyboardType="decimal-pad"
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0,00 €"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <View style={styles.chipRow}>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <Pressable
                          key={c}
                          style={[
                            styles.chip,
                            {
                              borderColor: category === c ? colors.primary : colors.border,
                              backgroundColor: category === c ? colors.primary + '22' : 'transparent',
                              minHeight: tapMin,
                            },
                          ]}
                          onPress={() => setCategory(c)}
                        >
                          <Text style={{ color: category === c ? colors.primary : colors.textPrimary }}>
                            {t(`fields:costs.categories.${c}`, { defaultValue: c })}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : null}

                {step === 'harvest' ? (
                  <>
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder={t('capture:harvest.olives')}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      value={oliveKg}
                      onChangeText={setOliveKg}
                    />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder={t('capture:harvest.oil')}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      value={oilKg}
                      onChangeText={setOilKg}
                    />
                    {yieldPct != null ? (
                      <Text style={{ color: colors.textPrimary, fontWeight: '700', marginBottom: 8 }}>
                        {t('capture:harvest.yield')}: {yieldPct}%
                      </Text>
                    ) : null}
                    <Pressable onPress={() => setMoreOpen((v) => !v)}>
                      <Text style={{ color: colors.primary, fontWeight: '700' }}>
                        {moreOpen ? t('capture:less') : t('capture:more')}
                      </Text>
                    </Pressable>
                    {moreOpen ? (
                      <>
                        <TextInput
                          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                          placeholder={t('capture:harvest.mill')}
                          placeholderTextColor={colors.textSecondary}
                          value={mill}
                          onChangeText={setMill}
                        />
                        <TextInput
                          style={[styles.input, styles.textarea, { color: colors.textPrimary, borderColor: colors.border }]}
                          placeholder={t('capture:harvest.notes')}
                          placeholderTextColor={colors.textSecondary}
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
                      {photos.map((uri) => (
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

          {step !== 'choose' ? (
            <View style={styles.footer}>
              <Button
                title={submitting ? t('capture:saving') : t('capture:save')}
                onPress={() => void save()}
                loading={submitting}
                fullWidth
                size="large"
              />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#999', marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.styles.h3, fontWeight: '700', flex: 1 },
  body: { padding: spacing.md, paddingBottom: 24 },
  prompt: { fontSize: 16, marginBottom: 12 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  typeTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  lockedField: { borderWidth: 1, borderRadius: 10, padding: 12, fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10, fontSize: 16 },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  amount: { fontSize: 28, fontWeight: '700', minHeight: 56 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  photoActions: { gap: 8 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});

export default CaptureSheet;
