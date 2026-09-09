import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import {
  ServiceCategory,
  ServiceProviderProfile,
  UpsertServiceProfilePayload,
  categoryName,
  childCategories,
  offersMill,
  parentCategories,
} from '../../services/partnerService';
import { categoryIcon } from './categoryIcons';
import { fileUploadService } from '../../services/fileUploadService';
import { getPartnerService } from '../../services/serviceFactory';

export type WizardForm = {
  displayName: string;
  shortDescription: string;
  baseAreaLabel: string;
  serviceRadiusKm: number;
  providerKind: string;
  contactPreference: string;
  availability: string;
  phoneNumber: string;
  showPhone: boolean;
  experienceYears: string;
  crewSize: string;
  equipment: string;
  businessName: string;
  pricingNote: string;
  millOperatingPeriod: string;
  millProcessingMethod: string;
  millOrganic: boolean;
  millAppointmentRequired: boolean;
  serviceCategoryIds: string[];
  latitude?: number;
  longitude?: number;
};

export const formFromProfile = (mine: ServiceProviderProfile | null, fallbackName = ''): WizardForm => ({
  displayName: mine?.displayName || fallbackName,
  shortDescription: mine?.shortDescription || '',
  baseAreaLabel: mine?.baseAreaLabel || '',
  serviceRadiusKm: mine?.serviceRadiusKm || 50,
  providerKind: mine?.providerKind || 'Individual',
  contactPreference: mine?.contactPreference || 'InApp',
  availability: mine?.availability || 'Available',
  phoneNumber: mine?.phoneNumber || '',
  showPhone: mine?.showPhone || false,
  experienceYears: mine?.experienceYears != null ? String(mine.experienceYears) : '',
  crewSize: mine?.crewSize != null ? String(mine.crewSize) : '',
  equipment: mine?.equipment || '',
  businessName: mine?.businessName || '',
  pricingNote: mine?.pricingNote || 'Contact for price',
  millOperatingPeriod: mine?.millOperatingPeriod || '',
  millProcessingMethod: mine?.millProcessingMethod || '',
  millOrganic: mine?.millOrganic || false,
  millAppointmentRequired: mine?.millAppointmentRequired || false,
  serviceCategoryIds: mine?.serviceCategoryIds || [],
});

const toPayload = (form: WizardForm): UpsertServiceProfilePayload => ({
  displayName: form.displayName,
  shortDescription: form.shortDescription,
  baseAreaLabel: form.baseAreaLabel,
  serviceRadiusKm: Number(form.serviceRadiusKm),
  providerKind: form.providerKind,
  contactPreference: form.contactPreference,
  availability: form.availability,
  phoneNumber: form.phoneNumber,
  showPhone: form.showPhone,
  experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
  crewSize: form.crewSize ? Number(form.crewSize) : null,
  equipment: form.equipment,
  businessName: form.businessName,
  pricingNote: form.pricingNote,
  millOperatingPeriod: form.millOperatingPeriod,
  millProcessingMethod: form.millProcessingMethod,
  millOrganic: form.millOrganic,
  millAppointmentRequired: form.millAppointmentRequired,
  serviceCategoryIds: form.serviceCategoryIds,
  latitude: form.latitude,
  longitude: form.longitude,
});

type Props = {
  profile: ServiceProviderProfile;
  categories: ServiceCategory[];
  form: WizardForm;
  setForm: (next: WizardForm) => void;
  onPublished: (profile: ServiceProviderProfile) => void;
  onError: (message: string) => void;
};

