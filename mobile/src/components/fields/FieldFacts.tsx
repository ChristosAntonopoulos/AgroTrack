import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Field } from '../../services/fieldService';
import type { FieldPhenology, FieldWorkProfile } from '../../services/fieldWorkService';
import { useTheme } from '../../context/ThemeContext';
import { formatAreaFromSqm, formatFieldArea, formatFieldAreaSqm, resolveFieldCenter } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { formatRelativeTime, getFieldStatusLabel, numberLocaleFor } from '../../utils/fieldDisplay';
import { resolveFieldStageLabel } from '../../utils/fieldStage';
import { useFieldSpatialDossier } from '../../hooks/useFieldSpatialDossier';
import { formatPassDay, nearbyFire, ndviBand, textureFromFractions } from '../../utils/fieldDetailsGeo';
import { spacing } from '../../theme';
import { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  field: Field;
  year: number;
  canOwn: boolean;
  canViewSensitiveIdentity?: boolean;
  canViewDocuments?: boolean;
  workProfile?: FieldWorkProfile | null;
  phenology?: FieldPhenology | null;
  onOpenMap?: () => void;
};

const FactRow: React.FC<{ label: string; value?: string | null; empty?: boolean; first?: boolean }> = ({
  label,
  value,
  empty,
  first,
}) => {
  const { colors } = useTheme();
  const display = value && value.trim() ? value : '—';
  const isEmpty = empty || !value || !value.trim();
  return (
    <View
      style={[
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.18)' },
      ]}
    >
      <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          { color: isEmpty ? colors.textTertiary : colors.textPrimary, fontWeight: isEmpty ? '500' : '600' },
        ]}
        numberOfLines={3}
      >
        {display}
      </Text>
    </View>
  );
};

const FactCard: React.FC<{
  title: string;
  kicker?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  footer?: string;
}> = ({ title, kicker, children, action, footer }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceElevated }]}>
      <View style={styles.cardHead}>
        <View style={styles.cardHeadText}>
          {kicker ? (
            <Text style={[styles.kicker, { color: colors.textTertiary }]}>{kicker}</Text>
          ) : null}
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
        </View>
        {action}
      </View>
      <View style={styles.cardBody}>{children}</View>
      {footer ? (
        <Text style={[styles.footer, { color: colors.textTertiary }]}>{footer}</Text>
      ) : null}
    </View>
  );
};

const formatM = (value: number | undefined, locale: string): string | null => {
  if (value == null || !Number.isFinite(value)) return null;
  return `${Math.round(value).toLocaleString(locale)} m`;
};

