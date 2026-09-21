import React, { useState } from 'react';

/**
 * Stub for draft persistence across sheet open/close.
 * Real persistence is a follow-up; sheets keep local useState for now.
 */
export function useHarvestDraft<T>(initial: T): {
  draft: T;
  setDraft: React.Dispatch<React.SetStateAction<T>>;
  clearDraft: () => void;
} {
  const [draft, setDraft] = useState(initial);
  return {
    draft,
    setDraft,
    clearDraft: () => setDraft(initial),
  };
}
