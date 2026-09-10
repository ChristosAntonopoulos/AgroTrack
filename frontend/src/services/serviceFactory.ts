// Service Factory - Toggles between mock and real services based on environment variable

// Field Service
import { fieldService } from './fieldService';
import { mockFieldService } from './mock/mockFieldService';

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
import { financialTransactionService } from './financialTransactionService';
import { mockFinancialTransactionService } from './mock/mockFinancialTransactionService';
import { financialSummaryService } from './financialSummaryService';
import { mockFinancialSummaryService } from './mock/mockFinancialSummaryService';
import { harvestService } from './harvestService';
import { mockHarvestService } from './mock/mockHarvestService';
import { partnerService } from './partnerService';
import { mockPartnerService } from './mock/mockPartnerService';
import { meDashboardService } from './meDashboardService';
import { mockMeDashboardService } from './mock/mockMeDashboardService';
import { noteService } from './noteService';
import { mockNoteService } from './mock/mockNoteService';
import { chronologioService } from './chronologioService';
import { mockChronologioService } from './mock/mockChronologioService';
import { fieldWorkService } from './fieldWorkService';
import { mockFieldWorkService } from './mock/mockFieldWorkService';
import { isMockDataEnabled } from '../config/apiConfig';

const useMockData = isMockDataEnabled();

export const getFieldService = () => useMockData ? mockFieldService : fieldService;
export const getUserService = () => useMockData ? mockUserService : userService;
export const getLifecycleService = () => useMockData ? mockLifecycleService : lifecycleService;
export const getCalendarService = () => useMockData ? mockCalendarService : calendarService;
export const getAnalyticsService = () => useMockData ? mockAnalyticsService : analyticsService;
export const getMinistryNotificationService = () =>
  useMockData ? ministryNotificationService : ministryApiService;
export const getReportsService = () => reportsService;
export const getFinancialTransactionService = () =>
  useMockData ? mockFinancialTransactionService : financialTransactionService;
export const getFinancialSummaryService = () =>
  useMockData ? mockFinancialSummaryService : financialSummaryService;
export const getHarvestService = () => (useMockData ? mockHarvestService : harvestService);
export const getPartnerService = () => (useMockData ? mockPartnerService : partnerService);
export const getMeDashboardService = () =>
  useMockData ? mockMeDashboardService : meDashboardService;
export const getNoteService = () => (useMockData ? mockNoteService : noteService);
export const getChronologioService = () =>
  useMockData ? mockChronologioService : chronologioService;
export const getFieldWorkService = () =>
  useMockData ? mockFieldWorkService : fieldWorkService;

// Export a helper to check if mock mode is active
export const isMockMode = () => useMockData;
