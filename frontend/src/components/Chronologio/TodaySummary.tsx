import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckSquare, Leaf } from 'lucide-react';
import { useCaptureOptional } from '../../context/CaptureContext';
import type { useTodaySummary } from '../../chronologio/useTodaySummary';
import GroveWeatherCard from '../weather/GroveWeatherCard';

type TodayBundle = ReturnType<typeof useTodaySummary>;

type Props = {
  today: TodayBundle;
  fieldId?: string;
  onOpenWeather?: () => void;
};

const TodaySummary: React.FC<Props> = ({ today, fieldId, onOpenWeather }) => {
  const { t, i18n } = useTranslation(['chronologio', 'today']);
  const navigate = useNavigate();
  const capture = useCaptureOptional();
  const dateLabel = new Date().toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const runAttention = () => {
    const item = today.attention;
    if (item.action === 'open_task' && item.taskId) {
      navigate(`/tasks/${item.taskId}`);
      return;
    }
    if (item.action === 'tasks') {
      navigate('/tasks?focus=action');
      return;
    }
    if (item.action === 'schedule') {
      navigate(item.fieldId ? `/tasks/new?fieldId=${encodeURIComponent(item.fieldId)}` : '/tasks/new');
      return;
    }
    if (item.action === 'weather') {
      if (onOpenWeather) onOpenWeather();
      else if (item.fieldId) navigate(`/fields/${item.fieldId}/weather`);
      return;
    }
    capture?.openCapture({ fieldId: item.fieldId || fieldId });
  };

  const calm = today.attention.kind === 'calm';
  const attentionIcon = today.attention.kind === 'warning' ? (
    <AlertTriangle size={18} aria-hidden />
  ) : calm ? (
    <Leaf size={18} aria-hidden />
  ) : (
    <CheckSquare size={18} aria-hidden />
  );

  return (
    <section className="chrono-now" aria-labelledby="chrono-today-heading">
      <div className={`chrono-now-attention is-${today.attention.kind}`}>
        <p className="chrono-now-date" id="chrono-today-heading">
          {t('chronologio:today.heading', { date: dateLabel })}
        </p>
        <div className="chrono-now-copy">
          <span className="chrono-now-icon" aria-hidden>
            {attentionIcon}
          </span>
          <div>
            {calm ? (
              <h2>{t('chronologio:today.allClear')}</h2>
            ) : (
              <>
                <h2>{t(today.attention.titleKey, today.attention.titleParams)}</h2>
                <p>{t(today.attention.reasonKey, today.attention.reasonParams)}</p>
              </>
            )}
          </div>
        </div>
        <div className="chrono-now-actions">
          {calm ? null : (
            <button type="button" className="chrono-quiet-btn is-primary" onClick={runAttention}>
              {today.attention.action === 'open_task' || today.attention.action === 'tasks'
                ? t('chronologio:living.openTask')
                : today.attention.action === 'weather'
                  ? t('chronologio:today.seeConditions')
                  : t('chronologio:today.scheduleCheck')}
            </button>
          )}
          {today.work.length > 0 ? (
            <button type="button" className="chrono-quiet-btn" onClick={() => navigate('/tasks')}>
              {t('chronologio:today.workCount', { count: today.work.length })}
            </button>
          ) : null}
        </div>
      </div>

      <GroveWeatherCard
        fieldWeather={today.fieldWeather}
        snapshot={today.weather}
        fieldName={today.weatherField?.name}
        onOpen={onOpenWeather}
      />
    </section>
  );
};

export default TodaySummary;
