import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageContainer from '../components/Common/PageContainer';
import PageHeader from '../components/Common/PageHeader';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { getPartnerService } from '../services/serviceFactory';
import { ServiceCategory, ServiceProviderProfile, categoryName } from '../services/partnerService';
import ServiceProfileWizard, {
  WizardForm,
  formFromProfile,
} from '../components/Partners/ServiceProfileWizard';
import { getApiErrorMessage } from '../utils/translateApiError';
import './PartnersPage.css';

const MyServiceProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const [profile, setProfile] = useState<ServiceProviderProfile | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [form, setForm] = useState<WizardForm>(formFromProfile(null));
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [mine, cats] = await Promise.all([
      getPartnerService().getMyProfile(),
      getPartnerService().getCategories(),
    ]);
    setCategories(cats);
    setProfile(mine);
    setForm(formFromProfile(mine));
    setEditing(!mine || !mine.isListed);
  };

  useEffect(() => {
    load()
      .catch((err) => setError(getApiErrorMessage(err, t)))
      .finally(() => setLoading(false));
  }, [t]);

  const activate = async () => {
    const created = await getPartnerService().activate();
    setProfile(created);
    setForm(formFromProfile(created));
    setEditing(true);
  };

  const pauseOrResume = async () => {
    if (!profile) return;
    const next = profile.isPaused ? await getPartnerService().activate() : await getPartnerService().pause();
    setProfile(next);
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="partners-page">
          <Breadcrumbs />
          <PageHeader title={t('partners:myServices')} subtitle={t('partners:offerHint')} />
          <LoadingSpinner className="page-inline-loading" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="partners-page">
        <Breadcrumbs />
        <PageHeader
          title={t('partners:myServices')}
          subtitle={t('partners:offerHint')}
          actions={
            profile ? (
              <div className="partner-actions">
                <Button variant="outline" onClick={pauseOrResume}>
                  {profile.isPaused ? t('partners:resume') : t('partners:pause')}
                </Button>
                <Button variant="outline" to="/partners/requests">
                  {t('partners:requests')}
                </Button>
                {profile.isListed && !editing ? (
                  <Button onClick={() => setEditing(true)}>{t('partners:wizard.edit')}</Button>
                ) : null}
              </div>
            ) : (
              <Button onClick={activate}>{t('partners:enable')}</Button>
            )
          }
        />

        {profile ? (
          <>
            <p className="partners-inline-hint" role="status">
              {profile.isPaused
                ? t('partners:paused')
                : profile.isListed
                  ? t('partners:listed')
                  : t('partners:notListed')}
            </p>

            {editing ? (
              <Card className="partners-wizard-card">
                {error && <div className="error-message">{error}</div>}
                <ServiceProfileWizard
                  profile={profile}
                  categories={categories}
                  form={form}
                  setForm={setForm}
                  onError={(message) => setError(message)}
                  onPublished={(updated) => {
                    setProfile(updated);
                    setForm(formFromProfile(updated));
                    setEditing(!updated.isListed);
                  }}
                />
              </Card>
            ) : (
              <Card>
                <h2>{profile.displayName}</h2>
                <p>{profile.shortDescription}</p>
                <p>
                  {profile.baseAreaLabel} · {t('partners:radius', { km: profile.serviceRadiusKm })}
                </p>
                <p>
                  {t(`partners:kind.${profile.providerKind}`)}
                  {profile.crewSize ? ` · ${t('partners:crewCount', { count: profile.crewSize })}` : ''}
                </p>
                <div className="partners-chip-select partners-profile-chips">
                  {profile.categories.map((c) => (
                    <span key={c.id} className="partners-select-chip is-on">
                      {categoryName(c, i18n.language)}
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </PageContainer>
  );
};

export default MyServiceProfilePage;
