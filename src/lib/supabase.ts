import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "https://bssljvoorzotsiskhpcl.supabase.co";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "sb_publishable_bcss09rrbiJbwHx03f5A1g_QViwGFFI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
