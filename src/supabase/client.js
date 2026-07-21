import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://eyqnzemovfjgrcbduusw.supabase.co";

const supabaseKey = "sb_publishable_FAoQ4iz-vXtr9xd2BeAPtg_vvlAWE4H";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);