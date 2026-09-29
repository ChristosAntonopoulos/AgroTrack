import { roleHomePath, type AppRole } from '../navigation/navConfig';
import { getFieldService } from '../services/serviceFactory';
import { fieldPeopleService } from '../services/fieldPeopleService';

const GROVE_ROLES: AppRole[] = ['FieldOwner', ''];

/** Invited members open the shared grove. Owners start at home and learn the nav. */
export async function resolvePostAuthPath(
  role: AppRole,
  redirectTo?: string | null
): Promise<string> {
  if (redirectTo) return redirectTo;
  if (!GROVE_ROLES.includes(role)) return roleHomePath(role);

  try {
    const access = await fieldPeopleService.getAccessContext();
    // Invite / collaborator seats: open the shared grove — never owner field setup.
    if (access.fields.length > 0 && !access.ownsAnyField) {
      const fieldId = access.fields[0]?.fieldId;
      return fieldId ? `/chronologio?fieldId=${encodeURIComponent(fieldId)}` : roleHomePath(role);
    }

    const fields = await getFieldService().getFields();
    // Brand-new and unfinished groves start at home so the navigation lesson can run.
    const hasLiveGrove = fields.some((field) => field.status === 'Active');
    if (!hasLiveGrove) return roleHomePath(role);
  } catch {
    /* keep default home */
  }

  return roleHomePath(role);
}
