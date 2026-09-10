import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import type { Field } from '../../services/fieldService';
import type { FieldWeather } from '../../services/geospatialService';
import { readFieldViewPreferences, writeFieldViewPreferences } from '../../utils/fieldViewPreferences';
import type { SimpleMapPreset } from '../../utils/fieldMapPresets';
import FieldDetailMap from './FieldDetailMap';
import FieldWeatherVegetationCharts from './FieldWeatherVegetationCharts';

type Props = {
  field: Field;
  year: number;
  weather: FieldWeather | null;
};

const FieldMapDataTab: React.FC<Props> = ({ field, year, weather }) => {
  const { t } = useTranslation('fields');
  const { isFullPicture } = useExperienceMode();
  const stored = readFieldViewPreferences();
  const [preset, setPreset] = useState<SimpleMapPreset>(stored.lastPreset || 'field');

  useEffect(() => {
    writeFieldViewPreferences({ lastPreset: preset });
  }, [preset]);

  return (
    <section className="field-map-workspace">
      <h2>{t('page.mapData')}</h2>
      <p className="field-map-workspace-lead">{t('mapWorkspace.lead')}</p>
      <FieldDetailMap
        field={field}
        heightPx={isFullPicture ? 640 : 520}
        variant={isFullPicture ? 'full' : 'simple'}
        weather={weather}
        preset={preset}
        onPresetChange={setPreset}
      />
      <div className="field-map-meaning">
        <h3>{t('mapWorkspace.meaningTitle')}</h3>
        <p>{t(`mapWorkspace.meaning.${preset}`)}</p>
        <p className="field-map-fresh">{t('mapWorkspace.freshness', { year })}</p>
      </div>
      {isFullPicture && (preset === 'vegetation' || preset === 'water') ? (
        <FieldWeatherVegetationCharts fieldId={field.id} />
      ) : null}
    </section>
  );
};

export default FieldMapDataTab;
