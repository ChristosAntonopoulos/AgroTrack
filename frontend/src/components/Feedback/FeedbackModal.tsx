import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Camera, HeartHandshake, ImagePlus, X } from 'lucide-react';
import { captureAppScreenshot } from '../../feedback/captureScreenshot';
import { getApiErrorMessage } from '../../utils/translateApiError';
import { getFeedbackService } from '../../services/serviceFactory';
import Button from '../Common/Button';
import './Feedback.css';

type ImageSlot = { file: File; preview: string };

type Props = {
  open: boolean;
  onClose: () => void;
  initialComment?: string | null;
};

const FeedbackModal: React.FC<Props> = ({ open, onClose, initialComment }) => {
  const { t } = useTranslation(['feedback', 'common', 'errors']);
  const photoRef = useRef<HTMLInputElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const [comment, setComment] = useState('');
  const [screenshot, setScreenshot] = useState<ImageSlot | null>(null);
  const [photo, setPhoto] = useState<ImageSlot | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  const screenshotRef = useRef<ImageSlot | null>(null);
  screenshotRef.current = screenshot;

  const assignImage = (
    setter: React.Dispatch<React.SetStateAction<ImageSlot | null>>,
    file: File
  ) => {
    setter((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview);
      return { file, preview: URL.createObjectURL(file) };
    });
    setError(null);
  };

  const submittingRef = useRef(false);
  submittingRef.current = submitting;

  useEffect(() => {
    if (!open) return;
    setThanks(false);
    setError(null);
    if (initialComment) setComment(initialComment);
    const id = window.setTimeout(() => commentRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submittingRef.current) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, initialComment]);

  useEffect(() => {
    if (!open) return;
    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
        item.type.startsWith('image/')
      );
      if (!file) return;
      event.preventDefault();
      assignImage(screenshotRef.current ? setPhoto : setScreenshot, file);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [open]);

  const reset = () => {
    if (screenshot) URL.revokeObjectURL(screenshot.preview);
    if (photo) URL.revokeObjectURL(photo.preview);
    setComment('');
    setScreenshot(null);
    setPhoto(null);
    setError(null);
    setThanks(false);
    setCapturing(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting || capturing) return;
    reset();
    onClose();
  };

  const captureScreen = async () => {
    setError(null);
    setCapturing(true);
    try {
      const file = await captureAppScreenshot();
      assignImage(setScreenshot, file);
    } catch {
      setError(t('feedback:captureFailed'));
    } finally {
      setCapturing(false);
    }
  };

  const onPickFile = (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<ImageSlot | null>>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    assignImage(setter, file);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!comment.trim() && !screenshot && !photo) {
      setError(t('feedback:needSomething'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await getFeedbackService().submit({
        comment,
        pageUrl: `${window.location.pathname}${window.location.search}`,
        screenshot: screenshot?.file,
        photo: photo?.file,
      });
      setThanks(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`feedback-backdrop${capturing ? ' is-capturing' : ''}`}
      data-feedback-ignore="true"
      role="presentation"
      onClick={handleClose}
    >
      <div
        className="feedback-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onClick={(e) => e.stopPropagation()}
      >
        {thanks ? (
          <div className="feedback-thanks">
            <div className="feedback-thanks-icon" aria-hidden>
              <HeartHandshake size={26} />
            </div>
            <h2 id="feedback-title">{t('feedback:thanksTitle')}</h2>
            <p>{t('feedback:thanksBody')}</p>
            <Button variant="primary" onClick={handleClose}>
              {t('feedback:thanksClose')}
            </Button>
          </div>
        ) : (
          <>
            <div className="feedback-header">
              <div>
                <p className="feedback-kicker">{t('feedback:kicker')}</p>
                <h2 id="feedback-title" className="feedback-title">
                  {t('feedback:title')}
                </h2>
              </div>
              <button
                type="button"
                className="feedback-close"
                onClick={handleClose}
                aria-label={t('common:close')}
              >
                <X size={20} />
              </button>
            </div>
            <p className="feedback-intro">{t('feedback:intro')}</p>
            <form className="feedback-form" onSubmit={submit}>
              <label className="feedback-label">
                {t('feedback:commentLabel')}
                <textarea
                  ref={commentRef}
                  value={comment}
                  maxLength={4000}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('feedback:commentPlaceholder')}
                  disabled={submitting}
                />
              </label>

              <div className="feedback-actions-row">
                <button
                  type="button"
                  className="feedback-attach"
                  onClick={() => void captureScreen()}
                  disabled={capturing || submitting}
                >
                  <strong>
                    <Camera size={18} aria-hidden />
                    {capturing ? t('feedback:screenshotBusy') : t('feedback:screenshot')}
                  </strong>
                  <span>{t('feedback:screenshotHint')}</span>
                </button>
                <button
                  type="button"
                  className="feedback-attach"
                  onClick={() => photoRef.current?.click()}
                  disabled={submitting}
                >
                  <strong>
                    <ImagePlus size={18} aria-hidden />
                    {t('feedback:photo')}
                  </strong>
                  <span>{t('feedback:photoHint')}</span>
                </button>
              </div>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => onPickFile(event, setPhoto)}
              />

              {(screenshot || photo) && (
                <div className="feedback-previews">
                  {screenshot ? (
                    <div className="feedback-thumb">
                      <img src={screenshot.preview} alt="" />
                      <p className="feedback-thumb-label">{t('feedback:screenshot')}</p>
                      <button
                        type="button"
                        aria-label={t('feedback:removeImage')}
                        onClick={() => {
                          URL.revokeObjectURL(screenshot.preview);
                          setScreenshot(null);
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : null}
                  {photo ? (
                    <div className="feedback-thumb">
                      <img src={photo.preview} alt="" />
                      <p className="feedback-thumb-label">{t('feedback:photo')}</p>
                      <button
                        type="button"
                        aria-label={t('feedback:removeImage')}
                        onClick={() => {
                          URL.revokeObjectURL(photo.preview);
                          setPhoto(null);
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {error ? <p className="feedback-error">{error}</p> : null}

              <div className="feedback-footer">
                <Button variant="ghost" type="button" onClick={handleClose} disabled={submitting}>
                  {t('feedback:cancel')}
                </Button>
                <Button variant="primary" type="submit" loading={submitting} disabled={capturing}>
                  {submitting ? t('feedback:sending') : t('feedback:submit')}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default FeedbackModal;

