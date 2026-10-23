// Real data in Supabase. Same interface as memoryRepo: load, insert, update, remove.
// Row Level Security makes every query return only the signed-in user's rows,
// and user_id defaults to auth.uid() on insert.

// Tables are prefixed because the Supabase project is shared with other apps.
const TABLES = {
  tasks: 'habit_tasks',
  completions: 'habit_completions',
  pauses: 'habit_pauses',
  vacations: 'habit_vacations',
}

const PAGE = 1000 // Supabase returns at most 1000 rows per request

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

export function createSupabaseRepo(client) {
  async function fetchAll(table) {
    const rows = []
    for (let from = 0; ; from += PAGE) {
      const page = unwrap(
        await client.from(table).select('*').order('created_at').order('id').range(from, from + PAGE - 1),
      )
      rows.push(...page)
      if (page.length < PAGE) return rows
    }
  }

  return {
    mode: 'supabase',

    async load() {
      const keys = Object.keys(TABLES)
      const results = await Promise.all(keys.map((k) => fetchAll(TABLES[k])))
      return Object.fromEntries(keys.map((k, i) => [k, results[i]]))
    },

    async insert(table, row) {
      return unwrap(await client.from(TABLES[table]).insert(row).select().single())
    },

    async update(table, id, patch) {
      return unwrap(await client.from(TABLES[table]).update(patch).eq('id', id).select().single())
    },

    // Deleting a task cascades to its completions and pauses in the database.
    async remove(table, id) {
      unwrap(await client.from(TABLES[table]).delete().eq('id', id))
    },
  }
}
