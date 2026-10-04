import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import FeedbackModal from '../components/Feedback/FeedbackModal';

type FeedbackApi = {
  openFeedback: (options?: { comment?: string }) => void;
  closeFeedback: () => void;
  isOpen: boolean;
};

const FeedbackContextValue = createContext<FeedbackApi | null>(null);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [draftComment, setDraftComment] = useState<string | null>(null);
  const openFeedback = useCallback((options?: { comment?: string }) => {
    setDraftComment(options?.comment ?? null);
    setOpen(true);
  }, []);
  const closeFeedback = useCallback(() => {
    setDraftComment(null);
    setOpen(false);
  }, []);
  const value = useMemo(
    () => ({ openFeedback, closeFeedback, isOpen: open }),
    [openFeedback, closeFeedback, open]
  );

  return (
    <FeedbackContextValue.Provider value={value}>
      {children}
      <FeedbackModal open={open} initialComment={draftComment} onClose={closeFeedback} />
    </FeedbackContextValue.Provider>
  );
};

export const useFeedback = (): FeedbackApi => {
  const ctx = useContext(FeedbackContextValue);
  if (!ctx) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return ctx;
};

export const useFeedbackOptional = (): FeedbackApi | null => useContext(FeedbackContextValue);
