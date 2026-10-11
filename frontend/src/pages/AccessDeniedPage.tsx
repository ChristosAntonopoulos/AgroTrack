import React from 'react';
import { ShieldX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import Button from '../components/Common/Button';
import PageContainer from '../components/Common/PageContainer';

type Lang = 'el' | 'en' | 'it';

/** Human names per module (QA-008: My Oil is not reported as "money"). */
const MODULE_LABELS: Record<string, Record<Lang, string>> = {
  money: { el: 'Οικονομικά', en: 'Money', it: 'Denaro' },
  harvest: { el: 'Συγκομιδή', en: 'Harvest', it: 'Raccolto' },
  myOil: { el: 'Το λάδι μου', en: 'My Oil', it: 'Il mio olio' },
  tasks: { el: 'Εργασίες', en: 'Tasks', it: 'Attività' },
  photos: { el: 'Φωτογραφίες', en: 'Photos', it: 'Foto' },
  chronologio: { el: 'Χρονολόγιο', en: 'Chronologio', it: 'Cronologio' },
  documents: { el: 'Έγγραφα', en: 'Documents', it: 'Documenti' },
  access: { el: 'Πρόσβαση', en: 'Access', it: 'Accesso' },
};

const COPY: Record<Lang, { title: string; body: (name: string | null) => string; back: string }> = {
  el: {
    title: 'Δεν έχεις πρόσβαση',
    body: (name) =>
      `Δεν έχεις δικαίωμα να ανοίξεις ${name ? `την ενότητα «${name}»` : 'αυτή την ενότητα'} για το επιλεγμένο ελαιώνα.`,
    back: 'Επιστροφή στους ελαιώνες',
  },
  en: {
    title: 'Access denied',
    body: (name) =>
      `You do not have permission to open ${name ? `the “${name}” module` : 'this section'} for the selected field.`,
    back: 'Back to fields',
  },
  it: {
    title: 'Accesso negato',
    body: (name) =>
      `Non hai il permesso di aprire ${name ? `il modulo «${name}»` : 'questa sezione'} per il campo selezionato.`,
    back: 'Torna ai campi',
  },
};

const AccessDeniedPage: React.FC = () => {
  const { i18n } = useTranslation();
  const [params] = useSearchParams();
  const moduleKey = params.get('module');
  const lang: Lang = i18n.language?.startsWith('el') ? 'el' : i18n.language?.startsWith('it') ? 'it' : 'en';
  const moduleName = moduleKey ? MODULE_LABELS[moduleKey]?.[lang] ?? moduleKey : null;
  const copy = COPY[lang];

  return (
    <PageContainer maxWidth="sm">
      <div className="error-container" role="alert">
        <ShieldX size={44} aria-hidden />
        <h1>{copy.title}</h1>
        <p>{copy.body(moduleName)}</p>
        <Button to="/fields" variant="primary">
          {copy.back}
        </Button>
      </div>
    </PageContainer>
  );
};

export default AccessDeniedPage;
