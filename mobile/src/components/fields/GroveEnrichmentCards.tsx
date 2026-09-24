import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { Field } from '../../services/fieldService';
import { fieldHasBoundary } from '../../utils/fieldDisplay';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
import { RootStackParamList } from '../../navigation/types';
import { radii, spacing, typography } from '../../theme';

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
        <View style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
          <Ionicons name="shapes-outline" size={20} color={colors.primary} />
          <View style={styles.body}>
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
          </View>
        </View>
      ) : null}

      {needDetails ? (
        <View style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
          <Ionicons name="leaf-outline" size={20} color={colors.primary} />
          <View style={styles.body}>
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
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.md },
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  body: { flex: 1, gap: 4 },
  title: { ...typography.styles.body, fontWeight: '700' },
  desc: { ...typography.styles.bodySmall, lineHeight: 20 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  detailsLink: { marginTop: spacing.xs, paddingVertical: 4 },
  link: { fontWeight: '700', fontSize: 15 },
});

export default GroveEnrichmentCards;
