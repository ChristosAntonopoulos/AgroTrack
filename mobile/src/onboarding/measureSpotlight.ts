import type { View } from 'react-native';

export type WindowRect = { x: number; y: number; width: number; height: number };

/**
 * Single measurement primitive for every spotlight geometry read.
 *
 * Android exposes two different origins and they do not agree:
 *   - `measure()` returns pageX/pageY relative to the React root view.
 *   - `measureInWindow()` returns screen coords minus the window's visible
 *     frame, i.e. minus the status bar.
 * Mixing them offsets the overlay by the status bar height. Target rects and
 * overlay origins therefore both go through this helper so they always live in
 * the same space and cancel out exactly on subtraction.
 */
export const measureViewInWindow = (
  node: View | null,
  onMeasured: (rect: WindowRect) => void
): void => {
  if (!node) return;
  node.measureInWindow((x, y, width, height) => {
    // Detached / clipped views report undefined or NaN on Android.
    if (![x, y, width, height].every((value) => typeof value === 'number' && Number.isFinite(value))) {
      return;
    }
    onMeasured({ x, y, width, height });
  });
};

/** Measurements jitter; ignore noise under `slack` px to avoid a walking spotlight. */
export const sameRect = (a: WindowRect | null, b: WindowRect, slack = 3): boolean =>
  !!a &&
  Math.abs(a.x - b.x) < slack &&
  Math.abs(a.y - b.y) < slack &&
  Math.abs(a.width - b.width) < slack &&
  Math.abs(a.height - b.height) < slack;
