import { initStore } from './store.js'
import { createMemoryRepo } from './memoryRepo.js'
import { createSupabaseRepo } from './supabaseRepo.js'
import { buildSampleData } from './seed.js'
import { todayLocal } from '../domain/dates.js'
import { supabase, isConfigured } from '../lib/supabase.js'

export { isConfigured }

export const startDemo = () => initStore(createMemoryRepo(buildSampleData(todayLocal())))

const startSupabase = () => initStore(createSupabaseRepo(supabase))

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

// Leaving demo or signing out reloads the page so no data stays in memory.
export async function signOut() {
  if (supabase) await supabase.auth.signOut()
  location.replace(location.pathname + '#/login')
  location.reload()
}
