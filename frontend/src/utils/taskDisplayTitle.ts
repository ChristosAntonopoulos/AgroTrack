import { templateTitle } from '../data/fieldWorkCatalogueLabels';
import { looksLikeInternalCode } from './proposalPresentation';

export const taskDisplayTitle = (title: string | undefined, templateCode?: string, language = 'el'): string => {
  const trimmed = (title || '').trim();
  if (trimmed && !looksLikeInternalCode(trimmed)) return trimmed;
  return templateTitle(templateCode, language);
};
