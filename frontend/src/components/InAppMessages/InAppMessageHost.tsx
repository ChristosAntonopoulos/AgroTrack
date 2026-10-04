import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Megaphone, MessageCircleQuestion, PieChart, X } from 'lucide-react';
import Button from '../Common/Button';
import {
  InAppMessage,
  RespondAnswer,
  inAppMessageService,
} from '../../services/inAppCampaignService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import './InAppMessage.css';

type Props = {
  message: InAppMessage | null;
  loading?: boolean;
  onClose: () => void;
  onUpdated: (message: InAppMessage | null) => void;
};

const KindIcon: React.FC<{ kind: string }> = ({ kind }) => {
  if (kind === 'poll') return <PieChart size={18} aria-hidden />;
  if (kind === 'questionnaire') return <MessageCircleQuestion size={18} aria-hidden />;
  return <Megaphone size={18} aria-hidden />;
};

const InAppMessageHost: React.FC<Props> = ({ message, onClose, onUpdated }) => {
  const { t } = useTranslation(['common', 'errors']);
  const [answers, setAnswers] = useState<Record<string, RespondAnswer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (!message) return;
    setError(null);
    setThanks(message.hasResponded);
    const initial: Record<string, RespondAnswer> = {};
    for (const q of message.questions) {
      initial[q.id] = {
        questionId: q.id,
        optionIds: q.selectedOptionIds ?? [],
        textValue: q.textValue ?? '',
      };
    }
    setAnswers(initial);
  }, [message?.id, message?.hasResponded]);

  useEffect(() => {
    if (!message) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && message.modalDismissible && !submitting) {
        void handleDismiss();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [message, submitting]);

  const kindLabel = useMemo(() => {
    if (!message) return '';
    if (message.kind === 'poll') return t('common:inApp.poll');
    if (message.kind === 'questionnaire') return t('common:inApp.questionnaire');
    return t('common:inApp.announcement');
  }, [message, t]);

  const answeredCount = useMemo(() => {
    if (!message) return 0;
    return message.questions.filter((q) => {
      const a = answers[q.id];
      if (!q.required) return true;
      return (a?.optionIds?.length ?? 0) > 0 || Boolean(a?.textValue?.trim());
    }).length;
  }, [answers, message]);

  const canSubmit = useMemo(() => {
    if (!message || message.kind === 'announcement') return true;
    return message.questions.every((q) => {
      if (!q.required) return true;
      const a = answers[q.id];
      return (a?.optionIds?.length ?? 0) > 0 || Boolean(a?.textValue?.trim());
    });
  }, [answers, message]);

  if (!message) return null;

  const handleDismiss = async () => {
    if (!message.modalDismissible) return;
    try {
      await inAppMessageService.dismiss(message.id);
    } catch {
      // Still close locally.
    }
    onUpdated(null);
    onClose();
  };

  const setOption = (questionId: string, optionId: string, multi: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? { questionId, optionIds: [] };
      let optionIds = current.optionIds ?? [];
      if (multi) {
        optionIds = optionIds.includes(optionId)
          ? optionIds.filter((id) => id !== optionId)
          : [...optionIds, optionId];
      } else {
        optionIds = [optionId];
      }
      return { ...prev, [questionId]: { ...current, optionIds, textValue: undefined } };
    });
    setError(null);
  };

  const setText = (questionId: string, textValue: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { questionId, optionIds: [], textValue },
    }));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError(t('common:inApp.answerRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = message.questions.map((q) => {
        const a = answers[q.id];
        return {
          questionId: q.id,
          optionIds: a?.optionIds?.length ? a.optionIds : undefined,
          textValue: a?.textValue?.trim() ? a.textValue.trim() : undefined,
        };
      });
      const updated = await inAppMessageService.respond(message.id, payload);
      onUpdated(updated);
      setThanks(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAckAnnouncement = async () => {
    try {
      await inAppMessageService.markSeen(message.id);
    } catch {
      // ignore
    }
    if (message.ctaUrl) {
      window.open(message.ctaUrl, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  const priorityClass = `priority-${(message.priority || 'medium').toLowerCase()}`;
  const questionTotal = message.questions.length;

  return createPortal(
    <div
      className="inapp-backdrop"
      role="presentation"
      onClick={() => {
        if (message.modalDismissible && !submitting) void handleDismiss();
      }}
    >
      <div
        className={`inapp-dialog ${priorityClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inapp-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inapp-hero" aria-hidden>
          <div className={`inapp-hero-icon kind-${message.kind}`}>
            <KindIcon kind={message.kind} />
          </div>
        </div>

        <div className="inapp-header">
          <div>
            <p className="inapp-kicker">{kindLabel}</p>
            <h2 id="inapp-title" className="inapp-title">
              {message.title}
            </h2>
          </div>
          {message.modalDismissible && (
            <button
              type="button"
              className="inapp-close"
              onClick={() => void handleDismiss()}
              aria-label={t('common:close')}
              disabled={submitting}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {message.body && <p className="inapp-body">{message.body}</p>}

        {thanks && message.kind !== 'announcement' && (
          <div className="inapp-thanks" role="status">
            <CheckCircle2 size={22} aria-hidden />
            <div>
              <strong>{t('common:inApp.thanksTitle')}</strong>
              <p>{t('common:inApp.thanks')}</p>
            </div>
          </div>
        )}

        {message.kind === 'announcement' && (
          <div className="inapp-actions">
            <Button variant="primary" fullWidth onClick={() => void handleAckAnnouncement()}>
              {message.ctaLabel || t('common:inApp.gotIt')}
            </Button>
            {message.modalDismissible && (
              <Button variant="ghost" fullWidth onClick={() => void handleDismiss()}>
                {t('common:close')}
              </Button>
            )}
          </div>
        )}

        {message.kind !== 'announcement' && !thanks && (
          <div className="inapp-questions">
            {questionTotal > 1 && (
              <div className="inapp-progress" aria-hidden>
                <div className="inapp-progress-track">
                  <div
                    className="inapp-progress-fill"
                    style={{ width: `${Math.round((answeredCount / questionTotal) * 100)}%` }}
                  />
                </div>
                <span>
                  {answeredCount}/{questionTotal}
                </span>
              </div>
            )}

            {message.questions.map((q, index) => {
              const selected = answers[q.id]?.optionIds ?? [];
              const multi = q.type === 'multi';
              const cardOptions = q.type === 'yes_no' || q.options.length <= 4;
              return (
                <div key={q.id} className="inapp-question">
                  <div className="inapp-prompt">
                    {questionTotal > 1 && (
                      <span className="inapp-q-index">{index + 1}.</span>
                    )}
                    <span>
                      {q.prompt}
                      {q.required ? (
                        <span className="inapp-required" title={t('common:inApp.required')}>
                          {' '}
                          *
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {q.type === 'short_text' ? (
                    <textarea
                      className="inapp-textarea"
                      rows={3}
                      placeholder={t('common:inApp.textPlaceholder')}
                      value={answers[q.id]?.textValue ?? ''}
                      onChange={(e) => setText(q.id, e.target.value)}
                    />
                  ) : (
                    <div className={`inapp-options${cardOptions ? ' is-cards' : ''}`}>
                      {q.options.map((opt) => {
                        const isOn = selected.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            className={`inapp-option${isOn ? ' is-selected' : ''}`}
                            onClick={() => setOption(q.id, opt.id, multi)}
                            aria-pressed={isOn}
                          >
                            <span className="inapp-option-check" aria-hidden>
                              {isOn ? <CheckCircle2 size={16} /> : null}
                            </span>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {multi && (
                    <p className="inapp-hint">{t('common:inApp.multiHint')}</p>
                  )}
                </div>
              );
            })}
            {error && (
              <div className="inapp-error" role="alert">
                {error}
              </div>
            )}
            <div className="inapp-actions">
              <Button
                variant="primary"
                fullWidth
                loading={submitting}
                disabled={!canSubmit}
                onClick={() => void handleSubmit()}
              >
                {t('common:inApp.submit')}
              </Button>
              {message.modalDismissible && (
                <Button
                  variant="ghost"
                  fullWidth
                  disabled={submitting}
                  onClick={() => void handleDismiss()}
                >
                  {t('common:inApp.later')}
                </Button>
              )}
            </div>
          </div>
        )}

        {thanks && message.pollResults && message.pollResults.length > 0 && (
          <div className="inapp-poll-results">
            <h3>{t('common:inApp.results')}</h3>
            {message.pollResults.map((r) => {
              const total = message.pollResults!.reduce((sum, x) => sum + x.count, 0) || 1;
              const pct = Math.round((r.count / total) * 100);
              return (
                <div key={r.optionId} className="inapp-poll-row">
                  <div className="inapp-poll-label">
                    <span>{r.label}</span>
                    <span>
                      {r.count} ({pct}%)
                    </span>
                  </div>
                  <div className="inapp-poll-bar">
                    <div style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {thanks && (
          <div className="inapp-actions">
            <Button variant="primary" fullWidth onClick={onClose}>
              {t('common:inApp.done')}
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default InAppMessageHost;
