export class AccountChangedError extends Error {
  constructor() {
    super(
      "Your account changed while this request was running. Please try again.",
    );
  }
}

// Check before sending and after reading: a request from an old login must never
// populate the next account's screen, including when sign-out happens in another tab.
export async function accountRequest<T = unknown>(
  account: {
    transport?: (init: RequestInit) => Promise<Response>;
    currentUid: () => string | null;
    headers: () => Promise<Record<string, string>>;
  },
  init: RequestInit = {},
) {
  const uid = account.currentUid();
  const authHeaders = await account.headers();
  if (uid !== account.currentUid()) throw new AccountChangedError();
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(authHeaders))
    headers.set(name, value);
  const response = account.transport
    ? await account.transport({ ...init, headers })
    : await fetch("/api/club", { ...init, headers });
  const data = (await response.json()) as T;
  if (uid !== account.currentUid()) throw new AccountChangedError();
  return { response, data };
}
