import React from 'react';
import { Task } from '../../services/taskService';
import { CheckCircle, Clock, AlertCircle, DollarSign, TrendingUp } from 'lucide-react';
import './FieldMonitoring.css';

interface FieldMonitoringProps {
  tasks: Task[];
}

const FieldMonitoring: React.FC<FieldMonitoringProps> = ({ tasks }) => {
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const totalCost = tasks
    .filter(t => t.status === 'completed' && t.cost)
    .reduce((sum, t) => sum + (t.cost || 0), 0);
  
  const averageCost = completedTasks > 0 ? totalCost / completedTasks : 0;
  
  const upcomingDeadlines = tasks
    .filter(t => t.status !== 'completed' && t.scheduledEnd)
    .filter(t => {
      const deadline = new Date(t.scheduledEnd!);
      const daysUntil = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7 && daysUntil >= 0;
    })
    .length;

  const recentTasks = tasks
    .filter(t => t.updatedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="field-monitoring">
      <h3>Field Monitoring</h3>
      
      <div className="monitoring-metrics">
        <div className="metric-card">
          <div className="metric-header">
            <CheckCircle className="metric-icon completed" />
            <span className="metric-label">Completion Rate</span>
          </div>
          <div className="metric-value">{completionRate.toFixed(1)}%</div>
          <div className="metric-detail">{completedTasks} of {totalTasks} tasks</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <DollarSign className="metric-icon info" />
            <span className="metric-label">Total Cost</span>
          </div>
          <div className="metric-value">${totalCost.toFixed(2)}</div>
          <div className="metric-detail">Avg: ${averageCost.toFixed(2)} per task</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <AlertCircle className="metric-icon warning" />
            <span className="metric-label">Upcoming Deadlines</span>
          </div>
          <div className="metric-value">{upcomingDeadlines}</div>
          <div className="metric-detail">Within 7 days</div>
        </div>
      </div>

      <div className="monitoring-status">
        <h4>Task Status</h4>
        <div className="status-breakdown">
          <div className="status-item">
            <CheckCircle className="status-icon completed" />
            <span className="status-label">Completed</span>
            <span className="status-count">{completedTasks}</span>
          </div>
          <div className="status-item">
            <Clock className="status-icon in-progress" />
            <span className="status-label">In Progress</span>
            <span className="status-count">{inProgressTasks}</span>
          </div>
          <div className="status-item">
            <AlertCircle className="status-icon pending" />
            <span className="status-label">Pending</span>
            <span className="status-count">{pendingTasks}</span>
          </div>
        </div>
      </div>

      {recentTasks.length > 0 && (
        <div className="monitoring-recent">
          <h4>Recent Activity</h4>
          <div className="recent-tasks">
            {recentTasks.map(task => (
              <div key={task.id} className="recent-task-item">
                <div className="recent-task-title">{task.title}</div>
                <div className="recent-task-meta">
                  <span className={`task-status-badge ${task.status}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className="recent-task-date">
                    {new Date(task.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldMonitoring;
