import { Field, mockFields, getFieldsByRole, simulateDelay } from './mockDataService';

export { Field } from './mockDataService';

export const fieldService = {
  getFields: async (userId: string, userRole: string): Promise<Field[]> => {
    await simulateDelay();
    // Mock data already has correct types, return directly
    return getFieldsByRole(userId, userRole);
  },

  getField: async (id: string): Promise<Field> => {
    await simulateDelay();
    const field = mockFields.find(f => f.id === id);
    if (!field) {
      throw new Error('Field not found');
    }
    // Mock data already has correct types, return directly
    return { ...field };
  },

  // Read-only - no create/update/delete methods
};
