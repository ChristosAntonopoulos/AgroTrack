import type { TaskProposal } from '../services/fieldWorkService';
import { dedupeTaskProposals, proposalIdentityKey } from './taskProposalDedup';

const proposal = (overrides: Partial<TaskProposal>): TaskProposal => ({
  id: 'p1',
  fieldId: 'field-1',
  resultYear: 2026,
  templateCode: 'T14',
  templateVersion: 1,
  sourceType: 'seasonal_baseline',
  sourceTypeLabel: 'Seasonal',
  generatedAt: '2026-06-01T00:00:00Z',
  confidence: 'worth_checking',
  confidenceLabel: 'Check',
  reasonCodes: ['olive_fly_weekly_check'],
  explanation: 'Weekly trap check',
  greekExplanation: 'Εβδομαδιαίος έλεγχος',
  recommendedWindowStart: '2026-06-01',
  recommendedWindowEnd: '2026-06-07',
  status: 'active',
  statusLabel: 'Active',
  ...overrides,
});

describe('dedupeTaskProposals', () => {
  it('keeps one card for the same field, template, reason and window', () => {
    const list = dedupeTaskProposals([
      proposal({ id: 'a' }),
      proposal({ id: 'b' }),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('a');
  });

  it('keeps the same template on different fields', () => {
    const list = dedupeTaskProposals([
      proposal({ id: 'a', fieldId: 'field-1' }),
      proposal({ id: 'b', fieldId: 'field-2' }),
    ]);
    expect(list.map((p) => p.fieldId)).toEqual(['field-1', 'field-2']);
  });

  it('does not collapse missing field ids onto an assigned field', () => {
    const missing = proposal({ id: 'blank', fieldId: '' });
    const assigned = proposal({ id: 'named', fieldId: 'field-1' });
    expect(proposalIdentityKey(missing)).not.toBe(proposalIdentityKey(assigned));
    expect(dedupeTaskProposals([missing, assigned])).toHaveLength(2);
  });
});
