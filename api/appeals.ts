import { createSupabaseSyncHandler } from "./utils/supabase-sync";

export default createSupabaseSyncHandler({
  payloadKey: "appeals",
  table: "xmum_appeals"
});
