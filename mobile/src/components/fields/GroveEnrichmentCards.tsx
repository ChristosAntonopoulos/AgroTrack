import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Field } from '../../services/fieldService';
import { fieldHasBoundary } from '../../utils/fieldDisplay';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
import { RootStackParamList } from '../../navigation/types';
import { spacing, typography } from '../../theme';
import FieldDetailMotifCard from './FieldDetailMotifCard';

type Props = {
  field: Field;
  canEdit: boolean;
  onDismissBoundary?: () => void;
};

const hasDetails = (field: Field) =>
  Boolean((field.oliveVariety || field.variety)?.trim()) || field.treeCount != null;

const GroveEnrichmentCards: React.FC<Props> = ({ field, canEdit, onDismissBoundary }) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [boundaryDismissed, setBoundaryDismissed] = useState(false);

  if (!canEdit) return null;

  const needBoundary = !fieldHasBoundary(field) && !boundaryDismissed;
  const needDetails = !hasDetails(field);

  if (!needBoundary && !needDetails) return null;

  return (
    <View style={styles.wrap} accessibilityLabel={t('createGrove.enrich.aria')}>
      {needBoundary ? (
        <FieldDetailMotifCard motif="shapes-outline" icon="shapes-outline" gold>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('createGrove.enrich.boundaryTitle')}
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            {t('createGrove.enrich.boundaryBody')}
          </Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => navigation.navigate('FieldMapBoundary', { fieldId: field.id })}
              accessibilityRole="link"
            >
              <Text style={[styles.link, { color: colors.primary }]}>
                {t('createGrove.enrich.boundaryAction')}
              </Text>
            </Pressable>
            <Button
              title={t('createGrove.enrich.boundaryLater')}
              variant="ghost"
              size="small"
              onPress={() => {
                setBoundaryDismissed(true);
                onDismissBoundary?.();
              }}
            />
          </View>
        </FieldDetailMotifCard>
      ) : null}

      {needDetails ? (
        <FieldDetailMotifCard
          motif="leaf-outline"
          icon="leaf-outline"
          onPress={() => navigation.navigate('FieldForm', { fieldId: field.id, focus: 'details' })}
          accessibilityLabel={t('createGrove.enrich.detailsTitle')}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('createGrove.enrich.detailsTitle')}
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            {t('createGrove.enrich.detailsBody')}
          </Text>
          <Pressable
            onPress={() => navigation.navigate('FieldForm', { fieldId: field.id, focus: 'details' })}
            accessibilityRole="link"
            style={styles.detailsLink}
          >
            <Text style={[styles.link, { color: colors.primary }]}>
              {t('createGrove.enrich.detailsAction')}
            </Text>
          </Pressable>
        </FieldDetailMotifCard>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { ...typography.styles.body, fontWeight: '700', fontSize: 17, letterSpacing: -0.2 },
  desc: { ...typography.styles.bodySmall, lineHeight: 20 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  detailsLink: { paddingVertical: 2 },
  link: { fontWeight: '700', fontSize: 15 },
});

export default GroveEnrichmentCards;
