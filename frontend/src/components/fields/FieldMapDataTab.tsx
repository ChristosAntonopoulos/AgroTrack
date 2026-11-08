import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import type { FieldWeather } from '../../services/geospatialService';
import FieldDetailMap from './FieldDetailMap';
import FieldWeatherVegetationCharts from './FieldWeatherVegetationCharts';
import GroveWeatherCard from '../weather/GroveWeatherCard';
import MissingBoundaryPrompt from './MissingBoundaryPrompt';
import { fieldHasBoundary } from '../../utils/fieldDisplay';

type Props = {
  field: Field;
  year: number;
  weather: FieldWeather | null;
  canEdit?: boolean;
};

const FieldMapDataTab: React.FC<Props> = ({ field, weather, canEdit = true }) => {
  const { t } = useTranslation('fields');
  const hasBoundary = fieldHasBoundary(field);

  return (
    <section className="field-map-workspace">
      <MissingBoundaryPrompt field={field} canEdit={canEdit} />
      <FieldDetailMap field={field} variant="full" weather={weather} />
      {weather ? (
        <GroveWeatherCard
          fieldWeather={weather}
          fieldName={field.name}
          fieldId={field.id}
          fieldColor={field.color}
          embedded
          compact
        />
      ) : null}
      {hasBoundary ? (
        <FieldWeatherVegetationCharts fieldId={field.id} compact />
      ) : (
        <p className="field-map-satellite-locked" role="note">
          {t('createGrove.mapPrompt.satelliteLocked')}
        </p>
      )}
    </section>
  );
};

export default FieldMapDataTab;
