import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Cog, Droplets, Package, Sprout, Trees, Wallet, Wheat } from 'lucide-react';
import grovePhoto from '../../assets/landing/hero-grove.jpg';
import oilCellar from '../../assets/landing/oil-cellar.jpg';
import familyGrove from '../../assets/landing/family-grove.jpg';
import journeyBanner from '../../assets/landing/journey-banner.jpg';

type YearPack = {
  id: string;
  label: string;
  yield: string;
};

type QuestionCard = {
  id: string;
  ask: string;
  answer: string;
  detail?: string;
};

type FlowStep = { id: string; label: string };
type HarvestStage = { id: string; label: string; focus?: string; lines: string[] };
type YearMark = { year: string; label: string };
type Person = { name: string; did: string };
type ProofQuote = { quote: string; name: string; detail: string };

const asList = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const FLOW_ICON: Record<string, React.ReactNode> = {
  work: <Check size={32} strokeWidth={2.2} />,
  cost: <Wallet size={32} strokeWidth={1.75} />,
  harvest: <Wheat size={32} strokeWidth={1.75} />,
  mill: <Cog size={32} strokeWidth={1.75} />,
  oil: <Droplets size={32} strokeWidth={1.75} />,
  store: <Package size={32} strokeWidth={1.75} />,
  grove: <Trees size={32} strokeWidth={1.75} />,
  tins: <Package size={32} strokeWidth={1.75} />,
};

export const GroveDashboard: React.FC = () => {
  const { t } = useTranslation('landing');
  const stats = [
    ['work', t('hero.workLabel'), t('hero.workValue')],
    ['cost', t('hero.costLabel'), t('hero.costValue')],
    ['harvest', t('hero.harvestLabel'), t('hero.harvestValue')],
    ['oil', t('hero.oilLabel'), t('hero.oilValue')],
  ] as const;

  return (
    <article className="lp-dash">
      <p className="lp-dash-head">
        <span className="lp-field-dot" aria-hidden />
        {t('hero.field')}
        <span className="lp-dash-year">{t('hero.year')}</span>
      </p>
      <ul className="lp-dash-stats">
        {stats.map(([id, label, value]) => (
          <li key={id}>
            <span>{label}</span>
            <strong>{value}</strong>
          </li>
        ))}
      </ul>
      <p className="lp-dash-status">{t('hero.status')}</p>
    </article>
  );
};

export const FourQuestions: React.FC = () => {
  const { t } = useTranslation('landing');
  const cards = asList<QuestionCard>(t('questions.cards', { returnObjects: true }));

  return (
    <div className="lp-questions">
      {cards.map((card) => (
        <article key={card.id} className={`lp-q lp-q--${card.id}`}>
          <p>{card.ask}</p>
          <h3>{card.answer}</h3>
          {card.detail ? <span className="lp-q-detail">{card.detail}</span> : null}
        </article>
      ))}
    </div>
  );
};

