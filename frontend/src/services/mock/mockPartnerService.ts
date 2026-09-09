import {
  PartnerPublicProfile,
  PartnerSearchResponse,
  ServiceCategory,
  ServiceContactRequest,
  ServiceProviderProfile,
  UpsertServiceProfilePayload,
  UserNotificationItem,
  CreatePartnerContactPayload,
  SavedContact,
  UpsertSavedContactPayload,
} from '../partnerService';
import { demoStore } from '../demo/demoStore';

const CATEGORIES: ServiceCategory[] = [
  { id: 'c1', slug: 'pruning', name: { el: 'Κλάδεμα', en: 'Pruning', it: 'Potatura' }, description: { el: '', en: '', it: '' }, icon: 'scissors', sortOrder: 1, isActive: true, isProminent: true, suggestedTaskTypes: ['pruning'] },
  { id: 'c2', slug: 'harvest', name: { el: 'Συγκομιδή', en: 'Harvest', it: 'Raccolta' }, description: { el: '', en: '', it: '' }, icon: 'basket', sortOrder: 2, isActive: true, isProminent: true, suggestedTaskTypes: ['harvest'] },
  { id: 'c3', slug: 'machinery', name: { el: 'Μηχανήματα', en: 'Machinery', it: 'Macchinari' }, description: { el: '', en: '', it: '' }, icon: 'tractor', sortOrder: 3, isActive: true, isProminent: true, suggestedTaskTypes: [] },
  { id: 'c4', slug: 'agronomist', name: { el: 'Γεωπόνος', en: 'Agronomist', it: 'Agronomo' }, description: { el: '', en: '', it: '' }, icon: 'leaf', sortOrder: 4, isActive: true, isProminent: true, suggestedTaskTypes: ['general_field_inspection'] },
  { id: 'c5', slug: 'irrigation', name: { el: 'Άρδευση', en: 'Irrigation', it: 'Irrigazione' }, description: { el: '', en: '', it: '' }, icon: 'droplets', sortOrder: 5, isActive: true, isProminent: true, suggestedTaskTypes: ['irrigation_check'] },
  { id: 'c6', slug: 'plant-protection', name: { el: 'Φυτοπροστασία', en: 'Plant protection', it: 'Difesa' }, description: { el: '', en: '', it: '' }, icon: 'shield', sortOrder: 6, isActive: true, isProminent: true, suggestedTaskTypes: [] },
  { id: 'c7', slug: 'transport', name: { el: 'Μεταφορά', en: 'Transport', it: 'Trasporto' }, description: { el: '', en: '', it: '' }, icon: 'truck', sortOrder: 7, isActive: true, isProminent: true, suggestedTaskTypes: [] },
  { id: 'c8', slug: 'olive-mill', name: { el: 'Ελαιοτριβείο', en: 'Olive mill', it: 'Frantoio' }, description: { el: '', en: '', it: '' }, icon: 'factory', sortOrder: 8, isActive: true, isProminent: true, suggestedTaskTypes: ['harvest_book_mill'] },
  { id: 'c9', slug: 'labor', parentCategoryId: 'c2', name: { el: 'Εργάτες συγκομιδής', en: 'Harvest crew', it: 'Manodopera' }, description: { el: '', en: '', it: '' }, icon: 'users', sortOrder: 201, isActive: true, isProminent: false, suggestedTaskTypes: [] },
  { id: 'c10', slug: 'planting', parentCategoryId: 'c4', name: { el: 'Φύτευση', en: 'Planting', it: 'Impianto' }, description: { el: '', en: '', it: '' }, icon: 'sprout', sortOrder: 403, isActive: true, isProminent: false, suggestedTaskTypes: [] },
  { id: 'c11', slug: 'soil', name: { el: 'Λίπανση & έδαφος', en: 'Fertilization & soil', it: 'Concimazione' }, description: { el: '', en: '', it: '' }, icon: 'sprout', sortOrder: 9, isActive: true, isProminent: false, suggestedTaskTypes: [] },
  { id: 'c12', slug: 'admin', name: { el: 'Διοικητικές υπηρεσίες', en: 'Admin services', it: 'Servizi amministrativi' }, description: { el: '', en: '', it: '' }, icon: 'clipboard', sortOrder: 13, isActive: true, isProminent: false, suggestedTaskTypes: [] },
  { id: 'c13', slug: 'other', parentCategoryId: 'c12', name: { el: 'Άλλο', en: 'Other', it: 'Altro' }, description: { el: '', en: '', it: '' }, icon: 'more-horizontal', sortOrder: 1303, isActive: true, isProminent: false, suggestedTaskTypes: [] },
  { id: 'c14', slug: 'analyses', name: { el: 'Αναλύσεις', en: 'Analyses', it: 'Analisi' }, description: { el: '', en: '', it: '' }, icon: 'test-tube', sortOrder: 10, isActive: true, isProminent: false, suggestedTaskTypes: ['soil_analysis'] },
  { id: 'c15', slug: 'repairs', name: { el: 'Επισκευές εξοπλισμού', en: 'Equipment repairs', it: 'Riparazioni' }, description: { el: '', en: '', it: '' }, icon: 'wrench', sortOrder: 11, isActive: true, isProminent: false, suggestedTaskTypes: [] },
  { id: 'c16', slug: 'post-harvest', name: { el: 'Μετασυλλεκτικά', en: 'Post-harvest', it: 'Post-raccolta' }, description: { el: '', en: '', it: '' }, icon: 'package', sortOrder: 12, isActive: true, isProminent: false, suggestedTaskTypes: [] },
];

