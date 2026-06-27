import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getFieldService, getTaskService, getTaskTemplateService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import FormField from '../components/forms/FormField';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'CreateTask'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateTask'>;

const CreateTaskScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const preselectedFieldId = route.params?.fieldId;
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['tasks', 'common']);

  const [fields, setFields] = useState<Field[]>([]);
  const [fieldId, setFieldId] = useState(preselectedFieldId || '');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [fieldsData, templates] = await Promise.all([
          getFieldService().getFields(user?.id ?? '', user?.role ?? 'FieldOwner'),
          getTaskTemplateService().getTemplates().catch(() => []),
        ]);
        setFields(fieldsData);
        if (!fieldId && fieldsData.length > 0) setFieldId(fieldsData[0].id);
        if (templates.length > 0 && !title) {
          setTitle(templates[0].title);
          setType(templates[0].type);
          setDescription(templates[0].description || '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleCreate = async () => {
    if (!fieldId || !title.trim() || !type.trim()) {
      Alert.alert(t('tasks:createTask'));
      return;
    }
    try {
      setSaving(true);
      await getTaskService().createTask({
        fieldId,
        title: title.trim(),
        type: type.trim(),
        description: description || undefined,
      });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('tasks:createTask'), error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('tasks:createTask')}</Text>

      {fields.length > 0 ? (
        <View style={styles.fieldPicker}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Field</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {fields.map(f => (
              <Button
                key={f.id}
                title={f.name}
                variant={fieldId === f.id ? 'primary' : 'outline'}
                size="small"
                onPress={() => setFieldId(f.id)}
                style={styles.fieldChip}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <FormField label={t('common:type')} value={type} onChangeText={setType} editable={!saving} />
      <FormField label={t('common:description')} value={title} onChangeText={setTitle} editable={!saving} />
      <FormField
        label={t('common:description')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        editable={!saving}
      />

      <Button title={t('tasks:createTask')} onPress={handleCreate} loading={saving} fullWidth style={styles.saveBtn} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.base },
  title: { ...typography.styles.h3, fontWeight: '700', marginBottom: spacing.lg },
  fieldPicker: { marginBottom: spacing.md },
  label: { ...typography.styles.caption, marginBottom: spacing.sm, fontWeight: '600' },
  fieldChip: { marginRight: spacing.sm },
  saveBtn: { marginTop: spacing.lg },
});

export default CreateTaskScreen;
