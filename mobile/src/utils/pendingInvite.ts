let pendingToken: string | null = null;
let pendingFamilyToken: string | null = null;

export const setPendingInviteToken = (token: string) => {
  pendingToken = token;
};

export const takePendingInviteToken = (): string | null => {
  const token = pendingToken;
  pendingToken = null;
  return token;
};

export const setPendingFamilyInviteToken = (token: string) => {
  pendingFamilyToken = token;
};

export const takePendingFamilyInviteToken = (): string | null => {
  const token = pendingFamilyToken;
  pendingFamilyToken = null;
  return token;
};
