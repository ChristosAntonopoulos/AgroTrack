import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GreekCadastreInfo } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import Card from '../ui/Card';
import InfoRow from '../ui/InfoRow';
import { typography, spacing } from '../../theme';

export interface GreekCadastreInfoCardProps {
  cadastre: GreekCadastreInfo;
  hideTitle?: boolean;
}

const GreekCadastreInfoCard: React.FC<GreekCadastreInfoCardProps> = ({ cadastre, hideTitle }) => {
  const { colors } = useTheme();
  const { t } = useTranslation('fields');

  const verificationKey = cadastre.verificationStatus
    ? `addField.verificationStatuses.${cadastre.verificationStatus}`
    : null;
  const verificationLabel =
    verificationKey && t(verificationKey) !== verificationKey
      ? t(verificationKey)
      : cadastre.verificationStatus;

  const showStructuredLocation =
    cadastre.municipality || cadastre.postalCode || cadastre.prefecture || cadastre.cadastralOffice;

  return (
    <Card variant="outlined">
      {!hideTitle ? (
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('addField.cadastre.referenceTitle')}
        </Text>
      ) : null}
      <View style={[styles.disclaimer, { backgroundColor: colors.warning + '18' }]}>
        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
          {t('addField.cadastre.referenceDisclaimer')}
        </Text>
      </View>
      {cadastre.kaek ? (
        <InfoRow icon="barcode-outline" label="KAEK" value={cadastre.normalizedKaek || cadastre.kaek} />
      ) : null}
      {cadastre.officialAreaSqm != null ? (
        <InfoRow
          icon="document-text-outline"
          label={t('addField.officialArea')}
          value={`${cadastre.officialAreaSqm} m²`}
        />
      ) : null}
      {showStructuredLocation ? (
        <>
          {cadastre.municipality ? (
            <InfoRow icon="business-outline" label={t('addField.municipality')} value={cadastre.municipality} />
          ) : null}
          {cadastre.postalCode ? (
            <InfoRow icon="mail-outline" label={t('addField.postalCode')} value={cadastre.postalCode} />
          ) : null}
          {cadastre.prefecture ? (
            <InfoRow icon="map-outline" label={t('addField.prefecture')} value={cadastre.prefecture} />
          ) : null}
          {cadastre.cadastralOffice ? (
            <InfoRow
              icon="library-outline"
              label={t('addField.cadastralOffice')}
              value={cadastre.cadastralOffice}
            />
          ) : null}
        </>
      ) : cadastre.locationFromCadastre ? (
        <InfoRow
          icon="location-outline"
          label={t('addField.locationText')}
          value={cadastre.locationFromCadastre}
        />
      ) : null}
      {cadastre.coordinateSystem ? (
        <InfoRow
          icon="compass-outline"
          label={t('addField.coordinateSystem')}
          value={cadastre.coordinateSystem}
        />
      ) : null}
      {cadastre.mapScale ? (
        <InfoRow icon="resize-outline" label={t('addField.mapScale')} value={cadastre.mapScale} />
      ) : null}
      {cadastre.extractPrintDate ? (
        <InfoRow
          icon="calendar-outline"
          label={t('addField.printDate')}
          value={new Date(cadastre.extractPrintDate).toLocaleDateString()}
        />
      ) : null}
      {verificationLabel ? (
        <InfoRow
          icon="shield-checkmark-outline"
          label={t('addField.status')}
          value={verificationLabel}
          showDivider={false}
        />
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  title: {
    ...typography.styles.h5,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  disclaimer: {
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  disclaimerText: {
    ...typography.styles.caption,
    lineHeight: 18,
  },
});

export default GreekCadastreInfoCard;
