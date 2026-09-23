import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Check, CloudSun, Plus, Wallet, Wheat } from 'lucide-react';
import grovePhoto from '../../assets/landing/hero-grove.jpg';

type MonthId = 'sep' | 'oct' | 'nov';
type Kind = 'weather' | 'task' | 'note' | 'harvest' | 'expense';

type TimelineEntry = {
  id: string;
  month: MonthId;
  kind: Kind;
  day: string;
  title: string;
  meta: string;
  detail: string;
  photo?: boolean;
};

type Capability = { key: string; title: string; outcome: string; text: string };

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? (value as string[]) : [];

const asCapabilities = (value: unknown): Capability[] =>
  Array.isArray(value) ? (value as Capability[]) : [];

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  return reduced;
};

export const HeroStage: React.FC = () => {
  const { t } = useTranslation('landing');
  const rows: { id: Kind; photo?: boolean }[] = [
    { id: 'weather' },
    { id: 'task' },
    { id: 'note', photo: true },
    { id: 'harvest' },
    { id: 'expense' },
  ];

  return (
    <div className="lp-stage lp-stage--hero">
      <div className="lp-stage-bar">
        <span className="lp-field-chip">
          <span className="lp-field-dot" aria-hidden />
          {t('journal.field')}
        </span>
        <span className="lp-stage-month">{t('journal.month')}</span>
      </div>
      <ul className="lp-hero-rows">
        {rows.map((row) => (
          <li key={row.id} className={`lp-entry is-${row.id}`}>
            <EntryGlyph id={row.id} />
            <span>
              <strong>{t(`journal.${row.id}Title`)}</strong>
              <span>{t(`journal.${row.id}Meta`)}</span>
            </span>
            {row.photo ? <img src={grovePhoto} alt="" className="lp-note-photo" /> : null}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const ProofStrip: React.FC = () => {
  const { t } = useTranslation('landing');
  const items = asStrings(t('hero.strip', { returnObjects: true }));
  return (
    <p className="lp-strip">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </p>
  );
};

const POINT_ENTRY: Record<number, string> = {
  0: 'task',
  1: 'note',
  2: 'harvest',
};

export const ChronologioCentre: React.FC = () => {
  const { t } = useTranslation('landing');
  const reduced = useReducedMotion();
  const months = asStrings(t('chronologio.months', { returnObjects: true }));
  const points = asStrings(t('chronologio.points', { returnObjects: true }));
  const [month, setMonth] = useState<MonthId>('oct');
  const [selected, setSelected] = useState('note');
  const [paused, setPaused] = useState(false);

  const entries: TimelineEntry[] = [
    {
      id: 'sep',
      month: 'sep',
      kind: 'task',
      day: '12',
      title: t('journal.sepTitle'),
      meta: t('journal.sepMeta'),
      detail: t('journal.sepDetail'),
    },
    {
      id: 'weather',
      month: 'oct',
      kind: 'weather',
      day: '8',
      title: t('journal.weatherTitle'),
      meta: t('journal.weatherMeta'),
      detail: t('journal.detailWeather'),
    },
    {
      id: 'task',
      month: 'oct',
      kind: 'task',
      day: '8',
      title: t('journal.taskTitle'),
      meta: t('journal.taskMeta'),
      detail: t('journal.detailTask'),
    },
    {
      id: 'note',
      month: 'oct',
      kind: 'note',
      day: '8',
      title: t('journal.noteTitle'),
      meta: t('journal.noteMeta'),
      detail: t('journal.detailNote'),
      photo: true,
    },
    {
      id: 'harvest',
      month: 'oct',
      kind: 'harvest',
      day: '22',
      title: t('journal.harvestTitle'),
      meta: t('journal.harvestMeta'),
      detail: t('journal.detailHarvest'),
    },
    {
      id: 'expense',
      month: 'oct',
      kind: 'expense',
      day: '22',
      title: t('journal.expenseTitle'),
      meta: t('journal.expenseMeta'),
      detail: t('journal.detailExpense'),
    },
    {
      id: 'nov',
      month: 'nov',
      kind: 'harvest',
      day: '4',
      title: t('journal.novTitle'),
      meta: t('journal.novMeta'),
      detail: t('journal.novDetail'),
    },
  ];

  const visible = entries.filter((entry) => entry.month === month);
  const open = visible.find((entry) => entry.id === selected) ?? visible[0];

  useEffect(() => {
    if (reduced || paused || month !== 'oct') return undefined;
    const order = ['task', 'note', 'harvest', 'expense'];
    const timer = window.setInterval(() => {
      setSelected((current) => {
        const index = order.indexOf(current);
        return order[(index + 1) % order.length];
      });
    }, 4600);
    return () => window.clearInterval(timer);
  }, [reduced, paused, month]);

  return (
    <div className="lp-centre">
      <div className="lp-centre-copy">
        <h2 id="chrono-title">{t('chronologio.title')}</h2>
        <p>{t('chronologio.text')}</p>
        <div className="lp-points" role="group" aria-label={t('chronologio.title')}>
          {points.map((point, index) => (
            <button
              key={point}
              type="button"
              className={open?.id === POINT_ENTRY[index] ? 'is-active' : ''}
              onClick={() => {
                setPaused(true);
                setMonth('oct');
                setSelected(POINT_ENTRY[index]);
              }}
            >
              {point}
            </button>
          ))}
        </div>
      </div>
      <div
        className="lp-timeline"
        onMouseEnter={() => setPaused(true)}
        onFocusCapture={() => setPaused(true)}
      >
        <div className="lp-rail" role="group" aria-label={t('chronologio.railLabel')}>
          {(['sep', 'oct', 'nov'] as MonthId[]).map((id, index) => (
            <button
              key={id}
              type="button"
              className={month === id ? 'is-active' : ''}
              aria-pressed={month === id}
              onClick={() => {
                setPaused(true);
                setMonth(id);
                setSelected(id === 'oct' ? 'note' : id);
              }}
            >
              {months[index]}
            </button>
          ))}
        </div>
        <div className="lp-timeline-body">
          <ol>
            {visible.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className={open?.id === entry.id ? 'is-active' : ''}
                  aria-pressed={open?.id === entry.id}
                  onClick={() => {
                    setPaused(true);
                    setSelected(entry.id);
                  }}
                >
                  <span className="lp-timeline-day">{entry.day}</span>
                  <span>
                    <strong>{entry.title}</strong>
                    <em>{entry.meta}</em>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {open ? (
            <article className="lp-drawer" aria-live="polite">
              {open.photo ? <img src={grovePhoto} alt="" /> : null}
              <p className="lp-example">{t('journal.example')}</p>
              <h3>{open.title}</h3>
              <p className="lp-drawer-meta">{open.meta}</p>
              <p>{open.detail}</p>
              <p className="lp-drawer-field">{t('journal.field')}</p>
            </article>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const EntryGlyph: React.FC<{ id: Kind }> = ({ id }) => {
  const icon =
    id === 'weather' ? (
      <CloudSun size={20} />
    ) : id === 'task' ? (
      <Check size={20} />
    ) : id === 'note' ? (
      <Camera size={20} />
    ) : id === 'harvest' ? (
      <Wheat size={20} />
    ) : (
      <Wallet size={20} />
    );
  return (
    <span className={`lp-glyph is-${id}`} aria-hidden>
      {icon}
    </span>
  );
};

export const CapabilityGrid: React.FC = () => {
  const { t } = useTranslation('landing');
  const items = asCapabilities(t('capabilities.items', { returnObjects: true }));
  const byKey = Object.fromEntries(items.map((item) => [item.key, item]));
  const lead = ['map', 'harvest'];
  const small = ['tasks', 'capture', 'money', 'context'];

  return (
    <>
      <div className="lp-bento">
        {lead.map((key) =>
          byKey[key] ? (
            <article key={key} className={`lp-cap lp-cap--lead lp-cap--${key}`}>
              <CapabilitySketch kind={key} />
              <h3>{byKey[key].title}</h3>
              <p className="lp-cap-outcome">{byKey[key].outcome}</p>
              <p>{byKey[key].text}</p>
            </article>
          ) : null
        )}
        {small.map((key) =>
          byKey[key] ? (
            <article key={key} className="lp-cap lp-cap--small">
              <CapabilitySketch kind={key} />
              <h3>{byKey[key].title}</h3>
              <p className="lp-cap-outcome">{byKey[key].outcome}</p>
            </article>
          ) : null
        )}
      </div>
      <p className="lp-bridge">{t('capabilities.bridge')}</p>
    </>
  );
};

const CapabilitySketch: React.FC<{ kind: string }> = ({ kind }) => {
  const { t } = useTranslation('landing');
  if (kind === 'map') {
    return (
      <div className="lp-sketch lp-sketch--map" aria-hidden>
        <FieldShape tone="even" labeled={t('journal.field')} />
      </div>
    );
  }
  if (kind === 'harvest') {
    return (
      <ul className="lp-sketch lp-sketch-ledger" aria-hidden>
        <li>
          <span>{t('harvest.sacks')}</span>
          <strong>42</strong>
        </li>
        <li>
          <span>{t('harvest.kilos')}</span>
          <strong>860</strong>
        </li>
        <li>
          <span>{t('harvest.litres')}</span>
          <strong>148</strong>
        </li>
        <li>
          <span>{t('harvest.expenses')}</span>
          <strong>{t('journal.expenseMeta')}</strong>
        </li>
      </ul>
    );
  }
  const icon =
    kind === 'tasks' ? (
      <Check strokeWidth={2.4} />
    ) : kind === 'capture' ? (
      <Camera strokeWidth={2.2} />
    ) : kind === 'money' ? (
      <Wallet strokeWidth={2.2} />
    ) : (
      <CloudSun strokeWidth={2.2} />
    );
  return (
    <div className={`lp-cue lp-cue--${kind}`} aria-hidden>
      {icon}
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
        <FieldShape tone="patchy" labeled={t('journal.field')} />
        <div className="lp-compare-top" style={{ width: `${june}%` }}>
          <FieldShape tone="even" labeled={t('journal.field')} />
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
      <path d="M18 0 C 40 90, 22 180, 64 270 C 92 330, 48 380, 70 420" fill="none" stroke="#f3ead8" strokeWidth="14" opacity="0.72" />
      <path d="M34 0 C 52 90, 36 180, 76 270 C 102 330, 60 380, 82 420" fill="none" stroke="#c4b48f" strokeWidth="2" opacity="0.55" />
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
        <text
          x="330"
          y="214"
          textAnchor="middle"
          fill={tone === 'even' ? '#F6F3EB' : '#243028'}
          fontSize="28"
          fontWeight="700"
        >
          {labeled}
        </text>
      ) : null}
    </svg>
  );
};

export const HarvestCapture: React.FC = () => {
  const { t } = useTranslation('landing');
  const lines = [
    [t('harvest.sacks'), t('harvest.sacksValue')],
    [t('harvest.kilos'), t('harvest.kilosValue')],
    [t('harvest.litres'), t('harvest.litresValue')],
    [t('harvest.expenses'), t('harvest.expensesValue')],
  ];
  return (
    <div className="lp-phone">
      <p className="lp-example">{t('journal.example')}</p>
      <h3>
        {t('journal.field')}
        <span>{t('hero.today')}</span>
      </h3>
      <dl>
        {lines.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <Link to="/register" className="lp-phone-add">
        <Plus size={22} aria-hidden />
        {t('harvest.add')}
      </Link>
      <p className="lp-phone-sofar">{t('harvest.soFar')}</p>
    </div>
  );
};

export const TrustLabels: React.FC = () => {
  const { t } = useTranslation('landing');
  const labels = asStrings(t('trust.labels', { returnObjects: true }));
  return (
    <ul className="lp-trust-labels">
      {labels.map((label) => (
        <li key={label}>{label}</li>
      ))}
    </ul>
  );
};
