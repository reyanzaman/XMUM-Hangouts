# XMUM Hangouts - Vercel Deployment Guide

## Overview

This project is a React/TypeScript application that uses Vercel serverless functions for backend API endpoints instead of a traditional Express server.

## Architecture

```
Frontend (React/Vite) ──→ Vercel Serverless Functions (/api) ──→ Supabase
```

### File Structure

```
api/
├── auth/
│   ├── send-otp.ts        # Send OTP verification email
│   ├── verify-otp.ts      # Verify OTP code
│   └── login-password.ts  # Password login
├── hangouts.ts            # Hangout events sync
├── applications.ts        # Application sync
├── chats.ts               # Chat messages sync
├── messages.ts            # Messages sync
├── comments.ts            # Comments sync
├── likes.ts               # Likes sync
├── reports.ts             # Reports sync
├── appeals.ts             # Appeals sync
├── blocks.ts              # Blocks sync
├── notifications.ts       # Notifications sync
├── profiles.ts            # Profiles sync
└── utils/
    ├── otp-store.ts       # In-memory OTP storage
    └── sync-handler.ts    # Shared sync utilities

src/
├── App.tsx
├── main.tsx
├── context/
│   └── AppContext.tsx     # Calls /api endpoints
└── ...
```

## Deployment Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables in Vercel

Go to Vercel Dashboard → Project Settings → Environment Variables

Add these variables:

```
VITE_SUPABASE_URL=https://bssljvoorzotsiskhpcl.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_bcss09rrbiJbwHx03f5A1g_QViwGFFI
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=your_actual_resend_api_key
JWT_SECRET=your_strong_random_secret
VITE_ENABLE_DEMO_DATA=false
```

Before deploying OTP login on Vercel, run the SQL in `supabase/migrations/20260701_create_xmum_otp_codes.sql`.

### 3. Deploy to Vercel

```bash
git add .
git commit -m "Deploy: Vercel serverless functions setup"
git push origin main
```

Vercel will automatically:
1. Build the frontend with Vite (`vite build`)
2. Deploy serverless functions from the `/api` directory
3. Serve the static site

## How API Routes Work

### Automatic Route Mapping

Vercel automatically maps files to routes:
- `api/auth/send-otp.ts` → `https://your-domain.com/api/auth/send-otp`
- `api/hangouts.ts` → `https://your-domain.com/api/hangouts`
- `api/hangouts/sync.ts` → `https://your-domain.com/api/hangouts/sync` (if created)

### CORS Support

All endpoints include CORS headers to allow cross-origin requests:

```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
```

## Current Limitations

### In-Memory OTP Storage ⚠️

The current implementation stores OTP codes in memory, which means:

**Issue**: OTP codes reset on deployment, function restart, or cold start
**Impact**: Users cannot verify codes after deployment or function restart

### Required Fix for Production

Implement database-backed OTP storage:

```typescript
// Instead of: otpStore.set(email, { otp, expiresAt, attempts })

// Use Supabase:
const { data, error } = await supabase.from('otp_codes').insert([{
  email: formattedEmail,
  code: otp,
  expires_at: new Date(now + 60 * 60 * 1000),
  attempts: 0
}]);
```

**SQL for Supabase**:
```sql
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_email ON otp_codes(email);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);
```

## Local Development

### Option 1: Using Express Server (Recommended)

```bash
npm run dev
```

This runs Express on port 3000 with Vite dev server on port 5173, with automatic proxy configuration.

### Option 2: Using Vercel Functions Locally

```bash
npm install -g vercel
vercel dev
```

This simulates the Vercel environment locally.

## Testing the Deployment

1. **Test OTP endpoint**:
   ```bash
   curl -X POST https://your-domain.com/api/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"email":"student@xmu.edu.my"}'
   ```

2. **Test Login endpoint**:
   ```bash
   curl -X POST https://your-domain.com/api/auth/login-password \
     -H "Content-Type: application/json" \
     -d '{"email":"student@xmu.edu.my","password":"password123"}'
   ```

3. **Check logs**:
   - Vercel Dashboard → Logs
   - Look for "SECURITY-OTP" messages to verify code generation

## Troubleshooting

### 404 Errors on API Calls

**Check**:
1. Route file exists in `/api` directory
2. Function is exported as default export
3. Environment variables are set in Vercel
4. Frontend is calling the correct URL path

### CORS Errors

**Check**:
1. All endpoints have CORS headers
2. Options method is handled (preflight requests)

### Cold Start Delays

**Expected**: First request after 5+ minutes of inactivity will take 3-5 seconds
**Solution**: Upgrade to Vercel Pro for better performance

## Production Checklist

- [ ] Database-backed OTP storage implemented
- [ ] Error logging/monitoring set up (Sentry, LogRocket, etc.)
- [ ] Rate limiting enforced on backend
- [ ] RESEND_API_KEY configured with production email domain
- [ ] JWT_SECRET set to strong random value
- [ ] Supabase anon key has proper RLS policies
- [ ] Analytics tracking configured
- [ ] Error pages configured
- [ ] Custom domain configured
- [ ] SSL certificate auto-renewed

## API Reference

### Authentication

#### POST /api/auth/send-otp
Sends OTP code via email
```json
Request: { "email": "student@xmu.edu.my" }
Response: { "success": true, "message": "Code dispatched!", "id": "..." }
```

#### POST /api/auth/verify-otp
Verifies OTP code
```json
Request: { "email": "student@xmu.edu.my", "otp": "123456" }
Response: { "success": true, "message": "Verification successful!", "email": "..." }
```

#### POST /api/auth/login-password
Password login
```json
Request: { "email": "student@xmu.edu.my", "password": "password123" }
Response: { "success": true, "session": {...}, "profile": {...} }
```

### Data Sync

All endpoints support:
- **GET**: Returns empty array `{ resource: [] }`
- **POST**: Syncs data array `{ resource: [...] }`

Example:
```bash
POST /api/hangouts
{ "hangouts": [...] }
```

## Support & Debugging

For issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Review `/api` function implementation
4. Verify Supabase connectivity
5. Check environment variables are loaded

## References

- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Documentation](https://supabase.com/docs)
