// Service Factory - Toggles between mock and real services based on environment variable

// Field Service
import { fieldService } from './fieldService';
import { mockFieldService } from './mock/mockFieldService';

// Task Service
import { taskService } from './taskService';
import { mockTaskService } from './mock/mockTaskService';

// User Service
import { userService } from './userService';
import { mockUserService } from './mock/mockUserService';

// Lifecycle Service
import { lifecycleService } from './lifecycleService';
import { mockLifecycleService } from './mock/mockLifecycleService';

// Calendar Service
import { calendarService } from './calendarService';
import { mockCalendarService } from './mock/mockCalendarService';

// Analytics Service
import { analyticsService } from './analyticsService';
import { mockAnalyticsService } from './mock/mockAnalyticsService';

// Ministry Notifications
import { ministryNotificationService } from './ministryNotificationService';
import { ministryApiService } from './ministryApiService';

// Reports
import { reportsService } from './reportsService';
import { isMockDataEnabled } from '../config/apiConfig';

const useMockData = isMockDataEnabled();

export const getFieldService = () => useMockData ? mockFieldService : fieldService;
export const getTaskService = () => useMockData ? mockTaskService : taskService;
export const getUserService = () => useMockData ? mockUserService : userService;
export const getLifecycleService = () => useMockData ? mockLifecycleService : lifecycleService;
export const getCalendarService = () => useMockData ? mockCalendarService : calendarService;
export const getAnalyticsService = () => useMockData ? mockAnalyticsService : analyticsService;
export const getMinistryNotificationService = () =>
  useMockData ? ministryNotificationService : ministryApiService;
export const getReportsService = () => reportsService;

// Export a helper to check if mock mode is active
export const isMockMode = () => useMockData;
