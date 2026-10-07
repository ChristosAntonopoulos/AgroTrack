import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { subscriptionService } from '../../services/subscriptionService';
import type { OwnedFieldSummary } from '../../billing/subscriptionModel';
import { trackBillingEvent } from '../../billing/billingAnalytics';
import { spacing, radii } from '../../theme';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Free plan with more groves than it includes: pick which one stays editable.
 * The others become view-only — nothing is deleted.
 */
const WritableFieldSheet: React.FC = () => {
  const { t } = useTranslation('subscription');
  const { colors, fontScaleMultiplier, tapMin } = useTheme();
  const {
    writableSelectionOpen,
    closeWritableSelection,
    applySnapshot,
    refresh,
    snapshot,
    showUpgradePaywall,
  } = useSubscription();
  const [fields, setFields] = useState<OwnedFieldSummary[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [choice, setChoice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    setSaveError(false);
    try {
      const rows = await subscriptionService.getOwnedFields();
      setFields(rows);
      setChoice(rows.find((row) => row.isWritable)?.id ?? rows[0]?.id ?? null);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (writableSelectionOpen) {
      void load();
      trackBillingEvent('writable_selection_opened');
    }
  }, [writableSelectionOpen, load]);

  const confirm = async () => {
    if (!choice) return;
    setSaving(true);
    setSaveError(false);
    try {
      const next = await subscriptionService.selectWritableField(choice);
      trackBillingEvent('writable_field_selected');
      applySnapshot(next);
      closeWritableSelection();
      // Field capabilities (isSubscriptionReadOnly) changed server-side; screens refetch on focus.
      void refresh();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const limit = snapshot?.limits.ownedFields ?? 1;
  const text = (size: number) => ({
    color: colors.textSecondary,
    fontSize: size * fontScaleMultiplier,
    lineHeight: size * 1.45 * fontScaleMultiplier,
  });

  return (
    <Sheet
      open={writableSelectionOpen}
      onClose={closeWritableSelection}
      edge="bottom"
      title={t('writable.title')}
      subtitle={t('writable.body', { count: limit })}
      icon={<Ionicons name="location-outline" size={22} color={colors.primary} />}
      footer={
        state === 'ready' ? (
          <>
            <Button
              title={t('writable.confirm')}
              onPress={() => void confirm()}
              disabled={!choice || saving}
              loading={saving}
              fullWidth
            />
            <Button
              title={t('writable.orUpgrade')}
              variant="text"
              onPress={() => {
                closeWritableSelection();
                showUpgradePaywall({ source: 'settings', intent: 'upgrade' });
              }}
              fullWidth
            />
          </>
        ) : null
      }
    >
      {state === 'loading' ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : null}
      {state === 'error' ? (
        <View style={styles.stack}>
          <Text style={text(14)}>{t('writable.loadError')}</Text>
          <Button title={t('paywall.cta.retry')} variant="outline" size="small" onPress={() => void load()} />
        </View>
      ) : null}
      {state === 'ready' && fields.length === 0 ? <Text style={text(14)}>{t('writable.empty')}</Text> : null}
      {state === 'ready' ? (
        <View style={styles.stack}>
          {fields.map((field) => {
            const selected = choice === field.id;
            return (
              <Pressable
                key={field.id}
                onPress={() => setChoice(field.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[
                  styles.option,
                  {
                    minHeight: Math.max(tapMin, 52),
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primaryLight : colors.surfaceElevated,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16 * fontScaleMultiplier }}>
                    {field.name}
                  </Text>
                  {field.isWritable ? <Text style={text(12)}>{t('writable.current')}</Text> : null}
                </View>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={selected ? colors.primary : colors.textTertiary}
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {saveError ? <Text style={[text(14), { marginTop: spacing.sm }]}>{t('writable.error')}</Text> : null}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  spinner: { paddingVertical: spacing.xl },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});

export default WritableFieldSheet;
