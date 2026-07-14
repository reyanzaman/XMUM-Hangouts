import webpush from 'web-push';
import crypto from 'crypto';
import { AppNotification } from '../types.js';

type SupabaseAdminClient = any;

interface PushSubscriptionInput {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: { p256dh?: string; auth?: string };
}

const isMissingPushTableError = (error: any) =>
  error?.code === 'PGRST205' || error?.code === '42P01' || /xmum_push_(subscriptions|deliveries).*not find/i.test(error?.message || '');

const subscriptionIdForEndpoint = (endpoint: string) =>
  crypto.createHash('sha256').update(endpoint).digest('base64url').slice(0, 32);

const listAuthUsers = async (client: SupabaseAdminClient) => {
  const users: any[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
};

const findAuthUserByEmail = async (client: SupabaseAdminClient, email: string) =>
  (await listAuthUsers(client)).find((user: any) => (user.email || '').toLowerCase() === email.toLowerCase()) || null;

const saveSubscriptionInAuthMetadata = async (
  client: SupabaseAdminClient,
  identity: { userId: string; email: string },
  subscription: PushSubscriptionInput,
  userAgent: string
) => {
  const authUser = await findAuthUserByEmail(client, identity.email);
  if (!authUser) throw new Error('The authenticated user could not be matched for push notifications.');
  const existing = Array.isArray(authUser.app_metadata?.xmum_push_subscriptions)
    ? authUser.app_metadata.xmum_push_subscriptions
    : [];
  const entry = {
    id: subscriptionIdForEndpoint(subscription.endpoint || ''),
    user_id: identity.userId,
    user_email: identity.email,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys?.p256dh,
    auth_key: subscription.keys?.auth,
    expiration_time: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null,
    user_agent: userAgent.slice(0, 500),
    is_active: true,
    updated_at: new Date().toISOString()
  };
  const next = [entry, ...existing.filter((item: any) => item.endpoint !== subscription.endpoint)].slice(0, 5);
  const { error } = await client.auth.admin.updateUserById(authUser.id, {
    app_metadata: { ...(authUser.app_metadata || {}), xmum_push_subscriptions: next }
  });
  if (error) throw error;
};

const removeSubscriptionFromAuthMetadata = async (client: SupabaseAdminClient, email: string, endpoint: string) => {
  const authUser = await findAuthUserByEmail(client, email);
  if (!authUser) return;
  const existing = Array.isArray(authUser.app_metadata?.xmum_push_subscriptions)
    ? authUser.app_metadata.xmum_push_subscriptions
    : [];
  const next = existing.filter((item: any) => item.endpoint !== endpoint);
  const { error } = await client.auth.admin.updateUserById(authUser.id, {
    app_metadata: { ...(authUser.app_metadata || {}), xmum_push_subscriptions: next }
  });
  if (error) throw error;
};

const deriveVapidKeys = () => {
  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const stableSecret = (process.env.JWT_SECRET || (!isProduction ? 'xmum-local-dev-secret-change-me' : '')).trim();
  if (!stableSecret) return { publicKey: '', privateKey: '' };

  const privateKeyBytes = crypto.createHash('sha256').update(`xmum-web-push:${stableSecret}`).digest();
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.setPrivateKey(privateKeyBytes);
  return {
    privateKey: privateKeyBytes.toString('base64url'),
    publicKey: ecdh.getPublicKey(undefined, 'uncompressed').toString('base64url')
  };
};

const getPushConfig = () => {
  const configuredPublicKey = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const configuredPrivateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const useConfiguredPair = Boolean(configuredPublicKey && configuredPrivateKey);
  const fallbackKeys = useConfiguredPair ? null : deriveVapidKeys();
  return {
    publicKey: useConfiguredPair ? configuredPublicKey : fallbackKeys?.publicKey || '',
    privateKey: useConfiguredPair ? configuredPrivateKey : fallbackKeys?.privateKey || '',
    subject: (process.env.VAPID_SUBJECT || 'mailto:admin@xmum-hangouts.app').trim()
  };
};

export const getVapidPublicKey = () => getPushConfig().publicKey;

export const isPushConfigured = () => {
  const config = getPushConfig();
  return Boolean(config.publicKey && config.privateKey && config.subject);
};

const configureWebPush = () => {
  const config = getPushConfig();
  if (!config.publicKey || !config.privateKey) {
    throw new Error('Web Push VAPID keys are not configured.');
  }
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
};

export const savePushSubscription = async (
  client: SupabaseAdminClient,
  identity: { userId: string; email: string },
  subscription: PushSubscriptionInput,
  userAgent = ''
) => {
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error('Invalid push subscription.');
  }

  const row = {
    user_id: identity.userId,
    user_email: identity.email,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth_key: subscription.keys.auth,
    expiration_time: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null,
    user_agent: userAgent.slice(0, 500),
    is_active: true,
    updated_at: new Date().toISOString()
  };
  const { error } = await client.from('xmum_push_subscriptions').upsert(row, { onConflict: 'endpoint' });
  if (error && isMissingPushTableError(error)) {
    await saveSubscriptionInAuthMetadata(client, identity, subscription, userAgent);
    return;
  }
  if (error) throw error;
};

