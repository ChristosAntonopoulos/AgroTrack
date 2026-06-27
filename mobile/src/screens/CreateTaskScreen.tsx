import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getFieldService, getTaskService, getTaskTemplateService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import FormField from '../components/forms/FormField';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'CreateTask'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateTask'>;

const CreateTaskScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const preselectedFieldId = route.params?.fieldId;
  const preselectedStart = route.params?.scheduledStart;
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['tasks', 'common', 'fields']);

  const [fields, setFields] = useState<Field[]>([]);
  const [fieldId, setFieldId] = useState(preselectedFieldId || '');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledStart, setScheduledStart] = useState(
    preselectedStart ? preselectedStart.slice(0, 10) : ''
  );
  const [scheduledEnd, setScheduledEnd] = useState('');
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
        scheduledStart: scheduledStart
          ? new Date(`${scheduledStart}T09:00:00`).toISOString()
          : undefined,
        scheduledEnd: scheduledEnd
          ? new Date(`${scheduledEnd}T17:00:00`).toISOString()
          : undefined,
      });
      navigation.goBack();
    } catch (error: unknown) {
      Alert.alert(t('tasks:createTask'), error instanceof Error ? error.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {fields.length > 0 ? (
        <Card variant="outlined" style={styles.section}>
          <FormField label={t('fields:fieldName')} value={fields.find(f => f.id === fieldId)?.name ?? ''} editable={false} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {fields.map(f => (
              <Button
                key={f.id}
                title={f.name}
                variant={fieldId === f.id ? 'primary' : 'ghost'}
                size="small"
                onPress={() => setFieldId(f.id)}
                style={styles.fieldChip}
              />
            ))}
          </ScrollView>
        </Card>
      ) : null}

      <Card variant="elevated" style={styles.section}>
        <FormField label={t('common:type', { defaultValue: 'Type' })} value={type} onChangeText={setType} editable={!saving} />
        <FormField label={t('tasks:createTask')} value={title} onChangeText={setTitle} editable={!saving} />
        <FormField
          label={t('tasks:notes')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          editable={!saving}
        />
        <FormField
          label="Start (YYYY-MM-DD)"
          value={scheduledStart}
          onChangeText={setScheduledStart}
          placeholder="2026-06-27"
          editable={!saving}
        />
        <FormField
          label="End (YYYY-MM-DD)"
          value={scheduledEnd}
          onChangeText={setScheduledEnd}
          placeholder="2026-06-28"
          editable={!saving}
        />
      </Card>

      <Button title={t('tasks:createTask')} onPress={handleCreate} loading={saving} fullWidth style={styles.saveBtn} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  section: { marginBottom: spacing.md },
  chips: { marginTop: spacing.sm },
  fieldChip: { marginRight: spacing.sm },
  saveBtn: { marginTop: spacing.sm },
});

export default CreateTaskScreen;
