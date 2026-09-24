import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Field } from '../../services/fieldService';
import type { FieldWeather } from '../../services/geospatialService';
import FieldDetailMap from '../domain/FieldDetailMap';
import FieldIntelligenceCard from '../domain/FieldIntelligenceCard';
import GroveWeatherCard from '../weather/GroveWeatherCard';
import FieldWeatherVegetationCharts from './FieldWeatherVegetationCharts';
import { spacing } from '../../theme';

type Props = {
  field: Field;
  weather: FieldWeather | null;
};

/** Map tab body — mirrors web FieldMapDataTab: map → weather → charts → intelligence. */
const FieldMapDataPanel: React.FC<Props> = ({ field, weather }) => (
  <View style={styles.wrap}>
    <FieldDetailMap field={field} height={360} />
    {weather ? (
      <GroveWeatherCard fieldWeather={weather} fieldName={field.name} embedded compact />
    ) : null}
    <FieldWeatherVegetationCharts fieldId={field.id} compact />
    {field.boundary ? <FieldIntelligenceCard fieldId={field.id} /> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
});

export default FieldMapDataPanel;
