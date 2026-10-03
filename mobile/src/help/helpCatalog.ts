import { Ionicons } from '@expo/vector-icons';

export type HelpTopicId =
  | 'workspace'
  | 'record'
  | 'chronologio'
  | 'fields'
  | 'tasks'
  | 'harvest'
  | 'myOil'
  | 'money'
  | 'partners'
  | 'photos'
  | 'settings'
  | 'feedback';

export type HelpQuickActionId = 'record' | 'chronologio' | 'fields' | 'tasks' | 'feedback' | 'settings';

export type HelpTopic = {
  id: HelpTopicId;
  icon: keyof typeof Ionicons.glyphMap;
  /** i18n keys under help:topics.<id>.* */
  searchTags: string[];
};

export type HelpQuickAction = {
  id: HelpQuickActionId;
  icon: keyof typeof Ionicons.glyphMap;
};

/** Ordered topics for the Help screen — short, farmer-facing guides. */
export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'workspace',
    icon: 'grid-outline',
    searchTags: ['home', 'menu', 'launcher', 'workspace', 'αρχική', 'μενού'],
  },
  {
    id: 'record',
    icon: 'add-circle-outline',
    searchTags: ['record', 'capture', 'note', 'photo', 'καταγραφή', 'σημείωμα'],
  },
  {
    id: 'chronologio',
    icon: 'book-outline',
    searchTags: ['chronologio', 'timeline', 'history', 'χρονολόγιο', 'ιστορικό'],
  },
  {
    id: 'fields',
    icon: 'map-outline',
    searchTags: ['field', 'grove', 'boundary', 'map', 'χωράφι', 'ελαιώνας', 'όρια'],
  },
  {
    id: 'tasks',
    icon: 'checkbox-outline',
    searchTags: ['task', 'work', 'todo', 'εργασία', 'δουλειά'],
  },
  {
    id: 'harvest',
    icon: 'basket-outline',
    searchTags: ['harvest', 'sacks', 'oil', 'mill', 'συγκομιδή', 'ράβδος', 'σακιά'],
  },
  {
    id: 'myOil',
    icon: 'cube-outline',
    searchTags: ['oil', 'tins', 'stock', 'λάδι', 'τενεκέδες', 'αποθήκη', 'storage'],
  },
  {
    id: 'money',
    icon: 'wallet-outline',
    searchTags: ['money', 'expense', 'income', 'cost', 'χρήματα', 'έξοδα', 'έσοδα'],
  },
  {
    id: 'partners',
    icon: 'people-outline',
    searchTags: ['partner', 'family', 'help', 'συνεργάτες', 'οικογένεια'],
  },
  {
    id: 'photos',
    icon: 'images-outline',
    searchTags: ['photo', 'picture', 'φωτογραφίες'],
  },
  {
    id: 'settings',
    icon: 'settings-outline',
    searchTags: ['settings', 'language', 'theme', 'ρυθμίσεις', 'γλώσσα'],
  },
  {
    id: 'feedback',
    icon: 'heart-outline',
    searchTags: ['feedback', 'bug', 'idea', 'σχόλια', 'πρόβλημα'],
  },
];

export const HELP_QUICK_ACTIONS: HelpQuickAction[] = [
  { id: 'record', icon: 'add-circle-outline' },
  { id: 'chronologio', icon: 'book-outline' },
  { id: 'fields', icon: 'map-outline' },
  { id: 'tasks', icon: 'checkbox-outline' },
  { id: 'feedback', icon: 'heart-outline' },
  { id: 'settings', icon: 'settings-outline' },
];

export const filterHelpTopics = (
  query: string,
  getCopy: (id: HelpTopicId) => { title: string; body: string },
): HelpTopic[] => {
  const q = query.trim().toLowerCase();
  if (!q) return HELP_TOPICS;
  return HELP_TOPICS.filter((topic) => {
    const copy = getCopy(topic.id);
    const haystack = [topic.id, copy.title, copy.body, ...topic.searchTags]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
};
