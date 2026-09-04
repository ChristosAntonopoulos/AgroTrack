import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useExperienceMode } from '../context/ExperienceModeContext';
import { useOfflineMode } from '../context/OfflineContext';
import { getCalendarService, getFieldService, getTaskService } from '../services/serviceFactory';
import { isDeviceOnline } from '../utils/networkStatus';
import { CalendarEvent, CalendarFilters } from '../services/calendarService';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { useAllLocalizedTemplates } from '../hooks/useLocalizedTaskTemplate';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { getRecommendedForMonth } from '../utils/calendarRecommendations';
import { isEventOverdue } from '../utils/calendarViewUtils';
import { demoStore } from '../services/demo/demoStore';
import CalendarMonthView from '../components/Calendar/CalendarMonthView';
import CalendarWeekView from '../components/Calendar/CalendarWeekView';
import CalendarAgendaView from '../components/Calendar/CalendarAgendaView';
import CalendarFieldView from '../components/Calendar/CalendarFieldView';
import CalendarDayPanel from '../components/Calendar/CalendarDayPanel';
import CalendarFilterBar from '../components/Calendar/CalendarFilterBar';
import CalendarLegend from '../components/Calendar/CalendarLegend';
import CalendarRecommendationCard from '../components/Calendar/CalendarRecommendationCard';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  Sparkles,
} from 'lucide-react';
import './CalendarPage.css';

type ViewMode = 'month' | 'week' | 'agenda' | 'field';

