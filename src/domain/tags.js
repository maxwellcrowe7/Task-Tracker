// Tag colors, in rainbow order. Includes Braindump's ten, so imported tags keep their look.
// bg/fg are the light-mode chip colors; dark mode derives its own from fg (see TagChip).
export const PALETTE = [
  { id: 'red', bg: '#f7c4c0', fg: '#a3261f' },
  { id: 'rose', bg: '#f9c6d3', fg: '#a22247' },
  { id: 'terracotta', bg: '#f8cdbb', fg: '#9a3814' },
  { id: 'orange', bg: '#fbd3ad', fg: '#9a4a07' },
  { id: 'amber', bg: '#f8e2a8', fg: '#7d5806' },
  { id: 'yellow', bg: '#f7eba0', fg: '#6e5e00' },
  { id: 'olive', bg: '#dfe8a6', fg: '#52630c' },
  { id: 'lime', bg: '#d6eeb0', fg: '#3f6b10' },
  { id: 'forest', bg: '#c2e4c4', fg: '#1f6132' },
  { id: 'teal', bg: '#bce4de', fg: '#0d6357' },
  { id: 'cyan', bg: '#bde9ee', fg: '#0b6670' },
  { id: 'sky', bg: '#bfe3f7', fg: '#0e6a96' },
  { id: 'slate', bg: '#c7d8ee', fg: '#365d8e' },
  { id: 'indigo', bg: '#d0d2f4', fg: '#3d43a0' },
  { id: 'violet', bg: '#dccdf3', fg: '#5f3a9c' },
  { id: 'plum', bg: '#e9c9e9', fg: '#853c85' },
  { id: 'brown', bg: '#e9d2b3', fg: '#775024' },
  { id: 'gray', bg: '#dcd8ca', fg: '#57524a' },
]

export const FAV_CAP = 6 // favorites per side, so the add-bar chips fit on one line

export const paletteColor = (id) => PALETTE.find((c) => c.id === id) ?? PALETTE.find((c) => c.id === 'slate')

// Tags available on one side: that side's own plus the ones shared by both.
export const tagsFor = (tags, scope) =>
  tags.filter((t) => t.scope === scope || t.scope === 'both').sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))

// The least-used color, so new tags spread across the palette.
export function nextColor(tags) {
  const used = new Map(PALETTE.map((c) => [c.id, 0]))
  for (const t of tags) used.set(t.color, (used.get(t.color) ?? 0) + 1)
  return [...used.entries()].sort((a, b) => a[1] - b[1])[0][0]
}

// Chips for the add bar: just the starred favorites. The rest are under the Tag button.
export const quickTags = (tags, scope) => tagTree(tags, scope).map((r) => r.tag).filter((t) => t.fav).slice(0, FAV_CAP)

// Sides that already have the most favorites allowed, so `tag` can't be starred there.
export function favoritesFull(tags, tag) {
  const sides = tag.scope === 'both' ? ['personal', 'work'] : [tag.scope]
  return sides.filter((side) => tagsFor(tags, side).filter((t) => t.fav && t.id !== tag.id).length >= FAV_CAP)
}

// ---- Tags inside tags (parent_id) ----

const byOrder = (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)

// A side's tags as an indented tree: [{ tag, depth, hasChildren }], parents before
// their children. A tag whose parent isn't on this side shows at the top level.
export function tagTree(tags, scope) {
  const mine = tagsFor(tags, scope)
  const ids = new Set(mine.map((t) => t.id))
  const kids = new Map()
  for (const t of mine) {
    const parent = ids.has(t.parent_id) ? t.parent_id : null
    if (!kids.has(parent)) kids.set(parent, [])
    kids.get(parent).push(t)
  }
  const out = []
  const placed = new Set()
  const place = (tag, depth) => {
    placed.add(tag.id)
    out.push({ tag, depth, hasChildren: kids.has(tag.id) })
    for (const kid of (kids.get(tag.id) ?? []).sort(byOrder)) if (!placed.has(kid.id)) place(kid, depth + 1)
  }
  for (const tag of (kids.get(null) ?? []).sort(byOrder)) place(tag, 0)
  // Tags caught in a parent loop (bad data) still show, at the top.
  for (const tag of [...mine].sort(byOrder)) if (!placed.has(tag.id)) place(tag, 0)
  return out
}

// A tag plus everything nested under it, at any depth.
export function withDescendants(tags, id) {
  const out = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const t of tags) {
      if (t.parent_id && out.has(t.parent_id) && !out.has(t.id)) {
        out.add(t.id)
        grew = true
      }
    }
  }
  return out
}

// Tags `id` could be moved inside: anything on its side except itself and its own sub-tags.
export function parentChoices(tags, scope, id) {
  const blocked = id ? withDescendants(tags, id) : new Set()
  return tagTree(tags, scope).filter((row) => !blocked.has(row.tag.id))
}

// Moving a tag in the sidebar. `where` is 'before'/'after' the target (same level),
// 'inside' it (last child), or 'top' (first at the top level; target unused).
// Returns the saves to make: [{ id, patch }], renumbering sort_order on that level.
export function moveTag(tags, scope, dragId, targetId, where) {
  const visible = new Map(tagsFor(tags, scope).map((t) => [t.id, t]))
  const dragged = visible.get(dragId)
  const target = visible.get(targetId)
  if (!dragged || (where !== 'top' && !target)) return []
  if (where !== 'top' && withDescendants(tags, dragId).has(targetId)) return []
  const levelOf = (t) => (visible.has(t.parent_id) ? t.parent_id : null)
  const parent = where === 'top' ? null : where === 'inside' ? target.id : levelOf(target)
  const level = [...visible.values()].filter((t) => t.id !== dragId && levelOf(t) === parent).sort(byOrder)
  const at = where === 'top' ? 0 : where === 'inside' ? level.length : level.indexOf(target) + (where === 'after' ? 1 : 0)
  level.splice(at, 0, dragged)
  const saves = []
  level.forEach((t, i) => {
    const patch = {}
    if (t.sort_order !== i + 1) patch.sort_order = i + 1
    if (t === dragged && (t.parent_id ?? null) !== parent) patch.parent_id = parent
    if (Object.keys(patch).length) saves.push({ id: t.id, patch })
  })
  return saves
}
