/**
 * Client-side password hashing utility
 * 
 * ⚠️ IMPORTANT SECURITY NOTE:
 * 
 * This utility provides SHA-256 hashing at client-side, but it should NOT be used
 * as the primary password hashing mechanism because:
 * 
 * 1. SHA-256 is fast and not designed for password hashing (rainbow tables exist)
 * 2. HTTPS already encrypts data in transit
 * 3. Best practice: Send plain text password over HTTPS, let server handle bcrypt hashing
 * 4. Client-side hashing prevents server from implementing password strength requirements
 * 
 * USE THIS ONLY FOR:
 * - Extra UI security indicator (optional)
 * - Additional obfuscation layer (NOT primary security)
 * 
 * NEVER rely on this as the only password security!
 * 
 * CORRECT APPROACH (CURRENT):
 * - Client sends plain password over HTTPS
 * - Server hashes with bcrypt (slow, salted, resistant to attacks)
 * - Server stores bcrypt hash in database
 */

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Optional: Use for UI-only purposes (e.g., showing password strength)
 * Do NOT send this to server for authentication
 */
export async function getPasswordHashForUI(password: string): Promise<string> {
  return hashPassword(password);
}
