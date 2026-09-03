import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { resolveFieldCenter, formatFieldAreaSqm } from '../../utils/fieldGeo';
import { weatherService, WeatherData } from '../../services/weatherService';
import FieldDetailMap from './FieldDetailMap';
import WeatherWidget from './WeatherWidget';
import AreaComparisonCard from './AreaComparisonCard';
import Button from '../ui/Button';
import { spacing } from '../../theme';

export interface FieldPreviewHeroProps {
  field: Field;
  mapHeight?: number;
  onGestureActiveChange?: (active: boolean) => void;
  showWeather?: boolean;
  showAreaComparison?: boolean;
  onEditMapPress?: () => void;
}

const FieldPreviewHero: React.FC<FieldPreviewHeroProps> = ({
  field,
  mapHeight = 240,
  onGestureActiveChange,
  showWeather = true,
  showAreaComparison = true,
  onEditMapPress,
}) => {
  const { t } = useTranslation('fields');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const loadWeather = useCallback(async () => {
    if (!resolveFieldCenter(field)) {
      setWeather(null);
      return;
    }
    setWeatherLoading(true);
    try {
      setWeather(await weatherService.getFieldWeatherData(field.id));
    } catch {
      setWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  }, [field]);

  useEffect(() => {
    if (!showWeather) return;
    void loadWeather();
  }, [showWeather, loadWeather]);

  const measuredAreaSqm = formatFieldAreaSqm(field);
  const showAreaCard =
    showAreaComparison &&
    (field.greekCadastre?.officialAreaSqm != null || measuredAreaSqm != null);

  return (
    <View style={styles.wrap}>
      <FieldDetailMap
        field={field}
        height={mapHeight}
        onGestureActiveChange={onGestureActiveChange}
      />
      {onEditMapPress ? (
        <Button
          title={t('editMapBoundary')}
          variant="outline"
          onPress={onEditMapPress}
          fullWidth
        />
      ) : null}
      {showWeather || showAreaCard ? (
        <View style={styles.context}>
          {showWeather ? (
            <WeatherWidget
              weather={weather}
              loading={weatherLoading}
              high={weather?.high}
              low={weather?.low}
              namespace="fields"
            />
          ) : null}
          {showAreaCard ? (
            <AreaComparisonCard
              officialAreaSqm={field.greekCadastre?.officialAreaSqm}
              measuredAreaSqm={measuredAreaSqm}
              differencePercent={field.greekCadastre?.areaDifferencePercent}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  context: { gap: spacing.sm },
});

export default FieldPreviewHero;
