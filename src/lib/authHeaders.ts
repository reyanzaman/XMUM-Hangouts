import { supabase } from './supabase';

export const getAuthenticatedHeaders = async (includeJson = true): Promise<Record<string, string>> => {
  const headers: Record<string, string> = includeJson ? { 'Content-Type': 'application/json' } : {};

  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {
    // The validated local token remains available for resilient sessions.
  }

  try {
    const localToken = localStorage.getItem('xmum_local_auth_token');
    if (localToken) {
      headers['X-Local-Auth'] = localToken;
    }
  } catch {
    // Storage can be unavailable in restrictive/private browser modes.
  }

  return headers;
};
