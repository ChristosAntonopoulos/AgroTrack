import type { FieldWeather } from '../services/geospatialService';
import type { TaskProposal } from '../services/fieldWorkService';
import { isWeatherSensitiveTemplate, templateTitle } from '../data/fieldWorkCatalogueLabels';
import { formatTaskDateRange } from './taskDateRange';
import { parseBusinessDate } from './athensDate';
import type { WeatherDisplayKind } from './taskWeather';

export const PROPOSAL_SCHEDULE_KEY = 'oleachron.scheduleProposal.v1';

export type ProposalUrgencyRank = 1 | 2 | 3 | 4 | 5;
export type ProposalUrgencyGroup = 'needsDecision' | 'canWait';

export type ProposalChipKind = 'official' | 'expiring' | 'good' | 'caution' | 'unsuitable' | 'unknown' | 'seasonal';

export type ProposalChip = {
  id: ProposalChipKind;
  labelKey: string;
};

const GENERIC_EXPLANATION = [
  'οι συνθήκες και οι καταγραφές',
  'conditions suggest',
  'conditions and records',
];

const REASON_EXPLANATION_EL: Record<string, string> = {
  olive_fly_weekly_check: 'Δεν έχει καταγραφεί έλεγχος παγίδων τις τελευταίες 7 ημέρες.',
  olive_fly_activate: 'Είναι ώρα να ενεργοποιήσεις την παρακολούθηση δάκου, αν υπάρχει καρπός.',
  official_warning: 'Υπάρχει επίσημη προειδοποίηση για το χωράφι. Αξιολόγησέ την πριν αποφασίσεις.',
  harvest_estimate: 'Η συγκομιδή πλησιάζει. Επιβεβαίωσε εκτίμηση παραγωγής.',
  harvest_booking: 'Η συγκομιδή αναμένεται τον Νοέμβριο. Είναι ώρα να επιβεβαιώσεις συνεργείο και ελαιοτριβείο.',
  post_treatment_rain: 'Καταγράφηκε βροχή μετά την εφαρμογή. Χρειάζεται έλεγχος, όχι απαραίτητα επανάληψη.',
  fertiliser_rain: 'Καταγράφηκε βροχή μετά τη λίπανση. Χρειάζεται έλεγχος, όχι απαραίτητα επανάληψη.',
  frost_urgent: 'Αναμένεται παγετός. Έλεγξε το χωράφι μετά το κρύο.',
  heat_urgent: 'Αναμένεται ισχυρή ζέστη. Έλεγξε το χωράφι για καταπόνηση.',
  irrigation_deficit: 'Με τα σημερινά δεδομένα, το χωράφι μπορεί να χρειάζεται νερό σύντομα.',
  flowering_unconfirmed: 'Αναμένεται άνθιση — επιβεβαίωσε το στάδιο με μια παρατήρηση.',
  fruit_set_assessment: 'Μετά την άνθηση, εκτίμησε την καρπόδεση.',
  olive_moth_monitoring: 'Είναι περίοδος παρακολούθησης πυρηνοτρήτη — όχι αυτόματη σύσταση ψεκασμού.',
};

const REASON_EXPLANATION_EN: Record<string, string> = {
  olive_fly_weekly_check: 'No trap check has been recorded in the last 7 days.',
  olive_fly_activate: 'It is time to start olive-fly monitoring if the field has fruit.',
  official_warning: 'An official warning applies to this field. Review it before you decide.',
  harvest_estimate: 'Harvest is approaching. Confirm the production estimate.',
  harvest_booking: 'Harvest is expected in November. Confirm crew and mill bookings.',
  post_treatment_rain: 'Rain was recorded after the application. Check the field — a repeat is not always needed.',
  fertiliser_rain: 'Rain was recorded after fertilisation. Check the field — a repeat is not always needed.',
  frost_urgent: 'Frost is expected. Check the field after the cold.',
  heat_urgent: 'Strong heat is expected. Check the field for stress.',
  irrigation_deficit: 'Current data suggest the field may need water soon.',
  flowering_unconfirmed: 'Flowering is expected — confirm the stage with an observation.',
  fruit_set_assessment: 'After flowering, assess fruit set.',
  olive_moth_monitoring: 'Olive-moth monitoring period — not an automatic spray recommendation.',
};

const SEASONAL_FALLBACK_EL = 'Εποχική υπενθύμιση — δεν υπάρχουν ακόμη δεδομένα από το χωράφι.';
const SEASONAL_FALLBACK_EN = 'Seasonal reminder — there is not yet field evidence.';

