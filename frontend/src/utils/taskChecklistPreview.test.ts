import { checklistPreviewItems } from './taskChecklistPreview';

describe('checklist preview', () => {
  it('returns at most three Greek examples for a known template', () => {
    const preview = checklistPreviewItems('T14', 'el');
    expect(preview.items).toEqual([
      'Συλλήψεις παγίδας',
      'Περίοδος παγίδας σε ημέρες',
      'Δειγματοληψία καρπών',
    ]);
    expect(preview.items).toHaveLength(3);
  });
});
