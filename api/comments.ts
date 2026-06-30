import { createSupabaseSyncHandler } from "./utils/supabase-sync";

export default createSupabaseSyncHandler({
  payloadKey: "comments",
  table: "xmum_comments"
});
