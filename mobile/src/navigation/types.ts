import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: { reset?: boolean; token?: string; code?: string; email?: string } | undefined;
  Register: { token?: string; code?: string; email?: string; name?: string } | undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  Legal: { kind: 'privacy' | 'terms' };
  SessionExpired: undefined;
  InviteAccept: { token: string };
};

export type HarvestCampaignParams = {
  add?: boolean;
  kind?: 'sacks' | 'mill' | 'oil' | 'people' | 'expense' | 'income' | 'note';
  fieldId?: string;
  harvestId?: string;
  day?: string;
  /** `fields` / `totals` / `log` accepted for deep links; screen maps them to today|season. */
  view?: 'today' | 'season' | 'fields' | 'totals' | 'log';
};

export type FieldsStackParamList = {
  FieldsHome: undefined;
  HarvestCampaign: HarvestCampaignParams | undefined;
};

/** Phone home is the launcher. The dock shows only the record button. */
export type MainTabParamList = {
  Launcher: undefined;
  ChronologioTab: { fieldId?: string } | undefined;
  Fields: NavigatorScreenParams<FieldsStackParamList> | undefined;
  Capture: undefined;
  Tasks: {
    fieldId?: string;
    filter?: string;
    view?: 'today' | 'upcoming' | 'done' | 'todo' | 'now' | 'proposals' | 'history' | 'planned' | 'active';
    year?: string;
    created?: string;
    schedule?: boolean;
    templateCode?: string;
  } | undefined;
  More: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  FieldDetail: {
    fieldId: string;
    focus?: 'harvest' | 'harvest-final' | 'money';
    /** Local field page tab. Legacy `map` / `overview` / `vegetation` → field; `chronologio` kept for activation coaching. */
    mode?: 'field' | 'weather' | 'details' | 'vegetation' | 'overview' | 'map' | 'chronologio';
    /** First-run spatial loading panel. */
    activation?: 'spatial' | 'observe';
    /** Shown after the first boundary is saved. */
    groveReady?: boolean;
  };
  InviteAccept: { token: string };
  FamilyInviteAccept: { token: string };
  PartnerInviteAccept: { token: string };
  HarvestCampaign: HarvestCampaignParams | undefined;
  ThisHarvest: undefined;
  ThisHarvestReview: undefined;
  Money: { fieldId?: string; year?: number; tx?: string } | undefined;
  MyOil: { field?: string; do?: 'add' | 'give' | 'sell' | 'hold' | 'fill' | 'count' } | undefined;
  Photos: { fieldId?: string; photoId?: string; importNearby?: boolean } | undefined;
  Analytics: undefined;
  Reports: undefined;
  Partners: { fieldId?: string; category?: string; taskId?: string; addContact?: boolean } | undefined;
  PartnerSearch: { fieldId: string; categoryId?: string; category?: string; radiusKm?: number; taskId?: string };
  PartnerProfile: { userId: string; fieldId?: string; categoryId?: string; taskId?: string };
  MyServices: undefined;
  ServiceRequests: undefined;
  FieldWeatherVegetation: { fieldId: string };
  Chronologio: { fieldId?: string } | undefined;
  TaskDetail: { taskId: string };
  TaskCompletion: { taskId: string };
  FieldForm: { fieldId?: string; focus?: 'details' | 'settings' | 'appearance' };
  FieldWorkSetup: { fieldId: string; edit?: boolean };
  FieldWorkProfile: { fieldId: string };
  FieldMapBoundary: { fieldId: string };
  CreateTask: {
    fieldId?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    proposalId?: string;
    templateCode?: string;
  };
  Notifications: undefined;
  /** Deep-link alias; redirects to Chronologio. */
  NotesList: undefined;
  /** Secondary destinations previously hidden tabs — now root stack. */
  Calendar: { date?: string; fieldId?: string } | undefined;
  Settings: undefined;
  /** Plan, usage, manage / restore. Opened from More and Settings. */
  Subscription: undefined;
  Help: undefined;
  Legal: { kind: 'privacy' | 'terms' };
  Feedback: undefined;
  /** Deep-link alias; redirects to Chronologio. */
  Dashboard: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
