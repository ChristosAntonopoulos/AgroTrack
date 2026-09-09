import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { getPartnerService } from '../services/serviceFactory';
import { PartnerPublicProfile, categoryName } from '../services/partnerService';
import { fieldPeopleService } from '../services/fieldPeopleService';
import { getApiErrorMessage } from '../utils/translateApiError';
import PhoneActions from '../components/Partners/PhoneActions';
import './PartnersPage.css';

const PartnerProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const { userId } = useParams<{ userId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PartnerPublicProfile | null>(null);
  const [message, setMessage] = useState('');
  const [start, setStart] = useState(params.get('start') || '');
  const [end, setEnd] = useState(params.get('end') || '');
  const [categoryId, setCategoryId] = useState(params.get('categoryId') || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fieldId = params.get('fieldId') || '';

  useEffect(() => {
    if (!userId) return;
    getPartnerService()
      .getProfile(userId)
      .then((p) => {
        setProfile(p);
        if (!categoryId && p.categories[0]) setCategoryId(p.categories[0].id);
      })
      .catch((err) => setError(getApiErrorMessage(err, t)))
      .finally(() => setLoading(false));
  }, [userId, t]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !message.trim()) return;
    try {
      setSending(true);
      setError(null);
      await getPartnerService().contact(userId, {
        serviceCategoryId: categoryId,
        fieldId: fieldId || undefined,
        taskId: params.get('taskId') || undefined,
        suggestedStart: start || undefined,
        suggestedEnd: end || undefined,
        message: message.trim(),
      });
      setSent(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSending(false);
    }
  };

  const addToField = async () => {
    if (!userId || !fieldId) return;
    try {
      setAdding(true);
      setError(null);
      await fieldPeopleService.upsertMembership(fieldId, userId, ['work']);
      setAdded(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="partners-page">
          <Breadcrumbs />
          <LoadingSpinner className="page-inline-loading" />
        </div>
      </PageContainer>
    );
  }
  if (!profile) {
    return (
      <PageContainer>
        <div className="error-message">{error || t('partners:title')}</div>
        <Button to="/partners" variant="outline">
          {t('partners:title')}
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="partners-page">
        <Breadcrumbs />
        <div className="partner-result">
          {profile.photoUrl && <img className="partner-photo" src={profile.photoUrl} alt="" />}
          <div>
            <h1>{profile.displayName}</h1>
            <div className="partner-chips">
              {profile.categories.map((c) => (
                <span key={c.id} className="partner-chip partner-chip-job">
                  {categoryName(c, i18n.language)}
                </span>
              ))}
            </div>
            <div className="partner-meta">
              {profile.baseAreaLabel && <span>{profile.baseAreaLabel}</span>}
              <span>{t('partners:radius', { km: profile.serviceRadiusKm })}</span>
            </div>
          </div>
        </div>

        <p className="partners-lead">{profile.shortDescription}</p>
        {profile.equipment && (
          <p className="partners-lead">
            {t('partners:equipment')}: {profile.equipment}
          </p>
        )}
        {profile.phoneNumber ? (
          <div className="partner-profile-phone">
            <p className="partner-person-phone">
              {t('partners:phone')}: {profile.phoneNumber}
            </p>
            <PhoneActions phone={profile.phoneNumber} />
          </div>
        ) : null}
        <p className="partners-lead">{profile.pricingNote || t('partners:contactForPrice')}</p>

        <Card title={t('partners:contact')}>
          {sent ? (
            <p>{t('partners:sentOk')}</p>
          ) : (
            <form className="partners-form" onSubmit={submit}>
              <p className="partners-lead">{t('partners:contactNoAccess')}</p>
              <p className="partners-lead">{t('partners:privacyNote')}</p>
              <label>
                {t('partners:filters.service')}
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  {profile.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryName(c, i18n.language)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('partners:when')}
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </label>
              <label>
                {t('partners:when')}
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </label>
              <label>
                {t('partners:message')}
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} required />
              </label>
              {error && <div className="error-message">{error}</div>}
              <Button type="submit" loading={sending}>
                {t('partners:sendRequest')}
              </Button>
            </form>
          )}
        </Card>

        {fieldId ? (
          <p className="partners-quiet">
            {added ? (
              t('partners:addedToField')
            ) : (
              <button type="button" className="partners-text-link" onClick={() => void addToField()} disabled={adding}>
                {t('partners:addToField')}
              </button>
            )}
            <span className="partners-lead" style={{ display: 'block', marginTop: '0.35rem' }}>
              {t('partners:addToFieldHint')}
            </span>
          </p>
        ) : null}

        <Button variant="ghost" onClick={() => navigate(-1)}>
          {t('common:back')}
        </Button>
      </div>
    </PageContainer>
  );
};

export default PartnerProfilePage;
