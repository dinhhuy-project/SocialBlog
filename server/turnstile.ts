import { config } from 'dotenv';

config();

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

if (!TURNSTILE_SECRET_KEY) {
  console.warn(
    '[WARNING] TURNSTILE_SECRET_KEY environment variable is not set. CAPTCHA verification will be disabled.'
  );
}

/**
 * Verify Turnstile CAPTCHA token with Cloudflare's verification endpoint
 * @param token - The CAPTCHA token from the client
 * @returns Promise with verification result
 */
export async function verifyTurnstileToken(token: string): Promise<{
  success: boolean;
  score?: number;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
}> {
  // If secret key is not configured, allow verification to pass (for development)
  if (!TURNSTILE_SECRET_KEY) {
    console.warn('[TURNSTILE] Secret key not configured, skipping verification');
    return {
      success: true,
      score: 0.9,
      challenge_ts: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });

    if (!response.ok) {
      console.error('[TURNSTILE] Verification request failed:', response.status);
      return {
        success: false,
        error_codes: ['verification_request_failed'],
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[TURNSTILE] Verification error:', error);
    return {
      success: false,
      error_codes: ['verification_error'],
    };
  }
}

/**
 * Middleware to check CAPTCHA verification result
 * Should be used after verifyTurnstileToken
 */
export function isTurnstileValid(verification: {
  success: boolean;
  score?: number;
  error_codes?: string[];
}): boolean {
  // For production, require successful verification
  if (process.env.NODE_ENV === 'production') {
    return verification.success === true;
  }

  // For development, allow if success is true or if secret key is not configured
  return verification.success === true || !TURNSTILE_SECRET_KEY;
}
