import { CreateHarvestInput, HarvestRecord, harvestService } from '../harvestService';

const STORAGE_KEY = 'Oleachron_demo_harvest_records_v1';

const read = (): HarvestRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HarvestRecord[]) : [];
  } catch {
    return [];
  }
};

const write = (records: HarvestRecord[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const mockHarvestService: typeof harvestService = {
  listByField: async (fieldId) => read().filter((r) => r.fieldId === fieldId),
  create: async (input: CreateHarvestInput) => {
    const record: HarvestRecord = {
      id: `har-${Date.now()}`,
      fieldId: input.fieldId,
      harvestDate: input.harvestDate || new Date().toISOString(),
      harvestMethod: input.harvestMethod || '',
      workersUsed: input.workersUsed || 0,
      oliveKg: input.oliveKg,
      millName: input.millName,
      oilKg: input.oilKg,
      oilYieldPercent: input.oilKg && input.oliveKg ? (input.oilKg / input.oliveKg) * 100 : undefined,
      qualityGrade: '',
      notes: input.notes,
      status: 'posted',
    };
    write([record, ...read()]);
    return record;
  },

  void: async (id, reason) => {
    const next = read().map((record) =>
      record.id === id
        ? { ...record, status: 'voided' as const, voidReason: reason, voidedAt: new Date().toISOString() }
        : record
    );
    write(next);
    return next.find((record) => record.id === id)!;
  },
};
