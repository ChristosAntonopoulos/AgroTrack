import React from 'react';
import type { Field } from '../../services/fieldService';
import type { FieldWeather } from '../../services/geospatialService';
import FieldDetailMap from './FieldDetailMap';
import FieldWeatherVegetationCharts from './FieldWeatherVegetationCharts';

type Props = {
  field: Field;
  year: number;
  weather: FieldWeather | null;
};

const FieldMapDataTab: React.FC<Props> = ({ field, weather }) => (
  <section className="field-map-workspace">
    <FieldDetailMap field={field} variant="full" weather={weather} />
    <FieldWeatherVegetationCharts fieldId={field.id} compact />
  </section>
);

export default FieldMapDataTab;
