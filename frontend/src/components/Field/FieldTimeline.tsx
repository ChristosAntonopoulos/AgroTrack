import React, { useEffect, useMemo, useState } from 'react';
import Card from '../Common/Card';
import Badge from '../Common/Badge';
import { demoStore, DemoEvent } from '../../services/demo/demoStore';
import { activityService, Activity } from '../../services/activityService';
import { isMockMode } from '../../services/serviceFactory';
import { formatDistanceToNow } from 'date-fns';
import './FieldTimeline.css';

type Props = {
  fieldId: string;
  limit?: number;
};

type Filter = 'all' | DemoEvent['type'] | string;

const labelForType: Record<string, string> = {
  task_status_changed: 'Task',
  evidence_added: 'Evidence',
  task_assigned: 'Assignment',
  task_approved: 'Approval',
  task_rejected: 'Approval',
  producer_assigned: 'Crew',
  producer_unassigned: 'Crew',
  lifecycle_stage_changed: 'Lifecycle',
  lifecycle_year_changed: 'Lifecycle',
  expense_logged: 'Cost',
  expense_updated: 'Cost',
  expense_voided: 'Cost',
  income_logged: 'Income',
  harvest_recorded: 'Harvest',
};

const variantForType = (t: string) => {
  switch (t) {
    case 'task_rejected':
      return 'error';
    case 'task_approved':
      return 'success';
    case 'evidence_added':
      return 'info';
    case 'producer_assigned':
    case 'producer_unassigned':
      return 'primary';
    case 'lifecycle_stage_changed':
    case 'lifecycle_year_changed':
    case 'expense_logged':
    case 'income_logged':
    case 'harvest_recorded':
      return 'info';
    case 'expense_voided':
      return 'error';
    default:
      return 'warning';
  }
};

const FieldTimeline: React.FC<Props> = ({ fieldId, limit = 15 }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [apiEvents, setApiEvents] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(!isMockMode());

  useEffect(() => {
    if (isMockMode()) return;
    const load = async () => {
      try {
        setLoading(true);
        const data = await activityService.getByFieldId(fieldId, limit);
        setApiEvents(data);
      } catch {
        setApiEvents([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [fieldId, limit]);

  const events = useMemo(() => {
    if (isMockMode()) {
      demoStore.ensureSeeded();
      const all = demoStore.getEvents().filter((e) => e.fieldId === fieldId);
      const filtered = filter === 'all' ? all : all.filter((e) => e.type === filter);
      return filtered
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    }

    const mapped = apiEvents.map((e) => ({
      id: e.id,
      type: e.type,
      timestamp: e.timestamp,
      message: e.message,
    }));
    const filtered = filter === 'all' ? mapped : mapped.filter((e) => e.type === filter);
    return filtered.slice(0, limit);
  }, [fieldId, filter, limit, apiEvents]);

  return (
    <Card
      className="ftl"
      title="Activity Timeline"
      subtitle="A living log of what happened on this field"
      padding="md"
    >
      <div className="ftl-filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="all">All events</option>
          <option value="task_status_changed">Task changes</option>
          <option value="evidence_added">Evidence</option>
          <option value="task_assigned">Assignments</option>
          <option value="lifecycle_stage_changed">Stage changes</option>
          <option value="lifecycle_year_changed">Year changes</option>
          <option value="producer_assigned">Crew changes</option>
          <option value="producer_unassigned">Crew removals</option>
        </select>
      </div>

      {loading ? (
        <div className="ftl-empty">Loading activity...</div>
      ) : events.length === 0 ? (
        <div className="ftl-empty">No activity yet.</div>
      ) : (
        <div className="ftl-list">
          {events.map((e) => (
            <div key={e.id} className="ftl-item">
              <div className="ftl-badge">
                <Badge variant={variantForType(e.type) as any} size="sm">
                  {labelForType[e.type] || e.type}
                </Badge>
              </div>
              <div className="ftl-content">
                <div className="ftl-message">{'message' in e ? e.message : ''}</div>
                <div className="ftl-time">{formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default FieldTimeline;
