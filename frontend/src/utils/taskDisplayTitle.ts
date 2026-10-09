import { templateTitle } from '../data/fieldWorkCatalogueLabels';
import { getMinimalTemplate, minimalTemplateTitle } from '../data/minimalTaskTemplates';
import { looksLikeInternalCode } from './proposalPresentation';

export const taskDisplayTitle = (title: string | undefined, templateCode?: string, language = 'el'): string => {
  const trimmed = (title || '').trim();
  if (trimmed && !looksLikeInternalCode(trimmed)) return trimmed;
  if (getMinimalTemplate(templateCode)) {
    return minimalTemplateTitle(templateCode, language);
  }
  return templateTitle(templateCode, language);
};
