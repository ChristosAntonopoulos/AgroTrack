import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { LocaleProvider } from '../../context/LocaleProvider';
import MoneyCaptureForm from './MoneyCaptureForm';
import { clearMoneyEntryDraft, writeMoneyEntryDraft } from '../../finance/moneyEntryDraft';
import type { Field } from '../../services/fieldService';

const mockCreate = jest.fn();
const mockGetTasks = jest.fn();
const mockListByField = jest.fn();

jest.mock('../../services/serviceFactory', () => ({
  getFinancialTransactionService: () => ({ create: (...args: unknown[]) => mockCreate(...args) }),
  getTaskService: () => ({ listTasks: (...args: unknown[]) => mockGetTasks(...args) }),
  getHarvestService: () => ({ listByField: (...args: unknown[]) => mockListByField(...args) }),
}));

jest.mock('../../services/fileUploadService', () => ({
  fileUploadService: { uploadFile: jest.fn() },
}));

const field: Field = {
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

const continueOn = () => fireEvent.click(screen.getByRole('button', { name: 'Συνέχεια' }));
const pickCategory = async (name: RegExp) => {
  fireEvent.click(await screen.findByRole('option', { name }));
};

test('asks income or expense, then the type, before the amount', async () => {
  renderForm();
  expect(await screen.findByRole('button', { name: /Έξοδο/ })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Εργασία' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Έξοδο/ }));
  expect(await screen.findByText('Τι έξοδο;')).toBeInTheDocument();
  expect(screen.queryByLabelText(/Όνομα/i)).not.toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Εργασία' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Ποσό')).not.toBeInTheDocument();
  await pickCategory(/^Εργασία$/);
  expect(await screen.findByLabelText('Ποσό')).toBeInTheDocument();
  expect(screen.queryByLabelText(/Όνομα/i)).not.toBeInTheDocument();
});

test('starts a task expense on the amount and keeps the known field, date, and name', async () => {
  renderForm({
    context: {
      preferredType: 'expense',
      fieldId: 'field-1',
      taskId: 'task-1',
      category: 'labor',
      description: 'Κλάδεμα',
      occurredAt: '2026-09-22T08:00:00',
    },
  });
  expect(await screen.findByLabelText('Ποσό')).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Εργασία' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Ποσό'), { target: { value: '12' } });
  continueOn();
  expect(screen.queryByRole('radio', { name: 'Kato' })).not.toBeInTheDocument();
  expect(await screen.findByLabelText(/Όνομα/i)).toHaveValue('Κλάδεμα');
});

test('keeps continue disabled until a positive amount exists', async () => {
  renderForm({ context: { preferredType: 'expense', fieldId: 'field-1' } });
  await screen.findByRole('option', { name: 'Εργασία' });
  await pickCategory(/^Εργασία$/);
  const next = await screen.findByRole('button', { name: 'Συνέχεια' });
  expect(next).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Ποσό'), { target: { value: '10' } });
  expect(next).not.toBeDisabled();
});

test('category is chosen before the amount and is not repeated later', async () => {
  renderForm({ context: { preferredType: 'expense' } });
  expect(await screen.findByRole('option', { name: 'Καύσιμα και ενέργεια' })).toBeInTheDocument();
  await pickCategory(/Καύσιμα και ενέργεια/);
  expect(await screen.findByLabelText('Ποσό')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Ποσό'), { target: { value: '10' } });
  continueOn();
  fireEvent.click(screen.getByRole('radio', { name: 'Kato' }));
  fireEvent.click(await screen.findByRole('button', { name: /Περισσότερα στοιχεία/i }));
  expect(screen.queryByRole('option', { name: 'Εργασία' })).not.toBeInTheDocument();
});

test('oil sale opened from money redirects to cellar sell', async () => {
  const onSellOil = jest.fn();
  renderForm({
    context: {
      preferredType: 'income',
      category: 'olive_oil_sale',
      sourcePage: 'money',
    },
    onSellOil,
  });
  await waitFor(() => expect(onSellOil).toHaveBeenCalled());
});

test('preselects a related harvest when provided', async () => {
  renderForm({
    context: { preferredType: 'income', fieldId: 'field-1', harvestId: 'harvest-1' },
  });
  await pickCategory(/Επιδότηση/);
  fireEvent.change(await screen.findByLabelText('Ποσό'), { target: { value: '1' } });
  continueOn();
  fireEvent.click(screen.getByRole('radio', { name: 'Kato' }));
  const harvestSelect = (await screen.findByLabelText(/Σχετική συγκομιδή/i)) as HTMLSelectElement;
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
  continueOn();
  fireEvent.click(screen.getByRole('radio', { name: 'Kato' }));
  expect(await screen.findByDisplayValue('Draft amount')).toBeInTheDocument();
  expect(screen.getByLabelText(/Όνομα/i)).toBeInTheDocument();
});

test('posts a confirmed expense through the financial transaction API', async () => {
  const onSaved = jest.fn();
  renderForm({
    context: { preferredType: 'expense', fieldId: 'field-1' },
    onSaved,
  });
  await pickCategory(/^Εργασία$/);
  fireEvent.change(await screen.findByLabelText('Ποσό'), { target: { value: '45' } });
  continueOn();
  fireEvent.click(screen.getByRole('radio', { name: 'Kato' }));
  fireEvent.change(await screen.findByLabelText(/Όνομα/i), {
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
  await pickCategory(/Επιδότηση/);
  fireEvent.change(await screen.findByLabelText('Ποσό'), { target: { value: '120' } });
  continueOn();
  fireEvent.click(screen.getByRole('radio', { name: 'Kato' }));
  fireEvent.click(screen.getByRole('button', { name: /Αποθήκευση ως πρόχειρο/i }));
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0]).toEqual(
    expect.objectContaining({ amount: 120, saveAsDraft: true })
  );
});
