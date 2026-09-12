import React from 'react';
import { Modal, View, Text, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/** Bottom sheet used for Partners add / import / share / edit flows. */
const PartnersSheet: React.FC<Props> = ({ visible, title, subtitle, onClose, children, footer }) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlay} onPress={onClose} accessibilityRole="button" />
        <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {title ? (
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          ) : null}
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          ) : null}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28, 36, 24, 0.45)' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  title: { ...typography.styles.h3, fontWeight: '800', marginBottom: spacing.xs },
  subtitle: { ...typography.styles.body, marginBottom: spacing.md, lineHeight: 20 },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: spacing.sm, paddingBottom: spacing.md },
  footer: { gap: spacing.sm, paddingTop: spacing.sm },
});

export default PartnersSheet;
