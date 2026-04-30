import React, { useEffect, useMemo } from 'react';
import Card from '../Common/Card';
import Button from '../Common/Button';
import Badge from '../Common/Badge';
import { demoStore, DemoStepKey } from '../../services/demo/demoStore';
import { useNavigate } from 'react-router-dom';
import './DemoTourPanel.css';

type Props = {
  userId: string;
  role: string;
  onClose?: () => void;
};

type Step = {
  key: DemoStepKey;
  label: string;
  hint: string;
  actionLabel?: string;
  action?: () => void;
};

const DemoTourPanel: React.FC<Props> = ({ userId, role, onClose }) => {
  const navigate = useNavigate();

  const progress = demoStore.getDemoProgress(userId, role);

  // Auto-check steps based on events.
  useEffect(() => {
    demoStore.ensureSeeded();
    const events = demoStore.getEvents();

    if (role === 'Producer') {
      const started = events.some((e) => e.type === 'task_status_changed' && e.actorUserId === userId && e.message.startsWith('Task started'));
      const evidence = events.some((e) => e.type === 'evidence_added' && e.actorUserId === userId);
      if (started) demoStore.markDemoStep(userId, role, 'producer_start_task');
      if (evidence) demoStore.markDemoStep(userId, role, 'producer_add_evidence');
    }

    if (role === 'FieldOwner' || role === 'Administrator') {
      const approved = events.some((e) => e.type === 'task_approved' && e.actorUserId === 'user1');
      if (approved) demoStore.markDemoStep(userId, role, 'owner_approve_task');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role]);

  const steps: Step[] = useMemo(() => {
    if (role === 'Producer') {
      return [
        {
          key: 'producer_visit_today',
          label: 'Open Today',
          hint: 'See your route and recommended next tasks.',
          actionLabel: 'Go to Today',
          action: () => navigate('/today'),
        },
        {
          key: 'producer_start_task',
          label: 'Start a task',
          hint: 'Use the Operations Board on a field to start work.',
          actionLabel: 'Open a field',
          action: () => navigate('/fields'),
        },
        {
          key: 'producer_add_evidence',
          label: 'Add evidence',
          hint: 'Attach a photo URL and a quick note.',
          actionLabel: 'Open a field',
          action: () => navigate('/fields'),
        },
      ];
    }

    return [
      {
        key: 'owner_visit_approvals',
        label: 'Open Approvals Inbox',
        hint: 'Review completed work from producers.',
        actionLabel: 'Go to Approvals',
        action: () => navigate('/approvals'),
      },
      {
        key: 'owner_approve_task',
        label: 'Approve a task',
        hint: 'Approve one item and watch the system update.',
        actionLabel: 'Go to Approvals',
        action: () => navigate('/approvals'),
      },
      {
        key: 'owner_view_timeline',
        label: 'See the timeline update',
        hint: 'Open any field and check the Activity Timeline.',
        actionLabel: 'Open Fields',
        action: () => navigate('/fields'),
      },
    ];
  }, [navigate, role]);

  const completed = steps.filter((s) => progress.steps[s.key]).length;
  const total = steps.length;

  return (
    <Card className="demo-tour" padding="md">
      <div className="demo-tour-header">
        <div>
          <div className="demo-tour-title">Try this next</div>
          <div className="demo-tour-subtitle">A quick path to the best parts of the demo</div>
        </div>
        <div className="demo-tour-right">
          <Badge variant={completed === total ? 'success' : 'info'} size="sm">
            {completed}/{total} done
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              demoStore.dismissDemoTour(userId, role, true);
              onClose?.();
            }}
          >
            Dismiss
          </Button>
        </div>
      </div>

      <div className="demo-tour-steps">
        {steps.map((s) => {
          const done = progress.steps[s.key];
          return (
            <div key={s.key} className={`demo-tour-step ${done ? 'done' : ''}`}>
              <div className="demo-tour-step-left">
                <div className="demo-tour-check">{done ? '✓' : ''}</div>
                <div>
                  <div className="demo-tour-step-label">{s.label}</div>
                  <div className="demo-tour-step-hint">{s.hint}</div>
                </div>
              </div>
              {s.action && s.actionLabel ? (
                <Button variant={done ? 'outline' : 'primary'} size="sm" onClick={s.action}>
                  {s.actionLabel}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      {completed === total ? (
        <div className="demo-tour-finish">
          You’ve completed the core demo flow. Try switching roles on the login page to see the shared world.
        </div>
      ) : null}
    </Card>
  );
};

export default DemoTourPanel;