type MockListing = {
  userId: string;
  lat: number;
  lng: number;
  profile: PartnerPublicProfile;
};

const LISTINGS: MockListing[] = [
  {
    userId: 'mock-pruner',
    lat: 35.34,
    lng: 25.13,
    profile: {
      userId: 'mock-pruner',
      displayName: 'Nikos Karras',
      providerKind: 'Individual',
      categories: [CATEGORIES[0], CATEGORIES[8]],
      baseAreaLabel: 'Heraklion',
      serviceRadiusKm: 50,
      serviceAreas: ['Heraklion'],
      shortDescription: 'Seasonal pruning for olive groves.',
      experienceYears: 18,
      equipment: 'Pole pruners',
      languages: ['el', 'en'],
      certifications: [],
      contactPreference: 'InApp',
      availability: 'Available',
      isVerified: false,
      verificationStatus: 'Unverified',
      pricingNote: 'Contact for price',
      completenessScore: 72,
    },
  },
  {
    userId: 'mock-harvest',
    lat: 35.32,
    lng: 25.18,
    profile: {
      userId: 'mock-harvest',
      displayName: 'Vassiliou Harvest Crew',
      providerKind: 'Team',
      categories: [CATEGORIES[1], CATEGORIES[8]],
      baseAreaLabel: 'Peza',
      serviceRadiusKm: 80,
      serviceAreas: ['Peza', 'Heraklion'],
      shortDescription: 'Harvest crew with nets and a small shaker.',
      experienceYears: 12,
      equipment: 'Nets, shaker',
      languages: ['el'],
      certifications: [],
      contactPreference: 'InApp',
      availability: 'Limited',
      isVerified: false,
      verificationStatus: 'Unverified',
      pricingNote: 'Contact for price',
      completenessScore: 68,
    },
  },
];

const requests: ServiceContactRequest[] = [];
const notifications: UserNotificationItem[] = [];
const savedContacts: SavedContact[] = [];
let myProfile: ServiceProviderProfile | null = null;

