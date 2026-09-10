import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import type { Field } from '../../services/fieldService';
import { fieldPeopleService, type FieldMembership } from '../../services/fieldPeopleService';
import { geospatialService, type FieldSpatialProfile } from '../../services/geospatialService';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel } from '../../utils/fieldDisplay';

type Props = {
  field: Field;
  year: number;
  canOwn: boolean;
};

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
  if (value == null || value === '') return null;
  return (
    <div className="field-details-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
};

const FieldDetailsTab: React.FC<Props> = ({ field, year, canOwn }) => {
  const { t } = useTranslation(['fields', 'common']);
  const { isEveryday } = useExperienceMode();
  const [more, setMore] = useState(!isEveryday);
  const [people, setPeople] = useState<FieldMembership[]>([]);
  const [spatial, setSpatial] = useState<FieldSpatialProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    fieldPeopleService
      .getPeople(field.id)
      .then((rows) => {
        if (!cancelled) setPeople(rows);
      })
      .catch(() => {
        if (!cancelled) setPeople([]);
      });
    geospatialService
      .getSpatialProfile(field.id)
      .then((profile) => {
        if (!cancelled) setSpatial(profile);
      })
      .catch(() => {
        if (!cancelled) setSpatial(null);
      });
    return () => {
      cancelled = true;
    };
  }, [field.id]);

  const unknown = t('fields:details.unknown');
  const draft = field.status === 'Draft';
  const missing = [
    !field.name ? t('fields:details.checklist.name') : null,
    !field.boundary && field.latitude == null ? t('fields:details.checklist.boundary') : null,
    !field.area && !field.areaHectares && !field.areaSqm ? t('fields:details.checklist.area') : null,
    field.status !== 'Active' ? t('fields:details.checklist.active') : null,
  ].filter(Boolean);

  return (
    <div className="field-details">
      <h2>{t('fields:page.details')}</h2>

      {draft ? (
        <section className="field-details-card">
          <h3>{t('fields:page.draftField')}</h3>
          <p>{t('fields:details.draftHelp')}</p>
          {missing.length ? (
            <ul>
              {missing.map((item) => (
                <li key={String(item)}>{item}</li>
              ))}
            </ul>
          ) : null}
          {canOwn ? (
            <Link className="field-attention-primary" to={`/fields/${field.id}/edit`}>
              {t('fields:page.editField')}
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="field-details-card">
        <h3>{t('fields:details.identity')}</h3>
        <dl>
          <Row label={t('fields:form.name')} value={field.name} />
          <Row label={t('fields:overview.status')} value={getFieldStatusLabel(field.status, t)} />
          <Row label={t('fields:locationLabel')} value={getFieldShortLocation(field) || unknown} />
          <Row
            label={t('fields:overview.area')}
            value={formatFieldArea(field) || unknown}
          />
          <Row label={t('fields:page.yearLabel', { year })} value={String(year)} />
          <Row
            label={t('fields:details.boundary')}
            value={field.boundary ? t('fields:details.hasBoundary') : t('fields:details.noBoundary')}
          />
        </dl>
      </section>

      <section className="field-details-card">
        <h3>{t('fields:details.grove')}</h3>
        <dl>
          <Row label={t('fields:overview.variety')} value={field.variety || field.oliveVariety || unknown} />
          <Row label={t('fields:form.treeAge')} value={field.treeAge != null ? String(field.treeAge) : unknown} />
          <Row label={t('fields:details.trees')} value={field.treeCount != null ? String(field.treeCount) : unknown} />
        </dl>
      </section>

      {!isEveryday || more ? (
        <>
          <section className="field-details-card">
            <h3>{t('fields:details.water')}</h3>
            <dl>
              <Row
                label={t('fields:form.irrigationLabel')}
                value={field.irrigationStatus ? t('fields:card.irrigationYes') : t('fields:details.rainfed')}
              />
              <Row label={t('fields:details.irrigationType')} value={field.irrigationType || unknown} />
            </dl>
          </section>

          <section className="field-details-card">
            <h3>{t('fields:details.terrain')}</h3>
            <dl>
              <Row label={t('fields:form.groundType')} value={field.groundType || field.soilType || unknown} />
              <Row label={t('fields:details.slope')} value={field.slope || unknown} />
              <Row
                label={t('fields:details.elevation')}
                value={
                  spatial?.terrain?.averageElevationM != null
                    ? `${Math.round(spatial.terrain.averageElevationM)} m`
                    : unknown
                }
              />
            </dl>
          </section>

          <section className="field-details-card">
            <h3>{t('fields:details.people')}</h3>
            {people.length === 0 ? (
              <p>{t('fields:details.noPeople')}</p>
            ) : (
              <ul className="field-details-people">
                {people.map((person) => (
                  <li key={person.userId}>
                    <strong>{person.displayName || person.email || person.userId}</strong>
                    <span>{person.capacities.join(', ')}</span>
                  </li>
                ))}
              </ul>
            )}
            {canOwn ? (
              <Link className="fd-text-link" to={`/partners?fieldId=${encodeURIComponent(field.id)}`}>
                {t('fields:page.manageAccess')}
              </Link>
            ) : null}
          </section>

          <section className="field-details-card">
            <h3>{t('fields:page.documents')}</h3>
            {(field.documents || []).length === 0 ? (
              <p>{t('fields:details.noDocuments')}</p>
            ) : (
              <ul>
                {(field.documents || []).map((doc) => (
                  <li key={doc.id}>{doc.fileName}</li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <button type="button" className="field-attention-secondary" onClick={() => setMore(true)}>
          {t('fields:details.more')}
        </button>
      )}
    </div>
  );
};

export default FieldDetailsTab;