const ServiceProfileWizard: React.FC<Props> = ({
  profile,
  categories,
  form,
  setForm,
  onPublished,
  onError,
}) => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const parents = useMemo(() => parentCategories(categories), [categories]);
  const millSelected = offersMill(categories, form.serviceCategoryIds);
  const selectedCount = form.serviceCategoryIds.length;

  const setIds = (ids: string[]) => {
    setForm({ ...form, serviceCategoryIds: Array.from(new Set(ids)) });
  };

  const isOn = (id: string) => form.serviceCategoryIds.includes(id);

  const toggleParent = (parent: ServiceCategory, children: ServiceCategory[]) => {
    const childIds = children.map((c) => c.id);
    if (isOn(parent.id)) {
      setIds(form.serviceCategoryIds.filter((id) => id !== parent.id && !childIds.includes(id)));
      return;
    }
    setIds([...form.serviceCategoryIds, parent.id]);
  };

  const toggleChild = (parent: ServiceCategory, childId: string) => {
    if (isOn(childId)) {
      setIds(form.serviceCategoryIds.filter((id) => id !== childId));
      return;
    }
    const next = [...form.serviceCategoryIds, childId];
    if (!next.includes(parent.id)) next.push(parent.id);
    setIds(next);
  };

  const useLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm({
        ...form,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    });
  };

  const onPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileUploadService.uploadFile(file);
      await getPartnerService().saveProfile({ photoUrl: url });
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  const canNext = () => {
    if (step === 1) return form.serviceCategoryIds.length > 0;
    if (step === 2) return form.serviceRadiusKm > 0 && Boolean(form.baseAreaLabel || form.latitude || profile.hasBaseLocation);
    if (step === 3) return form.displayName.trim().length > 1 && form.shortDescription.trim().length > 8;
    return true;
  };

  const publish = async () => {
    try {
      setSaving(true);
      const updated = await getPartnerService().saveProfile(toPayload(form));
      onPublished(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const goStep = (n: number) => {
    if (n < step) setStep(n);
  };

  return (
    <div className="partners-wizard">
      <ol className="partners-steps" aria-label={t('partners:wizard.stepsLabel')}>
        {[1, 2, 3, 4].map((n) => {
          const state = n === step ? 'active' : n < step ? 'done' : '';
          return (
            <li key={n} className={state}>
              <button
                type="button"
                className="partners-step-btn"
                disabled={n >= step}
                onClick={() => goStep(n)}
              >
                <span className="partners-step-num" aria-hidden>
                  {n}
                </span>
                <span>{t(`partners:wizard.step${n}`)}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <div className="partners-wizard-panel">
          <div className="partners-wizard-panel-head">
            <div>
              <h2 className="partners-wizard-title">{t('partners:wizard.servicesTitle')}</h2>
              <p className="partners-lead">{t('partners:wizard.servicesHint')}</p>
            </div>
            <p className="partners-selected-count" aria-live="polite">
              {t('partners:wizard.selectedCount', { count: selectedCount })}
            </p>
          </div>

          <div className="partners-service-grid">
            {parents.map((parent) => {
              const children = childCategories(categories, parent.id);
              const parentOn = isOn(parent.id);
              const childSelected = children.some((c) => isOn(c.id));
              const cardOn = parentOn || childSelected;

              return (
                <article
                  key={parent.id}
                  className={`partners-service-card${cardOn ? ' is-selected' : ''}`}
                >
                  <button
                    type="button"
                    className="partners-service-card-head"
                    onClick={() => toggleParent(parent, children)}
                    aria-pressed={parentOn}
                  >
                    <span className="partners-service-card-icon" aria-hidden>
                      {categoryIcon(parent.icon)}
                    </span>
                    <span className="partners-service-card-title">
                      {categoryName(parent, i18n.language)}
                    </span>
                    <span className={`partners-service-check${parentOn ? ' is-on' : ''}`} aria-hidden>
                      {parentOn ? '✓' : ''}
                    </span>
                  </button>

                  {children.length > 0 ? (
                    <div className="partners-service-children" role="group" aria-label={categoryName(parent, i18n.language)}>
                      {children.map((child) => {
                        const on = isOn(child.id);
                        return (
                          <button
                            key={child.id}
                            type="button"
                            className={`partners-select-chip${on ? ' is-on' : ''}`}
                            aria-pressed={on}
                            onClick={() => toggleChild(parent, child.id)}
                          >
                            {categoryName(child, i18n.language)}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="partners-wizard-panel partners-form partners-form--wide">
          <h2 className="partners-wizard-title">{t('partners:wizard.step2')}</h2>
          <label>
            <span>{t('partners:baseArea')}</span>
            <input
              value={form.baseAreaLabel}
              onChange={(e) => setForm({ ...form, baseAreaLabel: e.target.value })}
              required
            />
          </label>
          <p className="partners-field-hint">{t('partners:baseAreaHint')}</p>
          <Button type="button" variant="outline" onClick={useLocation}>
            {t('partners:useMyLocation')}
          </Button>
          {(form.latitude || profile.hasBaseLocation) && (
            <p className="partners-inline-hint">{t('partners:locationSet')}</p>
          )}
          <label>
            <span>{t('partners:serviceRadius')}</span>
            <select
              value={form.serviceRadiusKm}
              onChange={(e) => setForm({ ...form, serviceRadiusKm: Number(e.target.value) })}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={60}>60</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="partners-wizard-panel partners-form partners-form--wide">
          <h2 className="partners-wizard-title">{t('partners:wizard.step3')}</h2>
          <label>
            <span>{t('partners:displayName')}</span>
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              required
            />
          </label>
          <label>
            <span>{t('partners:photo')}</span>
            <input type="file" accept="image/*" onChange={onPhoto} />
          </label>
          {profile.photoUrl && <img className="partner-photo" src={profile.photoUrl} alt="" />}
          <label>
            <span>{t('partners:shortDescription')}</span>
            <textarea
              value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              required
              rows={4}
            />
          </label>
          <div className="partners-form-row">
            <label>
              <span>{t('partners:kindLabel')}</span>
              <select
                value={form.providerKind}
                onChange={(e) => setForm({ ...form, providerKind: e.target.value })}
              >
                <option value="Individual">{t('partners:kind.Individual')}</option>
                <option value="Team">{t('partners:kind.Team')}</option>
                <option value="Business">{t('partners:kind.Business')}</option>
              </select>
            </label>
            {form.providerKind === 'Team' && (
              <label>
                <span>{t('partners:crewSize')}</span>
                <input
                  type="number"
                  min={1}
                  value={form.crewSize}
                  onChange={(e) => setForm({ ...form, crewSize: e.target.value })}
                />
              </label>
            )}
            <label>
              <span>{t('partners:filters.availability')}</span>
              <select
                value={form.availability}
                onChange={(e) => setForm({ ...form, availability: e.target.value })}
              >
                <option value="Available">{t('partners:availability.Available')}</option>
                <option value="Limited">{t('partners:availability.Limited')}</option>
                <option value="Unavailable">{t('partners:availability.Unavailable')}</option>
              </select>
            </label>
          </div>
          <div className="partners-form-row">
            <label>
              <span>{t('partners:experience')}</span>
              <input
                type="number"
                min={0}
                value={form.experienceYears}
                onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
              />
            </label>
            <label>
              <span>{t('partners:equipment')}</span>
              <input
                value={form.equipment}
                onChange={(e) => setForm({ ...form, equipment: e.target.value })}
              />
            </label>
          </div>
          <label>
            <span>{t('partners:phone')}</span>
            <input
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              type="tel"
              inputMode="tel"
            />
          </label>
          <label className={`partner-toggle${form.showPhone ? ' is-on' : ''}`}>
            <input
              type="checkbox"
              checked={form.showPhone}
              onChange={(e) => setForm({ ...form, showPhone: e.target.checked })}
            />
            <span>{t('partners:showPhone')}</span>
          </label>
          <label>
            <span>{t('partners:businessName')}</span>
            <input
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            />
          </label>
          {millSelected && (
            <div className="partners-mill-fields">
              <h3>{t('partners:wizard.millDetails')}</h3>
              <label>
                <span>{t('partners:mill.period')}</span>
                <input
                  value={form.millOperatingPeriod}
                  onChange={(e) => setForm({ ...form, millOperatingPeriod: e.target.value })}
                />
              </label>
              <label>
                <span>{t('partners:mill.method')}</span>
                <input
                  value={form.millProcessingMethod}
                  onChange={(e) => setForm({ ...form, millProcessingMethod: e.target.value })}
                />
              </label>
              <label className={`partner-toggle${form.millOrganic ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.millOrganic}
                  onChange={(e) => setForm({ ...form, millOrganic: e.target.checked })}
                />
                <span>{t('partners:mill.organic')}</span>
              </label>
              <label className={`partner-toggle${form.millAppointmentRequired ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.millAppointmentRequired}
                  onChange={(e) => setForm({ ...form, millAppointmentRequired: e.target.checked })}
                />
                <span>{t('partners:mill.appointment')}</span>
              </label>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="partners-wizard-panel partners-preview">
          <h2 className="partners-wizard-title">{t('partners:wizard.step4')}</h2>
          <div className="partners-preview-card">
            <h3>{form.displayName}</h3>
            <p>{form.shortDescription}</p>
            <p className="partners-preview-meta">
              {form.baseAreaLabel} · {t('partners:radius', { km: form.serviceRadiusKm })}
            </p>
            <p className="partners-preview-meta">
              {t(`partners:kind.${form.providerKind}`)}
              {form.crewSize ? ` · ${t('partners:crewCount', { count: Number(form.crewSize) })}` : ''}
              {form.experienceYears
                ? ` · ${t('partners:years', { count: Number(form.experienceYears) })}`
                : ''}
            </p>
            {form.equipment ? (
              <p className="partners-preview-meta">
                {t('partners:equipment')}: {form.equipment}
              </p>
            ) : null}
            <div className="partners-chip-select">
              {form.serviceCategoryIds.map((id) => {
                const cat = categories.find((c) => c.id === id);
                if (!cat) return null;
                return (
                  <span key={id} className="partners-select-chip is-on">
                    {categoryName(cat, i18n.language)}
                  </span>
                );
              })}
            </div>
            <p className="partners-field-hint">{t('partners:privacyNote')}</p>
          </div>
        </div>
      )}

      <div className="partners-wizard-footer">
        {step > 1 && (
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
            {t('common:back')}
          </Button>
        )}
        <div className="partners-wizard-footer-spacer" />
        {step < 4 && (
          <Button type="button" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
            {t('partners:wizard.next')}
          </Button>
        )}
        {step === 4 && (
          <Button type="button" loading={saving} onClick={() => void publish()}>
            {t('partners:wizard.publish')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ServiceProfileWizard;
