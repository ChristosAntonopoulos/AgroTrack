import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFieldService } from '../services/serviceFactory';
import { getTaskService } from '../services/serviceFactory';
import { getAnalyticsService } from '../services/serviceFactory';
import { exportService } from '../services/exportService';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { Download, FileText, File, FileMinus } from 'lucide-react';
import { subMonths, startOfDay, endOfDay, format as formatDate } from 'date-fns';
import './ReportsPage.css';

type ReportType = 'field-summary' | 'task-completion' | 'cost-analysis' | 'lifecycle-progress' | 'producer-performance' | 'annual-summary';
type ExportFormat = 'pdf' | 'excel' | 'csv';

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<ReportType>('field-summary');
  const [startDate, setStartDate] = useState(formatDate(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(formatDate(new Date(), 'yyyy-MM-dd'));
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadFields();
  }, []);

  useEffect(() => {
    if (fields.length > 0) {
      setSelectedFields(fields.map(f => f.id));
    }
  }, [fields]);

  useEffect(() => {
    if (selectedFields.length > 0) {
      loadTasks();
    }
  }, [selectedFields, startDate, endDate]);

  const loadFields = async () => {
    try {
      const fieldService = getFieldService();
      const fieldsData = await fieldService.getFields();
      setFields(fieldsData);
    } catch (error) {
      console.error('Error loading fields:', error);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const taskService = getTaskService();
      const allTasks = await taskService.getTasks();
      
      const filteredTasks = allTasks.filter(task => {
        if (!task.createdAt) return false;
        const taskDate = new Date(task.createdAt);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return taskDate >= start && taskDate <= end && selectedFields.includes(task.fieldId);
      });
      
      setTasks(filteredTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const generateReport = async (format: ExportFormat) => {
    try {
      setGenerating(true);
      const filename = `${reportType}-${formatDate(new Date(), 'yyyy-MM-dd')}`;

      switch (reportType) {
        case 'field-summary':
          await generateFieldSummaryReport(format, filename);
          break;
        case 'task-completion':
          await generateTaskCompletionReport(format, filename);
          break;
        case 'cost-analysis':
          await generateCostAnalysisReport(format, filename);
          break;
        default:
          alert('Report type not yet implemented');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const generateFieldSummaryReport = async (format: ExportFormat, filename: string) => {
    const headers = ['Field Name', 'Area (ha)', 'Variety', 'Lifecycle Year', 'Total Tasks', 'Completed Tasks', 'Completion Rate'];
    const rows = fields
      .filter(f => selectedFields.includes(f.id))
      .map(field => {
        const fieldTasks = tasks.filter(t => t.fieldId === field.id);
        const completed = fieldTasks.filter(t => t.status === 'completed').length;
        return [
          field.name,
          field.area,
          field.variety || 'N/A',
          field.currentLifecycleYear,
          fieldTasks.length,
          completed,
          fieldTasks.length > 0 ? `${((completed / fieldTasks.length) * 100).toFixed(1)}%` : '0%',
        ];
      });

    const data = { headers, rows, title: 'Field Summary Report' };
    
    if (format === 'csv') {
      exportService.exportToCSV(data, filename);
    } else if (format === 'excel') {
      exportService.exportToExcel(data, filename);
    } else {
      exportService.exportTableToPDF(data, filename);
    }
  };

  const generateTaskCompletionReport = async (format: ExportFormat, filename: string) => {
    const headers = ['Task Title', 'Field', 'Type', 'Status', 'Assigned To', 'Scheduled Start', 'Scheduled End', 'Actual End'];
    const rows = tasks.map(task => {
      const field = fields.find(f => f.id === task.fieldId);
      return [
        task.title,
        field?.name || 'Unknown',
        task.type,
        task.status,
        task.assignedTo || 'Unassigned',
        task.scheduledStart ? formatDate(new Date(task.scheduledStart), 'yyyy-MM-dd') : 'N/A',
        task.scheduledEnd ? formatDate(new Date(task.scheduledEnd), 'yyyy-MM-dd') : 'N/A',
        task.actualEnd ? formatDate(new Date(task.actualEnd), 'yyyy-MM-dd') : 'N/A',
      ];
    });

    const data = { headers, rows, title: 'Task Completion Report' };
    
    if (format === 'csv') {
      exportService.exportToCSV(data, filename);
    } else if (format === 'excel') {
      exportService.exportToExcel(data, filename);
    } else {
      exportService.exportTableToPDF(data, filename);
    }
  };

  const generateCostAnalysisReport = async (format: ExportFormat, filename: string) => {
    const analyticsService = getAnalyticsService();
    const costAnalysis = await analyticsService.getCostAnalysis({
      start: startOfDay(new Date(startDate)),
      end: endOfDay(new Date(endDate)),
    });

    const headers = ['Field', 'Total Cost'];
    const rows = costAnalysis.costByField.map(item => [item.fieldName, `$${item.cost.toFixed(2)}`]);

    const data = { headers, rows, title: 'Cost Analysis Report' };
    
    if (format === 'csv') {
      exportService.exportToCSV(data, filename);
    } else if (format === 'excel') {
      exportService.exportToExcel(data, filename);
    } else {
      exportService.exportTableToPDF(data, filename);
    }
  };

  if (user?.role !== 'FieldOwner' && user?.role !== 'Administrator') {
    return (
      <PageContainer>
        <div className="reports-page">
          <Breadcrumbs />
          <div className="error-message">You do not have permission to generate reports.</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="reports-page">
        <Breadcrumbs />
      
      <div className="reports-header">
        <h1>Reports</h1>
      </div>

      <Card className="report-builder">
        <div className="report-config">
          <div className="config-section">
            <label>Report Type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
              <option value="field-summary">Field Summary</option>
              <option value="task-completion">Task Completion</option>
              <option value="cost-analysis">Cost Analysis</option>
              <option value="lifecycle-progress">Lifecycle Progress</option>
              <option value="producer-performance">Producer Performance</option>
              <option value="annual-summary">Annual Summary</option>
            </select>
          </div>

          <div className="config-section">
            <label>Date Range</label>
            <div className="date-inputs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="config-section">
            <label>Fields</label>
            <div className="field-checkboxes">
              {fields.map(field => (
                <label key={field.id} className="field-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.id)}
                    onChange={() => handleFieldToggle(field.id)}
                  />
                  <span>{field.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="export-buttons">
            <Button
              onClick={() => generateReport('pdf')}
              disabled={generating || selectedFields.length === 0}
              loading={generating}
              variant="primary"
              icon={<FileText />}
            >
              Export PDF
            </Button>
            <Button
              onClick={() => generateReport('excel')}
              disabled={generating || selectedFields.length === 0}
              loading={generating}
              variant="success"
              icon={<File />}
            >
              Export Excel
            </Button>
            <Button
              onClick={() => generateReport('csv')}
              disabled={generating || selectedFields.length === 0}
              loading={generating}
              variant="secondary"
              icon={<FileMinus />}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {loading && <LoadingSpinner />}
      </Card>
      </div>
    </PageContainer>
  );
};

export default ReportsPage;
