import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  SessionExpired: undefined;
  InviteAccept: { token: string };
  FamilyInviteAccept: { token: string };
  PartnerInviteAccept: { token: string };
};

export type HarvestCampaignParams = {
  add?: boolean;
  evening?: boolean;
  fieldId?: string;
  harvestId?: string;
  day?: string;
};

export type FieldsStackParamList = {
  FieldsHome: undefined;
  HarvestCampaign: HarvestCampaignParams | undefined;
};

/** Visible bottom tabs: Chronologio · Fields · Capture · Tasks · More */
export type MainTabParamList = {
  ChronologioTab: undefined;
  Fields: NavigatorScreenParams<FieldsStackParamList> | undefined;
  Capture: undefined;
  Tasks: {
    fieldId?: string;
    filter?: string;
    view?: 'now' | 'upcoming' | 'proposals' | 'history' | 'planned' | 'active';
    year?: string;
    created?: string;
  } | undefined;
  More: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  FieldDetail: {
    fieldId: string;
    focus?: 'harvest' | 'harvest-final' | 'money';
    /** Local field page tab (web-aligned). Legacy `chronologio` / `overview` still accepted. */
    mode?: 'overview' | 'map' | 'details' | 'chronologio';
  };
  InviteAccept: { token: string };
  FamilyInviteAccept: { token: string };
  PartnerInviteAccept: { token: string };
  HarvestCampaign: HarvestCampaignParams | undefined;
  ThisHarvest: undefined;
  ThisHarvestReview: undefined;
  Money: { fieldId?: string; year?: number; tx?: string } | undefined;
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
  FieldForm: { fieldId?: string };
  FieldWorkSetup: { fieldId: string; edit?: boolean };
  FieldMapBoundary: { fieldId: string };
  CreateTask: { fieldId?: string; scheduledStart?: string; scheduledEnd?: string; proposalId?: string };
  Notifications: undefined;
  /** Deep-link alias; redirects to Chronologio. */
  NotesList: undefined;
  /** Secondary destinations previously hidden tabs — now root stack. */
  Calendar: { date?: string; fieldId?: string } | undefined;
  Settings: undefined;
  Feedback: undefined;
  /** Deep-link alias; redirects to Chronologio. */
  Dashboard: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
