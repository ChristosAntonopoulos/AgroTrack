import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import Badge from '../components/Common/Badge';
import EmptyState from '../components/Common/EmptyState';
import { demoStore, DemoIssueStatus, DemoIssueSeverity, DemoIssueType } from '../services/demo/demoStore';
import { getTaskService } from '../services/serviceFactory';
import './IssuesPage.css';

const getUserName = (id?: string) => {
  if (!id) return 'Unknown';
  demoStore.ensureSeeded();
  const u = demoStore.getUsers().find((x) => x.id === id);
  if (!u) return id;
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return name || u.email;
};

const IssuesPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || '';

  const [fieldFilter, setFieldFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | DemoIssueSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DemoIssueStatus>('all');

  const { fields, producers, issues } = useMemo(() => {
    demoStore.ensureSeeded();
    return {
      fields: demoStore.getFields(),
      producers: demoStore.getUsers().filter((u) => u.role === 'Producer'),
      issues: demoStore.getIssues(),
    };
  }, []);

  const filtered = useMemo(() => {
    let list = issues.slice();
    if (fieldFilter !== 'all') list = list.filter((i) => i.fieldId === fieldFilter);
    if (severityFilter !== 'all') list = list.filter((i) => i.severity === severityFilter);
    if (statusFilter !== 'all') list = list.filter((i) => i.status === statusFilter);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [issues, fieldFilter, severityFilter, statusFilter]);

  const markResolved = (issueId: string) => {
    demoStore.updateIssueStatus(issueId, 'Resolved', user?.userId);
    window.location.reload();
  };

  const createFollowUpTask = async (issueId: string, producerId: string) => {
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) return;
    const svc = getTaskService();

    const type: string = issue.type === 'Leak' ? 'Irrigation' : issue.type === 'Pest' ? 'Pest Control' : 'Soil Testing';
    const title = issue.type === 'Leak' ? `Fix irrigation leak - ${issue.fieldId}` : `Follow up: ${issue.title}`;
    await svc.createTask({
      fieldId: issue.fieldId,
      type,
      title,
      description: `Follow-up for issue (${issue.severity} ${issue.type}): ${issue.description}`,
      lifecycleYear: 'low',
      assignedTo: producerId,
      scheduledStart: new Date().toISOString(),
      scheduledEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    } as any);

    demoStore.updateIssueStatus(issueId, 'InProgress', user?.userId);
    window.location.reload();
  };

  if (role !== 'FieldOwner' && role !== 'Administrator') {
    return (
      <PageContainer>
        <EmptyState title="Issues are for Owners" description="Log in as a Field Owner to triage issues." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="issues-page">
        <Breadcrumbs />

        <div className="issues-header">
          <div>
            <h1>Issues</h1>
            <p className="issues-subtitle">Triage incidents and create follow-up work orders</p>
          </div>
          <Badge variant={filtered.some((i) => i.status === 'Open') ? 'warning' : 'success'} size="md">
            {filtered.filter((i) => i.status === 'Open').length} open
          </Badge>
        </div>

        <Card title="Filters" padding="md">
          <div className="issues-filters">
            <div className="issues-filter">
              <label>Field</label>
              <select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)}>
                <option value="all">All fields</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="issues-filter">
              <label>Severity</label>
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as any)}>
                <option value="all">All</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="issues-filter">
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="all">All</option>
                <option value="Open">Open</option>
                <option value="InProgress">In progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="Inbox" subtitle="Open issues first, then in progress" padding="md">
          {filtered.length === 0 ? (
            <EmptyState title="No issues" description="Great—nothing to triage right now." />
          ) : (
            <div className="issues-list">
              {filtered.map((i) => {
                const field = fields.find((f) => f.id === i.fieldId);
                const preview = i.photoUrls?.[0];
                return (
                  <div key={i.id} className="issues-item">
                    <div className="issues-item-left">
                      {preview ? <img className="issues-preview" src={preview} alt="Issue preview" /> : <div className="issues-preview placeholder">No photo</div>}
                      <div className="issues-main">
                        <div className="issues-title">{i.title}</div>
                        <div className="issues-meta">
                          <Badge size="sm" variant={i.severity === 'High' ? 'error' : i.severity === 'Medium' ? 'warning' : 'info'}>
                            {i.severity}
                          </Badge>
                          <Badge size="sm" variant="primary">{i.type}</Badge>
                          <Badge size="sm" variant={i.status === 'Open' ? 'warning' : i.status === 'Resolved' ? 'success' : 'info'}>
                            {i.status}
                          </Badge>
                          <span><strong>Field:</strong> {field?.name || i.fieldId}</span>
                          <span><strong>Reported by:</strong> {getUserName(i.createdByUserId)}</span>
                        </div>
                        <div className="issues-desc">{i.description}</div>
                      </div>
                    </div>

                    <div className="issues-actions">
                      <Button size="sm" variant="outline" onClick={() => (window.location.href = `/fields/${i.fieldId}`)}>
                        Open field
                      </Button>

                      {i.status !== 'Resolved' ? (
                        <Button size="sm" variant="success" onClick={() => markResolved(i.id)}>
                          Mark resolved
                        </Button>
                      ) : null}

                      {i.status !== 'Resolved' ? (
                        <div className="issues-followup">
                          <select defaultValue="" onChange={(e) => createFollowUpTask(i.id, e.target.value)} >
                            <option value="" disabled>Create follow-up task…</option>
                            {producers.map((p) => (
                              <option key={p.id} value={p.id}>
                                Assign to {getUserName(p.id)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};

export default IssuesPage;

