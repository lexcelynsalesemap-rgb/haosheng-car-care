import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://eyqnzemovfjgrcbduusw.supabase.co";

const supabaseKey =
  "sb_publishable_FAoQ4iz-vXtr9xd2BeAPtg_vvlAWE4H4";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