export const YearFlow: React.FC = () => {
  const { t } = useTranslation('landing');
  const steps = asList<FlowStep>(t('flow.steps', { returnObjects: true }));

  return (
    <div className="lp-flow-wrap">
      <div className="lp-flow-atmosphere" aria-hidden>
        <img src={journeyBanner} alt="" />
      </div>
      <ol className="lp-flow" aria-label={t('flow.title')}>
        {steps.map((step) => (
          <li key={step.id}>
            <span className={`lp-flow-mark is-${step.id}`} aria-hidden>
              {FLOW_ICON[step.id] ?? <Sprout size={28} />}
            </span>
            <strong>{step.label}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
};

export const ChronologioCentre: React.FC = () => {
  const { t } = useTranslation('landing');
  const years = asList<YearPack>(t('chronologio.years', { returnObjects: true }));
  const [yearId, setYearId] = useState(years.find((year) => year.id === '2025')?.id ?? years[0]?.id ?? '');

  return (
    <div className="lp-centre">
      <div className="lp-centre-copy">
        <h2 id="chrono-title">{t('chronologio.title')}</h2>
        <p>{t('chronologio.text')}</p>
      </div>
      <div className="lp-years-card">
        <p className="lp-years-field">{t('chronologio.field')}</p>
        <div className="lp-rail lp-rail--years" role="group" aria-label={t('chronologio.railLabel')}>
          {years.map((item) => (
            <button
              key={item.id}
              type="button"
              className={yearId === item.id ? 'is-active' : ''}
              aria-pressed={yearId === item.id}
              onClick={() => setYearId(item.id)}
            >
              <span>{item.label}</span>
              <em>{item.yield}</em>
            </button>
          ))}
        </div>
        <article className="lp-years-highlight">
          <img src={grovePhoto} alt="" />
          <div>
            <h3>{t('chronologio.highlightTitle')}</h3>
            <p>{t('chronologio.highlightWhen')}</p>
          </div>
        </article>
      </div>
    </div>
  );
};

export const MapStage: React.FC = () => {
  const { t } = useTranslation('landing');
  const [june, setJune] = useState(72);
  const towardJune = june >= 50;
  const label = towardJune ? t('map.juneLabel') : t('map.marchLabel');
  const fact = towardJune ? t('map.juneFact') : t('map.marchFact');

  return (
    <figure className="lp-map">
      <div className="lp-compare">
        <FieldShape tone="patchy" labeled={t('chronologio.field')} />
        <div className="lp-compare-top" style={{ width: `${june}%` }}>
          <FieldShape tone="even" labeled={t('chronologio.field')} />
        </div>
        <p className="lp-compare-label">{label}</p>
      </div>
      <label className="lp-compare-control" htmlFor="grove-compare">
        <span>{t('map.march')}</span>
        <input
          id="grove-compare"
          type="range"
          min={0}
          max={100}
          value={june}
          aria-valuetext={label}
          aria-label={t('map.compareLabel')}
          onChange={(event) => setJune(Number(event.target.value))}
        />
        <span>{t('map.june')}</span>
      </label>
      <figcaption className="lp-fact" aria-live="polite">
        {fact}
      </figcaption>
    </figure>
  );
};

const FieldShape: React.FC<{ tone: 'even' | 'patchy'; labeled?: string }> = ({ tone, labeled }) => {
  const id = tone === 'even' ? 'even' : 'patchy';
  return (
    <svg viewBox="0 0 640 420" className="lp-field-svg" aria-hidden>
      <defs>
        <linearGradient id={`land-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9c6a4" />
          <stop offset="0.45" stopColor="#d8c8a2" />
          <stop offset="1" stopColor="#b7c3a0" />
        </linearGradient>
        <filter id={`grain-${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed={tone === 'even' ? 4 : 9} />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.28  0 0 0 0 0.34  0 0 0 0 0.2  0 0 0 0.28 0"
          />
        </filter>
      </defs>
      <rect width="640" height="420" fill={`url(#land-${id})`} />
      <rect width="640" height="420" filter={`url(#grain-${id})`} />
      <g stroke="#8d946c" strokeWidth="1.4" fill="none" opacity="0.7">
        <path d="M0 70 H640" />
        <path d="M0 128 H640" />
        <path d="M0 186 H640" />
        <path d="M0 244 H640" />
        <path d="M0 302 H640" />
        <path d="M0 360 H640" />
      </g>
      <path
        d="M18 0 C 40 90, 22 180, 64 270 C 92 330, 48 380, 70 420"
        fill="none"
        stroke="#f3ead8"
        strokeWidth="14"
        opacity="0.72"
      />
      <path
        d="M34 0 C 52 90, 36 180, 76 270 C 102 330, 60 380, 82 420"
        fill="none"
        stroke="#c4b48f"
        strokeWidth="2"
        opacity="0.55"
      />
      <polygon
        points="64,196 150,86 214,124 318,62 428,104 548,78 604,168 572,286 456,352 318,318 196,368 88,304 40,236"
        fill={tone === 'even' ? '#3f5a32' : '#b7c092'}
        stroke="#1e2a1c"
        strokeWidth="3.5"
      />
      {tone === 'patchy' ? (
        <polygon points="250,140 390,118 430,196 300,230" fill="#c6a56a" opacity="0.9" />
      ) : (
        <polygon points="180,160 300,130 340,200 210,220" fill="#4e6b3c" opacity="0.55" />
      )}
      {labeled ? (
        <text x="330" y="214" textAnchor="middle" fill={tone === 'even' ? '#F6F3EB' : '#243028'} fontSize="28" fontWeight="700">
          {labeled}
        </text>
      ) : null}
    </svg>
  );
};

export const HarvestJourney: React.FC = () => {
  const { t } = useTranslation('landing');
  const stages = asList<HarvestStage>(t('harvest.stages', { returnObjects: true }));

  return (
    <ol className="lp-journey">
      {stages.map((stage, index) => (
        <li key={stage.id} className={`is-${stage.id}`}>
          {stage.label ? <p>{stage.label}</p> : null}
          {stage.focus ? <strong className="lp-journey-focus">{stage.focus}</strong> : null}
          <ul>
            {(stage.lines || []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {index < stages.length - 1 ? <span className="lp-journey-arrow" aria-hidden /> : null}
        </li>
      ))}
    </ol>
  );
};

const TIN_STATES = ['free', 'free', 'free', 'free', 'free', 'free', 'held', 'given'] as const;

export const OilTinCluster: React.FC = () => {
  const { t } = useTranslation('landing');
  return (
    <figure className="lp-oil-scene">
      <img src={oilCellar} alt="" />
      <figcaption className="lp-sr">{t('oil.titleLine')}</figcaption>
    </figure>
  );
};

export const FamilyStage: React.FC = () => {
  const { t } = useTranslation('landing');
  return (
    <div className="lp-family-stage">
      <FamilyBoard />
      <figure className="lp-family-scene">
        <img src={familyGrove} alt="" />
        <figcaption className="lp-sr">{t('family.title')}</figcaption>
      </figure>
    </div>
  );
};

export const OilStore: React.FC = () => {
  const { t } = useTranslation('landing');
  const groups = [
    ['free', t('oil.available')],
    ['held', t('oil.held')],
    ['given', t('oil.given')],
  ] as const;

  return (
    <div className="lp-store">
      <p className="lp-store-total">{t('oil.total')}</p>
      <p className="lp-store-batch">{t('oil.batch')}</p>
      {groups.map(([state, label]) => (
        <div key={state} className="lp-store-row">
          <div className="lp-tins" aria-hidden>
            {TIN_STATES.filter((tin) => tin === state).map((tin, index) => (
              <span key={`${tin}-${index}`} className={`lp-tin is-${tin}`}>
                <i className="lp-tin-handle" />
                <em>{t('oil.lot')}</em>
              </span>
            ))}
          </div>
          <span>{label}</span>
        </div>
      ))}
      <p className="lp-store-actions">{t('oil.actions')}</p>
    </div>
  );
};

export const MemoryYears: React.FC = () => {
  const { t } = useTranslation('landing');
  const marks = asList<YearMark>(t('years.marks', { returnObjects: true }));

  return (
    <ol className="lp-memory-years">
      {marks.map((mark) => (
        <li key={mark.year}>
          <strong>{mark.year}</strong>
          <span>{mark.label}</span>
        </li>
      ))}
    </ol>
  );
};

export const FamilyBoard: React.FC = () => {
  const { t } = useTranslation('landing');
  const people = asList<Person>(t('family.people', { returnObjects: true }));

  return (
    <div className="lp-family-board">
      <p className="lp-family-field">{t('family.field')}</p>
      <ul className="lp-activity">
        {people.map((person) => (
          <li key={person.name}>
            <strong>{person.name}</strong>
            <span>{person.did}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const FarmerProof: React.FC = () => {
  const { t } = useTranslation('landing');
  const quotes = asList<ProofQuote>(t('proof.quotes', { returnObjects: true })).filter(
    (quote) => quote?.quote && quote?.name
  );
  if (quotes.length === 0) return null;

  return (
    <section className="lp-section lp-proof" aria-labelledby="proof-title">
      <div className="landing-container">
        <h2 id="proof-title">{t('proof.title')}</h2>
        <ul>
          {quotes.map((quote) => (
            <li key={quote.name}>
              <blockquote>
                <p>{quote.quote}</p>
                <footer>
                  {quote.name}
                  {quote.detail ? <span>{quote.detail}</span> : null}
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
