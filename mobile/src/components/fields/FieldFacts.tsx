import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { fieldPeopleService, FieldMembership } from '../../services/fieldPeopleService';
import { geospatialService, FieldSpatialProfile } from '../../services/geospatialService';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel } from '../../utils/fieldDisplay';
import { spacing, radii, typography } from '../../theme';
import { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  field: Field;
  year: number;
  canOwn: boolean;
};

const FactRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  const { colors } = useTheme();
  if (value == null || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
};

const FactCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
      {children}
    </View>
  );
};

const FieldFacts: React.FC<Props> = ({ field, year, canOwn }) => {
  const { t } = useTranslation('fields');
  const { colors, tapMin } = useTheme();
  const { isEveryday } = usePreferences();
  const navigation = useNavigation<Nav>();
  const [more, setMore] = useState(!isEveryday);
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

  const unknown = t('details.unknown');
  const draft = field.status === 'Draft';
  const missing = [
    !field.name ? t('details.checklist.name') : null,
    !field.boundary && field.latitude == null ? t('details.checklist.boundary') : null,
    !field.area && !field.appMeasuredAreaSqm ? t('details.checklist.area') : null,
    field.status !== 'Active' ? t('details.checklist.active') : null,
  ].filter(Boolean) as string[];

  return (
    <View style={styles.block}>
      {draft ? (
        <FactCard title={t('page.draftField')}>
          <Text style={[styles.help, { color: colors.textSecondary }]}>{t('details.draftHelp')}</Text>
          {missing.map((item) => (
            <Text key={item} style={{ color: colors.textSecondary }}>
              · {item}
            </Text>
          ))}
          {canOwn ? (
            <Pressable
              onPress={() => navigation.navigate('FieldForm', { fieldId: field.id })}
              style={[styles.linkBtn, { minHeight: tapMin }]}
            >
              <Text style={[styles.link, { color: colors.link }]}>{t('page.editField')}</Text>
            </Pressable>
          ) : null}
        </FactCard>
      ) : null}

      <FactCard title={t('details.identity')}>
        <FactRow label={t('fieldName')} value={field.name} />
        <FactRow label={t('overview.status')} value={getFieldStatusLabel(field.status, t)} />
        <FactRow label={t('locationLabel')} value={getFieldShortLocation(field) || unknown} />
        <FactRow label={t('overview.area')} value={formatFieldArea(field) || unknown} />
        <FactRow label={t('page.yearLabel', { year })} value={String(year)} />
        <FactRow
          label={t('details.boundary')}
          value={field.boundary ? t('details.hasBoundary') : t('details.noBoundary')}
        />
      </FactCard>

      <FactCard title={t('details.grove')}>
        <FactRow label={t('overview.variety')} value={field.variety || field.oliveVariety || unknown} />
        <FactRow label={t('treeAge')} value={field.treeAge != null ? String(field.treeAge) : unknown} />
        <FactRow label={t('details.trees')} value={field.treeCount != null ? String(field.treeCount) : unknown} />
      </FactCard>

      {!isEveryday || more ? (
        <>
          <FactCard title={t('details.water')}>
            <FactRow
              label={t('irrigation')}
              value={field.irrigationStatus ? t('card.irrigationYes') : t('details.rainfed')}
            />
            <FactRow label={t('details.irrigationType')} value={field.irrigationType || unknown} />
          </FactCard>

          <FactCard title={t('details.terrain')}>
            <FactRow label={t('groundType')} value={field.groundType || field.soilType || unknown} />
            <FactRow label={t('details.slope')} value={field.slope || unknown} />
            <FactRow
              label={t('details.elevation')}
              value={
                spatial?.terrain?.averageElevationM != null
                  ? `${Math.round(spatial.terrain.averageElevationM)} m`
                  : unknown
              }
            />
          </FactCard>

          <FactCard title={t('details.people')}>
            {people.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>{t('details.noPeople')}</Text>
            ) : (
              people.map((person) => (
                <FactRow
                  key={person.userId}
                  label={person.displayName || person.email || person.userId}
                  value={person.capacities.join(', ')}
                />
              ))
            )}
            {canOwn ? (
              <Pressable
                onPress={() => navigation.navigate('Partners', { fieldId: field.id })}
                style={[styles.linkBtn, { minHeight: tapMin }]}
              >
                <Text style={[styles.link, { color: colors.link }]}>{t('page.manageAccess')}</Text>
              </Pressable>
            ) : null}
          </FactCard>

          <FactCard title={t('page.documents')}>
            {(field.documents || []).length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>{t('details.noDocuments')}</Text>
            ) : (
              (field.documents || []).map((doc) => (
                <FactRow key={doc.id} label={doc.fileName} value={doc.type} />
              ))
            )}
          </FactCard>
        </>
      ) : (
        <Pressable
          onPress={() => setMore(true)}
          style={[
            styles.moreBtn,
            {
              minHeight: tapMin,
              borderColor: colors.borderLight,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Text style={[styles.link, { color: colors.textPrimary }]}>{t('details.more')}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  card: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.base,
    gap: 10,
  },
  cardTitle: { ...typography.styles.h4, fontWeight: '700', marginBottom: 4 },
  help: { ...typography.styles.bodySmall, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { ...typography.styles.bodySmall, flexShrink: 0, maxWidth: '46%' },
  rowValue: { fontWeight: '700', flex: 1, textAlign: 'right' },
  linkBtn: { justifyContent: 'center', marginTop: 4 },
  link: { fontWeight: '700' },
  moreBtn: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
});

export default FieldFacts;