const currentUserId = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw)?.userId : 'me';
  } catch {
    return 'me';
  }
};

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const mockPartnerService = {
  getCategories: async () => CATEGORIES,
  getMyProfile: async () => myProfile,
  activate: async (): Promise<ServiceProviderProfile> => {
    myProfile = {
      id: 'me-profile',
      userId: currentUserId(),
      displayName: 'My services',
      providerKind: 'Individual',
      serviceCategoryIds: [],
      categories: [],
      serviceRadiusKm: 50,
      serviceAreas: [],
      shortDescription: '',
      languages: [],
      certifications: [],
      contactPreference: 'InApp',
      showPhone: false,
      availability: 'Available',
      isPaused: false,
      verificationStatus: 'Unverified',
      isVerified: false,
      isListed: false,
      completenessScore: 12,
      hasBaseLocation: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return myProfile;
  },
  pause: async () => {
    if (!myProfile) throw new Error('No profile');
    myProfile = { ...myProfile, isPaused: true, isListed: false };
    return myProfile;
  },
  saveProfile: async (payload: UpsertServiceProfilePayload) => {
    if (!myProfile) await mockPartnerService.activate();
    const cats = CATEGORIES.filter((c) => payload.serviceCategoryIds?.includes(c.id));
    myProfile = {
      ...myProfile!,
      displayName: payload.displayName ?? myProfile!.displayName,
      photoUrl: payload.photoUrl ?? myProfile!.photoUrl,
      businessName: payload.businessName ?? myProfile!.businessName,
      providerKind: (payload.providerKind as ServiceProviderProfile['providerKind']) ?? myProfile!.providerKind,
      serviceCategoryIds: payload.serviceCategoryIds ?? myProfile!.serviceCategoryIds,
      categories: cats.length ? cats : myProfile!.categories,
      baseAreaLabel: payload.baseAreaLabel ?? myProfile!.baseAreaLabel,
      serviceRadiusKm: payload.serviceRadiusKm ?? myProfile!.serviceRadiusKm,
      serviceAreas: payload.serviceAreas ?? myProfile!.serviceAreas,
      shortDescription: payload.shortDescription ?? myProfile!.shortDescription,
      experienceYears: payload.experienceYears ?? myProfile!.experienceYears,
      equipment: payload.equipment ?? myProfile!.equipment,
      contactPreference: (payload.contactPreference as ServiceProviderProfile['contactPreference']) ?? myProfile!.contactPreference,
      showPhone: payload.showPhone ?? myProfile!.showPhone,
      phoneNumber: payload.phoneNumber ?? myProfile!.phoneNumber,
      availability: (payload.availability as ServiceProviderProfile['availability']) ?? myProfile!.availability,
      pricingNote: payload.pricingNote ?? myProfile!.pricingNote,
      hasBaseLocation: payload.latitude != null && payload.longitude != null ? true : myProfile!.hasBaseLocation,
      isListed: !myProfile!.isPaused && Boolean(payload.shortDescription || myProfile!.shortDescription),
      updatedAt: new Date().toISOString(),
    };
    return myProfile;
  },
  search: async (params: {
    fieldId: string;
    categoryId?: string;
    category?: string;
    radiusKm?: number;
  }): Promise<PartnerSearchResponse> => {
    demoStore.ensureSeeded();
    const field = demoStore.getFields().find((f) => f.id === params.fieldId);
    const coords = field?.centerPoint?.coordinates;
    const lat = coords?.[1] ?? field?.latitude ?? 35.33;
    const lng = coords?.[0] ?? field?.longitude ?? 25.14;
    const radius = params.radiusKm || 50;
    const results = LISTINGS
      .map((listing) => ({
        listing,
        distanceKm: Math.max(1, Math.round(haversineKm(lat, lng, listing.lat, listing.lng))),
      }))
      .filter((row) => row.distanceKm <= radius && row.distanceKm <= row.listing.profile.serviceRadiusKm)
      .filter((row) => !params.categoryId || row.listing.profile.categories.some((c) => c.id === params.categoryId || c.slug === params.category))
      .map((row) => ({
        userId: row.listing.userId,
        displayName: row.listing.profile.displayName,
        providerKind: row.listing.profile.providerKind,
        categories: row.listing.profile.categories,
        distanceKm: row.distanceKm,
        availability: row.listing.profile.availability,
        experienceYears: row.listing.profile.experienceYears,
        equipment: row.listing.profile.equipment,
        isVerified: false,
        verificationStatus: 'Unverified',
        completenessScore: row.listing.profile.completenessScore,
        serviceRadiusKm: row.listing.profile.serviceRadiusKm,
        baseAreaLabel: row.listing.profile.baseAreaLabel,
        pricingNote: row.listing.profile.pricingNote,
      }));
    return {
      results,
      radiusKm: radius,
      nextRadiusKm: radius >= 100 ? 100 : radius >= 60 ? 100 : radius >= 50 ? 60 : 50,
      canExpandRadius: radius < 100,
      fieldApproximateArea: field?.locationText || field?.name,
    };
  },
  getProfile: async (userId: string) => {
    const listing = LISTINGS.find((l) => l.userId === userId);
    if (!listing) throw new Error('Not found');
    return listing.profile;
  },
  contact: async (userId: string, payload: CreatePartnerContactPayload) => {
    const listing = LISTINGS.find((l) => l.userId === userId);
    const request: ServiceContactRequest = {
      id: `req-${Date.now()}`,
      requesterUserId: currentUserId(),
      providerUserId: userId,
      providerName: listing?.profile.displayName,
      serviceCategoryId: payload.serviceCategoryId,
      category: CATEGORIES.find((c) => c.id === payload.serviceCategoryId),
      fieldId: payload.fieldId,
      taskId: payload.taskId,
      approximateArea: 'Nearby grove',
      message: payload.message,
      status: 'New',
      contactMethod: 'in_app',
      direction: 'outgoing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    requests.unshift(request);
    notifications.unshift({
      id: `n-${Date.now()}`,
      type: 'partner_contact',
      title: 'Collaboration request sent',
      message: payload.message,
      relatedEntityId: request.id,
      relatedEntityType: 'ServiceContactRequest',
      actionUrl: '/partners/requests',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    return request;
  },
  getRequests: async (direction?: 'incoming' | 'outgoing') =>
    direction ? requests.filter((r) => r.direction === direction) : requests,
  updateRequest: async (id: string, status: string) => {
    const request = requests.find((r) => r.id === id);
    if (!request) throw new Error('Not found');
    request.status = status;
    request.updatedAt = new Date().toISOString();
    return request;
  },
  getNotifications: async () => notifications,
  markNotificationRead: async (id: string) => {
    const item = notifications.find((n) => n.id === id);
    if (item) item.isRead = true;
  },
  getContacts: async (params?: { fieldId?: string; includeUnassigned?: boolean }) => {
    if (params?.fieldId && params.includeUnassigned) {
      return savedContacts.filter((c) => c.fieldIds.includes(params.fieldId!) || c.fieldIds.length === 0);
    }
    if (params?.fieldId) {
      return savedContacts.filter((c) => c.fieldIds.includes(params.fieldId!));
    }
    if (params?.includeUnassigned) {
      return savedContacts.filter((c) => c.fieldIds.length === 0);
    }
    return [...savedContacts];
  },
  createContact: async (payload: UpsertSavedContactPayload): Promise<SavedContact> => {
    const now = new Date().toISOString();
    const created: SavedContact = {
      id: `sc-${Date.now()}`,
      displayName: payload.displayName.trim(),
      phone: payload.phone?.trim() || undefined,
      email: payload.email?.trim() || undefined,
      notes: payload.notes?.trim() || undefined,
      serviceCategoryIds: payload.serviceCategoryIds || [],
      fieldIds: payload.fieldIds || [],
      linkedUserId: payload.linkedUserId,
      source: payload.source || 'Manual',
      createdAt: now,
      updatedAt: now,
    };
    savedContacts.unshift(created);
    return created;
  },
  updateContact: async (id: string, payload: UpsertSavedContactPayload): Promise<SavedContact> => {
    const existing = savedContacts.find((c) => c.id === id);
    if (!existing) throw new Error('Not found');
    existing.displayName = payload.displayName.trim();
    existing.phone = payload.phone?.trim() || undefined;
    existing.email = payload.email?.trim() || undefined;
    existing.notes = payload.notes?.trim() || undefined;
    existing.serviceCategoryIds = payload.serviceCategoryIds || [];
    existing.fieldIds = payload.fieldIds || [];
    existing.linkedUserId = payload.linkedUserId;
    if (payload.source) existing.source = payload.source;
    existing.updatedAt = new Date().toISOString();
    return existing;
  },
  deleteContact: async (id: string) => {
    const index = savedContacts.findIndex((c) => c.id === id);
    if (index >= 0) savedContacts.splice(index, 1);
  },
};
