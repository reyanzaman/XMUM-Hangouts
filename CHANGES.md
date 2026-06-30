# Vercel Deployment Fix - Summary of Changes

## Problem
The XMUM Hangouts app deployed on Vercel was returning 404 errors for all API endpoints (`/api/auth/send-otp`, `/api/hangouts`, etc.) because:
- Vercel doesn't support running Express servers directly
- There was no backend processing the API requests
- The frontend was trying to call relative paths that didn't exist

## Solution
Converted all Express API routes into Vercel serverless functions that run in the `/api` directory. Vercel automatically maps files to routes.

## Files Created

### Authentication Endpoints
```
api/auth/send-otp.ts
├── POST: Generates and sends OTP via Resend email
├── Rate limiting: 3 codes per 15 minutes
└── CORS enabled

api/auth/verify-otp.ts
├── POST: Verifies OTP code
├── Max 5 attempts per code
└── CORS enabled

api/auth/login-password.ts
├── POST: Password-based login
├── Returns Supabase session tokens
└── CORS enabled
```

### Data Sync Endpoints
```
api/hangouts.ts          → GET/POST /api/hangouts
api/applications.ts      → GET/POST /api/applications
api/chats.ts             → GET/POST /api/chats
api/messages.ts          → GET/POST /api/messages
api/comments.ts          → GET/POST /api/comments
api/likes.ts             → GET/POST /api/likes
api/reports.ts           → GET/POST /api/reports
api/appeals.ts           → GET/POST /api/appeals
api/blocks.ts            → GET/POST /api/blocks
api/notifications.ts     → GET/POST /api/notifications
api/profiles.ts          → GET/POST /api/profiles

All with:
├── GET: Returns empty array { resource: [] }
├── POST: Syncs data { resource: [...] }
└── CORS enabled + OPTIONS preflight support
```

### Utilities
```
api/utils/otp-store.ts
├── Shared in-memory OTP storage
├── Rate limiting store
└── WARNING: Resets on deployment

api/utils/sync-handler.ts
└── Generic handler for sync operations (template)
```

### Configuration Files
```
vercel.json
├── Build command: vite build
├── Output directory: dist
└── Environment configuration

.env.example (updated)
├── VITE_SUPABASE_URL
├── VITE_SUPABASE_ANON_KEY
├── RESEND_API_KEY
├── JWT_SECRET
└── NODE_ENV

DEPLOYMENT.md (new)
└── Complete deployment guide

VERCEL_SETUP.md (new)
└── Technical setup documentation
```

### Dependencies Added
```json
{
  "devDependencies": {
    "@vercel/node": "^3.2.0"  // Vercel serverless function types
  }
}
```

## Key Features

### 1. CORS Support
All endpoints include CORS headers:
```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
res.setHeader('Access-Control-Allow-Headers', '...');
```

### 2. Error Handling
All endpoints include try-catch blocks with proper error responses:
```typescript
return res.status(500).json({ error: "Internal server error" });
```

### 3. OTP Management
- 6-digit codes generated securely
- 60-minute expiration
- 5 attempt limit per code
- Rate limiting: 3 codes per 15 minutes
- 45-second cooldown between requests

### 4. Email Integration
- Uses Resend API for email delivery
- HTML-formatted OTP emails
- Magic link alternative
- Fallback error handling for quota limits

### 5. Authentication
- OTP-based login (primary)
- Password-based login (secondary)
- Deterministic password generation for Supabase
- Fallback sessions when Supabase is offline

## Deployment Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables in Vercel
Dashboard → Project Settings → Environment Variables

```
VITE_SUPABASE_URL=https://bssljvoorzotsiskhpcl.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_bcss09rrbiJbwHx03f5A1g_QViwGFFI
RESEND_API_KEY=<your_actual_key>
JWT_SECRET=<strong_random_secret>
NODE_ENV=production
```

### 3. Deploy
```bash
git add .
git commit -m "Deploy: Vercel serverless functions for API endpoints"
git push origin main
```

Vercel will automatically:
1. Build frontend: `vite build`
2. Deploy serverless functions from `/api`
3. Serve static files from `dist/`

