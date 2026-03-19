import { createClient } from '@supabase/supabase-js';

const CUSTOM_SUPABASE_URL = 'https://tqajkhmvmwnltzfshugh.supabase.co';
const CUSTOM_SUPABASE_ANON_KEY = 'sb_publishable_j47OP1q5aKd7ARzsj3Ea1Q_jXIANWMx';

// Untyped client for Mega Flex tables (not in Lovable Cloud schema)
export const megaFlexClient = createClient(CUSTOM_SUPABASE_URL, CUSTOM_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
