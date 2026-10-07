import { env } from "cloudflare:workers";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { firebaseConfig } from "./firebase-config";

export type Identity = {
  uid: string;
  email: string;
  verified: boolean;
  admin: boolean;
};
export class AuthError extends Error {
  constructor(
    message: string,
    public status = 401,
  ) {
    super(message);
  }
}
const googleKeys = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

// A key resolver argument lets tests use signed fixtures without a production bypass.
export async function verifyFirebaseToken(
  token: string,
  keys: JWTVerifyGetKey = googleKeys,
) {
  const { payload } = await jwtVerify(token, keys, {
    algorithms: ["RS256"],
    audience: firebaseConfig.projectId,
    issuer: `https://securetoken.google.com/${firebaseConfig.projectId}`,
    requiredClaims: ["sub", "iat", "exp", "auth_time"],
  });
  const time = Math.floor(Date.now() / 1000);
  if (
    !payload.sub ||
    payload.sub.length > 128 ||
    typeof payload.iat !== "number" ||
    payload.iat > time ||
    typeof payload.auth_time !== "number" ||
    payload.auth_time > time ||
    typeof payload.email !== "string"
  )
    throw new AuthError("Invalid sign-in token. Please sign in again.");
  return {
    uid: payload.sub,
    email: payload.email.toLowerCase(),
    verified: payload.email_verified === true,
    authTime: payload.auth_time,
  };
}

export async function identity(req: Request): Promise<Identity | null> {
  const header = req.headers.get("authorization");
  if (!header) return null;
  if (!header.startsWith("Bearer ") || header.length > 16000)
    throw new AuthError("Please sign in again.");
  try {
    const token = header.slice(7);
    const user = await verifyFirebaseToken(token);
    // Check the current account as well: deleted/disabled accounts cannot retain API access.
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
        signal: AbortSignal.timeout(8000),
      },
    );
    const result = (await response.json()) as {
      users?: {
        localId: string;
        disabled?: boolean;
        emailVerified?: boolean;
        validSince?: string;
      }[];
    };
    const account = result.users?.[0];
    if (
      !response.ok ||
      !account ||
      account.localId !== user.uid ||
      account.disabled ||
      Number(account.validSince || 0) > user.authTime
    )
      throw new Error("Account unavailable");
    const admins = (env.CLUBOS_ADMIN_UIDS || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return {
      ...user,
      verified: user.verified && account.emailVerified === true,
      admin: admins.includes(user.uid),
    };
  } catch {
    throw new AuthError(
      "Your sign-in could not be verified. Sign in again or retry shortly.",
    );
  }
}
