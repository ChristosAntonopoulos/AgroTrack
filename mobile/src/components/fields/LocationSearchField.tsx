import React, { useEffect, useRef, useState } from 'react';
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
import {
  reverseGeocode,
  searchPlaces,
  type GeocodedPlace,
} from '../../utils/geocodeLocation';
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
  const { t, i18n } = useTranslation('fields');
  const { colors } = useTheme();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  // A picked label must not re-run search and reopen the list over the map.
  const committedQuery = useRef<string | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const q = query.trim();
    if (committedQuery.current && q === committedQuery.current) {
      setSuggestions([]);
      setLoading(false);
      setSearched(false);
      setOpen(false);
      return;
    }
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setSearched(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setSearched(false);
    const timer = setTimeout(() => {
      void searchPlaces(q, 7, { signal: controller.signal, language: i18n.language })
        .then((places) => {
          if (cancelled) return;
          setSuggestions(places);
          setOpen(true);
        })
        .catch((error: unknown) => {
          if (cancelled || (error instanceof Error && error.name === 'AbortError')) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
            setSearched(true);
          }
        });
    }, 400);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, i18n.language]);

  const pick = (place: GeocodedPlace) => {
    committedQuery.current = place.label.trim();
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
      const place = await reverseGeocode(loc.latitude, loc.longitude, {
        language: i18n.language,
      }).catch(() => null);
      const label =
        place?.label ||
        t('createGrove.placement.nearMe', {
          defaultValue: t('addField.useCurrentLocation', { defaultValue: 'Near me' }),
        });
      committedQuery.current = label.trim();
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
          if (committedQuery.current && text.trim() === committedQuery.current) return;
          if (committedQuery.current) committedQuery.current = null;
          setQuery(text);
          setOpen(true);
          // Typing alone must not persist as locationText — only a list pick or GPS does.
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
                committedQuery.current = null;
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

      {showMenu ? (
        <View
          style={[
            styles.dropdown,
            {
              borderColor: colors.oliveBorder,
              backgroundColor: colors.surfaceElevated,
              ...createElevation(colors, 'md'),
            },
          ]}
        >
          {loading && suggestions.length === 0 ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.status, { color: colors.textTertiary }]}>
                {t('addField.locationSearching')}
              </Text>
            </View>
          ) : null}
          {!loading && searched && suggestions.length === 0 ? (
            <Text style={[styles.status, styles.statusAlone, { color: colors.textSecondary }]}>
              {t('createGrove.place.noResults', {
                defaultValue: t('addField.locationNotFound', {
                  defaultValue: 'No places found — try another name.',
                }),
              })}
            </Text>
          ) : null}
          {suggestions.slice(0, compact ? 5 : 6).map((place, index, list) => {
            const { primary, secondary } = splitPlaceLabel(place.label);
            const last = index === list.length - 1;
            return (
              <Pressable
                key={`${place.latitude},${place.longitude},${place.label}`}
                onPress={() => pick(place)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderBottomColor: colors.borderLight,
                    backgroundColor: pressed ? colors.primaryLight : 'transparent',
                    borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={[styles.pin, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="location" size={16} color={colors.primary} />
                </View>
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
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {!compact ? (
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
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    zIndex: 20,
    position: 'relative',
  },
  compactField: { marginBottom: 0, minHeight: 44 },
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
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 40,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  status: {
    ...typography.styles.caption,
    flex: 1,
  },
  statusAlone: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 56,
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCopy: { flex: 1, minWidth: 0, gap: 2 },
  optionPrimary: { ...typography.styles.bodySmall, fontWeight: '700' },
  optionSecondary: { fontSize: 12, lineHeight: 16 },
});

export default LocationSearchField;
