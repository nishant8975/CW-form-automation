import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''; // Export Anon Key

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    throw new Error("Supabase URL, Service Role Key, and Anon Key must be provided in your .env file");
}

// Admin client (using service key) for privileged operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// We will use supabaseUrl and supabaseAnonKey later to create user-level clients
