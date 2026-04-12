import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Verify a Google ID token (from GSI / One Tap on the web).
 *
 * Strategy:
 *  1. Try local JWT verification via google-auth-library (fast, no network call for data).
 *  2. If that fails (e.g. JS origin not yet registered in Google Cloud Console),
 *     fall back to Google's tokeninfo endpoint which verifies server-side.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  // Stage 1: local verification via google-auth-library
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new Error('Invalid Google token payload');
    }
    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email.split('@')[0],
      picture: payload.picture,
    };
  } catch (localErr) {
    console.warn('[google.service] verifyIdToken failed, trying tokeninfo fallback:', localErr instanceof Error ? localErr.message : localErr);
  }

  // Stage 2: fallback — ask Google's tokeninfo endpoint to validate the token
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google tokeninfo rejected the ID token: ${body}`);
  }
  const data = await res.json() as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
    aud?: string;
    error_description?: string;
  };

  if (data.error_description) {
    throw new Error(`Google tokeninfo error: ${data.error_description}`);
  }

  // Ensure the token was issued for OUR client (prevents token substitution attacks)
  if (process.env.GOOGLE_CLIENT_ID && data.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Google token audience mismatch');
  }

  if (!data.sub || !data.email) {
    throw new Error('Google tokeninfo returned invalid user data');
  }

  return {
    googleId: data.sub,
    email: data.email,
    name: data.name ?? data.email.split('@')[0],
    picture: data.picture,
  };
}

/** Verify a Google access token (from chrome.identity in the extension) */
export async function verifyGoogleAccessToken(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(
    `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
  );
  if (!res.ok) throw new Error('Failed to fetch Google user info');
  const data = await res.json() as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  };
  if (!data.sub || !data.email) throw new Error('Invalid Google user info');
  return {
    googleId: data.sub,
    email: data.email,
    name: data.name ?? data.email.split('@')[0],
    picture: data.picture,
  };
}
