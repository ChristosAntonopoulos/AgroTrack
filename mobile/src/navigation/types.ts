import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  SessionExpired: undefined;
  InviteAccept: { token: string };
  FamilyInviteAccept: { token: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Today: undefined;
  Calendar: { date?: string; fieldId?: string } | undefined;
  Fields: undefined;
  Capture: undefined;
  ChronologioTab: undefined;
  Tasks: { fieldId?: string; filter?: string } | undefined;
  More: undefined;
  Settings: undefined;
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
  ThisHarvest: undefined;
  ThisHarvestReview: undefined;
  Money: { fieldId?: string } | undefined;
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
  FieldForm: { fieldId?: string };
  FieldMapBoundary: { fieldId: string };
  CreateTask: { fieldId?: string; scheduledStart?: string; scheduledEnd?: string };
  Notifications: undefined;
  NotesList: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
