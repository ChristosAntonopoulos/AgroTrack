import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import FormField from '../forms/FormField';
import { useTheme } from '../../context/ThemeContext';
import { searchPlaces, type GeocodedPlace } from '../../utils/geocodeLocation';
import { locationService } from '../../services/locationService';
import { spacing, typography, createElevation } from '../../theme';

type Props = {
  value: string;
  onChange: (next: { locationText: string; latitude?: number; longitude?: number }) => void;
  disabled?: boolean;
  /** Tighter layout for map screens — no long helper under the field. */
  compact?: boolean;
};

const splitPlaceLabel = (label: string): { primary: string; secondary?: string } => {
  const parts = label
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) return { primary: label };
  return { primary: parts[0], secondary: parts.slice(1).join(', ') };
};

/**
 * Typeahead place picker — suggestions appear as you type; map only moves after a pick.
 */
const LocationSearchField: React.FC<Props> = ({ value, onChange, disabled, compact = false }) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setSearched(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSearched(false);
    const timer = setTimeout(() => {
      void searchPlaces(q, 7)
        .then((places) => {
          if (cancelled) return;
          setSuggestions(places);
          setOpen(true);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
            setSearched(true);
          }
        });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const pick = (place: GeocodedPlace) => {
    setQuery(place.label);
    setSuggestions([]);
    setOpen(false);
    setSearched(false);
    onChange({
      locationText: place.label,
      latitude: place.latitude,
      longitude: place.longitude,
    });
  };

  const useNearMe = async () => {
    setLocating(true);
    try {
      const loc = await locationService.getCurrentLocation();
      const label = t('createGrove.placement.nearMe', {
        defaultValue: t('addField.useCurrentLocation', { defaultValue: 'Near me' }),
      });
      setQuery(label);
      setSuggestions([]);
      setOpen(false);
      onChange({
        locationText: label,
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
    } catch {
      /* permission denied — keep typing */
    } finally {
      setLocating(false);
    }
  };

  const showMenu = open && query.trim().length >= 2 && (loading || searched || locating);

  return (
    <View style={styles.root}>
      <FormField
        label={compact ? undefined : t('addField.locationText')}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setOpen(true);
          // Text only — parent must not move the map until a list pick.
          onChange({ locationText: text });
        }}
        onFocus={() => {
          if (query.trim().length >= 2) setOpen(true);
        }}
        placeholder={t('createGrove.place.placeholder', {
          defaultValue: t('addField.locationPlaceholder'),
        })}
        editable={!disabled}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        containerStyle={compact ? styles.compactField : undefined}
        leftIcon={<Ionicons name="search-outline" size={18} color={colors.textSecondary} />}
        rightIcon={
          loading || locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : query.trim() ? (
            <Pressable
              hitSlop={8}
              onPress={() => {
                setQuery('');
                setSuggestions([]);
                setOpen(false);
                onChange({ locationText: '' });
              }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          ) : null
        }
      />
      {!compact ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {t('createGrove.place.hint', { defaultValue: t('addField.locationHint') })}
        </Text>
      ) : null}

      <Pressable
        onPress={() => void useNearMe()}
        disabled={disabled || locating}
        style={[
          styles.nearMe,
          { borderColor: colors.borderLight, backgroundColor: colors.surface },
        ]}
      >
        <Ionicons name="locate-outline" size={18} color={colors.primary} />
        <Text style={[styles.nearMeText, { color: colors.primary }]}>
          {t('addField.useCurrentLocation', {
            defaultValue: t('createGrove.placement.nearMe'),
          })}
        </Text>
      </Pressable>

      {showMenu ? (
        <View
          style={[
            styles.dropdown,
            {
              borderColor: colors.borderLight,
              backgroundColor: colors.surface,
              ...createElevation(colors, 'md'),
            },
          ]}
        >
          {loading && suggestions.length === 0 ? (
            <Text style={[styles.status, { color: colors.textTertiary }]}>
              {t('addField.locationSearching')}
            </Text>
          ) : null}
          {!loading && searched && suggestions.length === 0 ? (
            <Text style={[styles.status, { color: colors.textSecondary }]}>
              {t('createGrove.place.noResults', {
                defaultValue: t('addField.locationNotFound', {
                  defaultValue: 'No places found — try another name.',
                }),
              })}
            </Text>
          ) : null}
          {suggestions.slice(0, compact ? 6 : 8).map((place) => {
            const { primary, secondary } = splitPlaceLabel(place.label);
            return (
              <Pressable
                key={`${place.latitude},${place.longitude},${place.label}`}
                onPress={() => pick(place)}
                style={[styles.option, { borderBottomColor: colors.borderLight }]}
              >
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionPrimary, { color: colors.textPrimary }]} numberOfLines={1}>
                    {primary}
                  </Text>
                  {secondary ? (
                    <Text
                      style={[styles.optionSecondary, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {secondary}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    zIndex: 20,
    position: 'relative',
  },
  compactField: { marginBottom: 0 },
  hint: { ...typography.styles.caption, marginTop: -spacing.xs, marginBottom: spacing.xs },
  nearMe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  nearMeText: { ...typography.styles.bodySmall, fontWeight: '700' },
  dropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: 280,
    zIndex: 40,
  },
  status: {
    ...typography.styles.caption,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  optionCopy: { flex: 1, minWidth: 0, gap: 2 },
  optionPrimary: { ...typography.styles.bodySmall, fontWeight: '700' },
  optionSecondary: { fontSize: 12, lineHeight: 16 },
});

export default LocationSearchField;
