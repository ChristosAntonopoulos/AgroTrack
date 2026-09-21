import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, radii } from '../../theme';
import {
  InAppMessage,
  RespondAnswer,
  inAppMessageService,
} from '../../services/inAppCampaignService';
import { getApiErrorMessage } from '../../services/api';

type Props = {
  message: InAppMessage | null;
  onClose: () => void;
  onUpdated: (message: InAppMessage | null) => void;
};

const kindIcon = (kind: string): React.ComponentProps<typeof Ionicons>['name'] => {
  if (kind === 'poll') return 'pie-chart-outline';
  if (kind === 'questionnaire') return 'help-circle-outline';
  return 'megaphone-outline';
};

const InAppMessageHost: React.FC<Props> = ({ message, onClose, onUpdated }) => {
  const { t } = useTranslation(['common', 'errors']);
  const { colors } = useTheme();
  const [answers, setAnswers] = useState<Record<string, RespondAnswer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (!message) return;
    setError(null);
    setThanks(message.hasResponded);
    const initial: Record<string, RespondAnswer> = {};
    for (const q of message.questions) {
      initial[q.id] = {
        questionId: q.id,
        optionIds: q.selectedOptionIds ?? [],
        textValue: q.textValue ?? '',
      };
    }
    setAnswers(initial);
  }, [message?.id, message?.hasResponded]);

  const kindLabel = useMemo(() => {
    if (!message) return '';
    if (message.kind === 'poll') return t('common:inApp.poll');
    if (message.kind === 'questionnaire') return t('common:inApp.questionnaire');
    return t('common:inApp.announcement');
  }, [message, t]);

  const canSubmit = useMemo(() => {
    if (!message || message.kind === 'announcement') return true;
    return message.questions.every((q) => {
      if (!q.required) return true;
      const a = answers[q.id];
      return (a?.optionIds?.length ?? 0) > 0 || Boolean(a?.textValue?.trim());
    });
  }, [answers, message]);

  const handleDismiss = async () => {
    if (!message) {
      onClose();
      return;
    }
    if (!message.modalDismissible) return;
    try {
      await inAppMessageService.dismiss(message.id);
    } catch {
      // ignore
    }
    onUpdated(null);
    onClose();
  };

  const setOption = (questionId: string, optionId: string, multi: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? { questionId, optionIds: [] };
      let optionIds = current.optionIds ?? [];
      if (multi) {
        optionIds = optionIds.includes(optionId)
          ? optionIds.filter((id) => id !== optionId)
          : [...optionIds, optionId];
      } else {
        optionIds = [optionId];
      }
      return { ...prev, [questionId]: { ...current, optionIds, textValue: undefined } };
    });
    setError(null);
  };

  const handleSubmit = async () => {
    if (!message) return;
    if (!canSubmit) {
      setError(t('common:inApp.answerRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = message.questions.map((q) => {
        const a = answers[q.id];
        return {
          questionId: q.id,
          optionIds: a?.optionIds?.length ? a.optionIds : undefined,
          textValue: a?.textValue?.trim() ? a.textValue.trim() : undefined,
        };
      });
      const updated = await inAppMessageService.respond(message.id, payload);
      onUpdated(updated);
      setThanks(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t('common:inApp.submitFailed', { defaultValue: 'Could not submit.' })));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAck = async () => {
    if (!message) return;
    try {
      await inAppMessageService.markSeen(message.id);
    } catch {
      // ignore
    }
    if (message.ctaUrl) {
      void Linking.openURL(message.ctaUrl).catch(() => undefined);
    }
    onClose();
  };

  if (!message) return null;

  const footer = thanks ? (
    <Button title={t('common:inApp.done')} onPress={onClose} fullWidth />
  ) : message.kind === 'announcement' ? (
    <View style={styles.footerStack}>
      <Button
        title={message.ctaLabel || t('common:inApp.gotIt')}
        onPress={() => void handleAck()}
        fullWidth
      />
      {message.modalDismissible && (
        <Button
          title={t('common:close', { defaultValue: 'Close' })}
          variant="ghost"
          onPress={() => void handleDismiss()}
          fullWidth
        />
      )}
    </View>
  ) : (
    <View style={styles.footerStack}>
      <Button
        title={t('common:inApp.submit')}
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={!canSubmit}
        fullWidth
      />
      {message.modalDismissible && (
        <Button
          title={t('common:inApp.later')}
          variant="ghost"
          disabled={submitting}
          onPress={() => void handleDismiss()}
          fullWidth
        />
      )}
    </View>
  );

  return (
    <Sheet
      open={Boolean(message)}
      onClose={() => {
        if (message.modalDismissible && !submitting) void handleDismiss();
      }}
      edge="bottom"
      size="lg"
      accent
      hideClose={!message.modalDismissible}
      kicker={kindLabel}
      title={message.title}
      subtitle={message.body || undefined}
      icon={
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name={kindIcon(message.kind)} size={22} color={colors.primary} />
        </View>
      }
      footer={footer}
      scrollable
    >
      {thanks && message.kind !== 'announcement' && (
        <View style={[styles.thanks, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.thanksTitle, { color: colors.textPrimary }]}>
              {t('common:inApp.thanksTitle')}
            </Text>
            <Text style={[styles.thanksBody, { color: colors.textSecondary }]}>
              {t('common:inApp.thanks')}
            </Text>
          </View>
        </View>
      )}

      {!thanks && message.kind !== 'announcement' && (
        <View style={styles.questions}>
          {message.questions.map((q, index) => {
            const selected = answers[q.id]?.optionIds ?? [];
            const multi = q.type === 'multi';
            return (
              <View key={q.id} style={styles.question}>
                <Text style={[styles.prompt, { color: colors.textPrimary }]}>
                  {message.questions.length > 1 ? `${index + 1}. ` : ''}
                  {q.prompt}
                  {q.required ? ' *' : ''}
                </Text>
                {q.type === 'short_text' ? (
                  <TextInput
                    style={[
                      styles.textarea,
                      {
                        color: colors.textPrimary,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    multiline
                    placeholder={t('common:inApp.textPlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    value={answers[q.id]?.textValue ?? ''}
                    onChangeText={(text) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: { questionId: q.id, optionIds: [], textValue: text },
                      }))
                    }
                  />
                ) : (
                  <View style={styles.options}>
                    {q.options.map((opt) => {
                      const isOn = selected.includes(opt.id);
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => setOption(q.id, opt.id, multi)}
                          style={[
                            styles.option,
                            {
                              borderColor: isOn ? colors.primary : colors.border,
                              backgroundColor: isOn ? colors.primaryLight : colors.surface,
                            },
                          ]}
                        >
                          {isOn && (
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color={colors.primary}
                              style={{ marginRight: 6 }}
                            />
                          )}
                          <Text
                            style={[
                              styles.optionLabel,
                              { color: colors.textPrimary, fontWeight: isOn ? '700' : '500' },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
          {error ? (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          ) : null}
        </View>
      )}

      {thanks && message.pollResults && message.pollResults.length > 0 && (
        <View style={styles.pollResults}>
          <Text style={[styles.pollTitle, { color: colors.textPrimary }]}>
            {t('common:inApp.results')}
          </Text>
          {message.pollResults.map((r) => {
            const total = message.pollResults!.reduce((sum, x) => sum + x.count, 0) || 1;
            const pct = Math.round((r.count / total) * 100);
            return (
              <View key={r.optionId} style={styles.pollRow}>
                <View style={styles.pollLabel}>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{r.label}</Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {r.count} ({pct}%)
                  </Text>
                </View>
                <View style={[styles.pollTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.pollFill,
                      { width: `${pct}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Keep ScrollView happy when announcement has no body questions */}
      {message.kind === 'announcement' && !thanks ? <View style={{ height: 4 }} /> : null}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerStack: { gap: spacing.sm },
  thanks: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
  },
  thanksTitle: { ...typography.styles.body, fontWeight: '700', marginBottom: 2 },
  thanksBody: { ...typography.styles.bodySmall, lineHeight: 20 },
  questions: { gap: spacing.lg },
  question: { gap: spacing.sm },
  prompt: { ...typography.styles.body, fontWeight: '600', lineHeight: 22 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: '46%',
    flexGrow: 1,
  },
  optionLabel: { ...typography.styles.bodySmall },
  textarea: {
    minHeight: 88,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    padding: spacing.md,
    textAlignVertical: 'top',
    ...typography.styles.body,
  },
  error: { ...typography.styles.bodySmall, marginTop: spacing.xs },
  pollResults: { gap: spacing.md, marginTop: spacing.sm },
  pollTitle: { ...typography.styles.body, fontWeight: '700' },
  pollRow: { gap: 6 },
  pollLabel: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  pollTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  pollFill: { height: '100%', borderRadius: 999 },
});

export default InAppMessageHost;
