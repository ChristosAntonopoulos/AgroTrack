import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TemplatePicker from './TemplatePicker';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('./TaskCategoryMark', () => () => null);

const suggestions = [
  {
    templateCode: 'T06',
    title: 'Prune',
    fieldId: 'f1',
    resultYear: 2026,
    whyNow: 'Season',
    category: 'x',
    confidence: 'high',
  },
  {
    templateCode: 'T06',
    title: 'Prune',
    fieldId: 'f2',
    resultYear: 2026,
    whyNow: 'Season',
    category: 'x',
    confidence: 'high',
  },
];
const fields = [
  { id: 'f1', name: 'North grove' },
  { id: 'f2', name: 'South grove' },
];

describe('QA-035 template suggestions show their field', () => {
  it('QA-035 labels each "Suggested now" card with its field name', () => {
    render(<TemplatePicker suggestions={suggestions} fields={fields} onSelect={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('North grove')).toBeInTheDocument();
    expect(screen.getByText('South grove')).toBeInTheDocument();
  });

  it('QA-035 passes the suggestion field id through on select', () => {
    const onSelect = jest.fn();
    render(<TemplatePicker suggestions={suggestions} fields={fields} onSelect={onSelect} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByText('South grove').closest('button') as HTMLElement);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ kind: 'template', fieldId: 'f2' }));
  });
});