export const removePushSubscription = async (
  client: SupabaseAdminClient,
  identity: { userId: string; email: string },
  endpoint: string
) => {
  const { error } = await client
    .from('xmum_push_subscriptions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('endpoint', endpoint)
    .eq('user_id', identity.userId);
  if (error && isMissingPushTableError(error)) {
    await removeSubscriptionFromAuthMetadata(client, identity.email, endpoint);
    return;
  }
  if (error) throw error;
};

const notificationCopy = (notification: AppNotification) => {
  const customText = notification.payload.custom_text || notification.payload.message;
  const copy: Record<string, { title: string; fallback: string }> = {
    new_application: { title: 'New hangout request', fallback: 'A student asked to join your hangout.' },
    application_accepted: { title: 'Request accepted!', fallback: 'Your hangout request was accepted.' },
    application_rejected: { title: 'Hangout request update', fallback: 'There is an update to your hangout request.' },
    hangout_like: { title: 'Someone liked your plan', fallback: 'Your hangout received a new like.' },
    comment_reply: { title: 'New reply', fallback: 'Someone replied to your comment.' },
    chat_message: { title: 'New chat message', fallback: 'A classmate sent you a new message.' },
    upcoming_hangout_reminder: { title: 'Hangout reminder', fallback: 'One of your hangouts is coming up soon.' },
    new_report_admin: { title: 'Safety review needed', fallback: 'A new safety report needs review.' },
    report_approved: { title: 'Safety report update', fallback: 'Your safety report has been reviewed.' },
    report_appeal_result: { title: 'Appeal update', fallback: 'Your safety appeal has been reviewed.' },
    admin_message: { title: 'XMUM Hangouts update', fallback: 'You have a new update.' }
  };
  const selected = copy[notification.type] || { title: 'XMUM Hangouts', fallback: 'You have a new update.' };
  return {
    title: selected.title,
    body: (customText || selected.fallback).slice(0, 180)
  };
};

export const dispatchPushNotifications = async (client: SupabaseAdminClient, notificationIds: string[]) => {
  const uniqueIds = Array.from(new Set(notificationIds.filter(Boolean))).slice(0, 50);
  if (uniqueIds.length === 0) return { sent: 0, skipped: 0 };
  configureWebPush();

  const { data: notifications, error: notificationError } = await client
    .from('xmum_notifications')
    .select('*')
    .in('id', uniqueIds)
    .eq('is_read', false);
  if (notificationError) throw notificationError;
  if (!notifications?.length) return { sent: 0, skipped: uniqueIds.length };

  const recipients = Array.from(new Set(notifications.map((notification: AppNotification) => notification.user_id)));
  const { data: storedSubscriptions, error: subscriptionsError } = await client
    .from('xmum_push_subscriptions')
    .select('*')
    .in('user_id', recipients)
    .eq('is_active', true);
  let subscriptions = storedSubscriptions || [];
  let metadataFallback = false;
  if (subscriptionsError && isMissingPushTableError(subscriptionsError)) {
    metadataFallback = true;
    const authUsers = await listAuthUsers(client);
    subscriptions = authUsers.flatMap((user: any) => {
      const entries = Array.isArray(user.app_metadata?.xmum_push_subscriptions)
        ? user.app_metadata.xmum_push_subscriptions
        : [];
      return entries.filter((entry: any) => entry.is_active !== false && recipients.includes(entry.user_id));
    });
  } else if (subscriptionsError) {
    throw subscriptionsError;
  }
  if (!subscriptions?.length) return { sent: 0, skipped: notifications.length };

  const { data: deliveredRows, error: deliveryError } = metadataFallback
    ? { data: [], error: null }
    : await client.from('xmum_push_deliveries').select('notification_id, subscription_id').in('notification_id', uniqueIds);
  if (deliveryError && !isMissingPushTableError(deliveryError)) throw deliveryError;
  if (deliveryError && isMissingPushTableError(deliveryError)) metadataFallback = true;
  const delivered = new Set((deliveredRows || []).map((row: any) => `${row.notification_id}:${row.subscription_id}`));

  let sent = 0;
  let skipped = 0;
  for (const notification of notifications as AppNotification[]) {
    const recipientSubscriptions = subscriptions.filter((subscription: any) => subscription.user_id === notification.user_id);
    const metadataDeliveredIds = new Set<string>(
      Array.isArray((notification.payload as any).push_delivered_subscription_ids)
        ? (notification.payload as any).push_delivered_subscription_ids
        : []
    );
    for (const subscription of recipientSubscriptions) {
      const deliveryKey = `${notification.id}:${subscription.id}`;
      if (delivered.has(deliveryKey) || metadataDeliveredIds.has(subscription.id)) {
        skipped += 1;
        continue;
      }

      const copy = notificationCopy(notification);
      const payload = JSON.stringify({
        ...copy,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: notification.id,
        notificationId: notification.id,
        url: `/?push_notification_id=${encodeURIComponent(notification.id)}`
      });

      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          expirationTime: subscription.expiration_time ? new Date(subscription.expiration_time).getTime() : null,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth_key }
        }, payload, { TTL: 60 * 60 * 24, urgency: 'normal' });
        if (metadataFallback) {
          metadataDeliveredIds.add(subscription.id);
        } else {
          await client.from('xmum_push_deliveries').insert({
            notification_id: notification.id,
            subscription_id: subscription.id,
            delivered_at: new Date().toISOString()
          });
        }
        sent += 1;
      } catch (error: any) {
        const statusCode = Number(error?.statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          if (metadataFallback) {
            await removeSubscriptionFromAuthMetadata(client, subscription.user_email, subscription.endpoint);
          } else {
            await client
              .from('xmum_push_subscriptions')
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq('id', subscription.id);
          }
        }
        console.warn(`Push delivery failed with status ${statusCode || 'unknown'}.`);
      }
    }
    if (metadataFallback && metadataDeliveredIds.size > 0) {
      await client
        .from('xmum_notifications')
        .update({
          payload: {
            ...notification.payload,
            push_delivered_subscription_ids: Array.from(metadataDeliveredIds).slice(-20)
          }
        })
        .eq('id', notification.id);
    }
  }
  return { sent, skipped };
};

