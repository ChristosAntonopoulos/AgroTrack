import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import TaskDetailPage from './TaskDetailPage';
import type { FieldTask } from '../services/fieldWorkService';
import type { TaskFinancialSummary } from '../services/financialSummaryService';

const mockGetFieldTask = jest.fn();
const mockGetTaskSummary = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useParams: () => ({ id: 'task-1' }),
    useNavigate: () => jest.fn(),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  }),
  { virtual: true }
);

jest.mock('../components/Layout/Breadcrumbs', () => () => null);

jest.mock('../services/serviceFactory', () => ({
  getFieldWorkService: () => ({
    getFieldTask: (...args: unknown[]) => mockGetFieldTask(...args),
    startFieldTask: jest.fn(),
  }),
  getFieldService: () => ({ getFields: async () => [] }),
  getPartnerService: () => ({ getContacts: async () => [] }),
  getFinancialSummaryService: () => ({
    getTaskSummary: (...args: unknown[]) => mockGetTaskSummary(...args),
  }),
}));

jest.mock('../services/fieldPeopleService', () => ({
  fieldPeopleService: { getPeople: async () => [] },
}));

jest.mock('../context/CaptureContext', () => ({
  useCaptureOptional: () => ({ openCapture: jest.fn() }),
}));

const task: FieldTask = {
  id: 'task-1',
  fieldId: 'field-1',
  resultYear: 2026,
  title: 'Λίπανση',
  status: 'planned',
  statusLabel: 'Προγραμματισμένη',
  checklist: [],
  additionalParticipantUserIds: [],
  assignmentResponse: 'pending',
  weatherSuitability: 'unknown',
  weatherSuitabilityLabel: 'Άγνωστο',
  attachmentIds: [],
  createdByUserId: 'owner-1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  estimatedCost: 200,
};

const money: TaskFinancialSummary = {
  taskId: 'task-1',
  fieldId: 'field-1',
  estimatedCost: 200,
  actualCost: null,
  difference: null,
  transactionCount: 0,
  dataAvailability: {
    hasPostedRecords: false,
    hasDraftRecords: false,
    incomeIsUnknown: true,
    expensesAreUnknown: true,
    areaIsMissing: false,
    oilQuantityIsMissing: false,
    includesUnassigned: false,
  },
};

test('task detail keeps estimate separate from unknown actual cost', async () => {
  mockGetFieldTask.mockResolvedValue(task);
  mockGetTaskSummary.mockResolvedValue(money);
  await i18n.changeLanguage('el');
  render(
    <I18nextProvider i18n={i18n}>
      <TaskDetailPage />
    </I18nextProvider>
  );

  await waitFor(() => {
    expect(screen.getByText('Πραγματικό κόστος')).toBeInTheDocument();
  });
  expect(screen.getByText('Δεν έχει καταχωρηθεί ακόμη κόστος')).toBeInTheDocument();
  expect(screen.getByText('Το εκτιμώμενο ποσό δεν μπαίνει στα αποτελέσματα της χρονιάς.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Καταχώρηση εξόδου' })).toBeInTheDocument();
});
