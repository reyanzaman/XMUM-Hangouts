import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : null;

export function createSupabaseSyncHandler(options: {
  payloadKey: string;
  table: string;
  transformRows?: (rows: any[]) => any[];
}) {
  const { payloadKey, table, transformRows } = options;

  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    if (req.method === "GET") {
      return res.status(200).json({ [payloadKey]: [] });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const data = req.body?.[payloadKey];
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Invalid payload: must be array." });
      }

      if (!supabaseAdmin) {
        return res.status(503).json({
          error: "SUPABASE_SERVICE_ROLE_KEY is required for server-side sync."
        });
      }

      const rows = transformRows ? transformRows(data) : data;

      if (rows.length > 0) {
        const { error } = await supabaseAdmin.from(table).upsert(rows);
        if (error) {
          console.error(`Supabase sync failed for ${table}:`, error);
          return res.status(500).json({ error: `Failed to sync ${payloadKey} to Supabase.` });
        }
      }

      return res.status(200).json({ success: true, count: data.length });
    } catch (err) {
      console.error(`Failed to sync ${payloadKey}:`, err);
      return res.status(500).json({ error: `Failed to sync ${payloadKey}` });
    }
  };
}
