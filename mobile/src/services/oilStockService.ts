import api from './api';

export type OilPack = {
  tin16: number;
  tin17: number;
  bulkLitres: number;
  litres: number;
};

/** How much of a lot came from one grove. Shares across a lot sum to ~1. */
export type OilProvenanceEntry = {
  fieldId: string;
  share: number;
};

export type OilLot = {
  id: string;
  /** Cellar holding this lot. */
  cellarId?: string;
  batchId: string;
  cellarOwnerUserId?: string;
  /** Pressing this lot was allocated from, when it came through the mill flow. */
  sourcePressingId?: string | null;
  pressedOn: string;
  resultYear: number;
  harvestRecordIds: string[];
  /** Grove shares summing to ~1. */
  provenance: OilProvenanceEntry[];
  fieldIds: string[];
  totalAmount: number;
  unit: 'kg' | 'litres' | string;
  millKept: number;
  conversionFactor?: number | null;
  farmerLitres: number;
  packing: OilPack;
  reserved: OilPack;
  available: OilPack;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OilLotAllocation = {
  oilLotId: string;
  pack: OilPack;
};

export type OilCommitment = {
  id: string;
  contactId?: string | null;
  counterpartyName: string;
  requested: OilPack;
  delivered: OilPack;
  remaining: OilPack;
  isSale: boolean;
  amount?: number | null;
  currency: string;
  financialTransactionId?: string | null;
  allocations: OilLotAllocation[];
  promisedFor?: string | null;
  notes?: string | null;
  cancelled: boolean;
  derivedStatus: 'reserved' | 'pending_delivery' | 'delivered' | 'cancelled' | string;
  createdAt: string;
  updatedAt: string;
};

export type OilStockSummary = {
  onHand: OilPack;
  held: OilPack;
  reserved: OilPack;
  pendingDelivery: OilPack;
  available: OilPack;
  delivered: OilPack;
  openReservationCount: number;
  pendingDeliveryCount: number;
  lots: OilLot[];
  openCommitments: OilCommitment[];
};

export type StockMovement = {
  id: string;
  oilLotId?: string | null;
  oilCommitmentId?: string | null;
  kind: string;
  packDelta: OilPack;
  litresDelta: number;
  /** Shared by the two legs of one transfer (shared_out + shared_in). */
  transferId?: string | null;
  reversalOfMovementId?: string | null;
  notes?: string | null;
  occurredOn: string;
};

export type UpsertOilLotInput = {
  batchId: string;
  pressedOn?: string;
  resultYear?: number;
  harvestRecordIds?: string[];
  fieldIds?: string[];
  /** Measured grove split. Omitted = equal shares over fieldIds. */
  provenance?: OilProvenanceEntry[];
  totalAmount: number;
  unit: 'kg' | 'litres';
  millKept?: number;
  conversionFactor?: number;
  packing?: { tin16: number; tin17: number; bulkLitres: number };
  notes?: string;
  cellarOwnerUserId?: string;
  sourcePressingId?: string;
};

/** One slice of a pressing going into a single person's cellar. */
export type OilPressingAllocation = {
  cellarOwnerUserId: string;
  cellarId?: string;
  litres: number;
  oilLotId?: string | null;
};

export type OilPressing = {
  id: string;
  batchId: string;
  campaignId?: string | null;
  pressedOn: string;
  resultYear: number;
  totalAmount: number;
  unit: 'kg' | 'litres' | string;
  millKept: number;
  conversionFactor?: number | null;
  farmerLitres: number;
  fieldIds: string[];
  provenance: OilProvenanceEntry[];
  harvestRecordIds: string[];
  status: 'confirmed' | 'pending_allocation' | string;
  recordedByUserId: string;
  /** Cellars this pressing may be split between. Only filled while it awaits a split. */
  candidates: OilCellarCandidate[];
  notes?: string | null;
  allocations: OilPressingAllocation[];
  /** Lots created for the signed-in user's own cellar. */
  lots: OilLot[];
  createdAt: string;
  updatedAt: string;
};

export type CreateOilPressingInput = {
  batchId: string;
  campaignId?: string;
  pressedOn?: string;
  resultYear?: number;
  totalAmount: number;
  unit: 'kg' | 'litres';
  millKept?: number;
  conversionFactor?: number;
  fieldIds?: string[];
  provenance?: OilProvenanceEntry[];
  harvestRecordIds?: string[];
  notes?: string;
  /** Empty on a shared grove parks the pressing until the admin splits it. */
  allocations?: { cellarOwnerUserId: string; litres: number }[];
};

export type OilCellarCandidate = {
  userId: string;
  displayName: string;
  role: string;
  isYou: boolean;
};

export type OilShareSource = {
  fromOwnerUserId: string;
  fromDisplayName: string;
  available: OilPack;
  fieldIds: string[];
};

export type OilShareRequest = {
  id: string;
  fromOwnerUserId: string;
  toUserId: string;
  fromDisplayName: string;
  toDisplayName: string;
  requested: OilPack;
  fieldIds: string[];
  notes?: string | null;
  status: string;
  resultLotId?: string | null;
  isIncoming: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateOilCommitmentInput = {
  contactId?: string;
  counterpartyName: string;
  requested: { tin16: number; tin17: number; bulkLitres: number };
  isSale: boolean;
  amount?: number;
  currency?: string;
  alreadyDelivered?: boolean;
  promisedFor?: string;
  notes?: string;
  financialTransactionId?: string;
  allocations?: { oilLotId: string; pack: { tin16: number; tin17: number; bulkLitres: number } }[];
};

const emptyPack = (): OilPack => ({ tin16: 0, tin17: 0, bulkLitres: 0, litres: 0 });

const asPack = (value: Partial<OilPack> | null | undefined): OilPack => ({
  tin16: Math.max(0, Math.round(Number(value?.tin16) || 0)),
  tin17: Math.max(0, Math.round(Number(value?.tin17) || 0)),
  bulkLitres: Math.max(0, Number(value?.bulkLitres) || 0),
  litres: Math.max(0, Number(value?.litres) || 0),
});

const asProvenance = (
  raw: OilProvenanceEntry[] | null | undefined,
  fieldIds: string[]
): OilProvenanceEntry[] => {
  const entries = (raw || [])
    .filter((e) => e && e.fieldId)
    .map((e) => ({ fieldId: e.fieldId, share: Math.max(0, Number(e.share) || 0) }));
  if (entries.length > 0) return entries;
  // Lots recorded before grove shares existed weigh every grove the same.
  const ids = [...new Set((fieldIds || []).filter(Boolean))];
  if (ids.length === 0) return [];
  return ids.map((fieldId) => ({ fieldId, share: 1 / ids.length }));
};

const asLot = (raw: OilLot): OilLot => ({
  ...raw,
  cellarOwnerUserId: raw.cellarOwnerUserId || undefined,
  packing: asPack(raw.packing),
  reserved: asPack(raw.reserved),
  available: asPack(raw.available),
  harvestRecordIds: raw.harvestRecordIds || [],
  fieldIds: raw.fieldIds || [],
  provenance: asProvenance(raw.provenance, raw.fieldIds || []),
});

const asPressing = (raw: OilPressing): OilPressing => ({
  ...raw,
  fieldIds: raw.fieldIds || [],
  provenance: asProvenance(raw.provenance, raw.fieldIds || []),
  harvestRecordIds: raw.harvestRecordIds || [],
  candidates: raw.candidates || [],
  allocations: (raw.allocations || []).map((a) => ({
    ...a,
    litres: Math.max(0, Number(a.litres) || 0),
  })),
  lots: (raw.lots || []).map(asLot),
});

const asCommitment = (raw: OilCommitment): OilCommitment => ({
  ...raw,
  requested: asPack(raw.requested),
  delivered: asPack(raw.delivered),
  remaining: asPack(raw.remaining),
  allocations: (raw.allocations || []).map((a) => ({
    oilLotId: a.oilLotId,
    pack: asPack(a.pack),
  })),
});

const asSummary = (raw: OilStockSummary): OilStockSummary => {
  const onHand = asPack(raw.onHand);
  const available = asPack(raw.available);
  const reserved = asPack(raw.reserved);
  const pendingDelivery = asPack(raw.pendingDelivery);
  const held = asPack(
    raw.held ?? {
      tin16: reserved.tin16 + pendingDelivery.tin16,
      tin17: reserved.tin17 + pendingDelivery.tin17,
      bulkLitres: reserved.bulkLitres + pendingDelivery.bulkLitres,
      litres: reserved.litres + pendingDelivery.litres,
    }
  );
  return {
    onHand,
    held,
    reserved,
    pendingDelivery,
    available,
    delivered: asPack(raw.delivered),
    openReservationCount: raw.openReservationCount || 0,
    pendingDeliveryCount: raw.pendingDeliveryCount || 0,
    lots: (raw.lots || []).map(asLot),
    openCommitments: (raw.openCommitments || []).map(asCommitment),
  };
};

export const oilStockService = {
  async getSummary(params?: { year?: number; fieldId?: string }): Promise<OilStockSummary> {
    const { data } = await api.get('/api/v1/oil-lots/summary', { params });
    return asSummary(data);
  },

  async listLots(params?: { year?: number; fieldId?: string }): Promise<OilLot[]> {
    const { data } = await api.get('/api/v1/oil-lots', { params });
    return (data as OilLot[]).map(asLot);
  },

  async listCellarCandidates(fieldIds: string[]): Promise<OilCellarCandidate[]> {
    const { data } = await api.get('/api/v1/oil-lots/cellar-candidates', {
      params: { fieldIds: fieldIds.filter(Boolean).join(',') },
    });
    return (data as OilCellarCandidate[]) || [];
  },

  async upsertLot(input: UpsertOilLotInput): Promise<OilLot> {
    const { data } = await api.post('/api/v1/oil-lots', input);
    return asLot(data);
  },

  async listPressings(params?: { year?: number }): Promise<OilPressing[]> {
    const { data } = await api.get('/api/v1/oil-pressings', { params });
    return ((data as OilPressing[]) || []).map(asPressing);
  },

  /** Mill tickets still waiting for the grove admin to say who takes what. */
  async listPendingPressings(): Promise<OilPressing[]> {
    const { data } = await api.get('/api/v1/oil-pressings/pending');
    return ((data as OilPressing[]) || []).map(asPressing);
  },

  /** Record one mill ticket and hand each cellar its slice in a single call. */
  async createPressing(input: CreateOilPressingInput): Promise<OilPressing> {
    const { data } = await api.post('/api/v1/oil-pressings', input);
    return asPressing(data);
  },

  async allocatePressing(
    id: string,
    allocations: { cellarOwnerUserId: string; litres: number }[]
  ): Promise<OilPressing> {
    const { data } = await api.post(`/api/v1/oil-pressings/${id}/allocate`, { allocations });
    return asPressing(data);
  },

  async patchPacking(
    id: string,
    packing: { tin16: number; tin17: number; bulkLitres: number },
    millKept?: number
  ): Promise<OilLot> {
    const { data } = await api.patch(`/api/v1/oil-lots/${id}/packing`, { packing, millKept });
    return asLot(data);
  },

  async repack(id: string, addTin16: number, addTin17: number): Promise<OilLot> {
    const { data } = await api.post(`/api/v1/oil-lots/${id}/repack`, { addTin16, addTin17 });
    return asLot(data);
  },

  async adjust(input: {
    oilLotId: string;
    kind: string;
    pack: { tin16: number; tin17: number; bulkLitres: number };
    /** Correction/returned take oil out instead of putting it in (stock count found less). */
    remove?: boolean;
    notes?: string;
    counterpartyName?: string;
  }): Promise<void> {
    await api.post('/api/v1/oil-lots/adjust', input);
  },

  async listCommitments(openOnly = true): Promise<OilCommitment[]> {
    const { data } = await api.get('/api/v1/oil-commitments', { params: { openOnly } });
    return (data as OilCommitment[]).map(asCommitment);
  },

  async createCommitment(input: CreateOilCommitmentInput): Promise<OilCommitment> {
    const { data } = await api.post('/api/v1/oil-commitments', input);
    return asCommitment(data);
  },

  async deliver(
    id: string,
    pack?: { tin16: number; tin17: number; bulkLitres: number }
  ): Promise<OilCommitment> {
    const { data } = await api.post(`/api/v1/oil-commitments/${id}/deliver`, { pack });
    return asCommitment(data);
  },

  async cancelCommitment(id: string): Promise<void> {
    await api.post(`/api/v1/oil-commitments/${id}/cancel`);
  },

  async listMovements(limit = 100): Promise<StockMovement[]> {
    const { data } = await api.get('/api/v1/stock-movements', { params: { limit } });
    return (data as StockMovement[]).map((m) => ({
      ...m,
      packDelta: asPack(m.packDelta),
    }));
  },

  /** Undo one movement. Money posted next to a sale is left in place. */
  async reverseMovement(id: string): Promise<StockMovement> {
    const { data } = await api.post(`/api/v1/stock-movements/${id}/reverse`);
    const raw = data as StockMovement;
    return { ...raw, packDelta: asPack(raw.packDelta) };
  },

  async getShareSource(fieldIds: string[]): Promise<OilShareSource | null> {
    const { data } = await api.get('/api/v1/oil-lots/share-source', {
      params: { fieldIds: fieldIds.filter(Boolean).join(',') },
    });
    if (!data) return null;
    const raw = data as OilShareSource;
    return {
      ...raw,
      available: asPack(raw.available),
      fieldIds: raw.fieldIds || [],
    };
  },

  async listShareRequests(pendingOnly = true): Promise<OilShareRequest[]> {
    const { data } = await api.get('/api/v1/oil-lots/share-requests', {
      params: { pendingOnly },
    });
    return ((data as OilShareRequest[]) || []).map((r) => ({
      ...r,
      requested: asPack(r.requested),
      fieldIds: r.fieldIds || [],
    }));
  },

  async createShareRequest(input: {
    requested: { tin16: number; tin17: number; bulkLitres: number };
    fieldIds: string[];
    notes?: string;
  }): Promise<OilShareRequest> {
    const { data } = await api.post('/api/v1/oil-lots/share-requests', input);
    const raw = data as OilShareRequest;
    return { ...raw, requested: asPack(raw.requested), fieldIds: raw.fieldIds || [] };
  },

  async acceptShareRequest(id: string): Promise<OilShareRequest> {
    const { data } = await api.post(`/api/v1/oil-lots/share-requests/${id}/accept`);
    const raw = data as OilShareRequest;
    return { ...raw, requested: asPack(raw.requested), fieldIds: raw.fieldIds || [] };
  },

  async rejectShareRequest(id: string): Promise<OilShareRequest> {
    const { data } = await api.post(`/api/v1/oil-lots/share-requests/${id}/reject`);
    const raw = data as OilShareRequest;
    return { ...raw, requested: asPack(raw.requested), fieldIds: raw.fieldIds || [] };
  },
};

export { emptyPack };
