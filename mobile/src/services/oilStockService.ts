import api from './api';

export type OilPack = {
  tin16: number;
  tin17: number;
  bulkLitres: number;
  litres: number;
};

export type OilLot = {
  id: string;
  batchId: string;
  pressedOn: string;
  resultYear: number;
  harvestRecordIds: string[];
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
  physical: OilPack;
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
  notes?: string | null;
  occurredOn: string;
};

export type UpsertOilLotInput = {
  batchId: string;
  pressedOn?: string;
  resultYear?: number;
  harvestRecordIds?: string[];
  fieldIds?: string[];
  totalAmount: number;
  unit: 'kg' | 'litres';
  millKept?: number;
  conversionFactor?: number;
  packing?: { tin16: number; tin17: number; bulkLitres: number };
  notes?: string;
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

const asLot = (raw: OilLot): OilLot => ({
  ...raw,
  packing: asPack(raw.packing),
  reserved: asPack(raw.reserved),
  available: asPack(raw.available),
  harvestRecordIds: raw.harvestRecordIds || [],
  fieldIds: raw.fieldIds || [],
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

const asSummary = (raw: OilStockSummary): OilStockSummary => ({
  physical: asPack(raw.physical),
  reserved: asPack(raw.reserved),
  pendingDelivery: asPack(raw.pendingDelivery),
  available: asPack(raw.available),
  delivered: asPack(raw.delivered),
  openReservationCount: raw.openReservationCount || 0,
  pendingDeliveryCount: raw.pendingDeliveryCount || 0,
  lots: (raw.lots || []).map(asLot),
  openCommitments: (raw.openCommitments || []).map(asCommitment),
});

export const oilStockService = {
  async getSummary(params?: { year?: number; fieldId?: string }): Promise<OilStockSummary> {
    const { data } = await api.get('/api/v1/oil-lots/summary', { params });
    return asSummary(data);
  },

  async listLots(params?: { year?: number; fieldId?: string }): Promise<OilLot[]> {
    const { data } = await api.get('/api/v1/oil-lots', { params });
    return (data as OilLot[]).map(asLot);
  },

  async upsertLot(input: UpsertOilLotInput): Promise<OilLot> {
    const { data } = await api.post('/api/v1/oil-lots', input);
    return asLot(data);
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
};

export { emptyPack };
