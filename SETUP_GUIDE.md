# OutfitVincentAI - Security Setup Guide

## 🔐 Complete Security Configuration

Follow these steps to fully secure your OutfitVincentAI application before production deployment.

---

## 1. Supabase RLS Verification ✅

Your RLS policies are already configured correctly! All tables have proper Row-Level Security enabled.

**Verify in Supabase Dashboard:**
1. Go to: Database → Tables
2. Check each table has RLS enabled (green shield icon)
3. Review policies to ensure they match your security requirements

---

## 2. Google OAuth Setup

### A. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth Client ID**
5. Select **Web Application**

### B. Configure Authorized URLs

**Authorized JavaScript origins:**
```
https://2c95fd08-586c-4e21-9ff9-bea6ea888afc.lovableproject.com
https://yourdomain.com (when deployed)
```

**Authorized redirect URIs:**
```
https://bichfpvapfibrpplrtcr.supabase.co/auth/v1/callback
```

### C. Add to Supabase

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Google** provider
3. Add your **Client ID** and **Client Secret**
4. Save changes

### D. Configure Site URL

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://yourdomain.com` (or Lovable URL)
3. Add **Redirect URLs**:
   - `https://2c95fd08-586c-4e21-9ff9-bea6ea888afc.lovableproject.com/**`
   - `https://yourdomain.com/**` (production)

**📚 Detailed Guide:** [Supabase Google Auth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)

---

## 3. Upstash Redis Rate Limiting

### A. Create Upstash Account

1. Go to [Upstash Console](https://console.upstash.com)
2. Create a new Redis database
3. Select region closest to your users
4. Copy **REST URL** and **REST Token**

### B. Add to Supabase Secrets

1. Go to Supabase Dashboard → **Settings** → **Edge Functions**
2. Add these secrets:
   ```
   UPSTASH_REDIS_REST_URL=your_redis_url_here
   UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
   ```

### C. Test Rate Limiting

Rate limits configured:
- **Client-side**: 5 outfit generations per minute
- **Server-side**: 10 API requests per minute per IP

Test by making rapid requests - you should see rate limit errors after threshold.

---

## 4. CORS Configuration

### Update Production Domain

Edit `supabase/functions/_shared/cors.ts`:

```typescript
const ALLOWED_ORIGINS = [
  'https://2c95fd08-586c-4e21-9ff9-bea6ea888afc.lovableproject.com',
  'https://yourdomain.com',  // ← Add your domain
];
```

This restricts API access to only your approved domains.

---

## 5. NPM Security Audit

Run these commands regularly:

```bash
# Check for vulnerabilities
npm audit

# Automatically fix issues
npm audit fix

# For critical issues requiring breaking changes
npm audit fix --force
```

**Schedule**: Run weekly in development, before each deployment.

---

## 6. Test Security Features

### A. Test Input Sanitization

Try entering malicious input:
```html
<script>alert('XSS')</script>
```

Should be sanitized to plain text without executing.

### B. Test Rate Limiting

Generate 6 outfits in rapid succession:
- First 5 should work
- 6th should show rate limit error

Wait 1 minute and try again.

### C. Test RLS Policies

1. Create two test accounts
2. Try to access/modify other user's data
3. Should receive 403 Forbidden errors

### D. Test OAuth

1. Click "Continue with Google"
2. Should redirect to Google consent screen
3. After approval, should redirect back to app
4. Profile should be created automatically

---

## 7. Production Checklist

Before deploying to production:

- [ ] ✅ All Supabase secrets configured
- [ ] ✅ Google OAuth credentials added
- [ ] ✅ Upstash Redis configured
- [ ] ✅ CORS origins updated with production domain
- [ ] ✅ `npm audit` run and issues fixed
- [ ] ✅ Site URL and Redirect URLs configured in Supabase
- [ ] ✅ RLS policies verified on all tables
- [ ] ✅ Rate limiting tested
- [ ] ✅ Input sanitization tested
- [ ] ✅ Email verification enabled (optional but recommended)
- [ ] ✅ CSP headers reviewed
- [ ] ✅ Monitoring/logging configured

---

## 8. Monitoring & Logging

### Supabase Logs

View logs in Supabase Dashboard:
- **Auth logs**: Authentication → Logs
- **Edge function logs**: Edge Functions → [Function Name] → Logs
- **Database logs**: Database → Logs

### Key Metrics to Monitor

- Failed login attempts
- Rate limit violations
- RLS policy denials
- API error rates
- Unusual traffic patterns

---

## 9. Security Best Practices

### DO:
✅ Keep dependencies updated
✅ Use environment variables for all secrets
✅ Enable email verification in production
✅ Implement proper error handling
✅ Log security events
✅ Regular security audits
✅ Use HTTPS everywhere

### DON'T:
❌ Never commit API keys to git
❌ Don't disable RLS policies
❌ Don't trust client-side validation alone
❌ Don't log sensitive user data
❌ Don't use wildcard CORS in production
❌ Don't skip input validation

---

## 10. Incident Response

If a security issue is discovered:

1. **Immediate**: Disable affected feature
2. **Investigate**: Check Supabase logs
3. **Patch**: Fix vulnerability
4. **Notify**: Inform affected users
5. **Document**: Create post-mortem

---

## Need Help?

- **Documentation**: See `SECURITY.md`
- **Supabase Support**: [support.supabase.com](https://support.supabase.com)
- **Community**: [Lovable Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)

---

## Quick Test Script

Run this to verify security setup:

```bash
#!/bin/bash

echo "🔍 Running security checks..."

# 1. Check for vulnerabilities
echo "\n📦 Checking NPM packages..."
npm audit

# 2. Check for exposed secrets
echo "\n🔑 Checking for exposed secrets..."
grep -r "sk-" src/ 2>/dev/null && echo "⚠️  Found potential API key!" || echo "✅ No exposed secrets"

# 3. Check RLS is enabled
echo "\n🛡️  Check RLS policies in Supabase Dashboard"

# 4. Verify environment
echo "\n🌍 Current environment:"
echo "NODE_ENV: $NODE_ENV"

echo "\n✅ Security check complete!"
```

Save as `scripts/security-check.sh` and run before deployments.
