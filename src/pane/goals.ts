import type { Page } from './model'

export const goalTypes = ['form', 'phone', 'email', 'outbound'] as const
export type GoalType = typeof goalTypes[number]
/** `page` limits where the goal counts; `target` limits an outbound goal to one site. */
export type Goal = { id: string; name: string; type: GoalType; page?: string; target?: string }

const typeNames: Record<GoalType, string> = {form: 'Form submission', phone: 'Phone number click', email: 'Email address click', outbound: 'Outbound click'}
export const goalTypeName = (type: GoalType) => typeNames[type]

/** Goal text is one goal per line: name | type | page (optional) | site (outbound, optional). */
export function goalsFromText(text: string): unknown[] {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const [name = '', type = '', page = '', target = ''] = line.split('|').map(part => part.trim())
    return {name, type: type.toLowerCase(), ...(page ? {page} : {}), ...(target ? {target} : {})}
  })
}

export const goalsToText = (goals: readonly Goal[] = []) => goals.map(goal => [goal.name, goal.type, goal.page ?? '', goal.target ?? ''].join(' | ').replace(/( \| )+$/, '')).join('\n')

export function normalizeGoals(value: unknown, pages: readonly Page[]): Goal[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 12) throw Error('Use up to 12 conversion goals.')
  const live = new Map(pages.filter(page => !page.deleted).map(page => [page.slug, page]))
  const goals = value.map((item): Goal => {
    const input = item !== null && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {}
    const name = typeof input.name === 'string' ? input.name.normalize('NFC').trim() : ''
    if (!name || name.length > 60 || /[\u0000-\u001f\u007f-\u009f|]/.test(name)) throw Error('Name each goal in up to 60 characters.')
    if (!goalTypes.includes(input.type as GoalType)) throw Error(`Goal "${name}" needs a type: ${goalTypes.join(', ')}.`)
    const type = input.type as GoalType
    const page = input.page === undefined || input.page === '' ? undefined : String(input.page)
    if (page !== undefined && !live.has(page)) throw Error(`Goal "${name}" names a page that does not exist.`)
    if (type === 'form') {
      const target = page && live.get(page)
      if (!target || !(target.kind === 'contact' || target.slug === 'contact')) throw Error(`Goal "${name}" needs the page that holds the contact form.`)
    }
    const target = input.target === undefined || input.target === '' ? undefined : String(input.target).toLowerCase()
    if (target !== undefined && (type !== 'outbound' || !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(target))) throw Error(`Goal "${name}" can name only the site of an outbound link, such as example.com.`)
    const id = name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
    if (!id) throw Error('Name each goal in up to 60 characters.')
    return {id, name, type, ...(page ? {page} : {}), ...(target ? {target} : {})}
  })
  if (new Set(goals.map(goal => goal.id)).size !== goals.length) throw Error('Each goal needs a different name.')
  return goals
}

/** The goals a visitor's browser may count on this page: the tracker receives only these. */
export const goalsOnPage = (goals: readonly Goal[] = [], slug: string) => goals.filter(goal => !goal.page || goal.page === slug)
  .map(({id, name, type, target}) => ({id, name, type, ...(target ? {target} : {})}))
