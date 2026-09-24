import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import HarvestOpening from './HarvestOpening';

describe('HarvestOpening', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('el');
  });

  it('shows the harvest blessing and closes on the button', async () => {
    const onClose = jest.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <HarvestOpening seasonLabel="2026/27" onClose={onClose} />
      </I18nextProvider>
    );

    expect(screen.getByRole('dialog', { name: 'Καλή συγκομιδή' })).toBeInTheDocument();
    expect(screen.getByText('Ήρθε η ώρα να μαζέψεις τον κόπο μιας ολόκληρης χρονιάς.')).toBeInTheDocument();
    expect(screen.getByText('Η ιστορία της μένει εδώ.')).toBeInTheDocument();
    expect(screen.getByText('2026/27')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ξεκινάμε' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
