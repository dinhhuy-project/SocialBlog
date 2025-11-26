# Quick Start: Turnstile CAPTCHA Setup

## 5-Minute Setup Guide

### 1. Get Your Keys (2 minutes)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile**
3. Click **Create Site**
4. Enter your domain and click create
5. Copy your **Site Key** and **Secret Key**

### 2. Create Environment Files (2 minutes)

**For backend** - Create or edit `.env`:
```env
TURNSTILE_SECRET_KEY=paste_your_secret_key_here
```

**For frontend** - Create or edit `.env.local`:
```env
VITE_TURNSTILE_SITE_KEY=paste_your_site_key_here
```

### 3. Start Your App (1 minute)

```bash
npm run dev
```

## That's It! 🎉

The CAPTCHA will now appear on:
- `/login` page
- `/register` page

## Verification Levels

| Environment | CAPTCHA Verification |
|-------------|----------------------|
| Development (no keys) | ❌ Skipped |
| Development (with keys) | ✅ Enabled |
| Production | ✅ Required |

## Testing

### Test Login
```
URL: http://localhost:5173/login
Action: Try to login without completing CAPTCHA
Expected: Form submission blocked
```

### Test Registration
```
URL: http://localhost:5173/register
Action: Try to register without completing CAPTCHA
Expected: Form submission blocked
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| CAPTCHA not showing | Check `VITE_TURNSTILE_SITE_KEY` in `.env.local` |
| Verification fails | Check `TURNSTILE_SECRET_KEY` in `.env` |
| Wrong domain error | Add your domain in Cloudflare Turnstile settings |

## Next: Advanced Setup

For production deployment, security hardening, and advanced configuration, see [TURNSTILE_SETUP.md](./TURNSTILE_SETUP.md)

## Support

- [Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [Cloudflare Support](https://support.cloudflare.com/)
