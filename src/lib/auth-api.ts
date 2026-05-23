import { NextRequest } from "next/server";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
}

/**
 * Verifies a Firebase Auth ID Token sent in the Authorization header.
 * Calls Google's accounts:lookup API to securely verify the token status.
 */
export async function verifyAuth(request: Request | NextRequest): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED: Missing or invalid Authorization header");
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) {
    throw new Error("UNAUTHORIZED: Bearer token is empty");
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("INTERNAL_ERROR: Firebase API key is not configured on the server");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken: token }),
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData?.error?.message || "Invalid ID token";
    throw new Error(`UNAUTHORIZED: Authentication failed - ${message}`);
  }

  const data = await response.json();
  const user = data?.users?.[0];
  if (!user || !user.localId) {
    throw new Error("UNAUTHORIZED: User not found in authentication provider");
  }

  return {
    uid: user.localId,
    email: user.email,
  };
}
