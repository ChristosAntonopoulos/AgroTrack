import React from 'react';
import { View } from 'react-native';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import { spacing } from '../../theme';

export type LearningAction = {
  id: string;
  label: string;
  variant?: 'primary' | 'outline' | 'ghost';
};

const LearningPromptSheet = ({
  open,
  title,
  message,
  busy,
  actions,
  onClose,
  onAction,
}: {
  open: boolean;
  title: string;
  message: string;
  busy?: boolean;
  actions: LearningAction[];
  onClose: () => void;
  onAction: (id: string) => void;
}) => (
  <Sheet open={open} onClose={onClose} title={title} subtitle={message} edge="bottom" size="md">
    {actions.map((action) => (
      <View key={action.id} style={{ marginBottom: spacing.sm }}>
        <Button
          title={action.label}
          variant={action.variant || 'primary'}
          onPress={() => onAction(action.id)}
          disabled={busy}
          loading={busy && action.variant !== 'outline' && action.variant !== 'ghost'}
        />
      </View>
    ))}
  </Sheet>
);

export default LearningPromptSheet;
