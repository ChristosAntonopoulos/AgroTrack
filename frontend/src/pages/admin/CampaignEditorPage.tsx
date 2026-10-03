import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  adminCampaignService,
  CampaignResponses,
  InAppCampaign,
  UpsertInAppCampaign,
} from '../../services/inAppCampaignService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import Breadcrumbs from '../../components/Layout/Breadcrumbs';
import PageContainer from '../../components/Common/PageContainer';
import PageHeader from '../../components/Common/PageHeader';
import Button from '../../components/Common/Button';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import './AdminPages.css';

const emptyForm = (): UpsertInAppCampaign => ({
  kind: 'announcement',
  title: { en: '', el: '' },
  body: { en: '', el: '' },
  placements: { inbox: true, modal: false },
  priority: 'medium',
  audience: { roles: [] },
  startsAt: null,
  endsAt: null,
  modalDismissible: true,
  payload: {
    showResultsAfterVote: true,
    questions: [],
    ctaLabelEn: '',
    ctaLabelEl: '',
    ctaUrl: '',
  },
});

const ROLE_OPTIONS = ['FieldOwner', 'Producer', 'Agronomist', 'ServiceProvider', 'Administrator'];

const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

const CampaignEditorPage: React.FC = () => {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatDateTime } = useLocaleFormatters();

  const [form, setForm] = useState<UpsertInAppCampaign>(emptyForm);
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<CampaignResponses | null>(null);

  const load = useCallback(async () => {
    if (isNew || !id) return;
    setLoading(true);
    setError(null);
    try {
      const campaign = await adminCampaignService.get(id);
      applyCampaign(campaign);
      if (campaign.status !== 'draft') {
        setResponses(await adminCampaignService.getResponses(id));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  }, [id, isNew, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyCampaign = (campaign: InAppCampaign) => {
    setStatus(campaign.status);
    setForm({
      kind: campaign.kind,
      title: campaign.title,
      body: campaign.body,
      placements: campaign.placements,
      priority: campaign.priority,
      audience: campaign.audience,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      modalDismissible: campaign.modalDismissible,
      payload: {
        ...campaign.payload,
        questions: campaign.payload.questions ?? [],
      },
    });
  };

  const needsQuestions = form.kind === 'questionnaire' || form.kind === 'poll';

  const ensureQuestions = () => {
    if (!needsQuestions) return;
    if (form.payload.questions.length > 0) return;
    setForm((prev) => ({
      ...prev,
      payload: {
        ...prev.payload,
        questions: [
          {
            id: '',
            type: form.kind === 'poll' ? 'single' : 'yes_no',
            prompt: { en: '', el: '' },
            required: true,
            options:
              form.kind === 'poll'
                ? [
                    { id: '', label: { en: 'Option A', el: 'Επιλογή Α' } },
                    { id: '', label: { en: 'Option B', el: 'Επιλογή Β' } },
                  ]
                : [],
          },
        ],
      },
    }));
  };

  useEffect(() => {
    ensureQuestions();
  }, [form.kind]);

  const save = async (andPublish = false) => {
    setSaving(true);
    setError(null);
    try {
      const payload: UpsertInAppCampaign = {
        ...form,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        payload: {
          ...form.payload,
          ctaLabelEn: form.payload.ctaLabelEn || null,
          ctaLabelEl: form.payload.ctaLabelEl || null,
          ctaUrl: form.payload.ctaUrl || null,
          questions: needsQuestions ? form.payload.questions : [],
        },
      };
      let saved: InAppCampaign;
      if (isNew) {
        saved = await adminCampaignService.create(payload);
      } else {
        saved = await adminCampaignService.update(id!, payload);
      }
      if (andPublish) {
        saved = await adminCampaignService.publish(saved.id);
      }
      navigate(`/admin/campaigns/${saved.id}`, { replace: true });
      applyCampaign(saved);
      if (saved.status !== 'draft') {
        setResponses(await adminCampaignService.getResponses(saved.id));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!id || isNew) return;
    setSaving(true);
    try {
      const saved = await adminCampaignService.archive(id);
      applyCampaign(saved);
    } catch (err) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  const title = useMemo(
    () => (isNew ? t('admin:campaigns.new') : t('admin:campaigns.edit')),
    [isNew, t]
  );

  if (user?.role !== 'Administrator') {
    return (
      <PageContainer>
        <div className="admin-page">
          <Breadcrumbs />
          <div className="error-message">{t('admin:campaigns.forbidden')}</div>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="admin-page">
        <Breadcrumbs />
        <PageHeader
          title={title}
          subtitle={t('admin:campaigns.editorSubtitle')}
          backTo="/admin/campaigns"
          backLabel={t('common:back')}
          actions={
            <div className="admin-header-actions">
              {status !== 'archived' && (
                <Button variant="outline" loading={saving} onClick={() => void save(false)}>
                  {t('common:save')}
                </Button>
              )}
              {status !== 'published' && status !== 'archived' && (
                <Button variant="primary" loading={saving} onClick={() => void save(true)}>
                  {t('admin:campaigns.publish')}
                </Button>
              )}
              {status === 'published' && (
                <Button variant="warning" loading={saving} onClick={() => void archive()}>
                  {t('admin:campaigns.archive')}
                </Button>
              )}
            </div>
          }
        />

        {error && <div className="error-message">{error}</div>}
        <p className="admin-status-line">
          {t('admin:campaigns.columns.status')}: <span className={`admin-badge status-${status}`}>{status}</span>
        </p>

        <div className="admin-form-grid">
          <label>
            {t('admin:campaigns.fields.kind')}
            <select
              value={form.kind}
              onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}
            >
              <option value="announcement">{t('admin:campaigns.kinds.announcement')}</option>
              <option value="questionnaire">{t('admin:campaigns.kinds.questionnaire')}</option>
              <option value="poll">{t('admin:campaigns.kinds.poll')}</option>
            </select>
          </label>
          <label>
            {t('admin:campaigns.fields.priority')}
            <select
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
            >
              <option value="critical">critical</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.placements.inbox}
              onChange={(e) =>
                setForm((p) => ({ ...p, placements: { ...p.placements, inbox: e.target.checked } }))
              }
            />
            {t('admin:campaigns.fields.inbox')}
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.placements.modal}
              onChange={(e) =>
                setForm((p) => ({ ...p, placements: { ...p.placements, modal: e.target.checked } }))
              }
            />
            {t('admin:campaigns.fields.modal')}
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.modalDismissible}
              onChange={(e) => setForm((p) => ({ ...p, modalDismissible: e.target.checked }))}
            />
            {t('admin:campaigns.fields.dismissible')}
          </label>
          <label>
            {t('admin:campaigns.fields.startsAt')}
            <input
              type="datetime-local"
              value={toLocalInput(form.startsAt)}
              onChange={(e) => setForm((p) => ({ ...p, startsAt: fromLocalInput(e.target.value) }))}
            />
          </label>
          <label>
            {t('admin:campaigns.fields.endsAt')}
            <input
              type="datetime-local"
              value={toLocalInput(form.endsAt)}
              onChange={(e) => setForm((p) => ({ ...p, endsAt: fromLocalInput(e.target.value) }))}
            />
          </label>
        </div>

        <div className="admin-form-grid">
          <label>
            {t('admin:campaigns.fields.titleEn')}
            <input
              value={form.title.en}
              onChange={(e) => setForm((p) => ({ ...p, title: { ...p.title, en: e.target.value } }))}
            />
          </label>
          <label>
            {t('admin:campaigns.fields.titleEl')}
            <input
              value={form.title.el}
              onChange={(e) => setForm((p) => ({ ...p, title: { ...p.title, el: e.target.value } }))}
            />
          </label>
          <label className="admin-span-2">
            {t('admin:campaigns.fields.bodyEn')}
            <textarea
              rows={3}
              value={form.body.en}
              onChange={(e) => setForm((p) => ({ ...p, body: { ...p.body, en: e.target.value } }))}
            />
          </label>
          <label className="admin-span-2">
            {t('admin:campaigns.fields.bodyEl')}
            <textarea
              rows={3}
              value={form.body.el}
              onChange={(e) => setForm((p) => ({ ...p, body: { ...p.body, el: e.target.value } }))}
            />
          </label>
        </div>

        <fieldset className="admin-fieldset">
          <legend>{t('admin:campaigns.fields.audience')}</legend>
          <p className="admin-hint">{t('admin:campaigns.fields.audienceHint')}</p>
          <div className="admin-role-grid">
            {ROLE_OPTIONS.map((role) => {
              const checked = form.audience.roles.includes(role);
              return (
                <label key={role} className="admin-check">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        audience: {
                          roles: e.target.checked
                            ? [...p.audience.roles, role]
                            : p.audience.roles.filter((r) => r !== role),
                        },
                      }))
                    }
                  />
                  {role}
                </label>
              );
            })}
          </div>
        </fieldset>

        {form.kind === 'announcement' && (
          <div className="admin-form-grid">
            <label>
              {t('admin:campaigns.fields.ctaEn')}
              <input
                value={form.payload.ctaLabelEn ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, payload: { ...p.payload, ctaLabelEn: e.target.value } }))
                }
              />
            </label>
            <label>
              {t('admin:campaigns.fields.ctaEl')}
              <input
                value={form.payload.ctaLabelEl ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, payload: { ...p.payload, ctaLabelEl: e.target.value } }))
                }
              />
            </label>
            <label className="admin-span-2">
              {t('admin:campaigns.fields.ctaUrl')}
              <input
                value={form.payload.ctaUrl ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, payload: { ...p.payload, ctaUrl: e.target.value } }))
                }
              />
            </label>
          </div>
        )}

        {needsQuestions &&
          form.payload.questions.map((q, qi) => (
            <fieldset key={qi} className="admin-fieldset">
              <legend>
                {t('admin:campaigns.fields.question')} {qi + 1}
              </legend>
              <div className="admin-form-grid">
                <label>
                  {t('admin:campaigns.fields.questionType')}
                  <select
                    value={q.type}
                    onChange={(e) =>
                      setForm((p) => {
                        const questions = [...p.payload.questions];
                        questions[qi] = { ...questions[qi], type: e.target.value };
                        return { ...p, payload: { ...p.payload, questions } };
                      })
                    }
                  >
                    <option value="yes_no">yes_no</option>
                    <option value="single">single</option>
                    <option value="multi">multi</option>
                    <option value="short_text">short_text</option>
                  </select>
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) =>
                      setForm((p) => {
                        const questions = [...p.payload.questions];
                        questions[qi] = { ...questions[qi], required: e.target.checked };
                        return { ...p, payload: { ...p.payload, questions } };
                      })
                    }
                  />
                  {t('admin:campaigns.fields.required')}
                </label>
                <label>
                  {t('admin:campaigns.fields.promptEn')}
                  <input
                    value={q.prompt.en}
                    onChange={(e) =>
                      setForm((p) => {
                        const questions = [...p.payload.questions];
                        questions[qi] = {
                          ...questions[qi],
                          prompt: { ...questions[qi].prompt, en: e.target.value },
                        };
                        return { ...p, payload: { ...p.payload, questions } };
                      })
                    }
                  />
                </label>
                <label>
                  {t('admin:campaigns.fields.promptEl')}
                  <input
                    value={q.prompt.el}
                    onChange={(e) =>
                      setForm((p) => {
                        const questions = [...p.payload.questions];
                        questions[qi] = {
                          ...questions[qi],
                          prompt: { ...questions[qi].prompt, el: e.target.value },
                        };
                        return { ...p, payload: { ...p.payload, questions } };
                      })
                    }
                  />
                </label>
              </div>

              {q.type !== 'short_text' && q.type !== 'yes_no' && (
                <div className="admin-options">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="admin-option-row">
                      <input
                        placeholder="EN"
                        value={opt.label.en}
                        onChange={(e) =>
                          setForm((p) => {
                            const questions = [...p.payload.questions];
                            const options = [...questions[qi].options];
                            options[oi] = {
                              ...options[oi],
                              label: { ...options[oi].label, en: e.target.value },
                            };
                            questions[qi] = { ...questions[qi], options };
                            return { ...p, payload: { ...p.payload, questions } };
                          })
                        }
                      />
                      <input
                        placeholder="EL"
                        value={opt.label.el}
                        onChange={(e) =>
                          setForm((p) => {
                            const questions = [...p.payload.questions];
                            const options = [...questions[qi].options];
                            options[oi] = {
                              ...options[oi],
                              label: { ...options[oi].label, el: e.target.value },
                            };
                            questions[qi] = { ...questions[qi], options };
                            return { ...p, payload: { ...p.payload, questions } };
                          })
                        }
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() =>
                      setForm((p) => {
                        const questions = [...p.payload.questions];
                        questions[qi] = {
                          ...questions[qi],
                          options: [
                            ...questions[qi].options,
                            { id: '', label: { en: '', el: '' } },
                          ],
                        };
                        return { ...p, payload: { ...p.payload, questions } };
                      })
                    }
                  >
                    {t('admin:campaigns.fields.addOption')}
                  </Button>
                </div>
              )}
            </fieldset>
          ))}

        {form.kind === 'poll' && (
          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.payload.showResultsAfterVote}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  payload: { ...p.payload, showResultsAfterVote: e.target.checked },
                }))
              }
            />
            {t('admin:campaigns.fields.showResults')}
          </label>
        )}

        {form.kind === 'questionnaire' && (
          <Button
            variant="outline"
            type="button"
            onClick={() =>
              setForm((p) => ({
                ...p,
                payload: {
                  ...p.payload,
                  questions: [
                    ...p.payload.questions,
                    {
                      id: '',
                      type: 'yes_no',
                      prompt: { en: '', el: '' },
                      required: true,
                      options: [],
                    },
                  ],
                },
              }))
            }
          >
            {t('admin:campaigns.fields.addQuestion')}
          </Button>
        )}

        {responses && (
          <section className="admin-responses">
            <h2>{t('admin:campaigns.responses.title')}</h2>
            <div className="admin-stat-grid">
              <div>
                <strong>{responses.completedCount}</strong>
                <span>{t('admin:campaigns.responses.completed')}</span>
              </div>
              <div>
                <strong>{responses.dismissedCount}</strong>
                <span>{t('admin:campaigns.responses.dismissed')}</span>
              </div>
              <div>
                <strong>{responses.seenCount}</strong>
                <span>{t('admin:campaigns.responses.seen')}</span>
              </div>
              <div>
                <strong>{responses.deliveredCount}</strong>
                <span>{t('admin:campaigns.responses.delivered')}</span>
              </div>
            </div>
            {responses.questionTallies.map((q) => (
              <div key={q.questionId} className="admin-tally">
                <h3>{q.prompt}</h3>
                {q.options.map((o) => (
                  <div key={o.optionId} className="admin-tally-row">
                    <span>{o.label}</span>
                    <strong>{o.count}</strong>
                  </div>
                ))}
                {q.textAnswerCount > 0 && (
                  <p>
                    {t('admin:campaigns.responses.textAnswers')}: {q.textAnswerCount}
                  </p>
                )}
              </div>
            ))}
            {responses.recentAnswers.length > 0 && (
              <div className="admin-recent">
                <h3>{t('admin:campaigns.responses.recent')}</h3>
                <ul>
                  {responses.recentAnswers.slice(0, 20).map((a, i) => (
                    <li key={`${a.questionId}-${i}`}>
                      <strong>{a.userDisplayName}</strong>
                      {a.userRole ? ` (${a.userRole})` : ''} —{' '}
                      {a.textValue || a.optionIds.join(', ')} — {formatDateTime(a.submittedAt)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <p>
          <Link to="/admin/campaigns">{t('admin:campaigns.backToList')}</Link>
        </p>
      </div>
    </PageContainer>
  );
};

export default CampaignEditorPage;
