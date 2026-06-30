import { createSupabaseSyncHandler } from "./utils/supabase-sync";

export default createSupabaseSyncHandler({
  payloadKey: "blocks",
  table: "xmum_blocks"
});
