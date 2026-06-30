import React from 'react';
import { useTranslation } from 'react-i18next';
import { GreekCadastreInfo } from '../../services/fieldService';

interface Props {
  cadastre: GreekCadastreInfo;
  hideTitle?: boolean;
}

const GreekCadastreInfoCard: React.FC<Props> = ({ cadastre, hideTitle }) => {
  const { t } = useTranslation('fields');

  const verificationKey = cadastre.verificationStatus
    ? `addField.verificationStatuses.${cadastre.verificationStatus}`
    : null;
  const verificationLabel =
    verificationKey && t(verificationKey) !== verificationKey
      ? t(verificationKey)
      : cadastre.verificationStatus;

  const showStructuredLocation =
    cadastre.municipality || cadastre.postalCode || cadastre.prefecture || cadastre.cadastralOffice;

  return (
    <div className="cadastre-info-card">
      {!hideTitle && <h3>{t('addField.cadastre.referenceTitle')}</h3>}
      <p className="cadastre-info-disclaimer">{t('addField.cadastre.referenceDisclaimer')}</p>
      <dl className="cadastre-info-list">
        {cadastre.kaek && (
          <div>
            <dt>KAEK</dt>
            <dd>{cadastre.normalizedKaek || cadastre.kaek}</dd>
          </div>
        )}
        {cadastre.officialAreaSqm != null && (
          <div>
            <dt>{t('addField.officialArea')}</dt>
            <dd>{cadastre.officialAreaSqm} m²</dd>
          </div>
        )}
        {showStructuredLocation ? (
          <>
            {cadastre.municipality && (
              <div>
                <dt>{t('addField.municipality')}</dt>
                <dd>{cadastre.municipality}</dd>
              </div>
            )}
            {cadastre.postalCode && (
              <div>
                <dt>{t('addField.postalCode')}</dt>
                <dd>{cadastre.postalCode}</dd>
              </div>
            )}
            {cadastre.prefecture && (
              <div>
                <dt>{t('addField.prefecture')}</dt>
                <dd>{cadastre.prefecture}</dd>
              </div>
            )}
            {cadastre.cadastralOffice && (
              <div>
                <dt>{t('addField.cadastralOffice')}</dt>
                <dd>{cadastre.cadastralOffice}</dd>
              </div>
            )}
          </>
        ) : (
          cadastre.locationFromCadastre && (
            <div>
              <dt>{t('addField.locationText')}</dt>
              <dd>{cadastre.locationFromCadastre}</dd>
            </div>
          )
        )}
        {cadastre.coordinateSystem && (
          <div>
            <dt>{t('addField.coordinateSystem')}</dt>
            <dd>{cadastre.coordinateSystem}</dd>
          </div>
        )}
        {cadastre.mapScale && (
          <div>
            <dt>{t('addField.mapScale')}</dt>
            <dd>{cadastre.mapScale}</dd>
          </div>
        )}
        {cadastre.extractPrintDate && (
          <div>
            <dt>{t('addField.printDate')}</dt>
            <dd>{new Date(cadastre.extractPrintDate).toLocaleDateString()}</dd>
          </div>
        )}
        {verificationLabel && (
          <div>
            <dt>{t('addField.status')}</dt>
            <dd>{verificationLabel}</dd>
          </div>
        )}
      </dl>
    </div>
  );
};

export default GreekCadastreInfoCard;
