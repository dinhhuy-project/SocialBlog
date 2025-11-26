# Turnstile CAPTCHA Configuration Guide

This guide explains how to set up and configure Cloudflare Turnstile CAPTCHA for your SocialBlog application.

## What is Turnstile?

Cloudflare Turnstile is a free CAPTCHA alternative that provides:
- Better UX (puzzle-free challenges in most cases)
- Free tier (unlimited)
- Bot detection without solving challenges
- No cookies
- GDPR compliant
- Works with JavaScript disabled

## Getting Started

### Step 1: Create Cloudflare Account and Get Keys

1. Visit [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Sign up or log in to your Cloudflare account
3. Go to **Turnstile** in the left sidebar
4. Click **Create Site** and fill in the details:
   - **Site name**: SocialBlog (or your preferred name)
   - **Domains**: Add your domain(s)
     - For development: `localhost:5173`, `localhost:5000`
     - For production: your actual domain
5. Select **Turnstile (Free)**
6. You'll receive:
   - **Site Key** (public key)
   - **Secret Key** (private key)

### Step 2: Configure Environment Variables

#### For Frontend Development (`.env.local` or `.env`)

```env
# Client-side environment variables
VITE_TURNSTILE_SITE_KEY=your_site_key_here
```

**Location**: Create or update `d:\BlogSphere\SocialBlog\.env` at the project root

#### For Backend/Production (`.env`)

```env
# Backend environment variables
TURNSTILE_SECRET_KEY=your_secret_key_here

# Existing variables (keep these)
JWT_SECRET=your_jwt_secret
REFRESH_SECRET=your_refresh_secret
NODE_ENV=development
```

**Location**: Update `d:\BlogSphere\SocialBlog\.env` file

### Step 3: Start Using CAPTCHA

The integration is now complete! The CAPTCHA widget will automatically:

- Appear on the **Login** page
- Appear on the **Register** page
- Block submissions if verification fails
- Reset on failed attempts

## File Structure

New files added for Turnstile integration:

```
client/
  src/
    hooks/
      use-turnstile.ts          # React hook for CAPTCHA widget
    pages/
      login.tsx                 # Updated with CAPTCHA
      register.tsx              # Updated with CAPTCHA
    lib/
      auth.tsx                  # Updated to handle captchaToken

server/
  turnstile.ts                  # Server-side verification logic
  routes.ts                     # Updated endpoints with verification
```

## How It Works

### Frontend Flow

1. User visits login or register page
2. Turnstile script loads automatically via `useTurnstile` hook
3. Widget appears (verification badge)
4. User completes challenge (usually automatic)
5. Token is captured and sent with form submission

### Backend Flow

1. Server receives login/register request with `captchaToken`
2. Calls `verifyTurnstileToken()` to verify with Cloudflare
3. Blocks request if verification fails
4. Allows request to continue if verification succeeds

## Testing

### Development Mode

- If `TURNSTILE_SECRET_KEY` is not set, verification is **skipped** (for development)
- CAPTCHA widget still appears on client side
- No backend verification performed

### Production Mode

- CAPTCHA verification is **enforced**
- Invalid tokens are rejected with 400 error
- All requests must pass verification

## Troubleshooting

### CAPTCHA Widget Not Appearing

- **Check**: `VITE_TURNSTILE_SITE_KEY` environment variable
- **Check**: Browser console for errors
- **Check**: Ensure Turnstile script loads: https://challenges.cloudflare.com/turnstile/v0/api.js

### Verification Failures

- **Check**: `TURNSTILE_SECRET_KEY` is correctly set
- **Check**: Token hasn't expired (5 minute limit)
- **Check**: Site key matches the domain

### Development Testing

```bash
# Without environment variables (skips verification)
npm run dev

# With empty secret key
TURNSTILE_SECRET_KEY= npm run dev

# With proper setup (production-like)
TURNSTILE_SECRET_KEY=actual_key npm run dev
```

## Security Features

- **HttpOnly Cookies**: Tokens not accessible via JavaScript
- **Token Expiry**: Tokens expire after 5 minutes
- **Domain Verification**: Turnstile verifies hostname matches
- **No Cookies**: Turnstile doesn't use cookies for tracking
- **GDPR Compliant**: No personal data collection

## API Endpoints

### POST `/api/auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "captchaToken": "token_from_turnstile"
}
```

Response on success:
```json
{
  "user": { "id": 1, "username": "user", ... },
  "requiresVerification": false
}
```

Response on CAPTCHA failure:
```json
{
  "error": "CAPTCHA verification failed"
}
```

### POST `/api/auth/register`

Same structure as login endpoint.

## Documentation Links

- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [Turnstile Client-Side Rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
- [Turnstile Server-Side Verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

## Next Steps

1. Get your site key and secret key from Cloudflare
2. Create `.env` file with the keys
3. Test on login/register pages
4. Deploy to production with proper keys
