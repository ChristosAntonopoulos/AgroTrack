import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import type { FieldWeather } from '../../services/geospatialService';
import FieldDetailMap from './FieldDetailMap';
import FieldWeatherVegetationCharts from './FieldWeatherVegetationCharts';

type Props = {
  field: Field;
  year: number;
  weather: FieldWeather | null;
};

const FieldMapDataTab: React.FC<Props> = ({ field, year, weather }) => {
  const { t } = useTranslation('fields');

  return (
    <section className="field-map-workspace">
      <h2>{t('page.mapData')}</h2>
      <p className="field-map-workspace-lead">{t('mapWorkspace.lead')}</p>
      <FieldDetailMap field={field} heightPx={640} variant="full" weather={weather} />
      <div className="field-map-meaning">
        <h3>{t('mapWorkspace.meaningTitle')}</h3>
        <p>{t('mapWorkspace.meaning.field')}</p>
        <p className="field-map-fresh">{t('mapWorkspace.freshness', { year })}</p>
      </div>
      <FieldWeatherVegetationCharts fieldId={field.id} />
    </section>
  );
};

export default FieldMapDataTab;
