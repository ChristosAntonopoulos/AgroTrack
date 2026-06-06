import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCalendarService, getFieldService, getTaskService } from '../services/serviceFactory';
import { CalendarEvent, CalendarFilters } from '../services/calendarService';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { useAllLocalizedTemplates } from '../hooks/useLocalizedTaskTemplate';
import { getRecommendedForMonth } from '../utils/calendarRecommendations';
import { demoStore } from '../services/demo/demoStore';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import CalendarMonthView from '../components/Calendar/CalendarMonthView';
import CalendarDayView from '../components/Calendar/CalendarDayView';
import CalendarSeasonRibbon from '../components/Calendar/CalendarSeasonRibbon';
import CalendarFiltersComponent from '../components/Calendar/CalendarFilters';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import {
  addDays,
  addMonths,
  format,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Filter, LayoutGrid, Sparkles } from 'lucide-react';
import './CalendarPage.css';

type ViewMode = 'month' | 'day';

const CalendarPage: React.FC = () => {
  const { t, i18n } = useTranslation('calendar');
  const { user } = useAuth();
  const navigate = useNavigate();
  const localizedTemplates = useAllLocalizedTemplates();
  const dateLocale = i18n.language === 'el' ? el : enUS;

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldTasks, setFieldTasks] = useState<Task[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CalendarFilters>({
    showTasks: true,
    showLifecycles: false,
    showDeadlines: true,
  });
  const [showFilters, setShowFilters] = useState(false);

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;
  const visibleMonth = currentDate.getMonth() + 1;

  const recommended = useMemo(
    () =>
      getRecommendedForMonth(
        localizedTemplates,
        viewMode === 'day' ? selectedDate.getMonth() + 1 : visibleMonth,
        selectedField,
        fieldTasks,
        selectedFieldId || undefined
      ),
    [localizedTemplates, visibleMonth, selectedDate, viewMode, selectedField, fieldTasks, selectedFieldId]
  );

  useEffect(() => {
    loadFields();
    if (user?.userId && (user.role === 'FieldOwner' || user.role === 'Administrator')) {
      demoStore.markDemoStep(user.userId, user.role, 'owner_visit_calendar');
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [currentDate, selectedDate, viewMode, filters, selectedFieldId]);

  useEffect(() => {
    if (!selectedFieldId) {
      setFieldTasks([]);
      return;
    }
    getTaskService()
      .getTasks(selectedFieldId)
      .then(setFieldTasks)
      .catch(() => setFieldTasks([]));
  }, [selectedFieldId]);

  const loadFields = async () => {
    try {
      const fieldsData = await getFieldService().getFields();
      setFields(fieldsData);
      if (fieldsData.length > 0 && !selectedFieldId) {
        setSelectedFieldId(fieldsData[0].id);
      }
    } catch (error) {
      console.error('Error loading fields:', error);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const calendarService = getCalendarService();
      const rangeStart =
        viewMode === 'day' ? subDays(selectedDate, 1) : startOfMonth(currentDate);
      const rangeEnd =
        viewMode === 'day'
          ? addDays(selectedDate, 1)
          : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59);

      const fieldFilter: CalendarFilters = {
        ...filters,
        fieldIds: selectedFieldId ? [selectedFieldId] : filters.fieldIds,
      };

      const eventsData = await calendarService.getEvents(rangeStart, rangeEnd, fieldFilter);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      const next = subDays(selectedDate, 1);
      setSelectedDate(next);
      setCurrentDate(next);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      const next = addDays(selectedDate, 1);
      setSelectedDate(next);
      setCurrentDate(next);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setViewMode('day');
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.taskId) navigate(`/tasks/${event.taskId}`);
    else if (event.fieldId) navigate(`/fields/${event.fieldId}`);
  };

  const handleTemplateSelect = (templateId: string) => {
    if (!selectedFieldId) return;
    navigate(`/tasks/new?templateId=${templateId}&fieldId=${selectedFieldId}&month=${visibleMonth}`);
  };

  const headerLabel =
    viewMode === 'month'
      ? format(currentDate, 'MMMM yyyy', { locale: dateLocale })
      : format(selectedDate, 'd MMMM yyyy', { locale: dateLocale });

  return (
    <PageContainer>
      <div className="calendar-page-v2">
        <Breadcrumbs />

        <header className="calendar-page-v2-header">
          <div>
            <h1>{t('calendar:title')}</h1>
            <p className="calendar-page-v2-subtitle">{t('calendar:subtitle')}</p>
          </div>
          {user?.role === 'FieldOwner' && (
            <Button to="/tasks/new" variant="primary" size="sm" icon={<Sparkles />}>
              {t('calendar:fromTemplate')}
            </Button>
          )}
        </header>

        <div className="calendar-page-v2-toolbar">
          <div className="calendar-page-v2-nav">
            <Button onClick={handlePrev} variant="outline" size="sm" icon={<ChevronLeft />} aria-label={t('calendar:prev')} />
            <h2 className="calendar-page-v2-period">{headerLabel}</h2>
            <Button onClick={handleNext} variant="outline" size="sm" icon={<ChevronRight />} aria-label={t('calendar:next')} />
            <Button onClick={handleToday} variant="outline" size="sm">
              {t('calendar:today')}
            </Button>
          </div>

          <div className="calendar-page-v2-controls">
            {fields.length > 0 && (
              <select
                value={selectedFieldId}
                onChange={(e) => setSelectedFieldId(e.target.value)}
                aria-label={t('calendar:fieldLabel')}
                className="calendar-field-select"
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}

            <div className="calendar-view-toggle" role="group" aria-label={t('calendar:viewModeAria')}>
              <button
                type="button"
                className={viewMode === 'month' ? 'active' : ''}
                onClick={() => setViewMode('month')}
              >
                <LayoutGrid size={16} />
                {t('calendar:viewMonth')}
              </button>
              <button
                type="button"
                className={viewMode === 'day' ? 'active' : ''}
                onClick={() => setViewMode('day')}
              >
                <CalendarDays size={16} />
                {t('calendar:viewDay')}
              </button>
            </div>

            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'primary' : 'outline'}
              size="sm"
              icon={<Filter />}
            >
              {t('calendar:filters')}
            </Button>
          </div>
        </div>

        {selectedFieldId && (
          <CalendarSeasonRibbon
            entries={recommended}
            onSelect={user?.role === 'FieldOwner' ? handleTemplateSelect : undefined}
          />
        )}

        <div className="calendar-page-v2-body">
          {showFilters && (
            <aside className="calendar-page-v2-sidebar">
              <CalendarFiltersComponent fields={fields} filters={filters} onFiltersChange={setFilters} />
            </aside>
          )}

          <main className="calendar-page-v2-main">
            {loading ? (
              <LoadingSpinner />
            ) : viewMode === 'month' ? (
              <CalendarMonthView
                currentDate={currentDate}
                selectedDate={selectedDate}
                events={events}
                recommended={recommended}
                locale={i18n.language}
                onDateSelect={handleDateSelect}
                onEventClick={handleEventClick}
              />
            ) : (
              <CalendarDayView
                date={selectedDate}
                events={events}
                recommended={recommended}
                fieldId={selectedFieldId}
                locale={i18n.language}
                onEventClick={handleEventClick}
              />
            )}
          </main>
        </div>
      </div>
    </PageContainer>
  );
};

export default CalendarPage;
