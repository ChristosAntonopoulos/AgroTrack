import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, Alert } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Task } from '../services/taskService';
import { Field } from '../services/fieldService';
import { getTaskService, getFieldService } from '../services/serviceFactory';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/ui/Card';
import ListItem from '../components/lists/ListItem';
import Section from '../components/layout/Section';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import EvidenceForm, { EvidenceFormData } from '../components/forms/EvidenceForm';
import { typography, spacing } from '../theme';
import { formatDate, formatDateTime, formatCurrency } from '../utils/formatters';
import { toBoolean } from '../utils/booleanConverter';
import { RootStackParamList } from '../navigation/types';
import { API_BASE_URL } from '../services/fileService';

type Route = RouteProp<RootStackParamList, 'TaskDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;

const resolveImageUrl = (url: string) =>
  url.startsWith('http') ? url : `${API_BASE_URL.replace(/\/$/, '')}${url}`;

const TaskDetailScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { taskId } = route.params;
  const { isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['tasks', 'common']);
  const [task, setTask] = useState<Task | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [addingEvidence, setAddingEvidence] = useState(false);
  
  // Convert boolean states for native components (Button, Modal)
  const isUpdating: boolean = toBoolean(updating);
  const isAddingEvidence: boolean = toBoolean(addingEvidence);

  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const taskData = await getTaskService().getTask(taskId);
      setTask(taskData);
      
      try {
        const fieldData = await getFieldService().getField(taskData.fieldId);
        setField(fieldData);
      } catch (fieldError) {
        console.error('Error loading field:', fieldError);
      }
    } catch (error) {
      console.error('Error loading task details:', error);
      Alert.alert('Error', 'Failed to load task details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldPress = () => {
    if (field) {
      navigation.navigate('FieldDetail', { fieldId: field.id });
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!task) return;

    try {
      const statusLabels: Record<string, string> = {
        'pending': 'Start',
        'in_progress': 'Complete',
        'completed': 'Reopen',
      };

      const actionLabel = statusLabels[newStatus] || 'Update';
      const confirmMessage = `Are you sure you want to ${actionLabel.toLowerCase()} this task?`;

      Alert.alert(
        'Confirm Status Update',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: actionLabel,
            onPress: async () => {
              try {
                setUpdating(true);
                const updatedTask = await getTaskService().updateTaskStatus(taskId, newStatus);
                setTask(updatedTask);
                Alert.alert('Success', `Task status updated to ${newStatus.replace('_', ' ')}`);
              } catch (error: any) {
                console.error('Error updating task status:', error);
                Alert.alert('Error', error.message || 'Failed to update task status');
              } finally {
                setUpdating(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleStatusUpdate:', error);
    }
  };

  const handleAddEvidence = async (data: EvidenceFormData) => {
    if (!task) return;

    try {
      setAddingEvidence(true);
      const updatedTask = await getTaskService().addEvidence(
        taskId,
        data.photoUrl,
        data.notes
      );
      setTask(updatedTask);
      Alert.alert('Success', 'Evidence added successfully');
    } catch (error: any) {
      console.error('Error adding evidence:', error);
      throw error; // Let EvidenceForm handle the error display
    } finally {
      setAddingEvidence(false);
    }
  };

  const handleApprove = async (approve: boolean) => {
    if (!task) return;
    try {
      setUpdating(true);
      const updated = approve
        ? await getTaskService().approveTask(taskId)
        : await getTaskService().rejectTask(taskId);
      setTask(updated);
    } catch (error: any) {
      Alert.alert(t('common:confirm'), error.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusActionButtons = () => {
    if (!task) return null;
    const buttons = [];

    if (!isFieldOwner()) {
      if (task.status === 'pending') {
        buttons.push(
          <Button key="start" title={t('tasks:startTask')} onPress={() => handleStatusUpdate('in_progress')} disabled={isUpdating} loading={isUpdating} style={styles.actionButton} />
        );
      } else if (task.status === 'in_progress') {
        buttons.push(
          <Button key="complete" title={t('tasks:completeTask')} onPress={() => handleStatusUpdate('completed')} disabled={isUpdating} loading={isUpdating} style={styles.actionButton} />
        );
      }
      if (task.status === 'in_progress' || task.status === 'completed') {
        buttons.push(
          <Button key="evidence" title={t('tasks:addEvidence')} onPress={() => setShowEvidenceForm(true)} variant="outline" style={styles.actionButton} />
        );
      }
    }

    if (isFieldOwner() && task.approvalStatus === 'pending') {
      buttons.push(
        <Button key="approve" title={t('tasks:approve')} onPress={() => handleApprove(true)} disabled={isUpdating} style={styles.actionButton} />,
        <Button key="reject" title={t('tasks:reject')} onPress={() => handleApprove(false)} variant="outline" disabled={isUpdating} style={styles.actionButton} />
      );
    }

    return buttons;
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.base },
    header: { marginBottom: spacing.xl, paddingTop: spacing.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    taskTitle: { ...typography.styles.h2, color: colors.textPrimary, fontWeight: typography.fontWeight.bold, flex: 1, marginRight: spacing.sm },
    value: { ...typography.styles.body, color: colors.textPrimary, fontWeight: typography.fontWeight.medium },
    linkText: { color: colors.primary },
    evidenceImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: spacing.sm },
    backButton: { marginTop: spacing.base, marginBottom: spacing.xl },
    errorText: { ...typography.styles.body, color: colors.error, textAlign: 'center', marginTop: spacing.xl },
    actionsContainer: { gap: spacing.md },
    actionButton: { marginBottom: spacing.sm },
  });

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Task not found</Text>
        <Button
          title="Back"
          onPress={() => navigation.goBack()}
          variant="outline"
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <StatusBadge status={task.status} showIcon={true} />
      </View>

      <Section title="Task Information">
        <Card>
          <ListItem
            title="Type"
            rightContent={<Text style={styles.value}>{task.type}</Text>}
            showDivider={false}
          />
          {task.description ? (
            <ListItem
              title="Description"
              rightContent={<Text style={styles.value}>{task.description}</Text>}
              showDivider={false}
            />
          ) : null}
          <ListItem
            title="Status"
            rightContent={<StatusBadge status={task.status} />}
            showDivider={false}
          />
          {task.assignedTo ? (
            <ListItem
              title="Assigned To"
              rightContent={<Text style={styles.value}>User {task.assignedTo}</Text>}
              showDivider={false}
            />
          ) : null}
        </Card>
      </Section>

      {field ? (
        <Section title="Field Information">
          <Card onPress={handleFieldPress}>
            <ListItem
              title="Field Name"
              rightContent={<Text style={[styles.value, styles.linkText]}>→</Text>}
              subtitle={field.name}
              showDivider={false}
            />
            <ListItem
              title="Area"
              rightContent={<Text style={styles.value}>{field.area} hectares</Text>}
              showDivider={false}
            />
            {field.variety ? (
              <ListItem
                title="Variety"
                rightContent={<Text style={styles.value}>{field.variety}</Text>}
                showDivider={false}
              />
            ) : null}
          </Card>
        </Section>
      ) : null}

      <Section title="Schedule">
        <Card>
          {task.scheduledStart ? (
            <ListItem
              title="Scheduled Start"
              rightContent={
                <Text style={styles.value}>{formatDate(task.scheduledStart)}</Text>
              }
              showDivider={false}
            />
          ) : null}
          {task.scheduledEnd ? (
            <ListItem
              title="Scheduled End"
              rightContent={
                <Text style={styles.value}>{formatDate(task.scheduledEnd)}</Text>
              }
              showDivider={false}
            />
          ) : null}
          {task.actualStart ? (
            <ListItem
              title="Actual Start"
              rightContent={
                <Text style={styles.value}>{formatDate(task.actualStart)}</Text>
              }
              showDivider={false}
            />
          ) : null}
          {task.actualEnd ? (
            <ListItem
              title="Actual End"
              rightContent={
                <Text style={styles.value}>{formatDate(task.actualEnd)}</Text>
              }
              showDivider={false}
            />
          ) : null}
          <ListItem
            title="Lifecycle Year"
            rightContent={<Text style={styles.value}>{task.lifecycleYear}</Text>}
            showDivider={false}
          />
          {task.cost !== undefined ? (
            <ListItem
              title="Cost"
              rightContent={<Text style={styles.value}>{formatCurrency(task.cost)}</Text>}
              showDivider={false}
            />
          ) : null}
        </Card>
      </Section>

      {task.evidence && task.evidence.length > 0 ? (
        <Section title="Evidence">
          {task.evidence.map((evidence, index) => (
            <Card key={index}>
              {evidence.photoUrl ? (
                <Image
                  source={{ uri: resolveImageUrl(evidence.photoUrl) }}
                  style={styles.evidenceImage}
                  resizeMode="cover"
                />
              ) : null}
              {evidence.notes ? (
                <ListItem
                  title="Notes"
                  rightContent={<Text style={styles.value}>{evidence.notes}</Text>}
                  showDivider={false}
                />
              ) : null}
              <ListItem
                title="Timestamp"
                rightContent={
                  <Text style={styles.value}>{formatDateTime(evidence.timestamp)}</Text>
                }
                showDivider={false}
              />
            </Card>
          ))}
        </Section>
      ) : null}

      <Section title="Metadata">
        <Card>
          <ListItem
            title="Created"
            rightContent={<Text style={styles.value}>{formatDate(task.createdAt)}</Text>}
            showDivider={false}
          />
          <ListItem
            title="Last Updated"
            rightContent={<Text style={styles.value}>{formatDate(task.updatedAt)}</Text>}
            showDivider={false}
          />
        </Card>
      </Section>

      {getStatusActionButtons() && getStatusActionButtons()!.length > 0 ? (
        <Section title="Actions">
          <View style={styles.actionsContainer}>
            {getStatusActionButtons()}
          </View>
        </Section>
      ) : null}

      <Button
        title={t('common:back')}
        onPress={() => navigation.goBack()}
        variant="outline"
        style={styles.backButton}
      />

      <EvidenceForm
        visible={showEvidenceForm}
        onClose={() => setShowEvidenceForm(false)}
        onSubmit={handleAddEvidence}
        loading={isAddingEvidence}
      />
    </ScrollView>
  );
};

export default TaskDetailScreen;
