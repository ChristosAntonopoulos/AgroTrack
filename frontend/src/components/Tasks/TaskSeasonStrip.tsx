import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TaskSeasonStripProps {
  seasonLabel: string;
  attentionCount: number;
  suitableTodayCount: number;
  summaryLabel: string;
  chronologioTo: string;
}

const TaskSeasonStrip: React.FC<TaskSeasonStripProps> = ({
  seasonLabel,
  attentionCount,
  suitableTodayCount,
  summaryLabel,
  chronologioTo,
}) => {
  const { t } = useTranslation('tasks');
  return (
    <Link to={chronologioTo} className="tasks-season-strip">
      <div className="tasks-season-strip-main">
        <span className="tasks-season-strip-kicker">{t('fieldWork.views.now')}</span>
        <strong className="tasks-season-strip-season">{seasonLabel}</strong>
        <span className="tasks-season-strip-summary">
          {summaryLabel
            .replace('{{attention}}', String(attentionCount))
            .replace('{{suitable}}', String(suitableTodayCount))}
        </span>
      </div>
      <ChevronRight size={20} aria-hidden className="tasks-season-strip-chevron" />
    </Link>
  );
};

export default TaskSeasonStrip;
