import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import MoneyCaptureForm from './MoneyCaptureForm';
import type { Field } from '../../services/fieldService';
import type { FieldTask } from '../../services/fieldWorkService';
import type { HarvestRecord } from '../../services/harvestService';
import type { FinancialTransaction } from '../../services/financialTransactionService';

const mockCreate = jest.fn();
const mockGetTasks = jest.fn();
const mockListByField = jest.fn();

jest.mock('../../services/serviceFactory', () => ({
  getFinancialTransactionService: () => ({ create: (...args: unknown[]) => mockCreate(...args) }),
  getFieldWorkService: () => ({ listFieldTasks: (...args: unknown[]) => mockGetTasks(...args) }),
  getHarvestService: () => ({ listByField: (...args: unknown[]) => mockListByField(...args) }),
}));

jest.mock('../../services/fileUploadService', () => ({
  fileUploadService: { uploadFile: jest.fn() },
}));

const field: Field = {
  id: 'field-1',
  ownerId: 'owner-1',
  name: 'Κάτω χωράφι',
  area: 1,
  irrigationStatus: false,
  currentLifecycleYear: '2026',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  status: 'Active',
};

const task = {
  id: 'task-1',
  fieldId: 'field-1',
  title: 'Κλάδεμα',
} as FieldTask;

const harvest: HarvestRecord = {
  id: 'harvest-1',
  fieldId: 'field-1',
  harvestDate: '2026-11-02T00:00:00Z',
  harvestMethod: 'hand',
  workersUsed: 2,
  oliveKg: 400,
  millName: 'Μύλος',
  qualityGrade: 'extra',
};

const posted: FinancialTransaction = {
  id: 'ft-1',
  ownerUserId: 'owner-1',
  type: 'expense',
  typeLabel: 'Έξοδο',
  status: 'posted',
  statusLabel: 'Καταχωρημένο',
  amount: 45,
  currency: 'EUR',
  occurredOn: '2026-09-10T00:00:00',
  resultYear: 2026,
  fieldId: 'field-1',
  category: 'labor',
  description: 'Εργάτες',
  sourceType: 'task',
  sourceTypeLabel: 'Εργασία',
  attachmentIds: [],
  createdByUserId: 'owner-1',
  createdAt: '2026-09-10T00:00:00Z',
  updatedAt: '2026-09-10T00:00:00Z',
};

const renderForm = (
  props?: Partial<React.ComponentProps<typeof MoneyCaptureForm>>
) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MoneyCaptureForm
        context={{}}
        fields={[field]}
        canRecordIncome
        canRecordExpense
        isFullPicture={false}
        onSaved={jest.fn()}
        {...props}
      />
    </I18nextProvider>
  );

beforeEach(async () => {
  mockCreate.mockReset();
  mockGetTasks.mockReset();
  mockListByField.mockReset();
  mockGetTasks.mockResolvedValue([task]);
  mockListByField.mockResolvedValue([harvest]);
  mockCreate.mockResolvedValue(posted);
  await i18n.changeLanguage('el');
  window.confirm = jest.fn(() => true);
});

test('shows income and expense as a toggle, not a chooser page', async () => {
  renderForm();
  expect(await screen.findByRole('tablist', { name: 'Έσοδο ή έξοδο;' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Έσοδο' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Έξοδο' })).toBeInTheDocument();
  expect(screen.queryByText('Χρήματα που πήρες')).not.toBeInTheDocument();
  expect(screen.queryByText('Χρήματα που πλήρωσες')).not.toBeInTheDocument();
  expect(screen.queryByText('income')).not.toBeInTheDocument();
  expect(screen.queryByText('expense')).not.toBeInTheDocument();
});

test('skips the type chooser when an expense is preselected with field and task', async () => {
  renderForm({
    context: { preferredType: 'expense', fieldId: 'field-1', taskId: 'task-1' },
  });
  expect(await screen.findByLabelText('Ποσό')).toBeInTheDocument();
  expect(screen.getByText('Καταχώρηση εξόδου')).toBeInTheDocument();
  expect(screen.queryByText('Έσοδο ή έξοδο;')).not.toBeInTheDocument();
  const fieldSelect = screen.getByLabelText('Σε ποιον ελαιώνα;') as HTMLSelectElement;
  expect(fieldSelect.value).toBe('field-1');
  expect(await screen.findByDisplayValue('Κλάδεμα')).toBeInTheDocument();
});

test('posts a confirmed expense through the financial transaction API', async () => {
  const onSaved = jest.fn();
  renderForm({
    context: { preferredType: 'expense', fieldId: 'field-1' },
    onSaved,
  });
  fireEvent.change(await screen.findByLabelText('Ποσό'), { target: { value: '45' } });
  fireEvent.change(screen.getByPlaceholderText('Μεροκάματα για κλάδεμα'), { target: { value: 'Εργάτες κλαδέματος' } });
  fireEvent.click(screen.getByRole('button', { name: 'Καταχώρηση εξόδου' }));

  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      type: 'expense',
      amount: 45,
      currency: 'EUR',
      fieldId: 'field-1',
      category: 'labor',
      description: 'Εργάτες κλαδέματος',
      saveAsDraft: false,
    })
  );
  expect(onSaved).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'expense', fieldId: 'field-1', sourceId: 'ft-1' }),
    'Το έξοδο καταγράφηκε.',
    expect.objectContaining({ transactionId: 'ft-1', status: 'posted' })
  );
});

test('saves a draft from the footer without posting', async () => {
  mockCreate.mockResolvedValue({ ...posted, id: 'ft-draft', status: 'draft' });
  const onSaved = jest.fn();
  renderForm({
    context: { preferredType: 'income', fieldId: 'field-1' },
    onSaved,
  });
  fireEvent.change(await screen.findByLabelText('Πόσα λίτρα;'), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText('Τιμή ανά λίτρο'), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: 'Αποθήκευση ως πρόχειρο' }));

  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      type: 'income',
      amount: 120,
      saveAsDraft: true,
    })
  );
  expect(onSaved).toHaveBeenCalledWith(
    expect.anything(),
    'Το πρόχειρο αποθηκεύτηκε.',
    expect.objectContaining({ transactionId: 'ft-draft', status: 'draft' })
  );
});

test('category chips use Greek labels', async () => {
  renderForm({ context: { preferredType: 'expense' } });
  expect(await screen.findByRole('option', { name: /Εργασία/ })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /Λιπάσματα/ })).toBeInTheDocument();
  expect(screen.queryByText('labor')).not.toBeInTheDocument();
  expect(screen.queryByText('plant_protection')).not.toBeInTheDocument();
});

test('preselects a related harvest when provided', async () => {
  renderForm({
    context: { preferredType: 'income', fieldId: 'field-1', harvestId: 'harvest-1' },
  });
  const harvestSelect = await screen.findByLabelText('Σχετική συγκομιδή');
  await waitFor(() => expect((harvestSelect as HTMLSelectElement).value).toBe('harvest-1'));
});
