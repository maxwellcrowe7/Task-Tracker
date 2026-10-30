import { describe, it, expect } from 'vitest'
import { FAV_CAP, favoritesFull, tagsFor, nextColor, quickTags, paletteColor, tagTree, withDescendants, parentChoices, moveTag } from '../../src/domain/tags.js'

const tag = (id, o = {}) => ({ id, name: id, color: 'slate', scope: 'personal', fav: false, sort_order: 0, ...o })

describe('tags', () => {
  const tags = [tag('errands'), tag('siop', { scope: 'work' }), tag('urgent', { scope: 'both' }), tag('travel', { fav: true })]

  it('each side sees its own tags plus shared ones', () => {
    expect(tagsFor(tags, 'personal').map((t) => t.id)).toEqual(['errands', 'travel', 'urgent'])
    expect(tagsFor(tags, 'work').map((t) => t.id)).toEqual(['siop', 'urgent'])
  })

  it('add-bar chips are only the starred favorites', () => {
    expect(quickTags(tags, 'personal').map((t) => t.id)).toEqual(['travel'])
    expect(quickTags(tags, 'work').map((t) => t.id)).toEqual([])
  })

  it('knows when a side already has the most favorites', () => {
    const many = Array.from({ length: FAV_CAP }, (_, i) => tag(`f${i}`, { fav: true }))
    expect(favoritesFull(many, tag('new'))).toEqual(['personal'])
    expect(favoritesFull(many, tag('new', { scope: 'work' }))).toEqual([])
    expect(favoritesFull(many, many[0])).toEqual([]) // already starred: unstarring is always fine
  })

  it('new tags get the least-used color; unknown colors fall back', () => {
    expect(nextColor([tag('a', { color: 'red' })])).toBe('rose')
    expect(paletteColor('nope').id).toBe('slate')
  })
})

describe('nested tags', () => {
  const tags = [
    tag('sports', { sort_order: 1 }),
    tag('football', { parent_id: 'sports', sort_order: 2 }),
    tag('wrestling', { parent_id: 'sports', sort_order: 1 }),
    tag('nfl', { parent_id: 'football' }),
    tag('errands', { sort_order: 2 }),
    tag('siop', { scope: 'work', parent_id: 'sports' }), // parent is on the other side
  ]
  const tree = (scope) => tagTree(tags, scope).map((r) => `${'-'.repeat(r.depth)}${r.tag.id}`)

  it('lists parents before their children, indented', () => {
    expect(tree('personal')).toEqual(['sports', '-wrestling', '-football', '--nfl', 'errands'])
    expect(tagTree(tags, 'personal')[0].hasChildren).toBe(true)
  })

  it('shows a tag at the top when its parent is on the other side', () => {
    expect(tree('work')).toEqual(['siop'])
  })

  it('a tag covers everything nested under it', () => {
    expect([...withDescendants(tags, 'sports')].sort()).toEqual(['football', 'nfl', 'siop', 'sports', 'wrestling'])
    expect([...withDescendants(tags, 'errands')]).toEqual(['errands'])
  })

  it("can't be moved inside itself or its own sub-tags", () => {
    expect(parentChoices(tags, 'personal', 'football').map((r) => r.tag.id)).toEqual(['sports', 'wrestling', 'errands'])
  })

  it('survives a loop in the data', () => {
    const loop = [tag('a', { parent_id: 'b' }), tag('b', { parent_id: 'a' })]
    expect(tagTree(loop, 'personal').map((r) => r.tag.id)).toEqual(['a', 'b'])
    expect([...withDescendants(loop, 'a')].sort()).toEqual(['a', 'b'])
  })
})

describe('moveTag', () => {
  const tags = [
    tag('a', { sort_order: 1 }),
    tag('b', { sort_order: 2 }),
    tag('c', { sort_order: 3 }),
    tag('c1', { parent_id: 'c', sort_order: 1 }),
  ]
  const apply = (saves) => {
    const next = tags.map((t) => ({ ...t }))
    for (const s of saves) Object.assign(next.find((t) => t.id === s.id), s.patch)
    return tagTree(next, 'personal').map((r) => `${'-'.repeat(r.depth)}${r.tag.id}`)
  }

  it('reorders on the same level', () => {
    expect(apply(moveTag(tags, 'personal', 'c', 'a', 'before'))).toEqual(['c', '-c1', 'a', 'b'])
    expect(apply(moveTag(tags, 'personal', 'a', 'b', 'after'))).toEqual(['b', 'a', 'c', '-c1'])
  })

  it('nests, un-nests, and moves to the very top', () => {
    expect(apply(moveTag(tags, 'personal', 'a', 'c', 'inside'))).toEqual(['b', 'c', '-c1', '-a'])
    expect(apply(moveTag(tags, 'personal', 'c1', 'a', 'after'))).toEqual(['a', 'c1', 'b', 'c'])
    expect(apply(moveTag(tags, 'personal', 'c1', null, 'top'))).toEqual(['c1', 'a', 'b', 'c'])
  })

  it('only saves what changed, and refuses moves into its own sub-tags', () => {
    expect(moveTag(tags, 'personal', 'a', 'b', 'before')).toEqual([])
    expect(moveTag(tags, 'personal', 'c', 'c1', 'inside')).toEqual([])
    expect(moveTag(tags, 'personal', 'c', 'c1', 'after')).toEqual([])
  })
})