const formatPct = (value: number | undefined, locale: string): string | null => {
  if (value == null || !Number.isFinite(value)) return null;
  return `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
};

const FieldFacts: React.FC<Props> = ({
  field,
  year,
  canOwn,
  canViewSensitiveIdentity = true,
  canViewDocuments = true,
  workProfile,
  phenology,
  onOpenMap,
}) => {
  const { t, i18n } = useTranslation(['fields', 'common']);
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const dossier = useFieldSpatialDossier(field.id);
  const { spatial, collecting, terrain, soil, landCover, environment, green } = dossier;

  const lang = (i18n.language?.startsWith('el')
    ? 'el'
    : i18n.language?.startsWith('it')
      ? 'it'
      : 'en') as 'el' | 'en' | 'it';
  const numberLocale = numberLocaleFor(i18n.language);

  const draft = field.status === 'Draft';
  const missing = [
    !field.name ? t('fields:details.checklist.name') : null,
    !field.boundary && field.latitude == null ? t('fields:details.checklist.boundary') : null,
    !field.area && !field.appMeasuredAreaSqm ? t('fields:details.checklist.area') : null,
    field.status !== 'Active' ? t('fields:details.checklist.active') : null,
  ].filter(Boolean) as string[];

  const option = (prefix: string, value?: string | null) => {
    if (!value) return null;
    return t(`${prefix}${value}`, { defaultValue: value });
  };

  const variety = option('fields:addField.varietyOptions.', field.variety || field.oliveVariety);
  const irrigationType = option('fields:addField.irrigationOptions.', field.irrigationType);
  const stage = resolveFieldStageLabel({
    phenology,
    currentLifecycleStage: field.currentLifecycleStage,
    t,
  });
  const biennial =
    field.currentLifecycleYear === 'low' || field.currentLifecycleYear === 'high'
      ? t(`common:lifecycleYear.${field.currentLifecycleYear}`)
      : null;

  const areaSqm = spatial?.geometry?.areaSqm || formatFieldAreaSqm(field);
  const areaLabel =
    areaSqm != null && areaSqm > 0 ? formatAreaFromSqm(areaSqm, lang) : formatFieldArea(field, lang);
  const elevationHero = formatM(terrain?.averageElevationM, numberLocale);
  const slopeHero = formatPct(terrain?.averageSlopePercent, numberLocale);
  const slopeClassLabel = terrain?.dominantSlopeClass
    ? t(`fields:intelligence.slopeClasses.${terrain.dominantSlopeClass}`, {
        defaultValue: terrain.dominantSlopeClass,
      })
    : null;
  const aspectLabel = terrain?.dominantAspect
    ? t(`fields:intelligence.aspects.${terrain.dominantAspect}`, { defaultValue: terrain.dominantAspect })
    : null;
  const landCoverLabel = landCover?.dominantClass
    ? t(`fields:intelligence.landCoverClasses.${landCover.dominantClass}`, {
        defaultValue: landCover.dominantClass,
      })
    : null;
  const textureKey = soil ? textureFromFractions(soil) : null;
  const textureLabel = textureKey ? t(`fields:details.texture.${textureKey}`) : null;
  const fire = nearbyFire(environment);
  const ndviHint = ndviBand(green.ndvi);
  const center = resolveFieldCenter(field);
  const lat = spatial?.geometry?.centroidLat ?? center?.latitude;
  const lng = spatial?.geometry?.centroidLng ?? center?.longitude;
  const coords =
    lat != null && lng != null
      ? `${lat.toLocaleString(numberLocale, { maximumFractionDigits: 5 })}, ${lng.toLocaleString(numberLocale, {
          maximumFractionDigits: 5,
        })}`
      : null;

  const stremmata = areaSqm != null ? areaSqm / 1000 : 0;
  const hectares = areaSqm != null ? areaSqm / 10000 : 0;
  const density =
    field.treeCount == null
      ? null
      : lang === 'el'
        ? stremmata > 0
          ? field.treeCount / stremmata
          : null
        : hectares > 0
          ? field.treeCount / hectares
          : null;

  const coverParts = Object.entries(landCover?.percentByClass || {})
    .map(([name, pct]) => ({
      name: t(`fields:intelligence.landCoverClasses.${name}`, { defaultValue: name }),
      pct,
    }))
    .filter((part) => part.pct > 0.5)
    .sort((a, b) => b.pct - a.pct);

  const sources: { title: string; provider: string }[] = [
    { title: t('fields:details.sources.fieldRecord'), provider: t('fields:details.sources.oleachron') },
  ];
  if (terrain?.metadata?.source) {
    sources.push({ title: t('fields:details.land'), provider: terrain.metadata.source });
  }
  if (soil?.metadata?.source) {
    sources.push({ title: t('fields:details.soilTitle'), provider: soil.metadata.source });
  }
  if (landCoverLabel && landCover?.metadata?.source) {
    sources.push({ title: t('fields:intelligence.landCover'), provider: landCover.metadata.source });
  }
  if (green.date) {
    sources.push({
      title: t('fields:intelligence.vegetation'),
      provider: green.source || t('fields:details.kickers.sentinel'),
    });
  }

  const heroCells = [
    {
      label: t('fields:overview.area', { defaultValue: t('fields:card.area') }),
      value: areaLabel === '—' ? (collecting ? '…' : '—') : areaLabel,
      note: t('fields:details.hero.areaFrom'),
    },
    {
      label: t('fields:details.elevation'),
      value: elevationHero || (collecting ? '…' : '—'),
      note: terrain?.metadata?.source || t('fields:details.hero.dem'),
    },
    {
      label: t('fields:details.slope'),
      value: slopeHero || (collecting ? '…' : '—'),
      note: slopeClassLabel || t('fields:details.hero.dem'),
    },
    {
      label: t('fields:details.trees'),
      value: field.treeCount != null ? field.treeCount.toLocaleString(numberLocale) : '—',
      note: t('fields:details.hero.groveRecord'),
    },
  ];

  return (
    <View style={styles.block}>
      {canOwn ? (
        <Pressable
          onPress={() => navigation.navigate('FieldForm', { fieldId: field.id })}
          style={[styles.editBanner, { backgroundColor: colors.primaryLight }]}
          accessibilityRole="button"
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={[styles.editBannerText, { color: colors.primary }]}>{t('fields:page.editField')}</Text>
        </Pressable>
      ) : null}

      <Text style={[styles.lead, { color: colors.textSecondary }]}>
        {t('fields:details.leadApi')}
        {spatial?.calculatedAt
          ? ` ${t('fields:details.modelsUpdated', { when: formatRelativeTime(spatial.calculatedAt, numberLocale) })}`
          : collecting
            ? ` ${t('fields:details.collecting')}`
            : ''}
      </Text>

      {draft ? (
        <FactCard title={t('fields:page.draftField')}>
          <Text style={[styles.help, { color: colors.textSecondary }]}>{t('fields:details.draftHelp')}</Text>
          {missing.map((item) => (
            <Text key={item} style={{ color: colors.textSecondary, marginTop: 4 }}>
              · {item}
            </Text>
          ))}
        </FactCard>
      ) : null}

      <View style={styles.hero} accessibilityLabel={t('fields:details.factsAria')}>
        {heroCells.map((cell) => (
          <View key={cell.label} style={[styles.heroCell, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.heroLabel, { color: colors.textTertiary }]}>{cell.label}</Text>
            <Text style={[styles.heroValue, { color: colors.textPrimary }]}>{cell.value}</Text>
            <Text style={[styles.heroNote, { color: colors.textTertiary }]}>{cell.note}</Text>
          </View>
        ))}
      </View>

      <FactCard
        title={t('fields:details.land')}
        kicker={t('fields:details.kickers.dem')}
        footer={[terrain?.metadata?.source, terrain?.metadata?.spatialResolution].filter(Boolean).join(' · ')}
      >
        {terrain ? (
          <>
            <FactRow first label={t('fields:details.average')} value={elevationHero} empty={!elevationHero} />
            <FactRow label={t('fields:details.slope')} value={slopeHero} empty={!slopeHero} />
            <FactRow label={t('fields:intelligence.aspect')} value={aspectLabel} empty={!aspectLabel} />
            {terrain.maxSlopePercent != null ? (
              <FactRow
                label={t('fields:details.maxSlope', { value: formatPct(terrain.maxSlopePercent, numberLocale) })}
                value={slopeClassLabel}
              />
            ) : null}
            {environment?.intersectsNatura ? (
              <FactRow label={t('fields:intelligence.natura')} value={t('fields:intelligence.naturaInside')} />
            ) : null}
            {fire ? (
              <FactRow
                label={t('fields:intelligence.fire')}
                value={t('fields:intelligence.fireDistance', {
                  distance: fire.distanceKm.toFixed(1),
                  direction: fire.direction || '',
                })}
              />
            ) : null}
          </>
        ) : (
          <Text style={[styles.help, { color: colors.textSecondary }]}>
            {collecting ? t('fields:details.collectingBody') : t('fields:details.noTerrain')}
          </Text>
        )}
      </FactCard>

      <FactCard
        title={t('fields:details.soilTitle')}
        kicker={t('fields:details.kickers.soil')}
        footer={soil?.metadata?.source}
      >
        {soil ? (
          <>
            {soil.isRegionalEstimate || soil.metadata?.isRegionalEstimate ? (
              <Text style={[styles.banner, { backgroundColor: colors.primaryLight, color: colors.textSecondary }]}>
                {t('fields:details.sources.regional')}
              </Text>
            ) : null}
            <FactRow first label={t('fields:intelligence.soilTexture')} value={textureLabel} empty={!textureLabel} />
            <FactRow
              label={t('fields:intelligence.soilPh')}
              value={soil.ph != null ? soil.ph.toLocaleString(numberLocale, { maximumFractionDigits: 1 }) : null}
              empty={soil.ph == null}
            />
            <FactRow
              label={t('fields:intelligence.organicCarbon')}
              value={formatPct(soil.organicCarbonPercent, numberLocale)}
              empty={soil.organicCarbonPercent == null}
            />
            <FactRow label={t('fields:details.clay')} value={formatPct(soil.clayPercent, numberLocale)} />
            <FactRow label={t('fields:details.siltLabel')} value={formatPct(soil.siltPercent, numberLocale)} />
            <FactRow label={t('fields:details.sand')} value={formatPct(soil.sandPercent, numberLocale)} />
          </>
        ) : (
          <Text style={[styles.help, { color: colors.textSecondary }]}>
            {collecting ? t('fields:details.collectingBody') : t('fields:details.noSoil')}
          </Text>
        )}
      </FactCard>

      {landCoverLabel ? (
        <FactCard
          title={t('fields:intelligence.landCover')}
          kicker={t('fields:details.kickers.cover')}
          footer={landCover?.metadata?.source}
        >
          <FactRow first label={t('fields:intelligence.landCover')} value={landCoverLabel} />
          {coverParts.map((part) => (
            <FactRow
              key={part.name}
              label={part.name}
              value={formatPct(part.pct, numberLocale)}
            />
          ))}
        </FactCard>
      ) : null}

      <FactCard
        title={t('fields:details.vegetationTitle')}
        kicker={t('fields:details.kickers.sentinel')}
        footer={[green.source || t('fields:details.kickers.sentinel'), green.date ? formatPassDay(green.date, numberLocale) : null]
          .filter(Boolean)
          .join(' · ')}
        action={
          onOpenMap ? (
            <Pressable onPress={onOpenMap} accessibilityRole="button">
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                {t('fields:details.openMap')}
              </Text>
            </Pressable>
          ) : null
        }
      >
        {green.fresh && green.ndvi != null ? (
          <>
            <FactRow
              first
              label={t('fields:intelligence.ndviMean')}
              value={`${green.ndvi.toLocaleString(numberLocale, { maximumFractionDigits: 2 })}${
                ndviHint ? ` · ${t(`fields:intelligence.meaning.${ndviHint}`)}` : ''
              }`}
            />
            {green.ndmi != null ? (
              <FactRow
                label={t('fields:intelligence.ndmiMean')}
                value={green.ndmi.toLocaleString(numberLocale, { maximumFractionDigits: 2 })}
              />
            ) : null}
            <FactRow
              label={t('fields:details.lastClearPass')}
              value={green.date ? formatPassDay(green.date, numberLocale) : null}
            />
            <FactRow label={t('fields:details.cloudCover')} value={formatPct(green.cloud, numberLocale)} />
          </>
        ) : green.stale && green.date ? (
          <Text style={[styles.banner, { backgroundColor: colors.warningLight, color: colors.textPrimary }]}>
            {t('fields:details.greenStale', {
              when: formatPassDay(green.date, numberLocale),
              days: green.ageDays ?? '—',
            })}
          </Text>
        ) : (
          <Text style={[styles.help, { color: colors.textSecondary }]}>{t('fields:details.greenNone')}</Text>
        )}
      </FactCard>

      <FactCard title={t('fields:details.grove')} kicker={t('fields:details.kickers.grove')}>
        <FactRow first label={t('fields:overview.variety')} value={variety} empty={!variety} />
        <FactRow
          label={t('fields:treeAge')}
          value={
            field.treeAge != null ? t('fields:details.yearsOld', { count: field.treeAge }) : null
          }
          empty={field.treeAge == null}
        />
        <FactRow
          label={t('fields:details.trees')}
          value={field.treeCount != null ? field.treeCount.toLocaleString(numberLocale) : null}
          empty={field.treeCount == null}
        />
        {density != null ? (
          <FactRow
            label={t('fields:details.density')}
            value={t('fields:details.densityValue', {
              value: density.toLocaleString(numberLocale, { maximumFractionDigits: 0 }),
            })}
          />
        ) : null}
        <FactRow
          label={t('fields:irrigation')}
          value={field.irrigationStatus ? t('fields:card.irrigationYes') : t('fields:details.rainfed')}
        />
        <FactRow
          label={t('fields:details.irrigationType')}
          value={irrigationType}
          empty={!irrigationType}
        />
        <FactRow label={t('fields:details.stage')} value={stage} empty={!stage} />
        <FactRow label={t('fields:details.fruiting')} value={biennial} empty={!biennial} />
        {workProfile?.lastReviewedAt ? (
          <FactRow
            label={t('fields:details.practices')}
            value={t('fields:details.lastReviewed', {
              when: formatRelativeTime(workProfile.lastReviewedAt, numberLocale),
            })}
          />
        ) : null}
        {canOwn ? (
          <Pressable
            onPress={() => {
              if (workProfile?.status === 'active') {
                navigation.navigate('FieldWorkProfile', { fieldId: field.id });
                return;
              }
              navigation.navigate('FieldWorkSetup', { fieldId: field.id, edit: true });
            }}
            style={{ paddingVertical: 10 }}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('fields:details.openPractices')}</Text>
          </Pressable>
        ) : null}
      </FactCard>

      <FactCard title={t('fields:details.identity')}>
        <FactRow first label={t('fields:overview.status')} value={getFieldStatusLabel(field.status, t)} />
        <FactRow
          label={t('fields:locationLabel')}
          value={getFieldShortLocation(field)}
          empty={!getFieldShortLocation(field)}
        />
        <FactRow label={t('fields:details.coordinates')} value={coords} empty={!coords} />
        <FactRow
          label={t('fields:details.boundary')}
          value={field.boundary ? t('fields:details.hasBoundary') : t('fields:details.noBoundary')}
        />
        <FactRow label={t('fields:details.viewingYear')} value={String(year)} />
        {field.updatedAt ? (
          <FactRow
            label={t('fields:details.updated')}
            value={formatRelativeTime(field.updatedAt, numberLocale)}
          />
        ) : null}
        {canViewSensitiveIdentity && field.greekCadastre?.kaek ? (
          <FactRow label={t('fields:details.cadastre')} value={field.greekCadastre.kaek} />
        ) : null}
        {canViewSensitiveIdentity && field.accessNotes ? (
          <FactRow label={t('fields:details.accessNotes', { defaultValue: 'Access notes' })} value={field.accessNotes} />
        ) : null}
      </FactCard>

      <FactCard title={t('fields:details.sources.title')} kicker={t('fields:details.kickers.sources')}>
        <Text style={[styles.help, { color: colors.textSecondary }]}>{t('fields:details.sources.introApi')}</Text>
        {sources.map((source, index) => (
          <FactRow key={source.title} first={index === 0} label={source.title} value={source.provider} />
        ))}
      </FactCard>

      {canViewDocuments ? (
      <FactCard title={t('fields:page.documents')}>
        {(field.documents || []).length === 0 ? (
          <Text style={{ color: colors.textTertiary }}>{t('fields:details.noDocuments')}</Text>
        ) : (
          (field.documents || []).map((doc, index) => (
            <FactRow key={doc.id} first={index === 0} label={doc.fileName} value={doc.type} />
          ))
        )}
      </FactCard>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  lead: { fontSize: 14, lineHeight: 20 },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  editBannerText: { fontWeight: '700', fontSize: 15 },
  hero: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroCell: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 140,
  },
  heroLabel: { fontSize: 12, fontWeight: '600' },
  heroValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  heroNote: { fontSize: 11, marginTop: 4, lineHeight: 14 },
  card: {
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: 8,
  },
  cardHeadText: { flex: 1, gap: 2 },
  kicker: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardBody: { gap: 2 },
  help: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  banner: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
    overflow: 'hidden',
    marginBottom: 8,
  },
  footer: { fontSize: 11, marginTop: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  rowLabel: { fontSize: 14, flexShrink: 0, maxWidth: '46%', paddingTop: 1 },
  rowValue: { fontSize: 14, flex: 1, textAlign: 'right', lineHeight: 20 },
});

export default FieldFacts;
