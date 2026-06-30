import { createSupabaseSyncHandler } from "./utils/supabase-sync";

export default createSupabaseSyncHandler({
  payloadKey: "hangouts",
  table: "xmum_hangouts"
});
