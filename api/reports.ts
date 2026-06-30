import { createSupabaseSyncHandler } from "./utils/supabase-sync";

export default createSupabaseSyncHandler({
  payloadKey: "reports",
  table: "xmum_reports"
});
