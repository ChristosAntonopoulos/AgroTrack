import { roleHomePath, type AppRole } from '../navigation/navConfig';
import { getFieldService } from '../services/serviceFactory';
import { fieldPeopleService } from '../services/fieldPeopleService';
import { isFieldSetupIncomplete } from './fieldDisplay';

const GROVE_ROLES: AppRole[] = ['FieldOwner', ''];

/** First-time growers land on new field; drafts resume; invited members skip owner onboarding. */
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
    // Brand-new owner: create the first grove immediately.
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
