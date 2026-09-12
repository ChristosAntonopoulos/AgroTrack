import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import HeaderIconButton from '../components/layout/HeaderIconButton';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import FilterChips from '../components/ui/FilterChips';
import Sheet from '../components/ui/Sheet';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useOfflineMode } from '../context/OfflineContext';
import { useRefresh } from '../hooks/useRefresh';
import { pickCapturePhotoUris } from '../capture/photos';
import { resolvePublicAssetUrl } from '../config/env';
import {
  getFieldService,
  getFieldWorkService,
  getHarvestService,
  getNoteService,
  getPhotoService,
} from '../services/serviceFactory';
import type { Field } from '../services/fieldService';
import type {
  Photo,
  PhotoLinkStatus,
  PhotoUploadResult,
} from '../services/photoService';
import { notePreviewTitle } from '../services/noteService';
import { fieldLabelMap, friendlyFieldLabel } from '../utils/fieldLabels';
import { RootStackParamList } from '../navigation/types';
import { spacing, typography, radii, createElevation } from '../theme';
import PhotoViewer, { type PhotoViewerItem } from '../components/photos/PhotoViewer';

type LinkOwner = 'task' | 'note' | 'harvest' | 'phenology';
type LinkTarget = { id: string; label: string };
type Nav = NativeStackNavigationProp<RootStackParamList>;

const MAX_UPLOAD = 12;

const badgeKey = (photo: Photo): string => {
  if (!photo.isLinked || photo.ownerType === 'field') return 'standalone';
  if (photo.ownerType === 'task') return 'task';
  if (photo.ownerType === 'note') return 'note';
  if (photo.ownerType === 'harvest') return 'harvest';
  if (photo.ownerType === 'phenology') return 'phenology';
  return 'standalone';
};

