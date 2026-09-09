import api from './api';

export interface LocalizedText {
  el: string;
  en: string;
  it: string;
}

export interface ServiceCategory {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  icon: string;
  parentCategoryId?: string;
  sortOrder: number;
  isActive: boolean;
  isProminent: boolean;
  suggestedTaskTypes: string[];
}

export interface PartnerSearchResult {
  userId: string;
  displayName: string;
  photoUrl?: string;
  providerKind: string;
  categories: ServiceCategory[];
  distanceKm: number;
  availability: string;
  experienceYears?: number;
  crewSize?: number;
  equipment?: string;
  isVerified: boolean;
  baseAreaLabel?: string;
  pricingNote?: string;
}

export interface PartnerSearchResponse {
  results: PartnerSearchResult[];
  radiusKm: number;
  nextRadiusKm: number;
  canExpandRadius: boolean;
  fieldApproximateArea?: string;
}

export interface PartnerPublicProfile {
  userId: string;
  displayName: string;
  photoUrl?: string;
  providerKind: string;
  categories: ServiceCategory[];
  baseAreaLabel?: string;
  serviceRadiusKm: number;
  shortDescription: string;
  experienceYears?: number;
  crewSize?: number;
  equipment?: string;
  millOperatingPeriod?: string;
  millProcessingMethod?: string;
  millOrganic?: boolean;
  millAppointmentRequired?: boolean;
  phoneNumber?: string;
  availability: string;
  isVerified: boolean;
  pricingNote?: string;
}

export interface UserNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ServiceProviderProfile {
  id: string;
  userId: string;
  displayName: string;
  photoUrl?: string;
  providerKind: string;
  serviceCategoryIds: string[];
  categories: ServiceCategory[];
  baseAreaLabel?: string;
  serviceRadiusKm: number;
  shortDescription: string;
  experienceYears?: number;
  crewSize?: number;
  equipment?: string;
  millOperatingPeriod?: string;
  millProcessingMethod?: string;
  millOrganic?: boolean;
  millAppointmentRequired?: boolean;
  certifications?: string[];
  latitude?: number;
  longitude?: number;
  contactPreference: string;
  showPhone: boolean;
  phoneNumber?: string;
  availability: string;
  isPaused: boolean;
  isListed: boolean;
  completenessScore: number;
  hasBaseLocation?: boolean;
}

export interface ServiceContactRequest {
  id: string;
  requesterUserId?: string;
  providerUserId?: string;
  requesterName?: string;
  providerName?: string;
  category?: ServiceCategory;
  fieldId?: string;
  approximateArea: string;
  areaHectares?: number;
  message: string;
  status: string;
  direction: string;
  taskId?: string;
}

export type SavedContactSource = 'Manual' | 'PhoneBook';

export interface SavedContact {
  id: string;
  displayName: string;
  phone?: string;
  email?: string;
  notes?: string;
  serviceCategoryIds: string[];
  fieldIds: string[];
  linkedUserId?: string;
  source: SavedContactSource;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSavedContactPayload {
  displayName: string;
  phone?: string;
  email?: string;
  notes?: string;
  serviceCategoryIds?: string[];
  fieldIds?: string[];
  source?: SavedContactSource;
}

export const categoryName = (category: ServiceCategory, language: string) => {
  const lang = language.slice(0, 2) as keyof LocalizedText;
  return category.name[lang] || category.name.en || category.slug;
};

export const parentCategories = (categories: ServiceCategory[]) =>
  categories.filter((c) => !c.parentCategoryId).sort((a, b) => a.sortOrder - b.sortOrder);

export const childCategories = (categories: ServiceCategory[], parentId: string) =>
  categories.filter((c) => c.parentCategoryId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

export const offersMill = (categories: ServiceCategory[], selectedIds: string[]) =>
  selectedIds.some((id) => {
    const cat = categories.find((c) => c.id === id);
    return cat?.slug === 'olive-mill' || categories.some((p) => p.id === cat?.parentCategoryId && p.slug === 'olive-mill');
  });

export const partnerService = {
  getCategories: async () => (await api.get<ServiceCategory[]>('/api/v1/service-categories')).data,
  getMyProfile: async () => {
    try {
      return (await api.get<ServiceProviderProfile>('/api/v1/me/service-profile')).data;
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } })?.response?.status === 404) return null;
      throw error;
    }
  },
  activate: async () => (await api.post<ServiceProviderProfile>('/api/v1/me/service-profile/activate')).data,
  pause: async () => (await api.post<ServiceProviderProfile>('/api/v1/me/service-profile/pause')).data,
  saveProfile: async (payload: Record<string, unknown>) =>
    (await api.put<ServiceProviderProfile>('/api/v1/me/service-profile', payload)).data,
  search: async (params: Record<string, string | number | boolean | undefined>) =>
    (await api.get<PartnerSearchResponse>('/api/v1/partners', { params })).data,
  getProfile: async (userId: string) => (await api.get<PartnerPublicProfile>(`/api/v1/partners/${userId}`)).data,
  contact: async (userId: string, payload: Record<string, unknown>) =>
    (await api.post(`/api/v1/partners/${userId}/contact`, payload)).data,
  getRequests: async (direction?: string) =>
    (await api.get<ServiceContactRequest[]>('/api/v1/me/service-requests', { params: { direction } })).data,
  updateRequest: async (id: string, status: string, linkTask = false) =>
    (await api.patch(`/api/v1/service-requests/${id}`, { status, linkTask })).data,
  getContacts: async (params?: { fieldId?: string; includeUnassigned?: boolean }) =>
    (await api.get<SavedContact[]>('/api/v1/me/contacts', { params })).data,
  createContact: async (payload: UpsertSavedContactPayload) =>
    (await api.post<SavedContact>('/api/v1/me/contacts', payload)).data,
  updateContact: async (id: string, payload: UpsertSavedContactPayload) =>
    (await api.put<SavedContact>(`/api/v1/me/contacts/${id}`, payload)).data,
  deleteContact: async (id: string) => {
    await api.delete(`/api/v1/me/contacts/${id}`);
  },
  getNotifications: async (): Promise<UserNotificationItem[]> => {
    try {
      const response = await api.get<UserNotificationItem[]>('/api/v1/me/notifications');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 404) return [];
      throw error;
    }
  },
  markNotificationRead: async (id: string): Promise<void> => {
    await api.post(`/api/v1/me/notifications/${id}/read`);
  },
};
