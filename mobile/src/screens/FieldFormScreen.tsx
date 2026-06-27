import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Switch } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getFieldService } from '../services/serviceFactory';
import { useTheme } from '../context/ThemeContext';
import FormField from '../components/forms/FormField';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'FieldForm'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'FieldForm'>;

const FieldFormScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { fieldId } = route.params || {};
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common']);
  const isEdit = !!fieldId;

  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [variety, setVariety] = useState('');
  const [treeAge, setTreeAge] = useState('');
  const [groundType, setGroundType] = useState('');
  const [irrigation, setIrrigation] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (fieldId) {
      getFieldService()
        .getField(fieldId)
        .then(f => {
          setName(f.name);
          setArea(String(f.area));
          setVariety(f.variety || '');
          setTreeAge(f.treeAge ? String(f.treeAge) : '');
          setGroundType(f.groundType || '');
          setIrrigation(f.irrigationStatus);
        })
        .finally(() => setLoading(false));
    }
  }, [fieldId]);

  const handleSave = async () => {
    if (!name.trim() || !area) {
      Alert.alert(t('common:save'), t('fields:fieldName'));
      return;
    }
    try {
      setSaving(true);
      const data = {
        name: name.trim(),
        area: parseFloat(area),
        variety: variety || undefined,
        treeAge: treeAge ? parseInt(treeAge, 10) : undefined,
        groundType: groundType || undefined,
        irrigationStatus: irrigation,
      };
      if (isEdit && fieldId) {
        await getFieldService().updateField(fieldId, data);
      } else {
        await getFieldService().createField(data);
      }
      Alert.alert(t('fields:saved'));
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common:save'), error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {isEdit ? t('fields:editField') : t('fields:createField')}
      </Text>

      <FormField label={t('fields:fieldName')} value={name} onChangeText={setName} editable={!saving} />
      <FormField label={t('fields:area')} value={area} onChangeText={setArea} keyboardType="decimal-pad" editable={!saving} />
      <FormField label={t('fields:variety')} value={variety} onChangeText={setVariety} editable={!saving} />
      <FormField label={t('fields:treeAge')} value={treeAge} onChangeText={setTreeAge} keyboardType="number-pad" editable={!saving} />
      <FormField label={t('fields:groundType')} value={groundType} onChangeText={setGroundType} editable={!saving} />

      <View style={[styles.switchRow, { borderColor: colors.border }]}>
        <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>{t('fields:irrigation')}</Text>
        <Switch value={irrigation} onValueChange={setIrrigation} trackColor={{ true: colors.primary }} />
      </View>

      <Button title={t('common:save')} onPress={handleSave} loading={saving} fullWidth style={styles.saveBtn} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.base },
  title: { ...typography.styles.h3, fontWeight: '700', marginBottom: spacing.lg },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.lg,
  },
  switchLabel: { ...typography.styles.body },
  saveBtn: { marginTop: spacing.md },
});

export default FieldFormScreen;
