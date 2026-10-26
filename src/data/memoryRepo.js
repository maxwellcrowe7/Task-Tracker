// Demo mode: everything lives in memory and resets on reload.
// Same interface as the Supabase repo: load, insert, insertMany, update, remove.
export function createMemoryRepo(data) {
  const db = structuredClone(data)
  let nextId = 1

  return {
    mode: 'demo',

    async load() {
      return structuredClone(db)
    },

    async insert(table, row) {
      const saved = { id: `${table}-${nextId++}`, user_id: 'demo', created_at: new Date().toISOString(), ...row }
      db[table].push(saved)
      return structuredClone(saved)
    },

    async insertMany(table, rows) {
      const saved = []
      for (const row of rows) saved.push(await this.insert(table, row))
      return saved
    },

    async update(table, id, patch) {
      const row = db[table].find((r) => r.id === id)
      Object.assign(row, patch)
      return structuredClone(row)
    },

    async remove(table, id) {
      db[table] = db[table].filter((r) => r.id !== id)
      // Mirror the database's ON DELETE CASCADE.
      if (table === 'tasks') {
        db.completions = db.completions.filter((c) => c.task_id !== id)
        db.pauses = db.pauses.filter((p) => p.task_id !== id)
      }
    },
  }
}
