// Real data in Supabase. Same interface as memoryRepo: load, insert, insertMany, update, remove.
// Row Level Security makes every query return only the signed-in user's rows,
// and user_id defaults to auth.uid() on insert.

// Tables are prefixed because the Supabase project is shared with other apps.
const TABLES = {
  tasks: 'habit_tasks',
  completions: 'habit_completions',
  pauses: 'habit_pauses',
  vacations: 'habit_vacations',
  todos: 'habit_todos',
  tags: 'habit_tags',
}

const PAGE = 1000 // Supabase returns at most 1000 rows per request

// A table added in a newer version that hasn't been created in Supabase yet loads as
// empty instead of breaking the whole app (the save will show an error banner).
function missingTable(key, error) {
  if ((key === 'todos' || key === 'tags') && (error.code === 'PGRST205' || error.code === '42P01')) return []
  throw error
}

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
      const results = await Promise.all(keys.map((k) => fetchAll(TABLES[k]).catch((e) => missingTable(k, e))))
      return Object.fromEntries(keys.map((k, i) => [k, results[i]]))
    },

    async insert(table, row) {
      return unwrap(await client.from(TABLES[table]).insert(row).select().single())
    },

    // Inserted in chunks so a long backdated streak doesn't make one huge request.
    async insertMany(table, rows) {
      const saved = []
      for (let i = 0; i < rows.length; i += 500) {
        saved.push(...unwrap(await client.from(TABLES[table]).insert(rows.slice(i, i + 500)).select()))
      }
      return saved
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
