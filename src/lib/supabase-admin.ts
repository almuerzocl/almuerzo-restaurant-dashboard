import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Supabase Admin Client (Service Role)
 * 
 * This client bypasses Row Level Security (RLS) and has full access to all tables.
 * USE ONLY on the server side (API routes, server actions, server components).
 * NEVER expose this client to the browser/client side.
 * 
 * Use cases:
 * - Admin operations (update any user's profile, manage restaurants)
 * - Background tasks (cron jobs, webhooks)
 * - Cross-user queries (reports, analytics)
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
})
