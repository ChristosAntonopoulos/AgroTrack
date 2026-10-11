export type FieldsStatusFilter = 'all' | 'active' | 'archived';

/**
 * QA-022: pick a state-specific empty message for the Fields list.
 * "Change search term" copy is only valid while a search is actually active.
 */
export function getFieldsEmptyKeys(
  search: string,
  statusFilter: FieldsStatusFilter
): { title: string; description: string } {
  if (search.trim()) {
    return { title: 'fields:emptySearchTitle', description: 'fields:emptySearchDescription' };
  }
  if (statusFilter === 'archived') {
    return { title: 'fields:emptyArchivedTitle', description: 'fields:emptyArchivedDescription' };
  }
  return { title: 'fields:emptyFilterTitle', description: 'fields:emptyFilterDescription' };
}
