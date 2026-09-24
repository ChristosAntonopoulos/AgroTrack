import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import type { FieldPhenology, FieldTask, TaskProposal } from '../../services/fieldWorkService';
import type { FieldEnvironmentalAlert, FieldWeather } from '../../services/geospatialService';
import type { FieldYearSummary, YearFinancialSummary } from '../../services/financialSummaryService';
import type { ChronologioEntry } from '../../services/chronologioService';
import { countPlannedRemaining, resolveFieldAttention } from '../../utils/fieldOverviewAttention';
import GroveWeatherCard from '../weather/GroveWeatherCard';
import FieldStatusStrip from './FieldStatusStrip';
import FieldWeatherCard from './FieldWeatherCard';
import FieldYearGlance from './FieldYearGlance';
import FieldRecentChronologio from './FieldRecentChronologio';
import FieldDetailMap from './FieldDetailMap';
import FieldPhotosStrip from './FieldPhotosStrip';
import GroveEnrichmentCards from './GroveEnrichmentCards';

type Props = {
  field: Field;
  year: number;
  currentYear: number;
  phenology: FieldPhenology | null;
  tasks: FieldTask[];
  proposals: TaskProposal[];
  alerts: FieldEnvironmentalAlert[];
  weather: FieldWeather | null;
  weatherLoading: boolean;
  weatherError: boolean;
  onRetryWeather: () => void;
  costSummary: YearFinancialSummary | null;
  yearRollup: FieldYearSummary | null;
  recentEntries: ChronologioEntry[];
  onOpenChronologio: (entry?: ChronologioEntry) => void;
  onOpenMap: () => void;
  canViewMoney?: boolean;
  canEdit?: boolean;
};

const FieldOverview: React.FC<Props> = ({
  field,
  year,
  currentYear,
  phenology,
  tasks,
  proposals,
  alerts,
  weather,
  weatherLoading,
  weatherError,
  onRetryWeather,
  costSummary,
  yearRollup,
  recentEntries,
  onOpenChronologio,
  onOpenMap,
  canViewMoney = true,
  canEdit = false,
}) => {
  const { t, i18n } = useTranslation('fields');
  const isDraft = field.status === 'Draft';
  const isHistoricalYear = year < currentYear;
  const latestEntry = useMemo(
    () =>
      [...recentEntries].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      )[0],
    [recentEntries]
  );

  const attention = useMemo(
    () =>
      resolveFieldAttention({
        isDraft,
        isHistoricalYear,
        alerts,
        tasks,
        proposals,
        language: i18n.language,
      }),
    [isDraft, isHistoricalYear, alerts, tasks, proposals, i18n.language]
  );

  const harvestDaySacks = useMemo(() => {
    const harvestEntries = recentEntries.filter((e) => e.category === 'harvest');
    if (harvestEntries.length === 0) return null;
    let sacks = 0;
    let found = false;
    for (const entry of harvestEntries) {
      const raw = entry.details?.harvest?.sackCount;
      if (raw != null && Number.isFinite(Number(raw))) {
        sacks += Number(raw);
        found = true;
      }
    }
    return found ? sacks : null;
  }, [recentEntries]);

  return (
    <div className="field-overview">
      <GroveEnrichmentCards field={field} canEdit={canEdit} />

      <FieldStatusStrip
        phenology={phenology}
        currentLifecycleStage={field.currentLifecycleStage}
        tasks={tasks}
        attention={attention}
        latestEntry={latestEntry}
      />

      {field.capabilities?.canViewEnvironmentalData !== false ? (
      <div className="field-overview-grid">
        <div className="field-overview-map">
          <FieldDetailMap
            field={field}
            heightPx={320}
            variant="peek"
            weather={weather}
            onOpenMapTab={onOpenMap}
          />
        </div>
        <aside className="field-overview-side">
          {weather && !weatherLoading && !weatherError ? (
            <div className="field-overview-weather">
              {isHistoricalYear ? (
                <p className="field-weather-year-note">{t('weather.notThatYear', { year })}</p>
              ) : null}
              <GroveWeatherCard fieldWeather={weather} fieldName={field.name} />
              <button type="button" className="field-weather-more" onClick={onOpenMap}>
                {t('weather.seeCharts')}
              </button>
            </div>
          ) : (
            <FieldWeatherCard
              weather={weather}
              loading={weatherLoading}
              error={weatherError}
              year={year}
              isHistoricalYear={isHistoricalYear}
              allowRecommendation={!isDraft}
              attention={attention}
              nextTaskTitle={
                attention.kind === 'weatherReschedule' ? attention.title : undefined
              }
              onRetry={onRetryWeather}
              onSeeMore={onOpenMap}
            />
          )}
        </aside>
      </div>
      ) : null}

      <div className="field-overview-lower">
        <FieldYearGlance
          fieldId={field.id}
          year={year}
          costSummary={costSummary}
          yearRollup={yearRollup}
          plannedRemaining={countPlannedRemaining(tasks)}
          harvestDaySacks={harvestDaySacks}
          canViewMoney={canViewMoney}
        />
        {field.capabilities?.canViewChronologio !== false ? (
          <FieldRecentChronologio
            fieldId={field.id}
            entries={recentEntries}
            onSelect={onOpenChronologio}
          />
        ) : null}
      </div>

      {field.capabilities?.canViewPhotos !== false ? <FieldPhotosStrip fieldId={field.id} /> : null}
    </div>
  );
};

export default FieldOverview;
