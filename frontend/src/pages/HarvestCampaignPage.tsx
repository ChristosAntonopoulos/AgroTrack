import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, ChevronUp, Plus, Wallet, Wheat } from 'lucide-react';
import PageContainer from '../components/Common/PageContainer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { useHarvestCampaign } from '../context/HarvestCampaignContext';
import { useLocale } from '../context/LocaleProvider';
import { useCaptureOptional } from '../context/CaptureContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { getFieldService, getHarvestService, getReportsService } from '../services/serviceFactory';
import { weatherService } from '../services/weatherService';
import type { Field } from '../services/fieldService';
import type { HarvestRecord } from '../data/mockReportData';
import type { FieldWeather } from '../services/geospatialService';
import { filterHarvestsForSeason, overlappingCalendarYears } from '../ravdos/seasonFinance';
import { formatSeasonLabel as seasonName, getSeasonBounds } from '../utils/harvestSeason';
import { athensCalendarDateKey } from '../utils/athensDate';
import { formatDate, formatNumber } from '../utils/localeFormatters';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { nextGroveId, logForDate, skipReasons } from '../harvestCampaign/storage';
import { buildWeekStrip, type HarvestDayRank } from '../harvestCampaign/weatherRank';
import type { HarvestSkipReason } from '../harvestCampaign/types';
import './HarvestCampaignPage.css';

const numberLocale = (locale: string) =>
  locale.startsWith('el') ? 'el-GR' : locale.startsWith('it') ? 'it-IT' : 'en-US';

const formatKg = (kg: number, locale: string) =>
  formatNumber(kg, {
    locale: locale.startsWith('el') ? 'el' : locale.startsWith('it') ? 'it' : 'en',
    maximumFractionDigits: kg >= 100 ? 0 : 1,
  });

const HarvestCampaignPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common', 'capture']);
  const { locale } = useLocale();
  const capture = useCaptureOptional();
  const { campaign, seasonStartYear, isLive, isActive, start, stop, pause, resume, reorder, markGroveDone, logDay } =
    useHarvestCampaign();

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Field[]>([]);
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [weather, setWeather] = useState<FieldWeather | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [millName, setMillName] = useState('');
  const [expectedLitres, setExpectedLitres] = useState('');
  const [oliveKg, setOliveKg] = useState('');
  const [people, setPeople] = useState('');
  const [hours, setHours] = useState('');
  const [logFieldId, setLogFieldId] = useState('');
  const [wentToMill, setWentToMill] = useState(false);
  const [oilLitres, setOilLitres] = useState('');
  const [oilKg, setOilKg] = useState('');
  const [skipReason, setSkipReason] = useState<HarvestSkipReason>('rain');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const bounds = useMemo(() => getSeasonBounds(seasonStartYear), [seasonStartYear]);
  const today = athensCalendarDateKey(new Date());
  const loc = numberLocale(locale);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const years = overlappingCalendarYears(seasonStartYear);
      const [groveList, harvestChunks] = await Promise.all([
        getFieldService().getFields().catch(() => [] as Field[]),
        Promise.all(years.map((y) => getReportsService().getHarvestRecords(y).catch(() => [] as HarvestRecord[]))),
      ]);
      setFields(groveList);
      setHarvests(harvestChunks.flat());
      const weatherField = campaign.fieldOrder[0] || groveList[0]?.id;
      if (weatherField) {
        const snapshot = await weatherService.getFieldWeather(weatherField).catch(() => null);
        setWeather(snapshot);
      }
    } finally {
      setLoading(false);
    }
  }, [campaign.fieldOrder, seasonStartYear]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onSaved = () => void load();
    window.addEventListener(CAPTURE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(CAPTURE_SAVED_EVENT, onSaved);
  }, [load]);

  useEffect(() => {
    if (!setupOpen) return;
    setPickedIds(campaign.fieldOrder.length ? campaign.fieldOrder : fields.map((f) => f.id));
    setMillName(campaign.millName || '');
  }, [setupOpen, fields, campaign.fieldOrder, campaign.millName]);

  const nextId = nextGroveId(campaign);
  useEffect(() => {
    if (nextId) setLogFieldId(nextId);
  }, [nextId]);

  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const field of fields) map.set(field.id, friendlyFieldLabel(field.name));
    return map;
  }, [fields]);

  const seasonHarvests = useMemo(() => filterHarvestsForSeason(harvests, bounds), [harvests, bounds]);
  const oliveTotal = seasonHarvests.reduce((sum, row) => sum + (row.oliveKg || 0), 0);
  const oilTotal = seasonHarvests.reduce((sum, row) => sum + (row.oilKg || 0), 0);
  const millHarvests = seasonHarvests.filter((row) => row.millName || row.oilKg);
  const grovesDone = campaign.groveDoneIds.filter((id) => campaign.fieldOrder.includes(id)).length;
  const grovesTotal = campaign.fieldOrder.length || fields.length;
  const todayLog = logForDate(campaign, today);
  const week = useMemo(
    () =>
      buildWeekStrip({
        rain24: weather?.rain?.forecast24hMm,
        rain48: weather?.rain?.forecast48hMm,
        rain72: weather?.rain?.forecast72hMm,
        wind24: weather?.wind?.maxNext24hKmh,
        wind72: weather?.wind?.maxNext72hKmh,
      }),
    [weather]
  );
  const nextName = (nextId && labels.get(nextId)) || t('harvestCampaign.anyGrove');
  const weekday = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString(loc, { weekday: 'short' });
  };

  const openSetup = () => {
    setError(null);
    setSetupOpen(true);
  };

  const beginHarvest = () => {
    if (pickedIds.length === 0) {
      setError(t('harvestCampaign.needGrove'));
      return;
    }
    const litres = expectedLitres.trim() ? Number(expectedLitres.replace(',', '.')) : null;
    start({
      fieldOrder: pickedIds,
      millName,
      expectedOilLitres: litres && Number.isFinite(litres) && litres > 0 ? litres : null,
    });
    setSetupOpen(false);
  };

  const confirmStop = () => {
    if (window.confirm(t('harvestCampaign.stopConfirm'))) stop();
  };

  const saveToday = async () => {
    const kg = Number(oliveKg.replace(',', '.'));
    if (!Number.isFinite(kg) || kg <= 0) {
      setError(t('fields:harvest.oliveRequired'));
      return;
    }
    const fieldId = logFieldId || nextId || fields[0]?.id;
    if (!fieldId) {
      setError(t('harvestCampaign.needGrove'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const litres = oilLitres.trim() ? Number(oilLitres.replace(',', '.')) : undefined;
      const oil = oilKg.trim() ? Number(oilKg.replace(',', '.')) : undefined;
      const peopleCount = people.trim() ? Number(people.replace(',', '.')) : undefined;
      const hoursCount = hours.trim() ? Number(hours.replace(',', '.')) : undefined;
      await getHarvestService().create({
        fieldId,
        harvestDate: new Date(`${today}T12:00:00`).toISOString(),
        oliveKg: kg,
        workersUsed: peopleCount && Number.isFinite(peopleCount) ? peopleCount : 0,
        millName: wentToMill ? millName || campaign.millName || undefined : undefined,
        oilLitres: wentToMill && litres && Number.isFinite(litres) ? litres : undefined,
        oilKg: wentToMill && oil && Number.isFinite(oil) ? oil : undefined,
        notes: [peopleCount ? `${peopleCount}` : '', hoursCount ? `${hoursCount}h` : ''].filter(Boolean).join(' · ') || undefined,
      });
      logDay({
        date: today,
        fieldId,
        oliveKg: kg,
        people: peopleCount && Number.isFinite(peopleCount) ? peopleCount : undefined,
        hours: hoursCount && Number.isFinite(hoursCount) ? hoursCount : undefined,
        millVisit: wentToMill,
      });
      setOliveKg('');
      setPeople('');
      setHours('');
      setOilLitres('');
      setOilKg('');
      setWentToMill(false);
      await load();
    } catch {
      setError(t('capture:errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const skipToday = () => {
    logDay({ date: today, skipped: true, skipReason });
  };

  if (loading && fields.length === 0) return <LoadingSpinner className="page-inline-loading" />;

  const rankLabel = (rank: HarvestDayRank) => t(`harvestCampaign.rank.${rank}`);
  const expected = campaign.expectedOilLitres;
  const litresShown = millHarvests.reduce((sum, row) => sum + (row.oilKg || 0), 0);

  return (
    <PageContainer>
      <div className="harvest-campaign">
        <header className="hc-hero">
          <p className="hc-kicker">{seasonName(seasonStartYear)}</p>
          <h1>{t('harvestCampaign.title')}</h1>
          <p className="hc-lead">
            {isLive ? t('harvestCampaign.leadLive', { grove: nextName }) : t('harvestCampaign.leadIdle')}
          </p>
          <div className="hc-status-row">
            <span className={`hc-pill${isActive ? ' is-live' : ''}${campaign.status === 'paused' ? ' is-paused' : ''}`}>
              {t(`harvestCampaign.status.${campaign.status}`)}
            </span>
            {campaign.startedAt ? (
              <span className="hc-help" style={{ margin: 0 }}>
                {t('harvestCampaign.since', {
                  date: formatDate(campaign.startedAt, { locale, dateFormat: 'medium' }),
                })}
              </span>
            ) : null}
          </div>
          <div className="hc-hero-actions">
            {!isLive ? (
              <button type="button" className="hc-start" onClick={openSetup}>
                <Wheat size={18} aria-hidden /> {t('harvestCampaign.start')}
              </button>
            ) : (
              <>
                {isActive ? (
                  <button type="button" className="hc-ghost" onClick={pause}>
                    {t('harvestCampaign.pause')}
                  </button>
                ) : (
                  <button type="button" className="hc-start" onClick={resume}>
                    {t('harvestCampaign.resume')}
                  </button>
                )}
                <button type="button" className="hc-ghost is-danger" onClick={confirmStop}>
                  {t('harvestCampaign.stop')}
                </button>
              </>
            )}
          </div>
        </header>

        {setupOpen && !isLive ? (
          <section className="hc-section hc-setup" aria-labelledby="hc-setup-title">
            <h2 id="hc-setup-title">{t('harvestCampaign.setupTitle')}</h2>
            <p className="hc-help">{t('harvestCampaign.setupHint')}</p>
            <div className="hc-form">
              {fields.map((field) => (
                <label key={field.id} className="hc-check-row">
                  <input
                    type="checkbox"
                    checked={pickedIds.includes(field.id)}
                    onChange={() =>
                      setPickedIds((prev) =>
                        prev.includes(field.id) ? prev.filter((id) => id !== field.id) : [...prev, field.id]
                      )
                    }
                  />
                  <span>{friendlyFieldLabel(field.name)}</span>
                </label>
              ))}
              {fields.length === 0 ? <p className="hc-help">{t('harvestCampaign.noFields')}</p> : null}
              <label className="hc-field">
                <span>{t('harvestCampaign.millOptional')}</span>
                <input value={millName} onChange={(e) => setMillName(e.target.value)} />
              </label>
              <label className="hc-field">
                <span>{t('harvestCampaign.expectedLitres')}</span>
                <input
                  inputMode="decimal"
                  value={expectedLitres}
                  onChange={(e) => setExpectedLitres(e.target.value)}
                  placeholder={t('harvestCampaign.optional')}
                />
              </label>
              {error ? <p className="hc-error">{error}</p> : null}
              <div className="hc-hero-actions">
                <button type="button" className="hc-start" onClick={beginHarvest} disabled={fields.length === 0}>
                  {t('harvestCampaign.begin')}
                </button>
                <button type="button" className="hc-ghost" onClick={() => setSetupOpen(false)}>
                  {t('common:cancel')}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {isLive ? (
          <>
            <section className="hc-section" aria-labelledby="hc-today">
              <h2 id="hc-today">{t('harvestCampaign.todayTitle')}</h2>
              <p className="hc-help">{t('harvestCampaign.todayHint', { grove: nextName })}</p>
              <div className="hc-week" aria-label={t('harvestCampaign.weekLabel')}>
                {week.map((day) => (
                  <div key={day.offset} className={`hc-day is-${day.rank}`}>
                    <b>{weekday(day.offset)}</b>
                    <span className="hc-dot" aria-hidden />
                    <em>{rankLabel(day.rank)}</em>
                  </div>
                ))}
              </div>
            </section>

            <section className="hc-section" aria-labelledby="hc-clocks">
              <h2 id="hc-clocks">{t('harvestCampaign.clocksTitle')}</h2>
              <div className="hc-meters">
                <div className="hc-meter">
                  <span>{t('harvestCampaign.grovesMeter')}</span>
                  <strong>
                    {grovesDone}/{grovesTotal || '—'}
                  </strong>
                  <div className="hc-bar" aria-hidden>
                    <i style={{ width: grovesTotal ? `${Math.min(100, (grovesDone / grovesTotal) * 100)}%` : '0%' }} />
                  </div>
                </div>
                <div className="hc-meter">
                  <span>{t('harvestCampaign.oilMeter')}</span>
                  <strong>
                    {oilTotal > 0
                      ? `${formatKg(oilTotal, locale)} kg`
                      : oliveTotal > 0
                        ? `${formatKg(oliveTotal, locale)} kg`
                        : t('fields:thisHarvest.notYet')}
                  </strong>
                  <div className="hc-bar" aria-hidden>
                    <i
                      style={{
                        width: expected && expected > 0 ? `${Math.min(100, (litresShown / expected) * 100)}%` : oilTotal > 0 ? '55%' : oliveTotal > 0 ? '28%' : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="hc-section" aria-labelledby="hc-log">
              <h2 id="hc-log">{t('harvestCampaign.logTitle')}</h2>
              {todayLog && !todayLog.skipped ? (
                <p className="hc-help">
                  {t('harvestCampaign.alreadyLogged', {
                    kg: formatKg(todayLog.oliveKg || 0, locale),
                  })}
                </p>
              ) : todayLog?.skipped ? (
                <p className="hc-help">{t(`harvestCampaign.skipped.${todayLog.skipReason || 'other'}`)}</p>
              ) : null}
              <div className="hc-form">
                <label className="hc-field">
                  <span>{t('harvestCampaign.whichGrove')}</span>
                  <select value={logFieldId} onChange={(e) => setLogFieldId(e.target.value)}>
                    {(campaign.fieldOrder.length ? campaign.fieldOrder : fields.map((f) => f.id)).map((id) => (
                      <option key={id} value={id}>
                        {labels.get(id) || id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="hc-field">
                  <span>{t('fields:harvest.oliveKg')}</span>
                  <input inputMode="decimal" value={oliveKg} onChange={(e) => setOliveKg(e.target.value)} />
                </label>
                <div className="hc-row">
                  <label className="hc-field">
                    <span>{t('harvestCampaign.people')}</span>
                    <input inputMode="numeric" value={people} onChange={(e) => setPeople(e.target.value)} />
                  </label>
                  <label className="hc-field">
                    <span>{t('harvestCampaign.hours')}</span>
                    <input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
                  </label>
                </div>
                <label className="hc-check-row">
                  <input type="checkbox" checked={wentToMill} onChange={(e) => setWentToMill(e.target.checked)} />
                  <span>{t('harvestCampaign.wentToMill')}</span>
                </label>
                {wentToMill ? (
                  <div className="hc-row">
                    <label className="hc-field">
                      <span>{t('harvestCampaign.litres')}</span>
                      <input inputMode="decimal" value={oilLitres} onChange={(e) => setOilLitres(e.target.value)} />
                    </label>
                    <label className="hc-field">
                      <span>{t('fields:harvest.oilKg')}</span>
                      <input inputMode="decimal" value={oilKg} onChange={(e) => setOilKg(e.target.value)} />
                    </label>
                  </div>
                ) : null}
                {error ? <p className="hc-error">{error}</p> : null}
                <div className="hc-hero-actions">
                  <button type="button" className="hc-start" onClick={() => void saveToday()} disabled={!isActive || saving}>
                    {saving ? t('capture:saving') : t('harvestCampaign.saveToday')}
                  </button>
                </div>
                <div className="hc-row">
                  <label className="hc-field">
                    <span>{t('harvestCampaign.skipWhy')}</span>
                    <select value={skipReason} onChange={(e) => setSkipReason(e.target.value as HarvestSkipReason)}>
                      {skipReasons.map((reason) => (
                        <option key={reason} value={reason}>
                          {t(`harvestCampaign.skip.${reason}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="hc-ghost" onClick={skipToday} disabled={!isActive} style={{ alignSelf: 'end' }}>
                    {t('harvestCampaign.skipToday')}
                  </button>
                </div>
              </div>
            </section>

            <section className="hc-section" aria-labelledby="hc-order">
              <h2 id="hc-order">{t('harvestCampaign.orderTitle')}</h2>
              <p className="hc-help">{t('harvestCampaign.orderHint')}</p>
              {(campaign.fieldOrder.length ? campaign.fieldOrder : []).map((id, index) => {
                const done = campaign.groveDoneIds.includes(id);
                return (
                  <div key={id} className={`hc-grove${done ? ' is-done' : ''}`}>
                    <button
                      type="button"
                      className="hc-icon-btn"
                      disabled={index === 0}
                      onClick={() => reorder(id, -1)}
                      aria-label={t('harvestCampaign.moveUp')}
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      type="button"
                      className="hc-icon-btn"
                      disabled={index === campaign.fieldOrder.length - 1}
                      onClick={() => reorder(id, 1)}
                      aria-label={t('harvestCampaign.moveDown')}
                    >
                      <ChevronDown size={18} />
                    </button>
                    <div className="hc-grove-name">
                      {index + 1}. {labels.get(id) || id}
                      {id === nextId && !done ? (
                        <div className="hc-grove-meta">{t('harvestCampaign.upNext')}</div>
                      ) : null}
                    </div>
                    <button type="button" className="hc-ghost" onClick={() => markGroveDone(id)}>
                      {done ? t('harvestCampaign.reopenGrove') : t('harvestCampaign.groveDone')}
                    </button>
                  </div>
                );
              })}
            </section>

            <section className="hc-section" aria-labelledby="hc-spend">
              <h2 id="hc-spend">{t('harvestCampaign.spendTitle')}</h2>
              <p className="hc-help">{t('harvestCampaign.spendHint')}</p>
              <div className="hc-chips">
                {(['wages', 'mill', 'transport', 'fuel'] as const).map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="hc-chip"
                    onClick={() =>
                      capture?.openCapture({
                        preferredType: 'expense',
                        fieldId: logFieldId || nextId,
                      })
                    }
                  >
                    {t(`harvestCampaign.chips.${chip}`)}
                  </button>
                ))}
              </div>
            </section>

            <section className="hc-section" aria-labelledby="hc-mill">
              <h2 id="hc-mill">{t('fields:thisHarvest.millTitle')}</h2>
              {millHarvests.length === 0 ? (
                <p className="hc-help">{t('fields:thisHarvest.millEmpty')}</p>
              ) : (
                <ul className="hc-mill">
                  {millHarvests.slice(0, 8).map((visit, index) => (
                    <li key={visit.id || `${visit.fieldId}-${visit.harvestDate}-${index}`}>
                      <time>{formatDate(visit.harvestDate, { locale, dateFormat: 'medium' })}</time>
                      <span>
                        {visit.fieldName}
                        {visit.millName ? ` · ${visit.millName}` : ''}
                      </span>
                      <strong>
                        {formatKg(visit.oliveKg, locale)} kg
                        {visit.oilKg ? ` · ${formatKg(visit.oilKg, locale)} kg` : ''}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="hc-link"
                onClick={() => capture?.openCapture({ preferredType: 'harvest', fieldId: logFieldId || nextId })}
              >
                <Plus size={16} /> {t('harvestCampaign.addMillTicket')}
              </button>
            </section>
          </>
        ) : null}

        {!isLive && !setupOpen ? (
          <section className="hc-section">
            <h2>{t('harvestCampaign.whyTitle')}</h2>
            <p className="hc-help">{t('harvestCampaign.whyBody')}</p>
            {oliveTotal > 0 ? (
              <p className="hc-help">
                {t('harvestCampaign.alreadyThisSeason', {
                  olives: formatKg(oliveTotal, locale),
                })}
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="hc-hero-actions" style={{ marginTop: '1.2rem' }}>
          <Link to="/this-harvest/review" className="hc-link">
            {t('fields:thisHarvest.reviewLink')} <ChevronRight size={16} aria-hidden />
          </Link>
          <Link to="/money" className="hc-link">
            <Wallet size={16} aria-hidden /> {t('fields:thisHarvest.openMoney')}
          </Link>
        </div>
      </div>
    </PageContainer>
  );
};

export default HarvestCampaignPage;
