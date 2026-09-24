import type { CaptureContext, CaptureSavedDetail } from '../capture/types';
import type { HarvestCampaign } from './types';

export const harvestLinkedRecordId = (campaign: HarvestCampaign): string | undefined =>
  [...campaign.millWeights].reverse().find((row) => row.harvestRecordId)?.harvestRecordId ||
  [...campaign.sacks].reverse().find((row) => row.harvestRecordId)?.harvestRecordId;

export const harvestExpenseCaptureContext = (input: {
  campaign: HarvestCampaign;
  fieldId?: string;
  today: string;
  description: string;
}): CaptureContext => ({
  preferredType: 'expense',
  fieldId: input.fieldId || input.campaign.fieldOrder[0],
  occurredAt: `${input.today}T12:00:00`,
  harvestId: harvestLinkedRecordId(input.campaign),
  category: 'other_expense',
  description: input.description,
  harvestCampaignLink: true,
});

export const shouldMirrorHarvestExpense = (detail: CaptureSavedDetail): boolean =>
  detail.type === 'expense' &&
  detail.harvestCampaignLink === true &&
  Boolean(detail.sourceId) &&
  typeof detail.amount === 'number' &&
  Number.isFinite(detail.amount) &&
  detail.amount > 0;

export const harvestIncomeCaptureContext = (input: {
  campaign: HarvestCampaign;
  fieldId?: string;
  today: string;
  description: string;
}): CaptureContext => ({
  preferredType: 'income',
  fieldId: input.fieldId || input.campaign.fieldOrder[0],
  occurredAt: `${input.today}T12:00:00`,
  harvestId: harvestLinkedRecordId(input.campaign),
  category: 'olive_oil_sale',
  description: input.description,
  harvestCampaignLink: true,
});

export const shouldMirrorHarvestIncome = (detail: CaptureSavedDetail): boolean =>
  detail.type === 'income' &&
  detail.harvestCampaignLink === true &&
  Boolean(detail.sourceId) &&
  typeof detail.amount === 'number' &&
  Number.isFinite(detail.amount) &&
  detail.amount > 0;

export const harvestNoteCaptureContext = (input: {
  campaign: HarvestCampaign;
  fieldId?: string;
  today: string;
}): CaptureContext => ({
  preferredType: 'observation',
  fieldId: input.fieldId || input.campaign.fieldOrder[0],
  occurredAt: `${input.today}T12:00:00`,
  harvestCampaignLink: true,
});

export const shouldMirrorHarvestNote = (detail: CaptureSavedDetail): boolean =>
  detail.type === 'observation' && detail.harvestCampaignLink === true && Boolean(detail.sourceId);
