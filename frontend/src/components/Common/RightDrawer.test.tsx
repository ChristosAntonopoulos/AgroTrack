import React from 'react';
import { render, screen } from '@testing-library/react';
import RightDrawer from './RightDrawer';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key }),
}));

describe('RightDrawer', () => {
  it('QA_007_exposes_exactly_one_dialog_when_resetKey_changes', () => {
    const { rerender } = render(
      <RightDrawer open onClose={() => undefined} title="Capture" resetKey="quick:">
        <button type="button">First</button>
      </RightDrawer>
    );
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    rerender(
      <RightDrawer open onClose={() => undefined} title="Capture" resetKey="money:grove-1">
        <button type="button">Second</button>
      </RightDrawer>
    );

    // The panel that is animating out must not count as a second dialog.
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Capture');
  });

  it('QA-017 a leaving/hidden panel is inert and aria-hidden, the live one is not', () => {
    const { rerender } = render(
      <RightDrawer open onClose={() => undefined} title="Filters" resetKey="a">
        <button type="button">First</button>
      </RightDrawer>
    );
    rerender(
      <RightDrawer open onClose={() => undefined} title="Filters" resetKey="b">
        <button type="button">Second</button>
      </RightDrawer>
    );

    const panels = Array.from(document.querySelectorAll('aside.oa-drawer'));
    expect(panels.length).toBeGreaterThan(0);
    panels.forEach((panel) => {
      const live = panel.getAttribute('role') === 'dialog';
      expect(panel.hasAttribute('inert')).toBe(!live);
      expect(panel.getAttribute('aria-hidden') === 'true').toBe(!live);
    });
  });

  it('QA-017 renders no filter controls at all when closed', () => {
    render(
      <RightDrawer open={false} onClose={() => undefined} title="Filters">
        <button type="button">Hidden control</button>
      </RightDrawer>
    );
    expect(screen.queryByText('Hidden control')).not.toBeInTheDocument();
  });
});
