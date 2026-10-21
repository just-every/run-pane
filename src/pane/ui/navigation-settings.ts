import { normalizeNavigation, normalizeSocials, socialNames, socialNetworks } from '../navigation'
import type { MenuItem, Navigation, NavigationSite, Socials } from '../navigation'
import { escape } from './kit'

/** One line per item; each leading > places the item one level deeper. */
export function parseMenu(text: string): MenuItem[] {
 const result: MenuItem[] = [], parents: MenuItem[] = []
 for (const [index, raw] of text.split(/\r?\n/).entries()) {
  const line = raw.trim()
  if (!line) continue
  const prefix = line.match(/^(?:>\s*)*/)?.[0] ?? ''
  const depth = (prefix.match(/>/g) ?? []).length
  const parts = line.slice(prefix.length).split('|').map(part => part.trim())
  const [label, target = '', style = ''] = parts
  if (!label || parts.length > 3 || (style && style !== 'button')) throw Error(`Menu line ${index + 1}: use Label | page:slug or Label | https://example.com | button.`)
  if (depth > parents.length) throw Error(`Menu line ${index + 1}: add a parent before its child.`)
  const item: MenuItem = { label }
  if (target.startsWith('page:') && target.slice(5).trim()) item.page = target.slice(5).trim()
  else if (target) {
   if (!/^https?:\/\//i.test(target)) throw Error(`Menu line ${index + 1}: use page:slug or a full HTTP or HTTPS link.`)
   item.url = target
  }
  if (style === 'button') item.cta = true
  if (depth === 0) result.push(item)
  else {
   const parent = parents[depth - 1]
   ;(parent.children ??= []).push(item)
  }
  parents.length = depth
  parents.push(item)
 }
 return result
}
export function menuText(items: MenuItem[], depth = 0): string {
 return items.flatMap(item => {
  const target = item.page ? `page:${item.page}` : item.url ?? ''
  const line = `${'> '.repeat(depth)}${item.label}${target || item.cta ? ` | ${target}` : ''}${item.cta ? ' | button' : ''}`
  return [line, ...(item.children?.length ? [menuText(item.children, depth + 1)] : [])]
 }).join('\n')
}

/** Merge only submitted fields, preserving settings on saves from another page. */
export function navigationFromForm(input: Record<string, unknown>, site: NavigationSite): { navigation?: Navigation; socials?: Socials } {
 const names = ['main', 'footer', 'details', 'headerSocials', 'footerSocials'] as const
 const hasNavigation = names.some(name => input[`navigation.${name}`] !== undefined)
 let navigation = site.navigation
 if (hasNavigation) {
  const current = normalizeNavigation(site.navigation, site.pages)
  const next: Navigation = { ...current, details: site.navigation ? current.details : site.description }
  for (const name of names) {
   const value = input[`navigation.${name}`]
   if (value === undefined) continue
   if (typeof value !== 'string') throw Error('Navigation fields must contain text.')
   if (name === 'main' || name === 'footer') next[name] = parseMenu(value)
   else if (name === 'details') next.details = value.replace(/\r\n/g, '\n')
   else {
    if (value !== 'yes' && value !== 'no') throw Error('Choose yes or no for social links.')
    next[name] = value === 'yes'
   }
  }
  navigation = normalizeNavigation(next, site.pages)
 }
 let socials = site.socials
 if (socialNetworks.some(network => input[`socials.${network}`] !== undefined)) {
  const next: Record<string, unknown> = { ...site.socials }
  for (const network of socialNetworks) if (input[`socials.${network}`] !== undefined) next[network] = input[`socials.${network}`]
  socials = normalizeSocials(next)
 }
 return { ...(navigation ? { navigation } : {}), ...(socials ? { socials } : {}) }
}

/** Fields only: the editor's existing form owns autosave, draft and publication. */
export function navigationSettings(site: NavigationSite): string {
 const navigation = normalizeNavigation(site.navigation, site.pages)
 const socials = normalizeSocials(site.socials)
 const visibility = (name: 'headerSocials' | 'footerSocials', label: string) => `<label for="navigation-${name}">${label}</label><select id="navigation-${name}" name="navigation.${name}"><option value="no"${navigation[name] ? '' : ' selected'}>No</option><option value="yes"${navigation[name] ? ' selected' : ''}>Yes</option></select>`
 return `<details class="navigation-settings"><summary>Navigation and brand links</summary><p class="help" id="navigation-format">One item per line, in display order. Use Label | page:slug for a page or Label | https://example.com for an external link. Add | button to style a link as a button. For a dropdown, write its group label, then prefix each child with &gt;. Repeat &gt; for deeper groups. Labels cannot contain |. Hidden pages are excluded.</p><p class="help">Available pages: ${escape(site.pages.filter(page => !page.hidden).map(page => `page:${page.slug}`).join(', ') || 'None')}. Leave a menu blank to remove its links.</p><label for="navigation-main">Main menu</label><textarea id="navigation-main" name="navigation.main" rows="7" maxlength="50000" aria-describedby="navigation-format">${escape(menuText(navigation.main))}</textarea><label for="navigation-footer">Footer links</label><textarea id="navigation-footer" name="navigation.footer" rows="5" maxlength="50000" aria-describedby="navigation-format">${escape(menuText(navigation.footer))}</textarea><label for="navigation-details">Business details</label><textarea id="navigation-details" name="navigation.details" rows="3" maxlength="5000">${escape(site.navigation ? navigation.details : site.description)}</textarea><fieldset><legend>Social profiles</legend><p class="help">Use full HTTP or HTTPS profile links. Leave a field blank to remove that profile.</p>${socialNetworks.map(network => `<label for="social-${network}">${socialNames[network]} profile<input type="url" id="social-${network}" name="socials.${network}" value="${escape(socials[network] ?? '')}" maxlength="4000" autocomplete="off"></label>`).join('')}${visibility('headerSocials', 'Social icons in header')}${visibility('footerSocials', 'Social icons in footer')}</fieldset></details>`
}
