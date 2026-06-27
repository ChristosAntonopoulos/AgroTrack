import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  SessionExpired: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Fields: undefined;
  Tasks: { fieldId?: string; filter?: string } | undefined;
  More: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  FieldDetail: { fieldId: string };
  TaskDetail: { taskId: string };
  FieldForm: { fieldId?: string };
  CreateTask: { fieldId?: string };
  Notifications: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
