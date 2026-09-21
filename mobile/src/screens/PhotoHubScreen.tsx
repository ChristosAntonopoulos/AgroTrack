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
import {
  isMediaLibraryAvailable,
  MediaLibraryUnavailableError,
  requestLibraryScanPermission,
  scanLibraryForFieldPhotos,
  type LibraryFieldMatch,
  type LibraryScanRange,
} from '../capture/libraryFieldScan';
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
import { fieldHasGeo } from '../utils/fieldGeo';
import { fieldLabelMap, friendlyFieldLabel } from '../utils/fieldLabels';
import { RootStackParamList } from '../navigation/types';
import { spacing, typography, radii, createElevation } from '../theme';
import PhotoViewer, { type PhotoViewerItem } from '../components/photos/PhotoViewer';

type LinkOwner = 'task' | 'note' | 'harvest' | 'phenology';
type LinkTarget = { id: string; label: string };
type Nav = NativeStackNavigationProp<RootStackParamList>;

const MAX_UPLOAD = 12;
const SCAN_SAMPLE = 6;

const badgeKey = (photo: Photo): string => {
  if (!photo.isLinked || photo.ownerType === 'field') return 'standalone';
  if (photo.ownerType === 'task') return 'task';
  if (photo.ownerType === 'note') return 'note';
  if (photo.ownerType === 'harvest') return 'harvest';
  if (photo.ownerType === 'phenology') return 'phenology';
  return 'standalone';
};