export const isOfficialProposal = (proposal: TaskProposal): boolean => {
  const source = String(proposal.sourceType || '').toLowerCase();
  const reasons = (proposal.reasonCodes || []).map((code) => String(code || '').toLowerCase());
  return (
    source.includes('warning') ||
    source.includes('official') ||
    reasons.includes('official_warning') ||
    reasons.some((code) => code.includes('urgent') || code.includes('frost') || code.includes('storm'))
  );
};

export const proposalWindowEnd = (proposal: TaskProposal): Date | null => {
  const raw = proposal.validUntil || proposal.recommendedWindowEnd;
  if (!raw) return null;
  const date = parseBusinessDate(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isExpiringProposal = (proposal: TaskProposal, now = new Date()): boolean => {
  const end = proposalWindowEnd(proposal);
  if (!end) return false;
  const ms = end.getTime() - now.getTime();
  return ms >= 0 && ms <= 7 * 24 * 60 * 60 * 1000;
};

export const isWeatherSensitiveProposal = (proposal: TaskProposal): boolean =>
  isWeatherSensitiveTemplate(proposal.templateCode);

export const isInformationalProposal = (proposal: TaskProposal): boolean => {
  const confidence = String(proposal.confidence || '').toLowerCase();
  return confidence.includes('info') || confidence === 'low' || confidence === 'informational';
};

export const proposalUrgencyRank = (proposal: TaskProposal, now = new Date()): ProposalUrgencyRank => {
  if (isOfficialProposal(proposal)) return 1;
  if (isExpiringProposal(proposal, now)) return 2;
  if (isWeatherSensitiveProposal(proposal)) return 3;
  if (isInformationalProposal(proposal)) return 5;
  return 4;
};

export const sortProposals = (proposals: TaskProposal[], now = new Date()): TaskProposal[] =>
  [...proposals].sort((a, b) => {
    const rank = proposalUrgencyRank(a, now) - proposalUrgencyRank(b, now);
    if (rank !== 0) return rank;
    const aEnd = proposalWindowEnd(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bEnd = proposalWindowEnd(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aEnd - bEnd;
  });

export const groupProposals = (
  proposals: TaskProposal[],
  now = new Date()
): { needsDecision: TaskProposal[]; canWait: TaskProposal[] } => {
  const sorted = sortProposals(proposals, now);
  if (sorted.length < 4) {
    return { needsDecision: sorted, canWait: [] };
  }
  return {
    needsDecision: sorted.filter((proposal) => proposalUrgencyRank(proposal, now) <= 3),
    canWait: sorted.filter((proposal) => proposalUrgencyRank(proposal, now) >= 4),
  };
};

const looksGeneric = (text: string): boolean => {
  const lower = text.toLowerCase();
  return GENERIC_EXPLANATION.some((fragment) => lower.includes(fragment));
};

export const proposalExplanation = (proposal: TaskProposal, language = 'el'): string => {
  const greek = language.toLowerCase().startsWith('el');
  const raw = (greek ? proposal.greekExplanation || proposal.explanation : proposal.explanation || proposal.greekExplanation || '').trim();
  const reason = (proposal.reasonCodes?.[0] || '').toLowerCase();
  const mapped = greek ? REASON_EXPLANATION_EL[reason] : REASON_EXPLANATION_EN[reason];
  if (mapped && (!raw || looksGeneric(raw))) return mapped;
  if (raw && !looksGeneric(raw)) return raw;
  if (mapped) return mapped;
  return greek ? SEASONAL_FALLBACK_EL : SEASONAL_FALLBACK_EN;
};

export const proposalTitle = (proposal: TaskProposal, language = 'el'): string =>
  templateTitle(proposal.templateCode, language);

export const formatRecommendedPeriod = (
  proposal: TaskProposal,
  locale = 'el'
): string => {
  const range = formatTaskDateRange(
    proposal.recommendedWindowStart,
    proposal.recommendedWindowEnd,
    locale
  );
  if (range) return range;
  if (proposal.recommendedWindowEnd) {
    return formatTaskDateRange(undefined, proposal.recommendedWindowEnd, locale);
  }
  return '';
};

export const evaluateProposalWeather = (
  proposal: TaskProposal,
  weather?: FieldWeather | null
): { kind: WeatherDisplayKind; facts: Array<{ el: string; en: string }> } => {
  if (!isWeatherSensitiveProposal(proposal)) {
    return { kind: 'not_sensitive', facts: [] };
  }
  if (!weather || !weather.current) {
    return { kind: 'unknown', facts: [] };
  }

  const rain24 = weather.rain?.forecast24hMm ?? 0;
  const wind = weather.current.windSpeedKmh ?? weather.wind?.currentSpeedKmh ?? 0;
  const low = weather.current.lowC;
  const high = weather.current.highC;
  const updated = weather.lastUpdatedAt;

  const facts: Array<{ el: string; en: string }> = [];
  if (rain24 <= 0.2) {
    facts.push({ el: 'Δεν αναμένεται βροχή', en: 'No rain expected' });
  } else {
    facts.push({
      el: `Αναμένονται περίπου ${Math.round(rain24)} mm βροχής`,
      en: `About ${Math.round(rain24)} mm of rain expected`,
    });
  }
  facts.push({
    el: `Άνεμος έως ${Math.round(wind)} km/h`,
    en: `Wind up to ${Math.round(wind)} km/h`,
  });
  facts.push({
    el: `Θερμοκρασία ${Math.round(low)}–${Math.round(high)}°C`,
    en: `Temperature ${Math.round(low)}–${Math.round(high)}°C`,
  });
  if (updated) {
    const minutes = Math.max(1, Math.round((Date.now() - new Date(updated).getTime()) / 60000));
    facts.push({
      el: `Ενημέρωση πριν από ${minutes} λεπτά`,
      en: `Updated ${minutes} minutes ago`,
    });
  }

  if (rain24 >= 10 || wind >= 35) return { kind: 'unsuitable', facts };
  if (rain24 >= 2 || wind >= 20) return { kind: 'caution', facts };
  return { kind: 'good', facts };
};

export const proposalChips = (
  proposal: TaskProposal,
  weatherKind: WeatherDisplayKind,
  now = new Date()
): ProposalChip[] => {
  const chips: ProposalChip[] = [];
  if (isOfficialProposal(proposal)) {
    chips.push({ id: 'official', labelKey: 'fieldWork.proposal.chips.official' });
  }
  if (isExpiringProposal(proposal, now)) {
    chips.push({ id: 'expiring', labelKey: 'fieldWork.proposal.chips.expiring' });
  }
  if (weatherKind === 'good') chips.push({ id: 'good', labelKey: 'fieldWork.proposal.chips.good' });
  if (weatherKind === 'caution') chips.push({ id: 'caution', labelKey: 'fieldWork.proposal.chips.caution' });
  if (weatherKind === 'unsuitable') chips.push({ id: 'unsuitable', labelKey: 'fieldWork.proposal.chips.unsuitable' });
  if (weatherKind === 'unknown') chips.push({ id: 'unknown', labelKey: 'fieldWork.proposal.chips.unknown' });
  if (chips.length === 0) {
    chips.push({ id: 'seasonal', labelKey: 'fieldWork.proposal.chips.seasonal' });
  }
  return chips.slice(0, 2);
};

export const stashProposalForSchedule = (proposal: TaskProposal): void => {
  try {
    sessionStorage.setItem(PROPOSAL_SCHEDULE_KEY, JSON.stringify(proposal));
  } catch {
    /* ignore quota / private mode */
  }
};

export const readStashedProposal = (): TaskProposal | null => {
  try {
    const raw = sessionStorage.getItem(PROPOSAL_SCHEDULE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TaskProposal;
  } catch {
    return null;
  }
};

export const toDateInputValue = (value?: string): string => {
  if (!value) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? '';
};

export const scheduleProposalPath = (proposal: TaskProposal): string => {
  const params = new URLSearchParams();
  params.set('proposalId', proposal.id);
  if (proposal.fieldId) params.set('fieldId', proposal.fieldId);
  return `/tasks/new?${params.toString()}`;
};

export const looksLikeInternalCode = (value?: string): boolean => {
  const text = (value || '').trim();
  if (!text) return true;
  if (/^T\d{2}$/i.test(text)) return true;
  return /^[a-z0-9]+(_[a-z0-9]+)+$/i.test(text);
};

export const humanMetaLabel = (value?: string): string =>
  looksLikeInternalCode(value) ? '' : (value || '').trim();

export const weatherExplanationCopy = (
  kind: WeatherDisplayKind,
  facts: Array<{ el: string; en: string }>,
  language = 'el'
): { headline: string; facts: string[] } => {
  const greek = language.toLowerCase().startsWith('el');
  if (kind === 'not_sensitive') {
    return {
      headline: greek
        ? 'Ο καιρός δεν επηρεάζει σημαντικά αυτή την εργασία.'
        : 'Weather does not significantly affect this task.',
      facts: [],
    };
  }
  if (kind === 'unknown') {
    return {
      headline: greek
        ? 'Δεν υπάρχουν αρκετά δεδομένα καιρού για να αξιολογηθεί η ημέρα.'
        : 'There is not enough weather data to judge the day.',
      facts: [],
    };
  }
  return {
    headline: '',
    facts: facts.map((fact) => (greek ? fact.el : fact.en)),
  };
};
