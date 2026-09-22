import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { LocaleProvider } from '../../context/LocaleProvider';
import MoneyCaptureForm from './MoneyCaptureForm';
import { clearMoneyEntryDraft, writeMoneyEntryDraft } from '../../finance/moneyEntryDraft';

const mockCreate = jest.fn();
const mockGetTasks = jest.fn();
const mockListByField = jest.fn();

jest.mock('../../services/serviceFactory', () => ({
  getFinancialTransactionService: () => ({ create: (...args) => mockCreate(...args) }),
  getFieldWorkService: () => ({ listFieldTasks: (...args) => mockGetTasks(...args) }),
  getHarvestService: () => ({ listByField: (...args) => mockListByField(...args) }),
}));

jest.mock('../../services/fileUploadService', () => ({
  fileUploadService: { uploadFile: jest.fn() },
}));

const field = {
  id: 'field-1',
  ownerId: 'owner-1',
  name: 'Kato',
  area: 1,
  irrigationStatus: false,
  currentLifecycleYear: '2026',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  status: 'Active',
};

const task = { id: 'task-1', fieldId: 'field-1', title: 'Kladema' };

const harvest = {
  id: 'harvest-1',
  fieldId: 'field-1',
  harvestDate: '2026-11-02T00:00:00Z',
  harvestMethod: 'hand',
  workersUsed: 2,
  oliveKg: 400,
  millName: 'Mylos',
  qualityGrade: 'extra',
  status: 'posted',
};

const posted = {
  id: 'ft-1',
  ownerUserId: 'owner-1',
  type: 'expense',
  typeLabel: 'Expense',
  status: 'posted',
  statusLabel: 'Posted',
  amount: 45,
  currency: 'EUR',
  occurredOn: '2026-09-10T00:00:00',
  resultYear: 2026,
  fieldId: 'field-1',
  category: 'labor',
  description: 'Workers',
  sourceType: 'task',
  sourceTypeLabel: 'Task',
  attachmentIds: [],
  createdByUserId: 'owner-1',
  createdAt: '2026-09-10T00:00:00Z',
  updatedAt: '2026-09-10T00:00:00Z',
};

const renderForm = (props = {}) =>
  render(
    React.createElement(
      I18nextProvider,
      { i18n },
      React.createElement(
        LocaleProvider,
        null,
        React.createElement(MoneyCaptureForm, {
          context: {},
          fields: [field],
          canRecordIncome: true,
          canRecordExpense: true,
          onSaved: jest.fn(),
          ...props,
        })
      )
    )
  );

beforeEach(async () => {
  clearMoneyEntryDraft();
  mockCreate.mockReset();
  mockGetTasks.mockReset();
  mockListByField.mockReset();
  mockGetTasks.mockResolvedValue([task]);
  mockListByField.mockResolvedValue([harvest]);
  mockCreate.mockResolvedValue(posted);
  await i18n.changeLanguage('el');
  window.confirm = jest.fn(() => true);
});

test('disables save-as-draft until a positive amount exists', async () => {
  renderForm({ context: { preferredType: 'expense', fieldId: 'field-1' } });
  const draft = await screen.findByRole('button', { name: /Αποθήκευση ως πρόχειρο/i });
  expect(draft).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Ποσό'), { target: { value: '10' } });
  expect(draft).not.toBeDisabled();
});

test('category chips live under More details', async () => {
  renderForm({ context: { preferredType: 'expense' } });
  fireEvent.click(await screen.findByRole('button', { name: /Περισσότερα στοιχεία/i }));
  expect(await screen.findByRole('option', { name: /Εργασία/ })).toBeInTheDocument();
});

test('preselects a related harvest when provided', async () => {
  renderForm({
    context: { preferredType: 'income', fieldId: 'field-1', harvestId: 'harvest-1' },
  });
  const harvestSelect = await screen.findByLabelText(/Σχετική συγκομιδή/i);
  await waitFor(() => expect(harvestSelect.value).toBe('harvest-1'));
});

test('restores a session draft into the form fields', async () => {
  writeMoneyEntryDraft({
    kind: 'expense',
    category: 'labor',
    mode: 'total_only',
    quantity: '',
    unit: 'workday',
    unitPrice: '',
    amount: '33',
    fieldId: 'field-1',
    occurredOn: '2026-03-10',
    description: 'Draft amount',
    relatedTaskId: '',
    relatedHarvestId: '',
    paymentMethod: '',
    counterpartyName: '',
    notes: '',
    resultYear: 2026,
    moreOpen: false,
  });
  renderForm({ context: { preferredType: 'expense' } });
  expect(await screen.findByDisplayValue('33')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Draft amount')).toBeInTheDocument();
});

test('posts a confirmed expense through the financial transaction API', async () => {
  const onSaved = jest.fn();
  renderForm({
    context: { preferredType: 'expense', fieldId: 'field-1' },
    onSaved,
  });
  fireEvent.change(await screen.findByLabelText('Ποσό'), { target: { value: '45' } });
  fireEvent.change(screen.getByLabelText(/Σύντομη περιγραφή/i), {
    target: { value: 'Workers pruning' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Καταχώρηση εξόδου/i }));
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      type: 'expense',
      amount: 45,
      saveAsDraft: false,
    })
  );
  expect(onSaved).toHaveBeenCalled();
});

test('saves a draft from the footer without posting', async () => {
  mockCreate.mockResolvedValue({ ...posted, id: 'ft-draft', status: 'draft' });
  const onSaved = jest.fn();
  renderForm({
    context: { preferredType: 'income', fieldId: 'field-1' },
    onSaved,
  });
  fireEvent.change(await screen.findByLabelText(/Πόσα λίτρα/i), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText(/Τιμή ανά λίτρο/i), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: /Αποθήκευση ως πρόχειρο/i }));
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0]).toEqual(
    expect.objectContaining({ amount: 120, saveAsDraft: true })
  );
});
