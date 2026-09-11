import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import type { FieldWorkPlanPreview, FieldWorkPlanPreviewItem, FieldWorkProfile } from '../../services/fieldWorkService';
import type { OnboardingStepId } from '../../utils/fieldWorkOnboardingSteps';
import {
  flattenPlanPreviewItems,
  groupPlanPreviewBySeason,
  planTaskTone,
  practiceCategoryToStep,
  skippedPlanItems,
  type PlanTaskTone,
} from '../../utils/fieldWorkPlanPreview';
import { buildWorkProfileAnswerRows } from '../../utils/fieldWorkProfileAnswers';
import { formatTaskDateRange } from '../../utils/taskDateRange';
import './FieldWorkPlanReview.css';

type TabId = 'answers' | 'year';

type Props = {
  profile: FieldWorkProfile | null;
  preview: FieldWorkPlanPreview;
  activating?: boolean;
  onChangeAnswer: (step: OnboardingStepId) => void;
  onAccept: () => void;
};

const FieldWorkPlanReview: React.FC<Props> = ({
  profile,
  preview,
  activating,
  onChangeAnswer,
  onAccept,
}) => {
  const { t, i18n } = useTranslation(['tasks', 'common']);
  const [tab, setTab] = useState<TabId>('year');
  const [showSkipped, setShowSkipped] = useState(false);

  const answers = buildWorkProfileAnswerRows(profile, (key, params) => t(key, params));
  const items = flattenPlanPreviewItems(preview);
  const seasons = groupPlanPreviewBySeason(items);
  const skipped = skippedPlanItems(items);
  const plannedCount = items.filter((item) => planTaskTone(item) !== 'skipped').length;

  const toneLabel = (tone: PlanTaskTone) =>
    t(`tasks:fieldWork.onboarding.planPreview.tone.${tone}`);

  const dateLabel = (item: FieldWorkPlanPreviewItem) =>
    formatTaskDateRange(item.windowStart, item.windowEnd, i18n.language);

  return (
    <div className="fw-review">
      <h1 className="fw-setup-question">
        {t('tasks:fieldWork.onboarding.planPreview.title', { year: preview.resultYear })}
      </h1>
      <p className="fw-setup-hint">
        {t('tasks:fieldWork.onboarding.planPreview.intro', { count: plannedCount })}
      </p>

      <div className="fw-review-tabs" role="tablist" aria-label={t('tasks:fieldWork.onboarding.planPreview.tabsAria')}>
        <span className={`fw-review-tab-ink is-${tab}`} aria-hidden />
        {(['year', 'answers'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`fw-review-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`fw-review-panel-${id}`}
            className={tab === id ? 'is-active' : undefined}
            onClick={() => setTab(id)}
          >
            {t(`tasks:fieldWork.onboarding.planPreview.tabs.${id}`)}
          </button>
        ))}
      </div>

      <div className="fw-review-stage">
        {tab === 'year' ? (
          <div
            key="year"
            className="fw-review-pane"
            id="fw-review-panel-year"
            role="tabpanel"
            aria-labelledby="fw-review-tab-year"
          >
            {seasons.map((group) => (
              <section key={group.key} className="fw-review-season">
                <h2 className="fw-review-season-title">
                  {t(`tasks:fieldWork.onboarding.planPreview.seasons.${group.key}`)}
                </h2>
                <ul className="fw-review-tasks">
                  {group.items.map((item) => {
                    const tone = planTaskTone(item);
                    const when = dateLabel(item);
                    return (
                      <li key={item.templateCode} className={`fw-review-task is-${tone}`}>
                        <div className="fw-review-task-body">
                          <div className="fw-review-task-title">{item.templateName}</div>
                          <p className="fw-review-task-meta">
                            {when ? <span>{when}</span> : null}
                            <span className={`fw-review-tone is-${tone}`}>{toneLabel(tone)}</span>
                          </p>
                        </div>
                        {item.practiceCategory !== 'other' ? (
                          <button
                            type="button"
                            className="fw-plan-row-change"
                            onClick={() => onChangeAnswer(practiceCategoryToStep(item.practiceCategory))}
                          >
                            {t('tasks:fieldWork.onboarding.planPreview.changeRow')}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {skipped.length > 0 ? (
              <section className="fw-review-skipped">
                <button
                  type="button"
                  className="fw-review-skipped-toggle"
                  aria-expanded={showSkipped}
                  onClick={() => setShowSkipped((open) => !open)}
                >
                  {t('tasks:fieldWork.onboarding.planPreview.skippedToggle', {
                    count: skipped.length,
                  })}
                </button>
                {showSkipped ? (
                  <ul className="fw-review-tasks">
                    {skipped.map((item) => (
                      <li key={item.templateCode} className="fw-review-task is-skipped">
                        <div className="fw-review-task-body">
                          <div className="fw-review-task-title">{item.templateName}</div>
                          <p className="fw-review-task-meta">
                            {dateLabel(item) ? <span>{dateLabel(item)}</span> : null}
                            <span className="fw-review-tone is-skipped">{toneLabel('skipped')}</span>
                          </p>
                        </div>
                        {item.practiceCategory !== 'other' ? (
                          <button
                            type="button"
                            className="fw-plan-row-change"
                            onClick={() => onChangeAnswer(practiceCategoryToStep(item.practiceCategory))}
                          >
                            {t('tasks:fieldWork.onboarding.planPreview.changeRow')}
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            <p className="fw-plan-footer">{t('tasks:fieldWork.onboarding.planPreview.footer')}</p>
          </div>
        ) : (
          <div
            key="answers"
            className="fw-review-pane"
            id="fw-review-panel-answers"
            role="tabpanel"
            aria-labelledby="fw-review-tab-answers"
          >
            <ul className="fw-review-answers">
              {answers.map((row) => (
                <li key={row.id} className="fw-review-answer">
                  <div className="fw-review-answer-body">
                    <h2>{t(row.titleKey)}</h2>
                    {row.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="fw-plan-row-change"
                    onClick={() => onChangeAnswer(row.step)}
                  >
                    {t('tasks:fieldWork.onboarding.planPreview.changeRow')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="fw-setup-actions">
        <Button variant="primary" size="lg" fullWidth disabled={activating} onClick={onAccept}>
          {activating
            ? t('tasks:fieldWork.onboarding.planPreview.activating')
            : t('tasks:fieldWork.onboarding.planPreview.usePlan')}
        </Button>
        <Button variant="outline" size="lg" fullWidth disabled={activating} onClick={() => setTab('answers')}>
          {t('tasks:fieldWork.onboarding.planPreview.changes')}
        </Button>
      </div>
    </div>
  );
};

export default FieldWorkPlanReview;