export const processScheduledReminders = async (client: SupabaseAdminClient) => {
  const now = Date.now();
  const windowStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now + 65 * 60 * 1000).toISOString();
  const [{ data: hangouts, error: hangoutError }, { data: applications, error: applicationError }] = await Promise.all([
    client.from('xmum_hangouts').select('*').eq('status', 'active').gte('event_datetime', windowStart).lte('event_datetime', windowEnd),
    client.from('xmum_applications').select('hangout_id, applicant_id, status').eq('status', 'accepted')
  ]);
  if (hangoutError) throw hangoutError;
  if (applicationError) throw applicationError;
  if (!hangouts?.length) return { created: 0, expired: 0, sent: 0, skipped: 0 };

  const hangoutIds = hangouts.map((hangout: any) => hangout.id);
  const { data: existingNotifications, error: notificationError } = await client
    .from('xmum_notifications')
    .select('id, user_id, payload')
    .in('payload->>hangout_id', hangoutIds);
  if (notificationError) throw notificationError;

  const hasStage = (hangoutId: string, userId: string, stage: string) =>
    (existingNotifications || []).some((notification: any) =>
      notification.user_id === userId &&
      notification.payload?.hangout_id === hangoutId &&
      notification.payload?.reminder_stage === stage
    );
  const newNotifications: AppNotification[] = [];
  const expiredIds: string[] = [];

  for (const hangout of hangouts) {
    const eventTime = new Date(hangout.event_datetime).getTime();
    if (!Number.isFinite(eventTime)) continue;
    const accepted = (applications || [])
      .filter((application: any) => application.hangout_id === hangout.id)
      .map((application: any) => application.applicant_id);
    const recipients = Array.from(new Set<string>([hangout.creator_id, ...accepted]));
    const remaining = eventTime - now;
    let stage: 'one_hour' | 'thirty_minutes' | 'started' | 'expired' | null = null;
    if (remaining <= 0) stage = 'expired';
    else if (remaining <= 5 * 60 * 1000) stage = 'started';
    else if (remaining <= 30 * 60 * 1000) stage = 'thirty_minutes';
    else if (remaining <= 60 * 60 * 1000) stage = 'one_hour';
    if (!stage) continue;

    for (const userId of recipients) {
      if (hasStage(hangout.id, userId, stage)) continue;
      const isHost = userId === hangout.creator_id;
      const messages = {
        one_hour: isHost ? `Your hangout "${hangout.intention}" starts in about 1 hour.` : `A hangout you joined, "${hangout.intention}", starts in about 1 hour.`,
        thirty_minutes: isHost ? `Your hangout "${hangout.intention}" starts in about 30 minutes.` : `A hangout you joined, "${hangout.intention}", starts in about 30 minutes.`,
        started: isHost ? `Your hangout "${hangout.intention}" is starting now.` : `A hangout you joined, "${hangout.intention}", is starting now.`,
        expired: isHost ? `Your hangout "${hangout.intention}" has expired.` : `The hangout "${hangout.intention}" has expired.`
      };
      newNotifications.push({
        id: `notif_schedule_${stage}_${crypto.randomUUID()}`,
        user_id: userId,
        type: stage === 'expired' ? 'admin_message' : 'upcoming_hangout_reminder',
        payload: { hangout_id: hangout.id, reminder_stage: stage, custom_text: messages[stage] },
        is_read: false,
        created_at: new Date().toISOString()
      });
    }
    if (stage === 'expired') expiredIds.push(hangout.id);
  }

  if (newNotifications.length > 0) {
    const { error } = await client.from('xmum_notifications').insert(newNotifications);
    if (error) throw error;
  }
  if (expiredIds.length > 0) {
    const { error } = await client
      .from('xmum_hangouts')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .in('id', expiredIds);
    if (error) throw error;
  }
  const dispatch = newNotifications.length > 0
    ? await dispatchPushNotifications(client, newNotifications.map(notification => notification.id))
    : { sent: 0, skipped: 0 };
  return { created: newNotifications.length, expired: expiredIds.length, ...dispatch };
};
