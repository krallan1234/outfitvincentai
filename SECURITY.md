# Security Guidelines for OutfitVincentAI

## Overview
This document outlines the security measures implemented in OutfitVincentAI and best practices for maintaining security.

## 🔒 Implemented Security Features

### 1. Row-Level Security (RLS)
All Supabase tables have RLS enabled with proper policies:
- **outfits**: Users can only view/modify their own outfits or public outfits
- **clothes**: Users can only access their own clothing items
- **profiles**: Users can view all profiles but only modify their own
- **comments/likes**: Proper user validation for all interactions

### 2. Input Validation & Sanitization
- **DOMPurify**: All user inputs are sanitized to prevent XSS attacks
- **Zod schemas**: Strict validation for all forms (email, password, prompts)
- **Max length limits**: All text inputs have reasonable length constraints

Located in: `src/lib/security.ts`

### 3. Rate Limiting
**Client-side**: 
- 5 outfit generations per minute per user
- Implemented in `src/lib/security.ts`

**Server-side (Upstash Redis)**:
- 10 requests per minute per IP
- Sliding window algorithm
- Located in: `supabase/functions/_shared/rate-limit.ts`

**Setup Required**:
```bash
# Add Upstash Redis credentials to Supabase Secrets:
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### 4. CORS Protection
Strict CORS policy limiting requests to approved domains:
- Production domain
- Lovable preview domains
- Configurable in `supabase/functions/_shared/cors.ts`

**Update for production**:
```typescript
const ALLOWED_ORIGINS = [
  'https://yourdomain.com',
  // ... other allowed domains
];
```

### 5. OAuth Authentication
**Google OAuth** implemented with:
- Secure redirect URLs
- Email verification
- Profile creation on signup

**Setup Instructions**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized domains in Supabase Dashboard
4. Configure redirect URLs

### 6. API Key Protection
✅ **All API keys stored in Supabase Secrets**
- Never exposed in client code
- Only accessible from Edge Functions
- Proper environment variable usage

Configured keys:
- `OPENAI_API_KEY`
- `PINTEREST_API_KEY`
- `GOOGLE_GEMINI_API_KEY`
- And others...

### 7. Content Security Policy (CSP)
Strict CSP headers implemented:
- No inline scripts (except trusted)
- Restricted external resources
- Frame-ancestors: none
- X-Frame-Options: DENY

Located in: `src/lib/security.ts`

### 8. NPM Security Audits
Run regular security audits:
```bash
npm audit
npm audit fix
```

## 🚨 Security Checklist

### Before Production Deployment:
- [ ] Update CORS allowed origins with production domain
- [ ] Configure Upstash Redis credentials
- [ ] Set up Google OAuth credentials in Supabase
- [ ] Run `npm audit fix`
- [ ] Test rate limiting with load testing
- [ ] Verify all RLS policies are active
- [ ] Check all Supabase secrets are configured
- [ ] Enable email verification in Supabase Auth settings
- [ ] Set up monitoring and alerts

### Regular Maintenance:
- [ ] Weekly: Run `npm audit`
- [ ] Monthly: Review Supabase logs for suspicious activity
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security penetration testing
- [ ] Quarterly: Review and update RLS policies

## 🛡️ Testing Security

### Test Rate Limiting:
```javascript
// Rapid-fire test
for (let i = 0; i < 10; i++) {
  await generateOutfit(params);
}
// Should fail after 5 attempts
```

### Test Input Sanitization:
```javascript
const malicious = '<script>alert("XSS")</script>';
const sanitized = sanitizeUserInput(malicious);
// Should return empty string or plain text
```

### Test RLS Policies:
1. Create test users in different accounts
2. Try to access/modify each other's data
3. Verify proper 403/404 responses

## 🔐 Incident Response

If a security vulnerability is discovered:

1. **Immediate Actions**:
   - Disable affected feature/endpoint
   - Revoke compromised credentials
   - Document the incident

2. **Investigation**:
   - Check Supabase logs
   - Review affected user accounts
   - Identify scope of breach

3. **Remediation**:
   - Patch vulnerability
   - Update security measures
   - Force password reset if needed

4. **Communication**:
   - Notify affected users
   - Update security documentation
   - Post-mortem analysis

## 📞 Reporting Security Issues

If you discover a security vulnerability:
- **DO NOT** create a public GitHub issue
- Email: [your-security-email@domain.com]
- Use encrypted communication if possible
- Allow 90 days for patching before public disclosure

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [React Security Checklist](https://react.dev/learn/security)
- [Upstash Redis Rate Limiting](https://upstash.com/docs/redis/features/ratelimiting)

## 📊 Security Metrics

Track these metrics in production:
- Failed login attempts per IP
- Rate limit violations
- XSS/injection attempt detection
- Unusual API usage patterns
- Failed RLS policy checks

Use Supabase Analytics and custom logging to monitor these metrics.
