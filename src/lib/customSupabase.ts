import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const CUSTOM_SUPABASE_URL = 'https://tcajkhmwmmnltzfshugh.supabase.co';
const CUSTOM_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxYWpraG12bXdubHR6ZnNodWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODM0NjQsImV4cCI6MjA4Nzk1OTQ2NH0.9dGKsgwI43Ip8tg3JjvEc9pK-1QqBBTYGaMQPR_fYnk';

export const supabase = createClient<Database>(CUSTOM_SUPABASE_URL, CUSTOM_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
