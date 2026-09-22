/** First failure offers Try again. The next failure offers remove, replace, or report. */
export const IMAGE_RETRY_BEFORE_CHOICES = 1;

export type ImageRecoveryMode = 'none' | 'retry' | 'choices';

export const imageRecoveryMode = (attempt: number, failed: boolean): ImageRecoveryMode => {
  if (!failed) return 'none';
  return attempt >= IMAGE_RETRY_BEFORE_CHOICES ? 'choices' : 'retry';
};
