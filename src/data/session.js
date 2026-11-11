import { initStore, state } from './store.js'
import { createMemoryRepo } from './memoryRepo.js'
import { createSupabaseRepo } from './supabaseRepo.js'
import { buildSampleData } from './seed.js'
import { todayLocal } from '../domain/dates.js'
import { supabase, isConfigured } from '../lib/supabase.js'
import { startLiveUpdates } from '../lib/autoRefresh.js'

export { isConfigured }

export const startDemo = () => initStore(createMemoryRepo(buildSampleData(todayLocal())))

async function startSupabase() {
  const { data } = await supabase.auth.getSession()
  state.email = data.session?.user.email ?? ''
  await initStore(createSupabaseRepo(supabase))
  startLiveUpdates()
}

// On launch: demo mode if Supabase isn't configured, otherwise resume a saved login.
// Returns false when the login screen is needed.
export async function restoreSession() {
  if (!isConfigured) {
    await startDemo()
    return true
  }
  const { data } = await supabase.auth.getSession()
  if (!data.session) return false
  await startSupabase()
  return true
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  await startSupabase()
}

// New account. If the project asks people to confirm their email, there's no session yet:
// returns false and the confirmation link brings them back here signed in.
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: location.origin + location.pathname },
  })
  if (error) throw error
  // Supabase doesn't say an email is taken; it hands back a user with no identities.
  if (data.user && !data.user.identities?.length) throw new Error('There’s already an account with this email. Sign in instead.')
  if (!data.session) return false
  await startSupabase()
  return true
}

// Leaving demo or signing out reloads the page so no data stays in memory.
export async function signOut() {
  if (supabase) await supabase.auth.signOut()
  location.replace(location.pathname + '#/login')
  location.reload()
}
