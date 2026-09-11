import { renderHook } from '@testing-library/react';
import { useDrawerDialog } from './useDrawerDialog';

describe('useDrawerDialog', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('locks background scroll while open and restores it on close', () => {
    document.body.style.overflow = '';
    const onClose = jest.fn();
    const { rerender, unmount } = renderHook(
      ({ open }) => useDrawerDialog({ open, onClose }),
      { initialProps: { open: true } }
    );

    expect(document.body.style.overflow).toBe('hidden');

    rerender({ open: false });
    expect(document.body.style.overflow).toBe('');

    unmount();
  });

  it('closes on Escape', () => {
    const onClose = jest.fn();
    renderHook(() => useDrawerDialog({ open: true, onClose }));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('makes the document root inert while open', () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    const onClose = jest.fn();
    const { rerender } = renderHook(
      ({ open }) => useDrawerDialog({ open, onClose }),
      { initialProps: { open: true } }
    );

    expect(root.hasAttribute('inert')).toBe(true);

    rerender({ open: false });
    expect(root.hasAttribute('inert')).toBe(false);
    root.remove();
  });
});
