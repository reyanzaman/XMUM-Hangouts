# Vercel Deployment Checklist

## Pre-Deployment ✅

### Code Structure
- [x] `/api/auth/` directory created with 3 endpoints
- [x] `/api/` root directory with 11 data sync endpoints
- [x] `/api/utils/` directory with shared utilities
- [x] All endpoints have CORS headers
- [x] All endpoints handle OPTIONS preflight requests
- [x] All endpoints have error handling

### Configuration Files
- [x] `vercel.json` configured correctly
- [x] `vite.config.ts` has `/api` proxy for local dev
- [x] `package.json` includes `@vercel/node` dependency
- [x] `.env.example` has all required variables
- [x] `tsconfig.json` is compatible with Vercel

### Documentation
- [x] `QUICKSTART.md` - 3-step deployment guide
- [x] `DEPLOYMENT.md` - Complete technical guide
- [x] `VERCEL_SETUP.md` - Architecture documentation
- [x] `CHANGES.md` - Detailed change summary

## Deployment Steps

### Local Preparation
```bash
# 1. Install dependencies
npm install

# 2. Test locally (optional)
npm run dev
```

### Vercel Configuration
1. [ ] Go to https://vercel.com/dashboard
2. [ ] Select your XMUM-Hangouts project
3. [ ] Click Settings → Environment Variables
4. [ ] Add these variables:
   - [ ] `VITE_SUPABASE_URL` = `https://bssljvoorzotsiskhpcl.supabase.co`
   - [ ] `VITE_SUPABASE_ANON_KEY` = `sb_publishable_bcss09rrbiJbwHx03f5A1g_QViwGFFI`
   - [ ] `SUPABASE_SERVICE_ROLE_KEY` = your actual Supabase service role key
   - [ ] `RESEND_API_KEY` = your actual Resend API key
   - [ ] `JWT_SECRET` = random 16+ character string
   - [ ] `VITE_ENABLE_DEMO_DATA` = unset or `false` for production
5. [ ] Run the SQL in `supabase/migrations/20260701_create_xmum_otp_codes.sql`

### Git & Deployment
```bash
# 3. Commit changes
git add .
git commit -m "Fix: Convert Express routes to Vercel serverless functions"

# 4. Push to main branch
git push origin main
```

Vercel will automatically:
- Build the frontend with Vite
- Deploy serverless functions from `/api`
- Serve static files

## Post-Deployment Testing

### Verify Endpoints Are Live
1. [ ] Open https://xmum-hangouts.vercel.app/
2. [ ] Check browser console - no 404 errors on load

### Test OTP Endpoint
```bash
curl -X POST https://xmum-hangouts.vercel.app/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@xmu.edu.my"}'
```
Expected: `{"success": true, ...}`

### Test Login Endpoint
```bash
curl -X POST https://xmum-hangouts.vercel.app/api/auth/login-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@xmu.edu.my","password":"test123"}'
```
Expected: `{"success": true, ...}` or proper error message

### Test Data Sync
```bash
curl -X GET https://xmum-hangouts.vercel.app/api/hangouts
```
Expected: `{"hangouts": []}`

### Check Vercel Logs
1. [ ] Go to https://vercel.com/dashboard
2. [ ] Select XMUM-Hangouts project
3. [ ] Click "Deployments" tab
4. [ ] Check latest deployment → Logs
5. [ ] Look for "[SECURITY-OTP]" messages if tested

## Common Issues & Solutions

### ❌ Still Getting 404 Errors?
- [ ] Verify all files are in `/api` directory
- [ ] Check environment variables in Vercel (refresh page)
- [ ] Ensure files have default exports
- [ ] Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### ❌ CORS Errors?
- [ ] All endpoints have CORS headers (check code)
- [ ] OPTIONS method is handled (returns 200 with headers)
- [ ] No errors in Vercel logs

### ❌ OTP Not Sending?
- [ ] Check RESEND_API_KEY is set in Vercel
- [ ] Verify email domain is verified in Resend
- [ ] Check Vercel logs for Resend API errors
- [ ] Ensure email is @xmu.edu.my format

### ❌ Login Fails?
- [ ] Check Supabase is accessible
- [ ] Verify Supabase credentials in environment variables
- [ ] Check profile exists in xmum_profiles table
- [ ] Review Vercel function logs

### ❌ Cold Start Performance?
- [ ] First request takes 3-5 seconds (normal)
- [ ] Upgrade to Vercel Pro for better performance
- [ ] Consider implementing warming strategy

## Files Ready for Deployment

```
✅ api/
├── auth/
│   ├── send-otp.ts
│   ├── verify-otp.ts
│   └── login-password.ts
├── applications.ts
├── appeals.ts
├── blocks.ts
├── chats.ts
├── comments.ts
├── hangouts.ts
├── likes.ts
├── messages.ts
├── notifications.ts
├── profiles.ts
├── reports.ts
└── utils/
    ├── otp-store.ts
    └── sync-handler.ts

✅ Root Configuration
├── vercel.json
├── vite.config.ts (updated)
├── package.json (updated)
├── .env.example (updated)
├── QUICKSTART.md (new)
├── DEPLOYMENT.md (new)
├── VERCEL_SETUP.md (new)
└── CHANGES.md (new)
```

## Production Ready Checklist

### Before Going Live
- [ ] All 3 authentication endpoints working
- [ ] OTP emails sending successfully
- [ ] Login/verification flow complete
- [ ] All data sync endpoints operational
- [ ] CORS working properly
- [ ] Error messages are helpful
- [ ] Vercel logs clean (no errors)
- [ ] Performance acceptable
- [ ] Environment variables all set

### Optional Improvements (Phase 2)
- [ ] Implement database-backed OTP storage
- [ ] Add request logging/monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure rate limiting
- [ ] Upgrade to Vercel Pro
- [ ] Add custom domain
- [ ] Set up analytics
- [ ] Configure backup alerts

## Rollback (If Needed)

If deployment fails:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or restore from git history
git reset --hard <previous-commit-hash>
git push origin main --force
```

## Support Resources

📚 **Documentation**:
- `QUICKSTART.md` - Start here!
- `DEPLOYMENT.md` - Full guide
- `VERCEL_SETUP.md` - Technical details
- `CHANGES.md` - All changes

🔗 **External Links**:
- [Vercel Docs](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Resend API](https://resend.com/docs)
- [Supabase](https://supabase.com/docs)

## Sign-Off

- [ ] All changes reviewed
- [ ] Documentation complete
- [ ] Ready to deploy to production
- [ ] Team notified of deployment

---

**Status**: ✅ Ready to Deploy

**Last Updated**: June 20, 2026
**Version**: 1.0.0
