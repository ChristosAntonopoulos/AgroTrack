/** Authenticated app user (from JWT / stored session). */
export interface User {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}
