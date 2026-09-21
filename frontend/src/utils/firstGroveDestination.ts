import { roleHomePath, type AppRole } from '../navigation/navConfig';
import { getFieldService } from '../services/serviceFactory';
import { isFieldSetupIncomplete } from './fieldDisplay';

const GROVE_ROLES: AppRole[] = ['FieldOwner', ''];

/** First-time growers land on new field; drafts resume; everyone else goes home. */
export async function resolvePostAuthPath(
  role: AppRole,
  redirectTo?: string | null
): Promise<string> {
  if (redirectTo) return redirectTo;
  if (!GROVE_ROLES.includes(role)) return roleHomePath(role);

  try {
    const fields = await getFieldService().getFields();
    if (fields.length === 0) return '/fields/new';

    const hasLiveGrove = fields.some((field) => field.status === 'Active');
    if (!hasLiveGrove) {
      const draft = fields.find((field) => isFieldSetupIncomplete(field.status));
      if (draft) return `/fields/${draft.id}/edit`;
      return '/fields/new';
    }
  } catch {
    /* keep default home */
  }

  return roleHomePath(role);
}
