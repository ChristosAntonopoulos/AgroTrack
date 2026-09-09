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

export interface ServiceProviderProfile {
  id: string;
  userId: string;
  displayName: string;
  photoUrl?: string;
  businessName?: string;
  providerKind: 'Individual' | 'Team' | 'Business';
  serviceCategoryIds: string[];
  categories: ServiceCategory[];
  baseAreaLabel?: string;
  serviceRadiusKm: number;
  serviceAreas: string[];
  shortDescription: string;
  experienceYears?: number;
  crewSize?: number;
  equipment?: string;
  millOperatingPeriod?: string;
  millProcessingMethod?: string;
  millOrganic?: boolean;
  millAppointmentRequired?: boolean;
  languages: string[];
  certifications: string[];
  contactPreference: 'InApp' | 'Phone' | 'Both';
  showPhone: boolean;
  phoneNumber?: string;
  availability: 'Available' | 'Limited' | 'Unavailable';
  availableFrom?: string;
  availableUntil?: string;
  isPaused: boolean;
  verificationStatus: string;
  isVerified: boolean;
  pricingNote?: string;
  isListed: boolean;
  completenessScore: number;
  hasBaseLocation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertServiceProfilePayload {
  displayName?: string;
  photoUrl?: string | null;
  businessName?: string | null;
  providerKind?: string;
  serviceCategoryIds?: string[];
  latitude?: number;
  longitude?: number;
  baseAreaLabel?: string;
  serviceRadiusKm?: number;
  serviceAreas?: string[];
  shortDescription?: string;
  experienceYears?: number | null;
  equipment?: string | null;
  crewSize?: number | null;
  millOperatingPeriod?: string | null;
  millProcessingMethod?: string | null;
  millOrganic?: boolean | null;
  millAppointmentRequired?: boolean | null;
  languages?: string[];
  certifications?: string[];
  contactPreference?: string;
  showPhone?: boolean;
  phoneNumber?: string | null;
  availability?: string;
  availableFrom?: string | null;
  availableUntil?: string | null;
  pricingNote?: string | null;
}

export interface PartnerSearchResult {
  userId: string;
  displayName: string;
  photoUrl?: string;
  businessName?: string;
  providerKind: string;
  categories: ServiceCategory[];
  distanceKm: number;
  availability: string;
  experienceYears?: number;
  crewSize?: number;
  equipment?: string;
  isVerified: boolean;
  verificationStatus: string;
  completenessScore: number;
  serviceRadiusKm: number;
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
  businessName?: string;
  providerKind: string;
  categories: ServiceCategory[];
  baseAreaLabel?: string;
  serviceRadiusKm: number;
  serviceAreas: string[];
  shortDescription: string;
  experienceYears?: number;
  crewSize?: number;
  equipment?: string;
  millOperatingPeriod?: string;
  millProcessingMethod?: string;
  millOrganic?: boolean;
  millAppointmentRequired?: boolean;
  languages: string[];
  certifications: string[];
  contactPreference: string;
  phoneNumber?: string;
  availability: string;
  availableFrom?: string;
  availableUntil?: string;
  isVerified: boolean;
  verificationStatus: string;
  pricingNote?: string;
  completenessScore: number;
}

export interface CreatePartnerContactPayload {
  serviceCategoryId: string;
  fieldId?: string;
  taskId?: string;
  suggestedStart?: string;
  suggestedEnd?: string;
  message: string;
}

export interface ServiceContactRequest {
  id: string;
  requesterUserId: string;
  providerUserId: string;
  requesterName?: string;
  providerName?: string;
  serviceCategoryId: string;
  category?: ServiceCategory;
  fieldId?: string;
  taskId?: string;
  approximateArea: string;
  areaHectares?: number;
  suggestedStart?: string;
  suggestedEnd?: string;
  message: string;
  status: string;
  contactMethod: string;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
  updatedAt: string;
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
  linkedUserId?: string;
  source?: SavedContactSource;
}

export const categoryName = (category: ServiceCategory, language: string) => {
  const lang = language.slice(0, 2) as keyof LocalizedText;
  return category.name[lang] || category.name.en || category.slug;
};

export const PARTNER_FIELD_STORAGE_KEY = 'Oleachron.partners.lastFieldId';

export function rememberPartnerFieldId(fieldId: string) {
  try {
    if (fieldId) localStorage.setItem(PARTNER_FIELD_STORAGE_KEY, fieldId);
  } catch {
    /* ignore quota / private mode */
  }
}

export function rememberedPartnerFieldId(): string {
  try {
    return localStorage.getItem(PARTNER_FIELD_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export const parentCategories = (categories: ServiceCategory[]) =>
  categories.filter((c) => !c.parentCategoryId).sort((a, b) => a.sortOrder - b.sortOrder);

export const childCategories = (categories: ServiceCategory[], parentId: string) =>
  categories.filter((c) => c.parentCategoryId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

export const offersMill = (categories: ServiceCategory[], selectedIds: string[]) =>
  selectedIds.some((id) => {
    const cat = categories.find((c) => c.id === id);
    return cat?.slug === 'olive-mill' || categories.some((p) => p.id === cat?.parentCategoryId && p.slug === 'olive-mill');
  });

export function categorySlugForTaskType(taskType?: string, categories: ServiceCategory[] = []): string | undefined {
  if (!taskType) return undefined;
  const fromCatalog = categories.find(
    (c) => c.slug === taskType || c.suggestedTaskTypes.includes(taskType)
  );
  if (fromCatalog) {
    if (!fromCatalog.parentCategoryId) return fromCatalog.slug;
    return categories.find((c) => c.id === fromCatalog.parentCategoryId)?.slug || fromCatalog.slug;
  }
  const fallback: Record<string, string> = {
    pruning: 'pruning',
    harvest: 'harvest',
    harvest_daily_kilos: 'harvest',
    harvest_ready_nets: 'harvest',
    harvest_check_access: 'harvest',
    harvest_call_crew: 'harvest',
    harvest_book_mill: 'olive-mill',
    irrigation_check: 'irrigation',
    soil_analysis: 'analyses',
    general_field_inspection: 'agronomist',
  };
  return fallback[taskType];
}

export const partnerService = {
  getCategories: async (): Promise<ServiceCategory[]> => {
    const response = await api.get<ServiceCategory[]>('/api/v1/service-categories');
    return response.data;
  },

  getMyProfile: async (): Promise<ServiceProviderProfile | null> => {
    try {
      const response = await api.get<ServiceProviderProfile>('/api/v1/me/service-profile');
      return response.data;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw error;
    }
  },

  activate: async (): Promise<ServiceProviderProfile> => {
    const response = await api.post<ServiceProviderProfile>('/api/v1/me/service-profile/activate');
    return response.data;
  },

  pause: async (): Promise<ServiceProviderProfile> => {
    const response = await api.post<ServiceProviderProfile>('/api/v1/me/service-profile/pause');
    return response.data;
  },

  saveProfile: async (payload: UpsertServiceProfilePayload): Promise<ServiceProviderProfile> => {
    const response = await api.put<ServiceProviderProfile>('/api/v1/me/service-profile', payload);
    return response.data;
  },

  search: async (params: {
    fieldId: string;
    categoryId?: string;
    category?: string;
    radiusKm?: number;
    availability?: string;
    providerKind?: string;
    verifiedOnly?: boolean;
  }): Promise<PartnerSearchResponse> => {
    const response = await api.get<PartnerSearchResponse>('/api/v1/partners', { params });
    return response.data;
  },

  getProfile: async (userId: string): Promise<PartnerPublicProfile> => {
    const response = await api.get<PartnerPublicProfile>(`/api/v1/partners/${userId}`);
    return response.data;
  },

  contact: async (userId: string, payload: CreatePartnerContactPayload): Promise<ServiceContactRequest> => {
    const response = await api.post<ServiceContactRequest>(`/api/v1/partners/${userId}/contact`, payload);
    return response.data;
  },

  getRequests: async (direction?: 'incoming' | 'outgoing'): Promise<ServiceContactRequest[]> => {
    try {
      const response = await api.get<ServiceContactRequest[]>('/api/v1/me/service-requests', {
        params: direction ? { direction } : undefined,
        skipUnauthorizedHandler: true,
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 404) return [];
      throw error;
    }
  },

  updateRequest: async (id: string, status: string, linkTask = false): Promise<ServiceContactRequest> => {
    const response = await api.patch<ServiceContactRequest>(`/api/v1/service-requests/${id}`, {
      status,
      linkTask,
    });
    return response.data;
  },

  getNotifications: async (): Promise<UserNotificationItem[]> => {
    try {
      const response = await api.get<UserNotificationItem[]>('/api/v1/me/notifications', {
        skipUnauthorizedHandler: true,
      });
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

  getContacts: async (params?: { fieldId?: string; includeUnassigned?: boolean }): Promise<SavedContact[]> => {
    try {
      const response = await api.get<SavedContact[]>('/api/v1/me/contacts', {
        params,
        skipUnauthorizedHandler: true,
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 404) return [];
      throw error;
    }
  },

  createContact: async (payload: UpsertSavedContactPayload): Promise<SavedContact> => {
    const response = await api.post<SavedContact>('/api/v1/me/contacts', payload);
    return response.data;
  },

  updateContact: async (id: string, payload: UpsertSavedContactPayload): Promise<SavedContact> => {
    const response = await api.put<SavedContact>(`/api/v1/me/contacts/${id}`, payload);
    return response.data;
  },

  deleteContact: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/me/contacts/${id}`);
  },
};
