import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../Common/Card';
import Button from '../Common/Button';
import Badge from '../Common/Badge';
import { demoStore, DemoStepKey } from '../../services/demo/demoStore';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Sparkles, ChevronRight } from 'lucide-react';
import './DemoTourPanel.css';

type Props = {
  userId: string;
  role: string;
  onClose?: () => void;
};

type Step = {
  key: DemoStepKey;
  labelKey: string;
  hintKey: string;
  actionLabelKey: string;
  action: () => void;
};

const DemoTourPanel: React.FC<Props> = ({ userId, role, onClose }) => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const progress = demoStore.getDemoProgress(userId, role);

  useEffect(() => {
    demoStore.ensureSeeded();
    const events = demoStore.getEvents();

    if (role === 'Producer') {
      const started = events.some(
        (e) => e.type === 'task_status_changed' && e.actorUserId === userId && e.message.startsWith('Task started')
      );
      const evidence = events.some((e) => e.type === 'evidence_added' && e.actorUserId === userId);
      if (started) demoStore.markDemoStep(userId, role, 'producer_start_task');
      if (evidence) demoStore.markDemoStep(userId, role, 'producer_add_evidence');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role]);

  const steps: Step[] = useMemo(() => {
    if (role === 'Producer') {
      return [
        {
          key: 'producer_visit_today',
          labelKey: 'onboarding.producer.step1.label',
          hintKey: 'onboarding.producer.step1.hint',
          actionLabelKey: 'onboarding.producer.step1.action',
          action: () => navigate('/chronologio?focus=today'),
        },
        {
          key: 'producer_start_task',
          labelKey: 'onboarding.producer.step2.label',
          hintKey: 'onboarding.producer.step2.hint',
          actionLabelKey: 'onboarding.producer.step2.action',
          action: () => navigate('/fields'),
        },
        {
          key: 'producer_add_evidence',
          labelKey: 'onboarding.producer.step3.label',
          hintKey: 'onboarding.producer.step3.hint',
          actionLabelKey: 'onboarding.producer.step3.action',
          action: () => navigate('/fields'),
        },
      ];
    }

    return [
      {
        key: 'owner_visit_calendar',
        labelKey: 'onboarding.owner.step1.label',
        hintKey: 'onboarding.owner.step1.hint',
        actionLabelKey: 'onboarding.owner.step1.action',
        action: () => navigate('/this-harvest'),
      },
      {
        key: 'owner_schedule_template',
        labelKey: 'onboarding.owner.step2.label',
        hintKey: 'onboarding.owner.step2.hint',
        actionLabelKey: 'onboarding.owner.step2.action',
        action: () => navigate('/fields'),
      },
      {
        key: 'owner_view_timeline',
        labelKey: 'onboarding.owner.step3.label',
        hintKey: 'onboarding.owner.step3.hint',
        actionLabelKey: 'onboarding.owner.step3.action',
        action: () => navigate('/fields'),
      },
    ];
  }, [navigate, role]);

  const completed = steps.filter((s) => progress.steps[s.key]).length;
  const total = steps.length;
  const currentStep = steps.find((s) => !progress.steps[s.key]) ?? null;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = completed === total;

  return (
    <Card className="onboarding-panel" padding="none">
      <div className="onboarding-header">
        <div className="onboarding-header-left">
          <div className="onboarding-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="onboarding-title">{t('onboarding.title')}</div>
            <div className="onboarding-subtitle">{t('onboarding.subtitle')}</div>
          </div>
        </div>
        <div className="onboarding-header-right">
          <Badge variant={allDone ? 'success' : 'info'} size="sm">
            {completed}/{total}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              demoStore.dismissDemoTour(userId, role, true);
              onClose?.();
            }}
          >
            {t('onboarding.dismiss')}
          </Button>
        </div>
      </div>

      <div className="onboarding-progress-bar">
        <div className="onboarding-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {allDone ? (
        <div className="onboarding-complete">
          <CheckCircle2 size={32} className="onboarding-complete-icon" />
          <h3>{t('onboarding.completeTitle')}</h3>
          <p>{t('onboarding.completeHint')}</p>
        </div>
      ) : currentStep ? (
        <div className="onboarding-current">
          <div className="onboarding-step-number">
            {t('onboarding.stepOf', { current: completed + 1, total })}
          </div>
          <h3 className="onboarding-current-label">{t(currentStep.labelKey)}</h3>
          <p className="onboarding-current-hint">{t(currentStep.hintKey)}</p>
          <Button variant="primary" icon={<ChevronRight size={16} />} onClick={currentStep.action}>
            {t(currentStep.actionLabelKey)}
          </Button>
        </div>
      ) : null}

      <div className="onboarding-checklist">
        {steps.map((s, index) => {
          const done = progress.steps[s.key];
          const isCurrent = !done && s.key === currentStep?.key;
          return (
            <div
              key={s.key}
              className={`onboarding-check-item ${done ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
            >
              {done ? (
                <CheckCircle2 size={18} className="onboarding-check-icon done" />
              ) : (
                <Circle size={18} className="onboarding-check-icon" />
              )}
              <span className="onboarding-check-label">
                {index + 1}. {t(s.labelKey)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default DemoTourPanel;
