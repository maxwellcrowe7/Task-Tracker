import { describe, it, expect } from 'vitest'
import { state, initStore, refreshStore, updateTodo } from '../../src/data/store.js'

// A stand-in for Supabase whose data can be changed "from another device".
function fakeRepo() {
  const db = { tasks: [], completions: [], pauses: [], vacations: [], todos: [{ id: 'a', title: 'Old' }], tags: [] }
  let release = null
  return {
    db,
    mode: 'supabase',
    hold: () => new Promise((r) => (release = r)), // next update waits until let go
    letGo: () => release?.(),
    load: async () => structuredClone(db),
    insert: async (t, row) => row,
    insertMany: async (t, rows) => rows,
    update: async function (t, id, patch) {
      if (this.holding) await this.holding
      return patch
    },
    remove: async () => {},
  }
}

describe('refreshStore', () => {
  it('picks up changes made elsewhere', async () => {
    const repo = fakeRepo()
    await initStore(repo)
    repo.db.todos[0].title = 'Changed at work'
    await refreshStore()
    expect(state.todos[0].title).toBe('Changed at work')
  })

  it('does not swap data in while a save is still going', async () => {
    const repo = fakeRepo()
    await initStore(repo)
    repo.holding = repo.hold()
    const saving = updateTodo(state.todos[0], { title: 'Typed here' })
    repo.db.todos[0].title = 'Stale copy'
    await refreshStore()
    expect(state.todos[0].title).toBe('Old') // the refresh was skipped
    repo.letGo()
    await saving
    expect(state.todos[0].title).toBe('Typed here')
  })
})