## Testing

### Local Development
```bash
npm run dev
```
Runs Express server (port 3000) + Vite dev server (5173) with automatic API proxy.

### Vercel Preview
Push to a branch to get a preview URL and test the deployment.

### Production
Deployed at: https://xmum-hangouts.vercel.app/

Test endpoints:
```bash
# Send OTP
curl -X POST https://xmum-hangouts.vercel.app/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"student@xmu.edu.my"}'

# Verify OTP
curl -X POST https://xmum-hangouts.vercel.app/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"student@xmu.edu.my","otp":"123456"}'
```

## Important: Production Limitations

### ⚠️ In-Memory OTP Storage

**Current Issue**: 
- OTP codes stored in memory
- Lost on function restart, deployment, or cold start
- Only works within same process

**Production Fix Needed**:
Store OTP in Supabase instead of memory:

```typescript
// Create table in Supabase
CREATE TABLE otp_codes (
  email VARCHAR(255) PRIMARY KEY,
  code VARCHAR(10),
  expires_at TIMESTAMP,
  attempts INTEGER
);

// Then replace in send-otp.ts:
// OLD: otpStore.set(email, { otp, expiresAt, attempts })
// NEW: 
await supabase.from('otp_codes').upsert({
  email: formattedEmail,
  code: otp,
  expires_at: new Date(now + 60 * 60 * 1000),
  attempts: 0
});
```

## Monitoring & Logging

1. **Vercel Logs**: Dashboard → Logs
2. **Search for**: "[SECURITY-OTP]" to find code generation events
3. **Error tracking**: Set up Sentry or Datadog

## Next Steps (Production Ready)

1. [ ] Implement database-backed OTP storage in Supabase
2. [ ] Add request logging/monitoring
3. [ ] Configure error tracking (Sentry)
4. [ ] Set up rate limiting with database
5. [ ] Upgrade to Vercel Pro for better cold start times
6. [ ] Configure custom domain
7. [ ] Add analytics tracking
8. [ ] Set up automated backups
9. [ ] Configure backup email alerts
10. [ ] Review and enforce Supabase RLS policies

## File Changes Checklist

✅ Created: `/api/auth/send-otp.ts`
✅ Created: `/api/auth/verify-otp.ts`
✅ Created: `/api/auth/login-password.ts`
✅ Created: `/api/hangouts.ts`
✅ Created: `/api/applications.ts`
✅ Created: `/api/chats.ts`
✅ Created: `/api/messages.ts`
✅ Created: `/api/comments.ts`
✅ Created: `/api/likes.ts`
✅ Created: `/api/reports.ts`
✅ Created: `/api/appeals.ts`
✅ Created: `/api/blocks.ts`
✅ Created: `/api/notifications.ts`
✅ Created: `/api/profiles.ts`
✅ Created: `/api/utils/otp-store.ts`
✅ Updated: `package.json` (added @vercel/node)
✅ Updated: `vercel.json` (simplified config)
✅ Updated: `.env.example` (added JWT_SECRET)
✅ Updated: `vite.config.ts` (added proxy for dev)
✅ Created: `DEPLOYMENT.md` (complete guide)
✅ Created: `VERCEL_SETUP.md` (technical docs)
✅ Created: `CHANGES.md` (this file)

## Frontend Changes Required

None! The frontend (`AppContext.tsx`) already calls `/api/*` endpoints correctly. No changes needed.

## Troubleshooting

### 404 on API Calls
- Check file exists in `/api` directory
- Verify default export in function
- Check environment variables in Vercel
- Check browser network tab for actual URL

### CORS Errors
- All endpoints have CORS headers included
- Check if OPTIONS preflight is returning 200

### OTP Not Working
- Check Resend API key is set
- Verify email domain is verified in Resend
- Check browser console for error message
- Review Vercel logs

### Cold Start Delays
- Expected 3-5 seconds first request
- Upgrade to Vercel Pro to reduce
- Implement warming strategy if needed

## References

- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Resend Email API](https://resend.com/docs)
- [Supabase Docs](https://supabase.com/docs)
