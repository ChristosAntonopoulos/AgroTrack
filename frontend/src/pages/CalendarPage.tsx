import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCalendarService } from '../services/serviceFactory';
import { getFieldService } from '../services/serviceFactory';
import { CalendarEvent, CalendarFilters } from '../services/calendarService';
import { Field } from '../services/fieldService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import CalendarView from '../components/Calendar/CalendarView';
import CalendarFiltersComponent from '../components/Calendar/CalendarFilters';
import CalendarLegend from '../components/Calendar/CalendarLegend';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import './CalendarPage.css';

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CalendarFilters>({
    showTasks: true,
    showLifecycles: true,
    showDeadlines: true,
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadFields();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [currentDate, filters]);

  const loadFields = async () => {
    try {
      const fieldService = getFieldService();
      const fieldsData = await fieldService.getFields();
      setFields(fieldsData);
    } catch (error) {
      console.error('Error loading fields:', error);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const calendarService = getCalendarService();
      const monthStart = startOfMonth(currentDate);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      const eventsData = await calendarService.getEvents(monthStart, monthEnd, filters);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    // Could show a modal with events for that date
    console.log('Date clicked:', date);
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.taskId) {
      navigate(`/tasks/${event.taskId}`);
    } else if (event.fieldId) {
      navigate(`/fields/${event.fieldId}`);
    }
  };

  return (
    <PageContainer>
      <div className="calendar-page">
        <Breadcrumbs />
        
        <div className="calendar-page-header">
          <div className="calendar-controls">
            <Button onClick={handlePreviousMonth} variant="outline" size="sm" icon={<ChevronLeft />} />
            <h1>{format(currentDate, 'MMMM yyyy')}</h1>
            <Button onClick={handleNextMonth} variant="outline" size="sm" icon={<ChevronRight />} />
            <Button onClick={handleToday} variant="outline" size="sm">
              Today
            </Button>
          </div>
          <div className="calendar-actions">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'primary' : 'outline'}
              size="sm"
              icon={<Filter />}
            >
              Filters
            </Button>
            {user?.role === 'FieldOwner' && (
              <Button
                onClick={() => navigate('/tasks/new')}
                variant="primary"
                size="sm"
                icon={<Plus />}
              >
                New Task
              </Button>
            )}
          </div>
        </div>

        <div className="calendar-content">
          {showFilters && (
            <div className="calendar-sidebar">
              <CalendarFiltersComponent
                fields={fields}
                filters={filters}
                onFiltersChange={setFilters}
              />
              <CalendarLegend />
            </div>
          )}
          
          <div className="calendar-main">
            {loading ? (
              <LoadingSpinner />
            ) : (
              <CalendarView
                currentDate={currentDate}
                events={events}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
              />
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default CalendarPage;
