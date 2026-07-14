# XMUM Hangouts PWA and Web Push Setup

The PWA itself is generated automatically by `npm run build`. Web Push uses the open Web Push standard and the existing Vercel and Supabase services; no paid notification provider is required.

## 1. Optional subscription-table migration

Web Push works immediately by storing each user’s device subscriptions securely in Supabase Auth app metadata. No extra database setup is required.

For a larger future user base, `supabase/migrations/20260714_add_web_push.sql` can optionally be run in the Supabase SQL editor or through the Supabase CLI. The server automatically detects those tables and begins using them. They have RLS enabled and are intentionally available only to the server service-role client.

## 2. Web Push keys

No additional push provider or key setup is required. The server derives a permanent standards-based Web Push keypair from `JWT_SECRET`, which is already required by the production authentication server.

Keep `JWT_SECRET` stable after users subscribe. Changing it invalidates existing browser subscriptions. If an established VAPID keypair is preferred, generate one with:

```powershell
npm run generate:vapid
```

Then optionally add the resulting values to local `.env` and Vercel:

```text
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your-real-admin-address@example.com
```

The private key must remain secret and the same key pair must remain in use permanently.

## 3. Configure free scheduled reminders

Generate a long random `CRON_SECRET`, add it to Vercel, and store the production URL and secret in Supabase Vault:

```sql
select vault.create_secret('https://xmum-hangouts.vercel.app', 'xmum_app_url');
select vault.create_secret('REPLACE_WITH_THE_SAME_CRON_SECRET', 'xmum_cron_secret');
```

Enable the `pg_cron` and `pg_net` extensions in Supabase, then create the five-minute reminder job:

```sql
select cron.schedule(
  'xmum-push-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'xmum_app_url') || '/api/push/process-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'xmum_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

This uses Supabase Cron and Vercel Functions, both within the existing free-service architecture. The endpoint is protected by `CRON_SECRET` and delivery records prevent duplicate pushes.

## 4. Deploy and verify

1. Deploy over HTTPS.
2. Open **Get the App** from the footer.
3. Android: install from the browser prompt. iOS: use Safari → Share → Add to Home Screen.
4. Open the installed app, sign in, and tap **Enable notifications**.
5. Trigger an application, like, reply, approval, or scheduled reminder from another account.
6. Verify the OS notification appears with the app closed and opens the matching in-app notification destination.

iOS Web Push requires iOS/iPadOS 16.4 or newer and the website must first be installed on the Home Screen. Notification permission can only be requested following a user tap.
