import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import ChronologioDetailShell from './ChronologioDetailShell';

const Shell: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <I18nextProvider i18n={i18n}>
    <ChronologioDetailShell
      open={open}
      onClose={onClose}
      resetKey="event:1"
      title="Τίτλος συρταριού"
      categoryLabel="Εργασία"
      categoryIcon={<span>icon</span>}
      accent="work"
      footer={
        <>
          <button type="button">Πρώτη ενέργεια</button>
          <button type="button">Τελευταία ενέργεια</button>
        </>
      }
    >
      <p>Σώμα συρταριού</p>
    </ChronologioDetailShell>
  </I18nextProvider>
);

describe('ChronologioDetailShell keyboard', () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });
    root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
  });

  it('moves focus to the title, traps Tab, and restores the trigger', async () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <>
        <button type="button">Κάρτα γεγονότος</button>
        <Shell open={false} onClose={onClose} />
      </>,
      { container: root }
    );

    await userEvent.click(screen.getByRole('button', { name: 'Κάρτα γεγονότος' }));
    rerender(
      <>
        <button type="button">Κάρτα γεγονότος</button>
        <Shell open onClose={onClose} />
      </>
    );

    const title = await screen.findByRole('heading', { name: 'Τίτλος συρταριού' });
    await waitFor(() => expect(title).toHaveFocus());

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Κλείσιμο' })).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Πρώτη ενέργεια' })).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Τελευταία ενέργεια' })).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Κλείσιμο' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();

    rerender(
      <>
        <button type="button">Κάρτα γεγονότος</button>
        <Shell open={false} onClose={onClose} />
      </>
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Κάρτα γεγονότος' })).toHaveFocus());
  });
});
