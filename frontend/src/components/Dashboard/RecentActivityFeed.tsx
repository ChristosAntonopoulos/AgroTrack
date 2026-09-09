import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { el, enUS, it } from 'date-fns/locale';
import Card from '../Common/Card';
import type { MeDashboardActivity } from '../../services/meDashboardService';
import './DashboardWidgets.css';

export interface RecentActivityFeedProps {
  activities: MeDashboardActivity[];
  limit?: number;
  fieldNames?: Record<string, string>;
  showSeeMore?: boolean;
}

const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  activities,
  limit = 3,
  fieldNames = {},
  showSeeMore = false,
}) => {
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();
  const locale = i18n.language?.startsWith('el') ? el : i18n.language?.startsWith('it') ? it : enUS;
  const items = activities.slice(0, limit);

  return (
    <section className="recent-activity-feed" aria-label={t('myActions.recentTitle')}>
      <div className="recent-activity-header">
        <h2 className="dashboard-section-label">{t('myActions.recentTitle')}</h2>
        {showSeeMore && (
          <button
            type="button"
            className="recent-activity-more"
            onClick={() => navigate('/fields')}
          >
            {t('myActions.seeMore')}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <Card className="recent-activity-empty">
          <p>{t('myActions.recentEmpty')}</p>
        </Card>
      ) : (
        <ul className="recent-activity-list">
          {items.map((act) => {
            const target = act.taskId
              ? `/tasks/${act.taskId}`
              : act.fieldId
                ? `/fields/${act.fieldId}`
                : '/fields';
            return (
              <li key={act.id}>
                <button
                  type="button"
                  className="recent-activity-row"
                  onClick={() => navigate(target)}
                >
                  <span className="recent-activity-message">{act.message}</span>
                  <span className="recent-activity-meta">
                    {fieldNames[act.fieldId] ? `${fieldNames[act.fieldId]} · ` : ''}
                    {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true, locale })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default RecentActivityFeed;
