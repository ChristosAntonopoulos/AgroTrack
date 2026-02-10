import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAnalyticsService } from '../services/serviceFactory';
import { getFieldService } from '../services/serviceFactory';
import { DateRange, TaskMetrics, FieldMetrics, CostAnalysis, CompletionRates, TaskStatusDistribution } from '../services/analyticsService';
import { Field } from '../services/fieldService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import StatsCard from '../components/Common/StatsCard';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import LineChart from '../components/Analytics/LineChart';
import BarChart from '../components/Analytics/BarChart';
import PieChart from '../components/Analytics/PieChart';
import { TrendingUp, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { subDays, subMonths, subWeeks, startOfDay, endOfDay, format } from 'date-fns';
import './AnalyticsPage.css';

type TimePeriod = 'week' | 'month' | 'quarter' | 'year';

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfDay(subMonths(new Date(), 1)),
    end: endOfDay(new Date()),
  });
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics | null>(null);
  const [fieldMetrics, setFieldMetrics] = useState<FieldMetrics[]>([]);
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis | null>(null);
  const [completionRates, setCompletionRates] = useState<CompletionRates | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<TaskStatusDistribution | null>(null);

  useEffect(() => {
    loadFields();
  }, []);

  useEffect(() => {
    updateDateRange();
  }, [timePeriod]);

  useEffect(() => {
    if (fields.length > 0) {
      setSelectedFields(fields.map(f => f.id));
    }
  }, [fields]);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, selectedFields]);

  const updateDateRange = () => {
    const now = new Date();
    let start: Date;

    switch (timePeriod) {
      case 'week':
        start = startOfDay(subWeeks(now, 1));
        break;
      case 'month':
        start = startOfDay(subMonths(now, 1));
        break;
      case 'quarter':
        start = startOfDay(subMonths(now, 3));
        break;
      case 'year':
        start = startOfDay(subMonths(now, 12));
        break;
      default:
        start = startOfDay(subMonths(now, 1));
    }

    setDateRange({
      start,
      end: endOfDay(now),
    });
  };

  const loadFields = async () => {
    try {
      const fieldService = getFieldService();
      const fieldsData = await fieldService.getFields();
      setFields(fieldsData);
    } catch (error) {
      console.error('Error loading fields:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const analyticsService = getAnalyticsService();

      const [metrics, fieldMetricsData, costData, completionData, statusData] = await Promise.all([
        analyticsService.getTaskMetrics(dateRange),
        analyticsService.getFieldMetrics(selectedFields, dateRange),
        analyticsService.getCostAnalysis(dateRange),
        analyticsService.getCompletionRates(dateRange),
        analyticsService.getTaskStatusDistribution(dateRange),
      ]);

      setTaskMetrics(metrics);
      setFieldMetrics(fieldMetricsData);
      setCostAnalysis(costData);
      setCompletionRates(completionData);
      setStatusDistribution(statusData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'FieldOwner' && user?.role !== 'Administrator') {
    return (
      <PageContainer>
        <div className="analytics-page">
          <Breadcrumbs />
          <div className="error-message">You do not have permission to view analytics.</div>
        </div>
      </PageContainer>
    );
  }

  const statusDistributionData = statusDistribution ? [
    { name: 'Pending', value: statusDistribution.pending },
    { name: 'In Progress', value: statusDistribution.inProgress },
    { name: 'Completed', value: statusDistribution.completed },
  ] : [];

  const costByFieldData = costAnalysis?.costByField.map(item => ({
    name: item.fieldName,
    cost: item.cost,
  })) || [];

  const costByTaskTypeData = costAnalysis?.costByTaskType.map(item => ({
    name: item.type,
    cost: item.cost,
  })) || [];

  const completionRateData = completionRates?.monthly.map(item => ({
    month: format(new Date(item.month + '-01'), 'MMM yyyy'),
    rate: item.rate,
  })) || [];

  return (
    <PageContainer>
      <div className="analytics-page">
        <Breadcrumbs />
        
        <div className="analytics-header">
          <h1>Analytics Dashboard</h1>
          <div className="time-period-selector">
            <Button
              variant={timePeriod === 'week' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTimePeriod('week')}
            >
              Week
            </Button>
            <Button
              variant={timePeriod === 'month' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTimePeriod('month')}
            >
              Month
            </Button>
            <Button
              variant={timePeriod === 'quarter' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTimePeriod('quarter')}
            >
              Quarter
            </Button>
            <Button
              variant={timePeriod === 'year' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTimePeriod('year')}
            >
              Year
            </Button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
        <>
          <div className="metrics-grid">
            <StatsCard
              title="Total Tasks"
              value={taskMetrics?.total || 0}
              icon={<CheckCircle />}
              color="primary"
            />
            <StatsCard
              title="Completion Rate"
              value={`${taskMetrics?.completionRate.toFixed(1) || 0}%`}
              icon={<TrendingUp />}
              color="success"
            />
            <StatsCard
              title="Total Cost"
              value={`$${costAnalysis?.totalCost.toFixed(2) || '0.00'}`}
              icon={<DollarSign />}
              color="info"
            />
            <StatsCard
              title="Avg. Completion Time"
              value={`${taskMetrics?.averageCompletionTime.toFixed(1) || 0} days`}
              icon={<Clock />}
              color="warning"
            />
          </div>

          <div className="charts-grid">
            <div className="chart-row">
              <PieChart
                data={statusDistributionData}
                title="Task Status Distribution"
              />
              <BarChart
                data={costByFieldData}
                xAxisKey="name"
                bars={[{ dataKey: 'cost', name: 'Cost', color: '#2d5016' }]}
                title="Cost by Field"
              />
            </div>

            <div className="chart-row">
              <BarChart
                data={costByTaskTypeData}
                xAxisKey="name"
                bars={[{ dataKey: 'cost', name: 'Cost', color: '#4a7c2a' }]}
                title="Cost by Task Type"
              />
              <LineChart
                data={completionRateData}
                dataKey="rate"
                xAxisKey="month"
                lines={[{ dataKey: 'rate', name: 'Completion Rate (%)', color: '#28a745' }]}
                title="Monthly Completion Rate"
              />
            </div>
          </div>

          {fieldMetrics.length > 0 && (
            <div className="field-metrics-table">
              <h2>Field Performance</h2>
              <table>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Total Tasks</th>
                    <th>Completed</th>
                    <th>Completion Rate</th>
                    <th>Total Cost</th>
                    <th>Avg Cost/Task</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldMetrics.map(metric => (
                    <tr key={metric.fieldId}>
                      <td>{metric.fieldName}</td>
                      <td>{metric.totalTasks}</td>
                      <td>{metric.completedTasks}</td>
                      <td>{metric.completionRate.toFixed(1)}%</td>
                      <td>${metric.totalCost.toFixed(2)}</td>
                      <td>${metric.averageCostPerTask.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      </div>
    </PageContainer>
  );
};

export default AnalyticsPage;
