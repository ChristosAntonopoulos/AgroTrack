import type { Field } from '../../services/fieldService';
import type { HarvestCampaign } from '../types';

export type HarvestSheetSharedProps = {
  campaign: HarvestCampaign;
  fields: Field[];
  today: string;
  locale: string;
  onClose: () => void;
};

export type HarvestSheetKind =
  | import('../types').HarvestCaptureKind
  | 'add'
  | 'mill-link'
  | 'mill-next'
  | 'evening'
  | 'complete'
  | null;
