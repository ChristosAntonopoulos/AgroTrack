import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import FormField from '../forms/FormField';
import { useTheme } from '../../context/ThemeContext';
import { searchPlaces, type GeocodedPlace } from '../../utils/geocodeLocation';
import { spacing, typography } from '../../theme';

type Props = {
  value: string;
  onChange: (next: { locationText: string; latitude?: number; longitude?: number }) => void;
  disabled?: boolean;
};

const LocationSearchField: React.FC<Props> = ({ value, onChange, disabled }) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      void searchPlaces(q)
        .then((places) => {
          if (!cancelled) setSuggestions(places);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  return (
    <View>
      <FormField
        label={t('addField.locationText')}
        value={value}
        onChangeText={(locationText) => onChange({ locationText })}
        placeholder={t('createGrove.place.placeholder', {
          defaultValue: t('addField.locationPlaceholder'),
        })}
        editable={!disabled}
      />
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {t('createGrove.place.hint', { defaultValue: t('addField.locationHint') })}
      </Text>
      {loading && suggestions.length === 0 ? (
        <Text style={[styles.status, { color: colors.textTertiary }]}>
          {t('addField.locationSearching')}
        </Text>
      ) : null}
      {suggestions.length > 0 ? (
        <View style={[styles.list, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
          {suggestions.map((place) => (
            <Pressable
              key={`${place.latitude},${place.longitude},${place.label}`}
              onPress={() => {
                onChange({
                  locationText: place.label,
                  latitude: place.latitude,
                  longitude: place.longitude,
                });
                setSuggestions([]);
              }}
              style={[styles.option, { borderBottomColor: colors.borderLight }]}
            >
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>{place.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  hint: { ...typography.styles.caption, marginTop: -spacing.xs, marginBottom: spacing.xs },
  status: { ...typography.styles.caption, marginBottom: spacing.xs },
  list: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  optionText: { ...typography.styles.bodySmall, flex: 1 },
});

export default LocationSearchField;