const CalendarPage: React.FC = () => {
  const { t, i18n } = useTranslation('calendar');
  const { user } = useAuth();
  const { isEveryday, showWidget } = useExperienceMode();
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();
  const navigate = useNavigate();
  const localizedTemplates = useAllLocalizedTemplates();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const isMobile = useMediaQuery('(max-width: 900px)');

  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    isMobile || !showWidget('calendarMonthView') ? 'agenda' : 'month'
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [drawerOpen, setDrawerOpen] = useState(!isMobile && !isEveryday);
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

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;
  const visibleMonth = currentDate.getMonth() + 1;

  useEffect(() => {
    if (isEveryday || (isMobile && viewMode === 'month')) {
      setViewMode('agenda');
    }
  }, [isMobile, isEveryday]);

  const recommended = useMemo(
    () =>
      getRecommendedForMonth(
        localizedTemplates,
        selectedDate.getMonth() + 1,
        selectedField,
        fieldTasks,
        selectedFieldId || undefined
      ),
    [localizedTemplates, selectedDate, selectedField, fieldTasks, selectedFieldId]
  );

  const monthRecommendations = useMemo(
    () =>
      getRecommendedForMonth(
        localizedTemplates,
        visibleMonth,
        selectedField,
        fieldTasks,
        selectedFieldId || undefined
      ),
    [localizedTemplates, visibleMonth, selectedField, fieldTasks, selectedFieldId]
  );

  const filteredEvents = useMemo(() => {
    let list = events;
    const statuses = filters.statuses?.filter((s) => s !== 'overdue') ?? [];
    const wantOverdue = filters.statuses?.includes('overdue');

    if (wantOverdue || statuses.length > 0) {
      list = list.filter((event) => {
        const overdue = isEventOverdue(event);
        if (wantOverdue && overdue) return true;
        if (statuses.length && event.status && statuses.includes(event.status)) return true;
        return false;
      });
    }

    return list;
  }, [events, filters.statuses]);

  useEffect(() => {
    loadFields();
    if (user?.userId && (user.role === 'FieldOwner' || user.role === 'Administrator')) {
      demoStore.markDemoStep(user.userId, user.role, 'owner_visit_calendar');
    }
  }, [refreshGeneration]);

  useEffect(() => {
    loadEvents();
  }, [currentDate, viewMode, filters, selectedFieldId, refreshGeneration]);

  useEffect(() => {
    getTaskService()
      .getTasks(selectedFieldId || undefined)
      .then(setFieldTasks)
      .catch(() => setFieldTasks([]));
  }, [selectedFieldId, refreshGeneration]);

  const loadFields = async () => {
    try {
      const fieldsData = await getFieldService().getFields();
      setFields(fieldsData);
      setShowingCachedData(!isDeviceOnline());
    } catch (error) {
      console.error('Error loading fields:', error);
    }
  };

  const loadEvents = async () => {
    try {
      if (events.length === 0) setLoading(true);
      const calendarService = getCalendarService();

      let rangeStart: Date;
      let rangeEnd: Date;

      if (viewMode === 'month') {
        rangeStart = startOfMonth(currentDate);
        rangeEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59);
      } else if (viewMode === 'week') {
        rangeStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      } else {
        rangeStart = subDays(new Date(), 1);
        rangeEnd = addDays(new Date(), 45);
      }

      const fieldFilter: CalendarFilters = {
        ...filters,
        fieldIds: selectedFieldId ? [selectedFieldId] : undefined,
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
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 7));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 7));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
    setDrawerOpen(!isMobile);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setDrawerOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.taskId) navigate(`/tasks/${event.taskId}`);
    else if (event.fieldId) navigate(`/fields/${event.fieldId}`);
  };

  const handleTemplateSelect = (templateId: string, fieldId?: string) => {
    const fid = fieldId || selectedFieldId || fields[0]?.id;
    if (!fid) return;
    navigate(`/tasks/new?templateId=${templateId}&fieldId=${fid}&month=${visibleMonth}`);
  };

  const handleScheduleRecommended = () => {
    const first = recommended.find((r) => r.recommended);
    if (first) handleTemplateSelect(first.template.id);
  };

  const headerLabel =
    viewMode === 'month'
      ? format(currentDate, 'MMMM yyyy', { locale: dateLocale })
      : viewMode === 'week'
        ? t('weekOf', { date: format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: dateLocale }) })
        : format(currentDate, 'MMMM yyyy', { locale: dateLocale });

  const viewTabs: { id: ViewMode; icon: React.ReactNode; label: string }[] = [
    ...(showWidget('calendarMonthView')
      ? [{ id: 'month' as const, icon: <LayoutGrid size={16} />, label: t('viewMonth') }]
      : []),
    ...(showWidget('calendarWeekView')
      ? [{ id: 'week' as const, icon: <CalendarDays size={16} />, label: t('viewWeek') }]
      : []),
    { id: 'agenda', icon: <List size={16} />, label: t('viewAgenda') },
    ...(showWidget('calendarFieldView')
      ? [{ id: 'field' as const, icon: <MapPin size={16} />, label: t('viewField') }]
      : []),
  ];

  const fieldLabel = selectedFieldId
    ? fields.find((f) => f.id === selectedFieldId)?.name
    : t('allFields');

  return (
    <PageContainer padding="sm">
      <div className="calendar-page-v2">
        <header className="calendar-page-v2-header">
          <div>
            <h1>{t('title')}</h1>
            <p className="calendar-page-v2-subtitle">{t('subtitle')}</p>
          </div>
          <div className="calendar-page-v2-header-actions">
            <Button to="/tasks/new" variant="outline" size="sm" icon={<Plus size={16} />}>
              {t('newTask')}
            </Button>
            {user?.role === 'FieldOwner' && (
              <Button
                to={selectedFieldId ? `/fields/${selectedFieldId}/task-templates` : '/fields'}
                variant="primary"
                size="sm"
                icon={<Sparkles size={16} />}
              >
                {t('fromTemplate')}
              </Button>
            )}
          </div>
        </header>

        <div className="calendar-page-v2-toolbar">
          <div className="calendar-page-v2-nav">
            <Button onClick={handlePrev} variant="outline" size="sm" icon={<ChevronLeft />} aria-label={t('prev')} />
            <h2 className="calendar-page-v2-period">{headerLabel}</h2>
            <Button onClick={handleNext} variant="outline" size="sm" icon={<ChevronRight />} aria-label={t('next')} />
            <Button onClick={handleToday} variant="outline" size="sm">
              {t('today')}
            </Button>
          </div>

          {!isEveryday ? (
          <div className="calendar-view-toggle" role="tablist" aria-label={t('viewModeAria')}>
            {viewTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={viewMode === tab.id}
                className={viewMode === tab.id ? 'active' : ''}
                onClick={() => setViewMode(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          ) : null}
        </div>

        <CalendarFilterBar
          fields={fields}
          filters={filters}
          selectedFieldId={selectedFieldId}
          onFieldChange={setSelectedFieldId}
          onFiltersChange={setFilters}
        />

        <CalendarLegend />

        {drawerOpen && isMobile && (
          <button
            type="button"
            className="calendar-drawer-backdrop"
            aria-label={t('closePanel')}
            onClick={() => setDrawerOpen(false)}
          />
        )}

        <div className={`calendar-workspace${drawerOpen && viewMode !== 'field' ? ' calendar-workspace--with-panel' : ''}`}>
          <main className="calendar-workspace-main">
            {loading ? (
              <LoadingSpinner />
            ) : viewMode === 'month' ? (
              <CalendarMonthView
                currentDate={currentDate}
                selectedDate={selectedDate}
                events={filteredEvents}
                recommended={monthRecommendations}
                locale={i18n.language}
                onDateSelect={handleDateSelect}
                onEventClick={handleEventClick}
              />
            ) : viewMode === 'week' ? (
              <CalendarWeekView
                currentDate={currentDate}
                selectedDate={selectedDate}
                events={filteredEvents}
                recommended={monthRecommendations}
                locale={i18n.language}
                onDateSelect={handleDateSelect}
                onEventClick={handleEventClick}
              />
            ) : viewMode === 'agenda' ? (
              <CalendarAgendaView
                events={filteredEvents}
                locale={i18n.language}
                onEventClick={handleEventClick}
                onDateClick={handleDateSelect}
              />
            ) : (
              <CalendarFieldView
                events={filteredEvents}
                fields={selectedFieldId ? fields.filter((f) => f.id === selectedFieldId) : fields}
                recommended={monthRecommendations}
                locale={i18n.language}
                onEventClick={handleEventClick}
                onScheduleTemplate={handleTemplateSelect}
              />
            )}
          </main>

          {drawerOpen && viewMode !== 'field' && (
            <CalendarDayPanel
              date={selectedDate}
              events={filteredEvents}
              recommended={recommended}
              fieldId={selectedFieldId || fields[0]?.id}
              fieldLabel={fieldLabel}
              locale={i18n.language}
              isDrawer
              onClose={() => setDrawerOpen(false)}
              onEventClick={handleEventClick}
              onScheduleTemplate={(id) => handleTemplateSelect(id)}
              onCreateTask={() =>
                navigate(`/tasks/new?fieldId=${selectedFieldId || fields[0]?.id || ''}`)
              }
              onScheduleRecommended={handleScheduleRecommended}
            />
          )}
        </div>

        {monthRecommendations.length > 0 && (
          <section className="calendar-season-section" aria-labelledby="calendar-season-heading">
            <h2 id="calendar-season-heading">
              {t('seasonalSection', { month: format(currentDate, 'MMMM', { locale: dateLocale }) })}
            </h2>
            <p className="calendar-season-section-desc">{t('seasonalSectionDesc')}</p>
            <div className="calendar-season-grid">
              {monthRecommendations.slice(0, 6).map((entry) => (
                <CalendarRecommendationCard
                  key={entry.template.id}
                  entry={entry}
                  fieldLabel={fieldLabel}
                  onSchedule={
                    user?.role === 'FieldOwner'
                      ? () => handleTemplateSelect(entry.template.id)
                      : undefined
                  }
                  onDetails={() =>
                    navigate(
                      selectedFieldId
                        ? `/fields/${selectedFieldId}/task-templates`
                        : '/fields'
                    )
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageContainer>
  );
};

export default CalendarPage;
