import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Without both values the app runs in demo mode only.
export const isConfigured = Boolean(url && key)

// PKCE: the email-confirmation link comes back as ?code=… rather than #access_token=…,
// which would clash with the app's #/ routes.
export const supabase = isConfigured ? createClient(url, key, { auth: { flowType: 'pkce' } }) : null
