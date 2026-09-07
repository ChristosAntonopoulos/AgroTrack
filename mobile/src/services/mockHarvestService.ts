import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreateHarvestRecordInput, HarvestRecord, harvestService } from './harvestService';

const STORAGE_KEY = 'agrotrack_demo_harvest_records_v1';

const readRecords = async (): Promise<HarvestRecord[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HarvestRecord[]) : [];
  } catch {
    return [];
  }
};

const writeRecords = async (records: HarvestRecord[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const mockHarvestService: typeof harvestService = {
  listByField: async (fieldId) => {
    const records = await readRecords();
    return records
      .filter((r) => r.fieldId === fieldId && r.status === 'posted')
      .sort((a, b) => new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime());
  },

  create: async (input: CreateHarvestRecordInput) => {
    const now = new Date().toISOString();
    const record: HarvestRecord = {
      id: `harvest-${Date.now()}`,
      fieldId: input.fieldId,
      harvestDate: input.harvestDate || now,
      harvestMethod: input.harvestMethod?.trim() || '',
      workersUsed: input.workersUsed ?? 0,
      oliveKg: input.oliveKg,
      millName: input.millName,
      oilKg: input.oilKg,
      oilYieldPercent:
        input.oilYieldPercent ??
        (input.oilKg && input.oliveKg > 0
          ? Math.round((input.oilKg / input.oliveKg) * 10000) / 100
          : undefined),
      qualityGrade: input.qualityGrade?.trim() || '',
      notes: input.notes,
      status: 'posted',
    };
    const existing = await readRecords();
    await writeRecords([record, ...existing]);
    return record;
  },

  void: async (id, reason) => {
    const records = await readRecords();
    const index = records.findIndex((r) => r.id === id);
    if (index < 0) {
      throw new Error('Harvest record not found.');
    }
    const updated: HarvestRecord = {
      ...records[index],
      status: 'voided',
      voidReason: reason,
      voidedAt: new Date().toISOString(),
    };
    records[index] = updated;
    await writeRecords(records);
    return updated;
  },
};