const formatAthensDateTime = (value: string, locale: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(locale.startsWith('el') ? 'el-GR' : locale, {
    timeZone: 'Europe/Athens',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatAthensCardDate = (value: string, locale: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale.startsWith('el') ? 'el-GR' : locale, {
    timeZone: 'Europe/Athens',
    day: 'numeric',
    month: 'short',
  });
};

const PhotoHubScreen: React.FC = () => {
  const { t, i18n } = useTranslation(['photos', 'common', 'nav']);
  const { colors, tapMin } = useTheme();
  const { user } = useAuth();
  const { isOnline } = useOfflineMode();
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const params = route.params as
    | { fieldId?: string; photoId?: string; importNearby?: boolean }
    | undefined;
  const { width } = useWindowDimensions();
  const columns = width >= 720 ? 4 : width >= 360 ? 3 : 2;
  const gap = spacing.xs;
  const tile = (width - spacing.md * 2 - gap * (columns - 1)) / columns;
  const sampleTile = Math.min(72, (width - spacing.md * 2 - spacing.sm * (SCAN_SAMPLE - 1)) / SCAN_SAMPLE);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(
    null
  );
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
  const [scanOpen, setScanOpen] = useState(false);
  const [scanRange, setScanRange] = useState<LibraryScanRange>('12m');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ scanned: number; matches: number } | null>(
    null
  );
  const [scanMatches, setScanMatches] = useState<LibraryFieldMatch[]>([]);
  const [scanTruncated, setScanTruncated] = useState(false);
  const [scanPhase, setScanPhase] = useState<'range' | 'confirm'>('range');
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
    if (!params?.importNearby) return;
    setUploadPickerOpen(false);
    setScanPhase('range');
    setScanMatches([]);
    setScanTruncated(false);
    setScanProgress(null);
    setScanOpen(true);
    navigation.setParams({ importNearby: undefined });
  }, [navigation, params?.importNearby]);

  const openScanSheet = () => {
    setUploadPickerOpen(false);
    setScanPhase('range');
    setScanMatches([]);
    setScanTruncated(false);
    setScanProgress(null);
    setScanOpen(true);
  };

  const scanTargetFields = useMemo(() => {
    const withGeo = fields.filter(fieldHasGeo);
    if (fieldId) {
      const scoped = withGeo.filter((f) => f.id === fieldId);
      return scoped.length > 0 ? scoped : withGeo;
    }
    return withGeo;
  }, [fieldId, fields]);

  const runLibraryScan = async () => {
    if (!isMediaLibraryAvailable()) {
      Alert.alert(t('photos:scan.title'), t('photos:scan.nativeUnavailable'));
      return;
    }
    if (!isOnline) {
      Alert.alert('', t('photos:offline'));
      return;
    }
    if (scanTargetFields.length === 0) {
      Alert.alert('', t('photos:scan.noFields'));
      return;
    }

    const granted = await requestLibraryScanPermission({
      rationaleMessage: t('photos:scan.rationale'),
      deniedMessage: t('photos:scan.denied'),
    });
    if (!granted) {
      if (!isMediaLibraryAvailable()) {
        Alert.alert(t('photos:scan.title'), t('photos:scan.nativeUnavailable'));
      }
      return;
    }

    setScanning(true);
    setScanProgress({ scanned: 0, matches: 0 });
    try {
      const result = await scanLibraryForFieldPhotos({
        fields: scanTargetFields,
        range: scanRange,
        onProgress: (scanned, matches) => setScanProgress({ scanned, matches }),
      });
      setScanMatches(result.matches);
      setScanTruncated(result.truncated);
      if (result.matches.length === 0) {
        Alert.alert(t('photos:scan.title'), t('photos:scan.noMatches'));
        setScanPhase('range');
      } else {
        setScanPhase('confirm');
      }
    } catch (err) {
      if (err instanceof MediaLibraryUnavailableError) {
        Alert.alert(t('photos:scan.title'), t('photos:scan.nativeUnavailable'));
      } else {
        Alert.alert(t('photos:errors.scan'));
      }
    } finally {
      setScanning(false);
      setScanProgress(null);
    }
  };

  const runScanUpload = async () => {
    if (scanMatches.length === 0) return;
    if (!isOnline) {
      Alert.alert('', t('photos:offline'));
      return;
    }

    setScanOpen(false);
    setUploading(true);
    setUploadProgress({ done: 0, total: scanMatches.length });
    try {
      const uris = scanMatches.map((m) => m.uri);
      const results = await getPhotoService().uploadLocalUris(uris, {
        onProgress: (done, total) => setUploadProgress({ done, total }),
      });
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
      setScanMatches([]);
      setScanPhase('range');
      await load();
    } catch {
      Alert.alert(t('photos:errors.upload'));
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

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
      title: t('nav:photos', { defaultValue: 'Photos' }),
      headerRight: () => (
        <Pressable
          onPress={() => setUploadPickerOpen(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('photos:upload')}
          style={styles.headerAdd}
        >
          <Ionicons name="add" size={28} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, t, colors.primary]);

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
    setUploadProgress({ done: 0, total: uris.length });
    try {
      const results = await getPhotoService().uploadLocalUris(uris, {
        onProgress: (done, total) => setUploadProgress({ done, total }),
      });
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
      setUploadProgress(null);
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
            label: `${formatAthensCardDate(h.harvestDate, i18n.language)} · ${h.oliveKg} kg`,
          }));
        } else if (ownerType === 'phenology') {
          const observations = await getFieldWorkService().listPhenologyObservations(
            selected.fieldId
          );
          next = observations.map((o) => ({
            id: o.id,
            label: `${o.stageLabel || o.stageCode} · ${formatAthensCardDate(o.observedOn, i18n.language)}`,
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
    <ScreenLayout scroll padded refreshControl={{ refreshing, onRefresh }}>
      <View style={styles.stack}>
        <View style={styles.scopeRow}>
          <Pressable
            onPress={() => setFieldPickerOpen(true)}
            accessibilityLabel={t('photos:filters.field')}
            style={[
              styles.scopeChip,
              {
                minHeight: Math.max(44, tapMin * 0.9),
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                ...createElevation(colors, 'flat'),
              },
            ]}
          >
            <Ionicons name="map-outline" size={16} color={colors.primary} />
            <Text
              style={{ color: colors.textPrimary, fontWeight: '600', flexShrink: 1 }}
              numberOfLines={1}
            >
              {fieldScopeLabel}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
          </Pressable>

          {reviewItems.length > 0 ? (
            <Pressable
              onPress={() => setReviewOpen(true)}
              style={[
                styles.reviewChip,
                {
                  minHeight: Math.max(44, tapMin * 0.9),
                  backgroundColor: colors.warningLight || colors.surface,
                  borderColor: colors.warning || colors.borderLight,
                },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.warning || colors.primary}
              />
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                {t('photos:filters.needsReview')} ({reviewItems.length})
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
        />
        {fieldId || linkStatus !== 'all' || assignment ? (
          <Pressable
            onPress={() => {
              setFieldId('');
              setLinkStatus('all');
              setAssignment('');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('photos:clearAllFilters')}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ color: colors.primary, fontWeight: '600' }}>
              {t('photos:clearAllFilters')}
            </Text>
          </Pressable>
        ) : null}

        {uploading ? (
          <View style={styles.uploading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textSecondary }}>
              {uploadProgress
                ? t('photos:uploadingProgress', {
                    done: uploadProgress.done,
                    total: uploadProgress.total,
                  })
                : t('photos:uploading')}
            </Text>
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
            title={
              fieldId || linkStatus !== 'all' || assignment
                ? t('photos:emptyFiltered', {
                    filters: [
                      fieldId
                        ? `${t('photos:filters.field')}: ${fieldNames[fieldId] || fieldId}`
                        : null,
                      linkStatus !== 'all' ? t(`photos:filters.${linkStatus}`) : null,
                      assignment ? t(`photos:filters.${assignment}`) : null,
                    ]
                      .filter(Boolean)
                      .join(' + '),
                  })
                : t('photos:empty')
            }
            description={
              fieldId || linkStatus !== 'all' || assignment
                ? undefined
                : t('photos:emptyHint')
            }
            action={
              fieldId || linkStatus !== 'all' || assignment
                ? {
                    label: t('photos:clearFilters'),
                    onPress: () => {
                      setFieldId('');
                      setLinkStatus('all');
                      setAssignment('');
                    },
                  }
                : {
                    label: t('photos:upload'),
                    onPress: () => setUploadPickerOpen(true),
                  }
            }
          />
        ) : (
          <View style={[styles.grid, { gap }]}>
            {photos.map((photo) => {
              const src =
                resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url;
              const dateLabel = formatAthensCardDate(photo.effectiveCapturedAt, i18n.language);
              const fieldLabel =
                photo.fieldName ||
                (photo.fieldId
                  ? fieldNames[photo.fieldId] || friendlyFieldLabel(photo.fieldId)
                  : t('photos:badges.unassigned'));
              const statusLabel = photo.isLinked
                ? t('photos:badges.linkedWith', {
                    title:
                      photo.linkedTitle ||
                      t(`photos:badges.${badgeKey(photo)}`),
                  })
                : t('photos:badges.standalone');
              const showReview =
                photo.fieldAssignment === 'needsReview' ||
                photo.fieldAssignment === 'unassigned';
              return (
                <Pressable
                  key={photo.id}
                  onPress={() => {
                    const idx = photos.findIndex((p) => p.id === photo.id);
                    setViewerIndex(idx >= 0 ? idx : 0);
                  }}
                  onLongPress={() => setSelected(photo)}
                  accessibilityLabel={`${dateLabel} · ${fieldLabel}. ${statusLabel}`}
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
                  <View style={styles.overlay}>
                    <Text style={styles.overlayPrimary} numberOfLines={1}>
                      {[dateLabel, fieldLabel].filter(Boolean).join(' · ')}
                    </Text>
                    <Text style={styles.overlayStatus} numberOfLines={1}>
                      {statusLabel}
                    </Text>
                  </View>
                  {showReview ? (
                    <View style={styles.badges}>
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
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

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
          <View style={styles.optionBlock}>
            <Button
              title={t('photos:uploadLibrary')}
              variant="secondary"
              onPress={() => void runUpload(false)}
              fullWidth
              icon={<Ionicons name="images-outline" size={18} color={colors.textPrimary} />}
            />
            <Text style={[styles.optionHint, { color: colors.textSecondary }]}>
              {t('photos:uploadLibraryHint')}
            </Text>
          </View>
          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.orLabel, { color: colors.textSecondary }]}>
              {t('photos:uploadOr')}
            </Text>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          </View>
          <Pressable
            onPress={openScanSheet}
            disabled={!isOnline || uploading}
            accessibilityRole="button"
            accessibilityLabel={t('photos:importNearby')}
            style={({ pressed }) => [
              styles.findCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                opacity: !isOnline || uploading ? 0.5 : pressed ? 0.92 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.findIconWrap,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons name="locate-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.findCopy}>
              <Text style={[styles.findTitle, { color: colors.textPrimary }]}>
                {t('photos:importNearby')}
              </Text>
              <Text style={[styles.findBody, { color: colors.textSecondary }]}>
                {t('photos:importNearbyHint')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </Sheet>

      <Sheet
        open={scanOpen}
        onClose={() => {
          if (scanning) return;
          setScanOpen(false);
          setScanPhase('range');
        }}
        title={
          scanPhase === 'confirm' ? t('photos:scan.confirmTitle') : t('photos:scan.title')
        }
        edge="bottom"
        size="lg"
        footer={
          scanPhase === 'confirm' ? (
            <View style={styles.sheetActions}>
              <Button
                title={t('photos:scan.confirmUpload', { count: scanMatches.length })}
                onPress={() => void runScanUpload()}
                fullWidth
                disabled={uploading || scanning}
                icon={<Ionicons name="cloud-upload-outline" size={18} color={colors.onOlive} />}
              />
              <Button
                title={t('photos:scan.changeRange')}
                variant="secondary"
                onPress={() => {
                  setScanPhase('range');
                  setScanMatches([]);
                }}
                fullWidth
                disabled={scanning || uploading}
              />
            </View>
          ) : (
            <Button
              title={scanning ? t('photos:scan.scanning') : t('photos:scan.start')}
              onPress={() => void runLibraryScan()}
              fullWidth
              disabled={scanning || uploading || !isOnline}
              loading={scanning}
              icon={
                scanning ? undefined : (
                  <Ionicons name="scan-outline" size={18} color={colors.onOlive} />
                )
              }
            />
          )
        }
      >
        {scanPhase === 'range' ? (
          <View style={styles.sheetActions}>
            <Text style={[styles.scanLead, { color: colors.textPrimary }]}>
              {t('photos:scan.lead')}
            </Text>
            <View
              style={[
                styles.howCard,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.howTitle, { color: colors.textSecondary }]}>
                {t('photos:scan.howTitle')}
              </Text>
              {(
                [
                  t('photos:scan.step1'),
                  t('photos:scan.step2'),
                  t('photos:scan.step3'),
                ] as string[]
              ).map((step, index) => (
                <View key={step} style={styles.howStep}>
                  <View
                    style={[
                      styles.howNum,
                      {
                        backgroundColor: colors.primaryLight,
                      },
                    ]}
                  >
                    <Text style={[styles.howNumText, { color: colors.primary }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text style={[styles.howStepText, { color: colors.textPrimary }]}>{step}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
              {t('photos:scan.rangeTitle')}
            </Text>
            <FilterChips
              compact
              options={[
                { value: '3m', label: t('photos:scan.range3m') },
                { value: '12m', label: t('photos:scan.range12m') },
                { value: 'all', label: t('photos:scan.rangeAll') },
              ]}
              selected={scanRange}
              onSelect={(v) => setScanRange(v as LibraryScanRange)}
            />
            {scanning && scanProgress ? (
              <Text style={{ color: colors.textSecondary }}>
                {t('photos:scan.scanningProgress', {
                  scanned: scanProgress.scanned,
                  matches: scanProgress.matches,
                })}
              </Text>
            ) : (
              <Text style={[styles.optionHint, { color: colors.textSecondary }]}>
                {t('photos:scan.rationale')}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.sheetActions}>
            <Text style={{ color: colors.textPrimary }}>
              {t('photos:scan.confirmCount', { count: scanMatches.length })}
            </Text>
            {scanTruncated ? (
              <Text style={{ color: colors.textSecondary }}>
                {t('photos:scan.confirmTruncated', { count: scanMatches.length })}
              </Text>
            ) : null}
            <Text style={{ color: colors.textSecondary }}>{t('photos:scan.confirmHint')}</Text>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
              {t('photos:scan.sampleLabel')}
            </Text>
            <View style={[styles.sampleRow, { gap: spacing.sm }]}>
              {scanMatches.slice(0, SCAN_SAMPLE).map((match) => (
                <Image
                  key={match.assetId}
                  source={{ uri: match.uri }}
                  style={[
                    styles.sampleThumb,
                    {
                      width: sampleTile,
                      height: sampleTile,
                      backgroundColor: '#ddd',
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}
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
        title={
          selected?.fieldName ||
          (selected?.fieldId
            ? fieldNames[selected.fieldId] || friendlyFieldLabel(selected.fieldId)
            : t('photos:detail.title'))
        }
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
                {selected.fieldName ||
                  (selected.fieldId
                    ? fieldNames[selected.fieldId] || friendlyFieldLabel(selected.fieldId)
                    : '—')}
              </Text>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
                {t('photos:detail.captured')}
              </Text>
              <Text style={{ color: colors.textPrimary }}>
                {formatAthensDateTime(selected.effectiveCapturedAt, i18n.language)}
              </Text>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
                {t('photos:detail.location')}
              </Text>
              <Text style={{ color: colors.textPrimary }}>
                {selected.latitude != null && selected.longitude != null
                  ? `${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`
                  : t('photos:detail.noGps')}
              </Text>
              {selected.assignmentReason ? (
                <>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
                    {t('photos:detail.assignmentReason')}
                  </Text>
                  <Text style={{ color: colors.textPrimary }}>
                    {t(`photos:detail.reasons.${selected.assignmentReason}`, {
                      defaultValue: selected.assignmentReason,
                    })}
                  </Text>
                </>
              ) : null}
            </View>

            {selected.isLinked ? (
              <View
                style={[
                  styles.linkedCard,
                  {
                    borderColor: selected.linkBroken ? colors.warning || colors.border : colors.border,
                    backgroundColor: colors.surfaceElevated,
                  },
                ]}
              >
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
                  {t(`photos:badges.${badgeKey(selected)}`)}
                </Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {selected.linkedTitle || t('photos:detail.linkedAs')}
                </Text>
                {selected.linkedOccurredAt ? (
                  <Text style={{ color: colors.textSecondary }}>
                    {formatAthensDateTime(selected.linkedOccurredAt, i18n.language)}
                    {selected.linkedStatus ? ` · ${selected.linkedStatus}` : ''}
                  </Text>
                ) : null}
                {selected.linkBroken ? (
                  <Text style={{ color: colors.warning || colors.textSecondary }}>
                    {t('photos:detail.linkBroken')}
                  </Text>
                ) : null}
              </View>
            ) : null}

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
              <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
                {t('photos:detail.linkMoves')}
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

            {selected.canTrash !== false ? (
              <Button
                title={t('photos:detail.delete')}
                variant="secondary"
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
            ) : null}
          </View>
        ) : null}
      </Sheet>

      <PhotoViewer
        open={viewerIndex != null}
        items={viewerItems}
        index={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
        onOpenDetails={(idx) => {
          const photo = photos[idx];
          if (!photo) return;
          setViewerIndex(null);
          setSelected(photo);
        }}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  headerAdd: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 4,
  },
  stack: {
    gap: spacing.md,
  },
  scopeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
    maxWidth: '100%',
  },
  reviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
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
    borderWidth: 1.5,
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
    top: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    ...typography.styles.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xs,
    paddingTop: 28,
    paddingBottom: spacing.xs,
    backgroundColor: 'rgba(12,18,10,0.72)',
  },
  overlayPrimary: {
    ...typography.styles.caption,
    fontSize: 11,
    fontWeight: '700',
    color: '#f7faf5',
  },
  overlayStatus: {
    ...typography.styles.caption,
    fontSize: 10,
    color: '#d7e8cf',
  },
  linkedCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sheetActions: {
    gap: spacing.sm,
  },
  optionBlock: {
    gap: spacing.xs,
  },
  optionHint: {
    ...typography.styles.caption,
    lineHeight: 18,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  orLabel: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
  findCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  findIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findCopy: {
    flex: 1,
    gap: 2,
  },
  findTitle: {
    ...typography.styles.body,
    fontWeight: '600',
  },
  findBody: {
    ...typography.styles.caption,
    lineHeight: 18,
  },
  scanLead: {
    ...typography.styles.body,
    lineHeight: 22,
  },
  howCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  howTitle: {
    ...typography.styles.caption,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  howStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  howNum: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  howNumText: {
    ...typography.styles.caption,
    fontWeight: '700',
  },
  howStepText: {
    ...typography.styles.body,
    flex: 1,
    lineHeight: 20,
  },
  sampleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sampleThumb: {
    borderRadius: radii.sm,
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
