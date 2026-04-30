import React, { useMemo, useState } from 'react';
import Card from '../Common/Card';
import Badge from '../Common/Badge';
import { demoStore, DemoEvent } from '../../services/demo/demoStore';
import { formatDistanceToNow } from 'date-fns';
import './FieldTimeline.css';

type Props = {
  fieldId: string;
  limit?: number;
};

type Filter = 'all' | DemoEvent['type'];

const labelForType: Record<DemoEvent['type'], string> = {
  task_status_changed: 'Task',
  evidence_added: 'Evidence',
  task_assigned: 'Assignment',
  task_approved: 'Approval',
  task_rejected: 'Approval',
  producer_assigned: 'Crew',
  producer_unassigned: 'Crew',
};

const variantForType = (t: DemoEvent['type']) => {
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
    default:
      return 'warning';
  }
};

const FieldTimeline: React.FC<Props> = ({ fieldId, limit = 15 }) => {
  const [filter, setFilter] = useState<Filter>('all');

  const events = useMemo(() => {
    demoStore.ensureSeeded();
    const all = demoStore.getEvents().filter((e) => e.fieldId === fieldId);
    const filtered = filter === 'all' ? all : all.filter((e) => e.type === filter);
    return filtered
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }, [fieldId, filter, limit]);

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
          <option value="task_approved">Approvals</option>
          <option value="task_rejected">Rejections</option>
          <option value="producer_assigned">Crew changes</option>
          <option value="producer_unassigned">Crew removals</option>
        </select>
      </div>

      {events.length === 0 ? (
        <div className="ftl-empty">No activity yet.</div>
      ) : (
        <div className="ftl-list">
          {events.map((e) => (
            <div key={e.id} className="ftl-item">
              <div className="ftl-badge">
                <Badge size="sm" variant={variantForType(e.type) as any}>
                  {labelForType[e.type]}
                </Badge>
              </div>
              <div className="ftl-main">
                <div className="ftl-message">{e.message}</div>
                <div className="ftl-time">
                  {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default FieldTimeline;

