import { fieldService } from './fieldService';
import { mockFieldService } from './mockFieldService';
import { taskService } from './taskService';
import { mockTaskService } from './mockTaskService';
import { lifecycleService } from './lifecycleService';
import { mockLifecycleService } from './mockLifecycleService';
import { authService } from './authService';
import { mockAuthService } from './mockAuthService';
import { dashboardService } from './dashboardService';
import { mockDashboardService } from './mockDashboardService';
import { activityService } from './activityService';
import { mockActivityService } from './mockActivityService';
import { ministryApiService } from './ministryApiService';
import { mockMinistryService } from './mockMinistryService';
import { taskTemplateService } from './taskTemplateService';
import { mockTaskTemplateService } from './mockTaskTemplateService';
import { fileService } from './fileService';
import { mockFileService } from './mockFileService';
import { calendarService } from './calendarService';
import { financialEntryService } from './financialEntryService';
import { mockFinancialEntryService } from './mockFinancialEntryService';
import { harvestService } from './harvestService';
import { mockHarvestService } from './mockHarvestService';
import { partnerService } from './partnerService';
import { meDashboardService } from './meDashboardService';
import { mockMeDashboardService } from './mockMeDashboardService';
import { noteService } from './noteService';
import { mockNoteService } from './mockNoteService';
import { chronologioService } from './chronologioService';
import { mockChronologioService } from './mockChronologioService';
import { isMockDataEnabled } from '../config/env';

const useMock = () => isMockDataEnabled();

export const getAuthService = () => (useMock() ? mockAuthService : authService);
export const getFieldService = () => (useMock() ? mockFieldService : fieldService);
export const getTaskService = () => (useMock() ? mockTaskService : taskService);
export const getLifecycleService = () => (useMock() ? mockLifecycleService : lifecycleService);
export const getDashboardService = () => (useMock() ? mockDashboardService : dashboardService);
export const getActivityService = () => (useMock() ? mockActivityService : activityService);
export const getMinistryService = () => (useMock() ? mockMinistryService : ministryApiService);
export const getTaskTemplateService = () => (useMock() ? mockTaskTemplateService : taskTemplateService);
export const getFileService = () => (useMock() ? mockFileService : fileService);
export const getCalendarService = () => calendarService;
export const getFinancialEntryService = () =>
  useMock() ? mockFinancialEntryService : financialEntryService;
export const getHarvestService = () => (useMock() ? mockHarvestService : harvestService);
export const getPartnerService = () => partnerService;
export const getMeDashboardService = () =>
  useMock() ? mockMeDashboardService : meDashboardService;
export const getNoteService = () => (useMock() ? mockNoteService : noteService);
export const getChronologioService = () =>
  useMock() ? mockChronologioService : chronologioService;

export const isMockMode = () => isMockDataEnabled();
