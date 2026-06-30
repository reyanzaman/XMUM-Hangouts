# Vercel Deployment Setup - API Endpoints

This document explains the Vercel serverless function setup for XMUM Hangouts deployed on https://xmum-hangouts.vercel.app/

## Problem Solved

When your React app was deployed on Vercel, it couldn't access the Express backend API routes (like `/api/auth/send-otp`) because:
1. Vercel doesn't support running Express servers directly
2. The frontend was trying to call relative API paths that didn't exist on the same server

## Solution: Serverless Functions

I've converted all your Express API routes into Vercel serverless functions in the `/api` directory. Each file automatically becomes an endpoint:

### API Endpoints Created

#### Authentication Endpoints
- **`/api/auth/send-otp`** (`api/auth/send-otp.ts`)
  - POST: Sends OTP verification code via email
  - Integrates with Resend email service
  - Rate limiting: 3 codes per 15 minutes

- **`/api/auth/verify-otp`** (`api/auth/verify-otp.ts`)
  - POST: Verifies OTP code and creates session
  - Max 5 attempts per code
  - 60-minute expiration

- **`/api/auth/login-password`** (`api/auth/login-password.ts`)
  - POST: Password-based login
  - Returns Supabase session tokens

#### Data Sync Endpoints
- **`/api/hangouts`** - Hangout events
- **`/api/applications`** - Event applications
- **`/api/chats`** - Direct messages
- **`/api/messages`** - Message content
- **`/api/comments`** - Post comments
- **`/api/likes`** - Like records
- **`/api/reports`** - User reports
- **`/api/appeals`** - Appeal cases
- **`/api/blocks`** - Blocked users
- **`/api/notifications`** - User notifications
- **`/api/profiles`** - User profiles

## Environment Variables Required

Make sure these are set in your Vercel project settings:

```
VITE_SUPABASE_URL=https://bssljvoorzotsiskhpcl.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_bcss09rrbiJbwHx03f5A1g_QViwGFFI
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=your_resend_api_key
JWT_SECRET=your_strong_secret_key
VITE_ENABLE_DEMO_DATA=false
```

## How It Works

1. **Frontend** calls `fetch("/api/auth/send-otp", ...)`
2. **Vercel routing** automatically routes this to `api/auth/send-otp.ts`
3. **Serverless function** executes in an isolated environment
4. **Response** is sent back to the frontend

## Important Notes

### In-Memory Storage Limitation
⚠️ **Current Implementation**: OTP codes are stored in-memory, which means:
- They reset on each deployment
- Not shared across multiple serverless instances
- Works for testing but NOT production

### Production Upgrade Needed
For production, you need to upgrade the OTP storage to use a database:
- Store OTP codes in Supabase `otp_codes` table
- Store rate limiting data in Supabase
- This ensures persistence across deployments

### Example Production Storage
```typescript
// Instead of: otpStore.set(email, { otp, expiresAt, attempts })
// Use Supabase:
await supabase.from('otp_codes').insert({
  email: formattedEmail,
  code: otp,
  expires_at: new Date(now + 60 * 60 * 1000),
  attempts: 0
});
```

## Testing

1. **Local Development** (with your Express server):
   ```bash
   npm run dev  # Starts Express on port 3000 + Vite on 5173
   ```

2. **Vercel Preview**:
   - Push to your branch to auto-deploy
   - Test at `https://branch.xmum-hangouts.vercel.app/`

3. **Production**:
   - Merging to `main` deploys to `https://xmum-hangouts.vercel.app/`

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Set environment variables in Vercel project settings
3. ⚠️ **TODO**: Implement database-backed OTP storage for production
4. ⚠️ **TODO**: Add request logging/monitoring
5. ⚠️ **TODO**: Add rate limiting to database for persistence

## Verification

After deployment, verify the setup by:
1. Go to https://xmum-hangouts.vercel.app/
2. Try to sign in with your @xmu.edu.my email
3. Check that you receive an OTP email
4. Verify the OTP code works

If you still get 404 errors, check the Vercel deployment logs at https://vercel.com/dashboard
