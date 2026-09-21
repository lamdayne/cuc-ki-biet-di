import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ Cảnh báo: SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY chưa được thiết lập trong .env');
}

// Server connects exclusively using the service role key to bypass RLS safely
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
