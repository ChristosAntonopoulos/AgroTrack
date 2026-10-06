import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getFieldService } from '../../services/serviceFactory';
import type { Field } from '../../services/fieldService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import { radii, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = {
  field: Field;
};

/**
 * Title-as-switcher — change grove while keeping the current field-page tab.
 */
const FieldGroveSwitcher: React.FC<Props> = ({ field }) => {
  const { t, i18n } = useTranslation('fields');
  const { user } = useAuth();
  const { colors, tapMin } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FieldDetail'>>();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(false);
  const accent = resolveFieldColor(field.color, field.id);
  const displayName = friendlyFieldLabel(field.name);
  const locale = i18n.language?.startsWith('it') ? 'it' : i18n.language?.startsWith('en') ? 'en' : 'el';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void getFieldService()
      .getFields(user?.id || '', user?.role || 'FieldOwner')
      .then((list) => {
        if (!cancelled) setFields(list);
      })
      .catch(() => {
        if (!cancelled) setFields([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, user?.id, user?.role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter((item) => {
      const name = friendlyFieldLabel(item.name).toLowerCase();
      const place = (getFieldShortLocation(item) || '').toLowerCase();
      return name.includes(q) || place.includes(q);
    });
  }, [fields, query]);

  const switchTo = (next: Field) => {
    setOpen(false);
    setQuery('');
    if (next.id === field.id) return;
    navigation.replace('FieldDetail', {
      fieldId: next.id,
      mode: route.params?.mode,
      activation: route.params?.activation,
    });
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, { opacity: pressed ? 0.85 : 1, minHeight: Math.min(tapMin, 40) }]}
        accessibilityRole="button"
        accessibilityLabel={t('switcher.title', { defaultValue: 'Αλλαγή ελαιώνα' })}
      >
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {displayName}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
          <Text style={[styles.sheetTitle, { color: colors.textTertiary }]}>
            {t('switcher.title', { defaultValue: 'Αλλαγή ελαιώνα' })}
          </Text>
          <View style={[styles.search, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }]}>
            <Ionicons name="search" size={16} color={colors.textTertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('switcher.search', { defaultValue: 'Αναζήτηση' })}
              placeholderTextColor={colors.textTertiary}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              autoFocus
            />
          </View>
          {loading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
          {!loading && filtered.length === 0 ? (
            <Text style={{ color: colors.textSecondary, paddingVertical: 12 }}>
              {t('switcher.empty', { defaultValue: 'Δεν βρέθηκε ελαιώνας' })}
            </Text>
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => {
              const selected = item.id === field.id;
              const area = formatFieldArea(item, locale);
              const place = getFieldShortLocation(item);
              const meta = [area && area !== '—' ? area : null, place].filter(Boolean).join(' · ');
              return (
                <Pressable
                  onPress={() => switchTo(item)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: selected || pressed ? colors.primaryLight : 'transparent',
                      minHeight: Math.max(52, tapMin),
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <View
                    style={[styles.dot, { backgroundColor: resolveFieldColor(item.color, item.id) }]}
                  />
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {friendlyFieldLabel(item.name)}
                    </Text>
                    {meta ? (
                      <Text style={[styles.rowMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                        {meta}
                      </Text>
                    ) : null}
                  </View>
                  {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '72%',
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 1 },
});

export default FieldGroveSwitcher;
