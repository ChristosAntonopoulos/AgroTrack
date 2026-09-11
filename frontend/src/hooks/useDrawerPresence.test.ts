import { renderHook, act } from '@testing-library/react';
import { useDrawerPresence } from './useDrawerPresence';

describe('useDrawerPresence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps the last value mounted after close so exit can play', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDrawerPresence(value),
      { initialProps: { value: { id: 'note-1' } as { id: string } | null } }
    );

    expect(result.current.open).toBe(true);
    expect(result.current.mounted).toBe(true);
    expect(result.current.value?.id).toBe('note-1');

    rerender({ value: null });
    expect(result.current.open).toBe(false);
    expect(result.current.mounted).toBe(true);
    expect(result.current.value?.id).toBe('note-1');

    act(() => {
      jest.advanceTimersByTime(240);
    });

    expect(result.current.mounted).toBe(false);
    expect(result.current.value).toBeNull();
  });

  it('unmounts boolean sheets after the exit window', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDrawerPresence(value),
      { initialProps: { value: true as boolean } }
    );

    rerender({ value: false });
    expect(result.current.open).toBe(false);
    expect(result.current.mounted).toBe(true);

    act(() => {
      jest.advanceTimersByTime(240);
    });

    expect(result.current.mounted).toBe(false);
  });
});
