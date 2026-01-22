import { createClient } from '@supabase/supabase-js';

// Diese Umgebungsvariablen müssen in .env.local gesetzt werden
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
