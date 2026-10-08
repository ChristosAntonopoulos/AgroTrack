import { fieldService } from './fieldService';
import { mockFieldService } from './mockFieldService';
import { fieldWorkService } from './fieldWorkService';
import { taskService } from './taskService';
import { mockTaskService } from './mockTaskService';
import { lifecycleService } from './lifecycleService';
import { mockLifecycleService } from './mockLifecycleService';
import { authService } from './authService';
import { mockAuthService } from './mockAuthService';
import { ministryApiService } from './ministryApiService';
import { mockMinistryService } from './mockMinistryService';
import { fileService } from './fileService';
import { mockFileService } from './mockFileService';
import { financialTransactionService } from './financialTransactionService';
import { mockFinancialTransactionService } from './mockFinancialTransactionService';
import { financialSummaryService } from './financialSummaryService';
import { mockFinancialSummaryService } from './mockFinancialSummaryService';
import { harvestService } from './harvestService';
import { mockHarvestService } from './mockHarvestService';
import { partnerService } from './partnerService';
import { meDashboardService } from './meDashboardService';
import { mockMeDashboardService } from './mockMeDashboardService';
import { noteService } from './noteService';
import { mockNoteService } from './mockNoteService';
import { chronologioService } from './chronologioService';
import { mockChronologioService } from './mockChronologioService';
import { feedbackService } from './feedbackService';
import { photoService } from './photoService';
import { isMockDataEnabled } from '../config/env';

const useMock = () => isMockDataEnabled();

export const getAuthService = () => (useMock() ? mockAuthService : authService);
export const getFieldService = () => (useMock() ? mockFieldService : fieldService);
export const getFieldWorkService = () => fieldWorkService;
export const getTaskService = () => (useMock() ? mockTaskService : taskService);
export const getLifecycleService = () => (useMock() ? mockLifecycleService : lifecycleService);
export const getMinistryService = () => (useMock() ? mockMinistryService : ministryApiService);
export const getFileService = () => (useMock() ? mockFileService : fileService);
export const getFinancialTransactionService = () =>
  useMock() ? mockFinancialTransactionService : financialTransactionService;
export const getFinancialSummaryService = () =>
  useMock() ? mockFinancialSummaryService : financialSummaryService;
export const getHarvestService = () => (useMock() ? mockHarvestService : harvestService);
export const getPartnerService = () => partnerService;
export const getMeDashboardService = () =>
  useMock() ? mockMeDashboardService : meDashboardService;
export const getNoteService = () => (useMock() ? mockNoteService : noteService);
export const getChronologioService = () =>
  useMock() ? mockChronologioService : chronologioService;
export const getFeedbackService = () =>
  useMock()
    ? {
        submit: async () => undefined,
      }
    : feedbackService;
/** Photo Hub — live API only (uploads need the server for EXIF). */
export const getPhotoService = () => photoService;

export const isMockMode = () => isMockDataEnabled();
