import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import Badge from '../components/Common/Badge';
import EmptyState from '../components/Common/EmptyState';
import { demoStore } from '../services/demo/demoStore';
import { getTaskService } from '../services/serviceFactory';
import './ApprovalsPage.css';

const getUserName = (id?: string) => {
  if (!id) return 'Unassigned';
  demoStore.ensureSeeded();
  const u = demoStore.getUsers().find((x) => x.id === id);
  if (!u) return id;
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return name || u.email;
};

const ApprovalsPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || '';
  const userId = user?.userId;

  const [fieldFilter, setFieldFilter] = useState<string>('all');
  const [producerFilter, setProducerFilter] = useState<string>('all');

  const { fields, tasks, producers } = useMemo(() => {
    demoStore.ensureSeeded();
    const fields = demoStore.getFields();
    const tasks = demoStore.getTasks();
    const producers = demoStore.getUsers().filter((u) => u.role === 'Producer');
    return { fields, tasks, producers };
  }, []);

  const pending = useMemo(() => {
    let list = tasks.filter((t) => t.status === 'completed' && t.approvalStatus === 'pending');
    if (fieldFilter !== 'all') list = list.filter((t) => t.fieldId === fieldFilter);
    if (producerFilter !== 'all') list = list.filter((t) => t.assignedTo === producerFilter);
    list.sort((a, b) => {
      const ad = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bd = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bd - ad;
    });
    return list;
  }, [tasks, fieldFilter, producerFilter]);

  const approve = async (taskId: string) => {
    const svc: any = getTaskService();
    if (typeof svc.approveTask === 'function') {
      await svc.approveTask(taskId, 'Approved');
      if (userId) demoStore.markDemoStep(userId, role, 'owner_approve_task');
      window.location.reload();
    }
  };

  const reject = async (taskId: string) => {
    const svc: any = getTaskService();
    if (typeof svc.rejectTask === 'function') {
      await svc.rejectTask(taskId, 'Please add more detail/evidence');
      window.location.reload();
    }
  };

  useEffect(() => {
    if (!userId) return;
    demoStore.markDemoStep(userId, role, 'owner_visit_approvals');
  }, [role, userId]);

  if (role !== 'FieldOwner' && role !== 'Administrator') {
    return (
      <PageContainer>
        <EmptyState title="Approvals are for Owners" description="Log in as a Field Owner to review approvals." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="approvals-page">
        <Breadcrumbs />

        <div className="approvals-header">
          <div>
            <h1>Approvals Inbox</h1>
            <p className="approvals-subtitle">Review completed work from producers and approve or request changes</p>
          </div>
          <Badge variant={pending.length > 0 ? 'warning' : 'success'} size="md">
            {pending.length} pending
          </Badge>
        </div>

        <Card title="Filters" padding="md">
          <div className="approvals-filters">
            <div className="approvals-filter">
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
            <div className="approvals-filter">
              <label>Producer</label>
              <select value={producerFilter} onChange={(e) => setProducerFilter(e.target.value)}>
                <option value="all">All producers</option>
                {producers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getUserName(p.id)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card title="Pending approvals" subtitle="Fast review mode" padding="md">
          {pending.length === 0 ? (
            <EmptyState title="No pending approvals" description="You’re all caught up." />
          ) : (
            <div className="approvals-list">
              {pending.map((t) => {
                const field = fields.find((f) => f.id === t.fieldId);
                const preview = (t.evidence || []).find((e) => !!e.photoUrl)?.photoUrl;
                return (
                  <div key={t.id} className="approvals-item">
                    <div className="approvals-item-left">
                      {preview ? (
                        <img className="approvals-preview" src={preview} alt="Evidence preview" />
                      ) : (
                        <div className="approvals-preview placeholder">No photo</div>
                      )}
                      <div className="approvals-item-main">
                        <div className="approvals-item-title">{t.title}</div>
                        <div className="approvals-item-meta">
                          <Badge size="sm" variant="info">pending</Badge>
                          <span><strong>Field:</strong> {field?.name || t.fieldId}</span>
                          <span><strong>Producer:</strong> {getUserName(t.assignedTo)}</span>
                          <span><strong>Evidence:</strong> {(t.evidence || []).length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="approvals-item-actions">
                      <Button variant="success" size="sm" onClick={() => approve(t.id)}>
                        Approve
                      </Button>
                      <Button variant="error" size="sm" onClick={() => reject(t.id)}>
                        Reject
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => (window.location.href = `/fields/${t.fieldId}`)}>
                        Open field
                      </Button>
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

export default ApprovalsPage;

