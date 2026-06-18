import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mcjypffxtuoqfttoapjh.supabase.co';
export const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_sQvIRivhduUTWY_kAEm9Pg_6LOvTFZY';

export const supabase = createClient(supabaseUrl, supabaseKey);
