import type { TaskProposal } from '../services/fieldWorkService';
import { athensCalendarDateKey } from './athensDate';

const dateKey = (value?: string): string => {
  if (!value) return '-';
  try {
    return athensCalendarDateKey(value);
  } catch {
    return '-';
  }
};

export const proposalIdentityKey = (proposal: TaskProposal): string => {
  const reason = (proposal.reasonCodes[0] || proposal.sourceReference || 'default').toUpperCase();
  const template = (proposal.templateCode || '').trim().toUpperCase();
  return [
    proposal.fieldId || '-',
    template,
    reason,
    dateKey(proposal.recommendedWindowStart),
    dateKey(proposal.recommendedWindowEnd),
  ].join('|');
};

/** One active card per field / template / reason / window. Different fields stay distinct. */
export const dedupeTaskProposals = (proposals: TaskProposal[]): TaskProposal[] => {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const result: TaskProposal[] = [];

  for (const proposal of proposals) {
    if (seenIds.has(proposal.id)) continue;
    const key = proposalIdentityKey(proposal);
    if (seenKeys.has(key)) continue;
    seenIds.add(proposal.id);
    seenKeys.add(key);
    result.push(proposal);
  }

  return result;
};
