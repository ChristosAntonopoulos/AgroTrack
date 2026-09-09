import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { getFieldService } from '../../services/serviceFactory';
import { GreekCadastreInfo, ImportGreekCadastreFieldResponse } from '../../services/fieldService';
import GreekCadastreInfoCard from '../domain/GreekCadastreInfoCard';
import { spacing, typography } from '../../theme';

function loadDocumentPicker() {
  try {
    return require('expo-document-picker') as typeof import('expo-document-picker');
  } catch {
    return null;
  }
}

type Picked = { uri: string; name: string; type: string };

interface Props {
  onImported: (response: ImportGreekCadastreFieldResponse) => void;
  parsedCadastre?: GreekCadastreInfo;
}

const CadastreUploadStep: React.FC<Props> = ({ onImported, parsedCadastre }) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();
  const [kdFile, setKdFile] = useState<Picked | null>(null);
  const [kfFile, setKfFile] = useState<Picked | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const pick = async (which: 'kd' | 'kf') => {
    const DocumentPicker = loadDocumentPicker();
    if (!DocumentPicker) {
      setError(t('addField.cadastre.pickerUnavailable'));
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const picked: Picked = {
      uri: asset.uri,
      name: asset.name || `${which}.pdf`,
      type: asset.mimeType || 'application/pdf',
    };
    if (which === 'kd') setKdFile(picked);
    else setKfFile(picked);
  };

  const handleUpload = async () => {
    if (!kdFile || !kfFile) {
      setError(t('addField.cadastre.bothRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getFieldService().importGreekCadastre(kdFile, kfFile);
      setWarnings(response.warnings || []);
      onImported(response);
    } catch {
      setError(t('addField.cadastre.uploadFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('addField.cadastre.title')}</Text>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>{t('addField.cadastre.helper')}</Text>
      <Button title={kdFile ? kdFile.name : t('addField.cadastre.kdLabel')} variant="outline" onPress={() => void pick('kd')} />
      <Button title={kfFile ? kfFile.name : t('addField.cadastre.kfLabel')} variant="outline" onPress={() => void pick('kf')} />
      {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
      {warnings.map((w) => (
        <Text key={w} style={{ color: colors.warning }}>{w}</Text>
      ))}
      {parsedCadastre ? <GreekCadastreInfoCard cadastre={parsedCadastre} /> : null}
      <Button
        title={t('addField.cadastre.upload')}
        onPress={() => void handleUpload()}
        disabled={!kdFile || !kfFile}
        loading={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { ...typography.styles.h4, fontWeight: '700' },
  desc: { ...typography.styles.bodySmall, marginBottom: spacing.xs },
});

export default CadastreUploadStep;
