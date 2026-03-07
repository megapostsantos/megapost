import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const CUSTOM_SUPABASE_URL = 'https://tqajkhmvmwnltzfshugh.supabase.co';
const CUSTOM_SUPABASE_ANON_KEY = 'sb_publishable_j47OP1q5aKd7ARzsj3Ea1Q_jXIANWMx';

export const supabase = createClient<Database>(CUSTOM_SUPABASE_URL, CUSTOM_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
