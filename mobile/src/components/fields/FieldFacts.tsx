import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Field } from '../../services/fieldService';
import { fieldPeopleService, FieldMembership } from '../../services/fieldPeopleService';
import { geospatialService, FieldSpatialProfile } from '../../services/geospatialService';
import { useTheme } from '../../context/ThemeContext';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel } from '../../utils/fieldDisplay';
import { spacing, radii } from '../../theme';
import { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  field: Field;
  year: number;
  canOwn: boolean;
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
        numberOfLines={2}
      >
        {display}
      </Text>
    </View>
  );
};

const FactCard: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode }> = ({
  title,
  children,
  action,
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceElevated }]}>
      <View style={styles.cardHead}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
        {action}
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
};

const capacityLabel = (capacity: string, t: (k: string) => string) => {
  const key = `details.capacities.${capacity}`;
  const translated = t(key);
  return translated === key ? capacity : translated;
};

const FieldFacts: React.FC<Props> = ({ field, year, canOwn }) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const [people, setPeople] = useState<FieldMembership[]>([]);
  const [spatial, setSpatial] = useState<FieldSpatialProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    fieldPeopleService
      .getPeople(field.id, field)
      .then((rows) => {
        if (!cancelled) setPeople(rows);
      })
      .catch(() => {
        if (!cancelled) setPeople([]);
      });
    geospatialService
      .getSpatialProfile(field.id)
      .then((profile) => {
        if (!cancelled) setSpatial(profile);
      })
      .catch(() => {
        if (!cancelled) setSpatial(null);
      });
    return () => {
      cancelled = true;
    };
  }, [field]);

  const draft = field.status === 'Draft';
  const missing = [
    !field.name ? t('details.checklist.name') : null,
    !field.boundary && field.latitude == null ? t('details.checklist.boundary') : null,
    !field.area && !field.appMeasuredAreaSqm ? t('details.checklist.area') : null,
    field.status !== 'Active' ? t('details.checklist.active') : null,
  ].filter(Boolean) as string[];

  const variety = field.variety || field.oliveVariety;
  const ground = field.groundType || field.soilType;
  const elevation =
    spatial?.terrain?.averageElevationM != null
      ? `${Math.round(spatial.terrain.averageElevationM)} m`
      : null;

  return (
    <View style={styles.block}>
      {canOwn ? (
        <Pressable
          onPress={() => navigation.navigate('FieldForm', { fieldId: field.id })}
          style={[styles.editBanner, { backgroundColor: colors.primaryLight }]}
          accessibilityRole="button"
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={[styles.editBannerText, { color: colors.primary }]}>{t('page.editField')}</Text>
        </Pressable>
      ) : null}

      {draft ? (
        <FactCard title={t('page.draftField')}>
          <Text style={[styles.help, { color: colors.textSecondary }]}>{t('details.draftHelp')}</Text>
          {missing.map((item) => (
            <Text key={item} style={{ color: colors.textSecondary, marginTop: 4 }}>
              · {item}
            </Text>
          ))}
        </FactCard>
      ) : null}

      <FactCard title={t('details.identity')}>
        <FactRow first label={t('overview.status')} value={getFieldStatusLabel(field.status, t)} />
        <FactRow label={t('locationLabel')} value={getFieldShortLocation(field)} empty={!getFieldShortLocation(field)} />
        <FactRow label={t('overview.area')} value={formatFieldArea(field)} empty={!formatFieldArea(field)} />
        <FactRow
          label={t('details.boundary')}
          value={field.boundary ? t('details.hasBoundary') : t('details.noBoundary')}
        />
        <FactRow label={t('details.viewingYear')} value={String(year)} />
      </FactCard>

      <FactCard title={t('details.grove')}>
        <FactRow first label={t('overview.variety')} value={variety} empty={!variety} />
        <FactRow
          label={t('treeAge')}
          value={field.treeAge != null ? String(field.treeAge) : null}
          empty={field.treeAge == null}
        />
        <FactRow
          label={t('details.trees')}
          value={field.treeCount != null ? String(field.treeCount) : null}
          empty={field.treeCount == null}
        />
      </FactCard>

      <FactCard title={t('details.water')}>
        <FactRow
          first
          label={t('irrigation')}
          value={field.irrigationStatus ? t('card.irrigationYes') : t('details.rainfed')}
        />
        <FactRow
          label={t('details.irrigationType')}
          value={field.irrigationType}
          empty={!field.irrigationType}
        />
      </FactCard>

      <FactCard title={t('details.terrain')}>
        <FactRow first label={t('groundType')} value={ground} empty={!ground} />
        <FactRow label={t('details.slope')} value={field.slope} empty={!field.slope} />
        <FactRow label={t('details.elevation')} value={elevation} empty={!elevation} />
      </FactCard>

      <FactCard
        title={t('details.people')}
        action={
          canOwn ? (
            <Pressable onPress={() => navigation.navigate('Partners', { fieldId: field.id })}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                {t('page.manageAccess')}
              </Text>
            </Pressable>
          ) : null
        }
      >
        {people.length === 0 ? (
          <Text style={{ color: colors.textTertiary }}>{t('details.noPeople')}</Text>
        ) : (
          people.map((person) => (
            <FactRow
              key={person.userId}
              label={person.displayName || person.email || person.userId}
              value={person.capacities.map((c) => capacityLabel(c, t)).join(' · ')}
            />
          ))
        )}
      </FactCard>

      <FactCard title={t('page.documents')}>
        {(field.documents || []).length === 0 ? (
          <Text style={{ color: colors.textTertiary }}>{t('details.noDocuments')}</Text>
        ) : (
          (field.documents || []).map((doc) => (
            <FactRow key={doc.id} label={doc.fileName} value={doc.type} />
          ))
        )}
      </FactCard>
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: spacing.md },
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
  card: {
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardBody: { gap: 2 },
  help: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
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
