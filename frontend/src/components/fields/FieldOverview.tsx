import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import type { FieldPhenology, FieldTask, TaskProposal } from '../../services/fieldWorkService';
import type { FieldEnvironmentalAlert, FieldWeather } from '../../services/geospatialService';
import type { FieldYearSummary, YearFinancialSummary } from '../../services/financialSummaryService';
import type { ChronologioEntry } from '../../services/chronologioService';
import { countPlannedRemaining, resolveFieldAttention } from '../../utils/fieldOverviewAttention';
import FieldStatusStrip from './FieldStatusStrip';
import FieldWeatherCard from './FieldWeatherCard';
import FieldYearGlance from './FieldYearGlance';
import FieldRecentChronologio from './FieldRecentChronologio';
import FieldDetailMap from './FieldDetailMap';
import FieldPhotosStrip from './FieldPhotosStrip';

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
}) => {
  const { i18n } = useTranslation();
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

  return (
    <div className="field-overview">
      <FieldStatusStrip
        phenology={phenology}
        currentLifecycleStage={field.currentLifecycleStage}
        tasks={tasks}
        attention={attention}
        latestEntry={latestEntry}
      />

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
          <FieldWeatherCard
            weather={weather}
            loading={weatherLoading}
            error={weatherError}
            year={year}
            isHistoricalYear={isHistoricalYear}
            allowRecommendation={!isDraft}
            attention={attention}
            nextTaskTitle={attention.kind === 'nextTask' || attention.kind === 'weatherReschedule' ? attention.title : undefined}
            onRetry={onRetryWeather}
            onSeeMore={onOpenMap}
          />
        </aside>
      </div>

      <div className="field-overview-lower">
        <FieldYearGlance
          fieldId={field.id}
          year={year}
          costSummary={costSummary}
          yearRollup={yearRollup}
          plannedRemaining={countPlannedRemaining(tasks)}
        />
        <FieldRecentChronologio
          fieldId={field.id}
          entries={recentEntries}
          onSelect={onOpenChronologio}
        />
      </div>

      <FieldPhotosStrip fieldId={field.id} />
    </div>
  );
};

export default FieldOverview;