const PhotoHubScreen: React.FC = () => {
  const { t, i18n } = useTranslation(['photos', 'common', 'nav']);
  const { colors, tapMin } = useTheme();
  const { user } = useAuth();
  const { isOnline } = useOfflineMode();
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const params = route.params as { fieldId?: string; photoId?: string } | undefined;
  const { width } = useWindowDimensions();
  const columns = width >= 720 ? 3 : 2;
  const gap = spacing.sm;
  const tile = (width - spacing.md * 2 - gap * (columns - 1)) / columns;

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [fieldId, setFieldId] = useState(params?.fieldId || '');
  const [linkStatus, setLinkStatus] = useState<PhotoLinkStatus>('all');
  const [assignment, setAssignment] = useState('');
  const [reviewItems, setReviewItems] = useState<PhotoUploadResult[]>([]);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [uploadPickerOpen, setUploadPickerOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ownerType, setOwnerType] = useState<LinkOwner>('task');
  const [ownerId, setOwnerId] = useState('');
  const [targets, setTargets] = useState<LinkTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [confirmFieldId, setConfirmFieldId] = useState('');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const fieldNames = useMemo(() => fieldLabelMap(fields), [fields]);

  const viewerItems = useMemo(
    (): PhotoViewerItem[] =>
      photos.map((photo) => ({
        id: photo.id,
        uri: resolvePublicAssetUrl(photo.url) || photo.url,
        alt: photo.fileName || undefined,
      })),
    [photos]
  );

  const load = useCallback(async () => {
    const [fieldList, list] = await Promise.all([
      getFieldService()
        .getFields(user?.id || '', user?.role || '')
        .then((items) => items.filter((f) => f.status !== 'Draft'))
        .catch(() => [] as Field[]),
      getPhotoService().query({
        fieldId: fieldId || undefined,
        linkStatus: linkStatus === 'all' ? undefined : linkStatus,
        fieldAssignment: assignment || undefined,
        page: 1,
        pageSize: 96,
      }),
    ]);
    setFields(fieldList);
    setPhotos(list.items);
  }, [assignment, fieldId, linkStatus, user?.id, user?.role]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await load();
      } catch {
        Alert.alert(t('photos:errors.load'));
      } finally {
        setLoading(false);
      }
    })();
  }, [load, t]);

  useEffect(() => {
    if (params?.fieldId) setFieldId(params.fieldId);
  }, [params?.fieldId]);

  useEffect(() => {
    const photoId = params?.photoId;
    if (!photoId) return;
    const fromList = photos.find((p) => p.id === photoId);
    if (fromList) {
      setSelected(fromList);
      return;
    }
    if (loading) return;
    let cancelled = false;
    void getPhotoService()
      .getById(photoId)
      .then((photo) => {
        if (!cancelled) setSelected(photo);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [loading, params?.photoId, photos]);

  const { refreshing, onRefresh } = useRefresh(load);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderIconButton
          icon="add"
          accessibilityLabel={t('photos:upload')}
          onPress={() => setUploadPickerOpen(true)}
        />
      ),
    });
  }, [navigation, t]);

  const refreshPhoto = (photo: Photo) => {
    setSelected(photo);
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? photo : p)));
    setReviewItems((prev) =>
      prev.map((item) => (item.photo.id === photo.id ? { ...item, photo } : item))
    );
  };

  const runUpload = async (camera: boolean) => {
    setUploadPickerOpen(false);
    const uris = await pickCapturePhotoUris({
      camera,
      remainingSlots: MAX_UPLOAD,
      isOnline,
      offlineMessage: t('photos:offline'),
      permissionDeniedMessage: t('common:permissionRequired', {
        defaultValue: 'Permission required',
      }),
    });
    if (uris.length === 0) return;

    setUploading(true);
    try {
      const results = await getPhotoService().uploadLocalUris(uris);
      const needsReview = results.filter(
        (r) =>
          r.photo.fieldAssignment === 'needsReview' ||
          r.photo.fieldAssignment === 'unassigned' ||
          r.duplicateWarning
      );
      if (needsReview.length > 0) {
        setReviewItems((prev) => [...needsReview, ...prev]);
        setReviewOpen(true);
      }
      await load();
    } catch {
      Alert.alert(t('photos:errors.upload'));
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!selected) {
      setTargets([]);
      setOwnerId('');
      setConfirmFieldId('');
      return;
    }
    setConfirmFieldId(selected.fieldId || '');
    setOwnerId('');
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.fieldId) {
      setTargets([]);
      return;
    }
    let cancelled = false;
    const loadTargets = async () => {
      setLoadingTargets(true);
      try {
        let next: LinkTarget[] = [];
        if (ownerType === 'task') {
          const tasks = await getFieldWorkService().listFieldTasks({
            fieldId: selected.fieldId,
          });
          next = tasks.map((task) => ({
            id: task.id,
            label: `${task.title} · ${task.statusLabel || task.status}`,
          }));
        } else if (ownerType === 'note') {
          const notes = await getNoteService().getNotes({
            fieldId: selected.fieldId,
            limit: 40,
          });
          next = notes.map((note) => ({
            id: note.id,
            label: notePreviewTitle(note.body) || note.id,
          }));
        } else if (ownerType === 'harvest') {
          const harvests = await getHarvestService().listByField(selected.fieldId);
          next = harvests.map((h) => ({
            id: h.id,
            label: `${new Date(h.harvestDate).toLocaleDateString(i18n.language)} · ${h.oliveKg} kg`,
          }));
        } else if (ownerType === 'phenology') {
          const observations = await getFieldWorkService().listPhenologyObservations(
            selected.fieldId
          );
          next = observations.map((o) => ({
            id: o.id,
            label: `${o.stageLabel || o.stageCode} · ${new Date(o.observedOn).toLocaleDateString(i18n.language)}`,
          }));
        }
        if (!cancelled) setTargets(next);
      } catch {
        if (!cancelled) setTargets([]);
      } finally {
        if (!cancelled) setLoadingTargets(false);
      }
    };
    void loadTargets();
    return () => {
      cancelled = true;
    };
  }, [i18n.language, ownerType, selected?.fieldId, selected?.id]);

  const fieldScopeLabel = fieldId
    ? fieldNames[fieldId] || friendlyFieldLabel(fieldId)
    : t('photos:filters.allFields');

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ScreenLayout
      scroll
      padded
      refreshControl={{ refreshing, onRefresh }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('photos:subtitle')}
      </Text>

      <View style={styles.toolbar}>
        <Pressable
          onPress={() => setFieldPickerOpen(true)}
          style={[
            styles.scopeChip,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              minHeight: Math.max(tapMin * 0.7, 36),
            },
          ]}
        >
          <Ionicons name="leaf-outline" size={16} color={colors.primary} />
          <Text style={[styles.scopeText, { color: colors.textPrimary }]} numberOfLines={1}>
            {fieldScopeLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </Pressable>

        {reviewItems.length > 0 ? (
          <Pressable
            onPress={() => setReviewOpen(true)}
            style={[
              styles.reviewChip,
              {
                backgroundColor: colors.warningLight || colors.surfaceElevated,
                borderColor: colors.warning || colors.border,
                minHeight: Math.max(tapMin * 0.7, 36),
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={16} color={colors.warning || colors.primary} />
            <Text style={[styles.scopeText, { color: colors.textPrimary }]}>
              {t('photos:review.title')} ({reviewItems.length})
            </Text>
          </Pressable>
        ) : null}
      </View>

      <FilterChips
        compact
        options={[
          { value: 'all', label: t('photos:filters.all') },
          { value: 'standalone', label: t('photos:filters.standalone') },
          { value: 'linked', label: t('photos:filters.linked') },
        ]}
        selected={linkStatus}
        onSelect={(v) => setLinkStatus(v as PhotoLinkStatus)}
        style={styles.chipRow}
      />
      <FilterChips
        compact
        options={[
          { value: '', label: t('photos:filters.all') },
          { value: 'needsReview', label: t('photos:filters.needsReview') },
          { value: 'unassigned', label: t('photos:filters.unassigned') },
        ]}
        selected={assignment}
        onSelect={setAssignment}
        style={styles.chipRow}
      />

      {uploading ? (
        <View style={styles.uploading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textSecondary }}>{t('photos:uploading')}</Text>
        </View>
      ) : null}

      {!isOnline ? (
        <Text style={[styles.offline, { color: colors.warning || colors.textSecondary }]}>
          {t('photos:offline')}
        </Text>
      ) : null}

      {photos.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="images-outline" size={36} color={colors.textSecondary} />}
          title={t('photos:empty')}
          description={t('photos:emptyHint')}
        />
      ) : (
        <View style={[styles.grid, { gap }]}>
          {photos.map((photo) => {
            const src =
              resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url;
            const key = badgeKey(photo);
            const showReview =
              photo.fieldAssignment === 'needsReview' ||
              photo.fieldAssignment === 'unassigned';
            return (
              <Pressable
                key={photo.id}
                onPress={() => setSelected(photo)}
                onLongPress={() => {
                  const idx = photos.findIndex((p) => p.id === photo.id);
                  setViewerIndex(idx >= 0 ? idx : 0);
                }}
                style={[
                  styles.tile,
                  {
                    width: tile,
                    backgroundColor: colors.surfaceElevated,
                    borderColor: photo.isLinked ? colors.primary : colors.border,
                    ...createElevation(colors, 'sm'),
                  },
                ]}
              >
                <Image source={{ uri: src }} style={styles.thumb} />
                <View style={styles.badges}>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: photo.isLinked
                          ? colors.primary
                          : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: photo.isLinked ? colors.onOlive : colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {t(`photos:badges.${key}`)}
                    </Text>
                  </View>
                  {showReview ? (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: colors.warningLight || colors.surface },
                      ]}
                    >
                      <Text
                        style={[styles.badgeText, { color: colors.warning || colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {t(
                          `photos:badges.${
                            photo.fieldAssignment === 'unassigned' ? 'unassigned' : 'needsReview'
                          }`
                        )}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Sheet
        open={uploadPickerOpen}
        onClose={() => setUploadPickerOpen(false)}
        title={t('photos:upload')}
        edge="bottom"
        size="sm"
      >
        <View style={styles.sheetActions}>
          <Button
            title={t('photos:uploadCamera')}
            onPress={() => void runUpload(true)}
            fullWidth
            icon={<Ionicons name="camera-outline" size={18} color={colors.onOlive} />}
          />
          <Button
            title={t('photos:uploadLibrary')}
            variant="secondary"
            onPress={() => void runUpload(false)}
            fullWidth
            icon={<Ionicons name="images-outline" size={18} color={colors.textPrimary} />}
          />
        </View>
      </Sheet>

      <Sheet
        open={fieldPickerOpen}
        onClose={() => setFieldPickerOpen(false)}
        title={t('photos:filters.field')}
        edge="bottom"
        size="md"
      >
        <Pressable
          onPress={() => {
            setFieldId('');
            setFieldPickerOpen(false);
          }}
          style={[styles.pickerRow, { borderBottomColor: colors.border, minHeight: tapMin }]}
        >
          <Text style={{ color: colors.textPrimary }}>{t('photos:filters.allFields')}</Text>
        </Pressable>
        {fields.map((field) => (
          <Pressable
            key={field.id}
            onPress={() => {
              setFieldId(field.id);
              setFieldPickerOpen(false);
            }}
            style={[styles.pickerRow, { borderBottomColor: colors.border, minHeight: tapMin }]}
          >
            <Text style={{ color: colors.textPrimary }}>{friendlyFieldLabel(field.name)}</Text>
            {fieldId === field.id ? (
              <Ionicons name="checkmark" size={18} color={colors.primary} />
            ) : null}
          </Pressable>
        ))}
      </Sheet>

      <Sheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={t('photos:review.title')}
        edge="end"
        size="lg"
        footer={
          <Button
            title={t('photos:review.done')}
            onPress={() => {
              setReviewItems([]);
              setReviewOpen(false);
            }}
            fullWidth
          />
        }
      >
        {reviewItems.map((item) => {
          const photo = item.photo;
          const src =
            resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url;
          const defaultField =
            photo.fieldId || item.candidates[0]?.fieldId || fields[0]?.id || '';
          return (
            <View
              key={photo.id}
              style={[
                styles.reviewCard,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Image source={{ uri: src }} style={styles.reviewThumb} />
              {item.duplicateWarning ? (
                <Text style={{ color: colors.warning || colors.textSecondary }}>
                  {t('photos:review.duplicate')}
                </Text>
              ) : null}
              {item.candidates.length > 0 ? (
                <Text style={{ color: colors.textSecondary }}>
                  {t('photos:review.candidates')}:{' '}
                  {item.candidates.map((c) => c.fieldName).join(', ')}
                </Text>
              ) : null}
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
                {t('photos:review.pickField')}
              </Text>
              {fields.map((field) => (
                <Pressable
                  key={field.id}
                  onPress={async () => {
                    setBusy(true);
                    try {
                      const updated = await getPhotoService().confirmField(photo.id, field.id);
                      refreshPhoto(updated);
                      setReviewItems((prev) =>
                        prev.filter(
                          (r) =>
                            r.photo.id !== photo.id ||
                            updated.fieldAssignment === 'needsReview' ||
                            updated.fieldAssignment === 'unassigned'
                        )
                      );
                      await load();
                    } catch {
                      Alert.alert(t('photos:errors.save'));
                    } finally {
                      setBusy(false);
                    }
                  }}
                  style={[
                    styles.pickerRow,
                    {
                      borderBottomColor: colors.border,
                      minHeight: tapMin,
                      opacity: busy ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: colors.textPrimary }}>
                    {friendlyFieldLabel(field.name)}
                  </Text>
                  {(defaultField === field.id || photo.fieldId === field.id) ? (
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          );
        })}
      </Sheet>

      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={t('photos:detail.title')}
        edge="end"
        size="lg"
      >
        {selected ? (
          <View style={styles.detail}>
            <Pressable
              onPress={() => {
                const idx = photos.findIndex((p) => p.id === selected.id);
                setViewerIndex(idx >= 0 ? idx : 0);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('photos:viewer.expand')}
            >
              <Image
                source={{
                  uri: resolvePublicAssetUrl(selected.url) || selected.url,
                }}
                style={styles.detailImage}
                resizeMode="contain"
              />
            </Pressable>
            <View style={styles.metaBlock}>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
                {t('photos:detail.field')}
              </Text>
              <Text style={{ color: colors.textPrimary }}>
                {selected.fieldId
                  ? fieldNames[selected.fieldId] || friendlyFieldLabel(selected.fieldId)
                  : '—'}
              </Text>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
                {t('photos:detail.captured')}
              </Text>
              <Text style={{ color: colors.textPrimary }}>
                {new Date(selected.effectiveCapturedAt).toLocaleString(i18n.language)}
              </Text>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
                {t('photos:detail.location')}
              </Text>
              <Text style={{ color: colors.textPrimary }}>
                {selected.latitude != null && selected.longitude != null
                  ? `${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`
                  : t('photos:detail.noGps')}
              </Text>
              {selected.isLinked ? (
                <>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
                    {t('photos:detail.linkedAs')}
                  </Text>
                  <Text style={{ color: colors.textPrimary }}>
                    {t(`photos:badges.${badgeKey(selected)}`)}
                  </Text>
                </>
              ) : null}
            </View>

            {!selected.fieldId ? (
              <View style={styles.linkBlock}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {t('photos:review.pickField')}
                </Text>
                {fields.map((field) => (
                  <Pressable
                    key={field.id}
                    onPress={() => setConfirmFieldId(field.id)}
                    style={[
                      styles.pickerRow,
                      { borderBottomColor: colors.border, minHeight: tapMin },
                    ]}
                  >
                    <Text style={{ color: colors.textPrimary }}>
                      {friendlyFieldLabel(field.name)}
                    </Text>
                    {confirmFieldId === field.id ? (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                ))}
                <Button
                  title={t('photos:review.confirmField')}
                  disabled={busy || !confirmFieldId}
                  loading={busy}
                  fullWidth
                  onPress={async () => {
                    if (!confirmFieldId) return;
                    setBusy(true);
                    try {
                      const updated = await getPhotoService().confirmField(
                        selected.id,
                        confirmFieldId
                      );
                      refreshPhoto(updated);
                      await load();
                    } catch {
                      Alert.alert(t('photos:errors.save'));
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </View>
            ) : null}

            <View style={styles.linkBlock}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('photos:detail.link')}
              </Text>
              <FilterChips
                compact
                options={[
                  { value: 'task', label: t('photos:badges.task') },
                  { value: 'note', label: t('photos:badges.note') },
                  { value: 'harvest', label: t('photos:badges.harvest') },
                  { value: 'phenology', label: t('photos:badges.phenology') },
                ]}
                selected={ownerType}
                onSelect={(v) => setOwnerType(v as LinkOwner)}
              />
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
                {t('photos:detail.pickRecord')}
              </Text>
              {loadingTargets ? (
                <Text style={{ color: colors.textSecondary }}>
                  {t('photos:detail.loadingRecords')}
                </Text>
              ) : !selected.fieldId ? (
                <Text style={{ color: colors.textSecondary }}>
                  {t('photos:detail.noRecords')}
                </Text>
              ) : targets.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>
                  {t('photos:detail.noRecords')}
                </Text>
              ) : (
                targets.map((target) => (
                  <Pressable
                    key={target.id}
                    onPress={() => setOwnerId(target.id)}
                    style={[
                      styles.pickerRow,
                      { borderBottomColor: colors.border, minHeight: tapMin },
                    ]}
                  >
                    <Text style={{ color: colors.textPrimary, flex: 1 }} numberOfLines={2}>
                      {target.label}
                    </Text>
                    {ownerId === target.id ? (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                ))
              )}
              <Button
                title={t('photos:detail.saveLink')}
                disabled={busy || !ownerId || !selected.fieldId}
                loading={busy}
                fullWidth
                onPress={async () => {
                  setBusy(true);
                  try {
                    const updated = await getPhotoService().link(
                      selected.id,
                      ownerType,
                      ownerId
                    );
                    refreshPhoto(updated);
                    await load();
                  } catch {
                    Alert.alert(t('photos:errors.save'));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              {selected.isLinked ? (
                <Button
                  title={t('photos:detail.unlink')}
                  variant="secondary"
                  disabled={busy}
                  fullWidth
                  onPress={async () => {
                    setBusy(true);
                    try {
                      const updated = await getPhotoService().unlink(selected.id);
                      refreshPhoto(updated);
                      await load();
                    } catch {
                      Alert.alert(t('photos:errors.save'));
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              ) : null}
            </View>

            <Button
              title={t('photos:detail.delete')}
              variant="error"
              disabled={busy}
              fullWidth
              onPress={() => {
                Alert.alert(t('photos:detail.delete'), t('photos:detail.deleteConfirm'), [
                  { text: t('common:cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                  {
                    text: t('photos:detail.delete'),
                    style: 'destructive',
                    onPress: () => {
                      void (async () => {
                        setBusy(true);
                        try {
                          await getPhotoService().delete(selected.id);
                          setSelected(null);
                          await load();
                        } catch {
                          Alert.alert(t('photos:errors.save'));
                        } finally {
                          setBusy(false);
                        }
                      })();
                    },
                  },
                ]);
              }}
            />
          </View>
        ) : null}
      </Sheet>

      <PhotoViewer
        open={viewerIndex != null}
        items={viewerItems}
        index={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  subtitle: {
    ...typography.styles.bodySmall,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
    maxWidth: '100%',
  },
  reviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
  },
  scopeText: {
    ...typography.styles.label,
    maxWidth: 180,
  },
  chipRow: {
    marginBottom: 0,
  },
  uploading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  offline: {
    ...typography.styles.bodySmall,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#ddd',
  },
  badges: {
    position: 'absolute',
    left: spacing.xs,
    right: spacing.xs,
    bottom: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.styles.caption,
    fontSize: 10,
  },
  sheetActions: {
    gap: spacing.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  reviewCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reviewThumb: {
    width: '100%',
    height: 140,
    borderRadius: radii.sm,
    backgroundColor: '#ddd',
  },
  detail: {
    gap: spacing.md,
  },
  detailImage: {
    width: '100%',
    height: 240,
    borderRadius: radii.md,
    backgroundColor: '#ddd',
  },
  metaBlock: {
    gap: spacing.xs,
  },
  metaLabel: {
    ...typography.styles.caption,
    marginTop: spacing.sm,
  },
  linkBlock: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.styles.h4,
  },
});

export default PhotoHubScreen;
