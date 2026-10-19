// Ortega Bakery, the San Antonio bakery on Pane's homepage: its people and every
// version of its five pages, oldest first. Elena Ortega owns the site and
// approves; her son Mateo builds pages and does not publish; Tess Moreau is the
// web designer who moved the site in. The newest version is Mateo's pending
// wedding-cakes draft the app opens on.
import type { Page } from '../model'

export const owner = 'Elena Ortega'
export const team = [
  { id: '279a060f-e9f3-4b3b-832f-2eab950d511e', email: 'mateo@ortegabakery.example', name: 'Mateo Ortega', role: 'admin', status: 'active' },
  { id: '5b1c9e2a-7d34-4f0e-9a61-0c8e2f4d7b93', email: 'tess@moreaustudio.example', name: 'Tess Moreau', role: 'admin', status: 'active' },
  { id: '38e7796f-c32f-4228-86dd-3e9ef567fb11', email: 'rosa@ortegabakery.example', name: 'Rosa Ortega', role: 'member', status: 'active' },
]
const [mateo, tess] = [team[0].id, team[1].id]

type Pages = Record<string, Omit<Page, 'slug'>>
const base: Pages = {
  home: { title: 'Baked in San Antonio', body: 'Conchas, empanadas and pan de muerto every morning from 6 AM, and cakes made to order for birthdays, quinceañeras and weddings.\n\nWe are a family bakery on Fredericksburg Road. Walk in for the morning bake, or tell us about your celebration and we will plan the cake with you.' },
  about: { title: 'Our family bakery', body: 'Elena Ortega opened the bakery in 2004 with her mother\'s recipes and one oven. Twenty-two years later the oven count is four and the recipes have not changed.\n\nElena runs the kitchen and the cake orders. Her son Mateo looks after catering and the website. Rosa Ortega runs the front counter most mornings.' },
  services: { title: 'Catering and custom cakes', body: 'Morning trays: conchas, empanadas and coffee for 12 to 120 people. Order two days ahead.\nCustom cakes: birthdays, quinceañeras and anniversaries, from 8 to 150 servings.\nCatering pickup is at the side door from 7 AM.\n\nTell us the date, the number of guests and the flavors you like through the Contact page. We reply within one business day with a quote in USD.' },
  hours: { title: 'Hours and location', body: 'Monday to Friday: 6 AM to 6 PM\nSaturday: 6 AM to 4 PM\nSunday: 7 AM to 1 PM\n\n2214 Fredericksburg Road, San Antonio, TX 78201. Parking behind the building; the catering door is on the left side.' },
  contact: { title: 'Order a cake', body: 'Tell us about your order: the date, how many guests, and any flavors or allergies we should know about. Elena or Mateo answers every message, usually the same day.' },
}
const services = (extra: string) => ({ title: 'Catering and custom cakes', body: base.services.body.replace('\nCatering pickup', `${extra}\nCatering pickup`) })
const hours = (saturday: string, note = '') => ({ title: 'Hours and location', body: base.hours.body.replace('Saturday: 6 AM to 4 PM', `Saturday: ${saturday}`) + note })
const weddings = 'Wedding cakes: custom cakes for your biggest moments in San Antonio, from 50 to 300 servings.\nTastings Tuesday to Saturday, 45 minutes, for up to four people.'

/** Each version: who prepared it (null: the owner), days before now, and the pages it changes. */
export const versions: { id: string; actor: string | null; daysAgo: number; changes: Pages }[] = [
  // Tess moved the site in from WordPress.com.
  { id: '8612a725-0e60-4360-8b66-38a2af4c720a', actor: tess, daysAgo: 63, changes: base },
  { id: 'cc4eab99-2c9c-4055-85f6-ce3a730084f1', actor: mateo, daysAgo: 49, changes: { services: services('\nSheet cakes for offices and schools, from 24 servings.') } },
  { id: 'e1921582-ecc0-45c4-8ae6-c7f543a16200', actor: mateo, daysAgo: 35, changes: { home: { title: 'Baked in San Antonio', body: 'Pan de muerto is back from Thursday, October 15 to Monday, November 2. Order a dozen for your ofrenda.\n\n' + base.home.body } } },
  { id: '6b2addd4-421d-4702-884a-155e4fb6bfb9', actor: tess, daysAgo: 21, changes: { hours: hours('closed for the kitchen remodel') } },
  { id: 'ee075573-f701-494f-8a30-0d38472cebd8', actor: null, daysAgo: 20, changes: { hours: hours('6 AM to 4 PM', '\n\nThe kitchen remodel runs on weekdays after 6 PM; the bakery stays open as usual.') } },
  { id: '4d40800b-d64f-4f1c-87f5-68d5a3fb2342', actor: mateo, daysAgo: 13, changes: { contact: { title: 'Order a cake', body: base.contact.body + '\n\nFor Thanksgiving pies, order by Friday, November 20.' } } },
  { id: '9782ffb7-c6d5-45ee-8db9-74c1fa4ee777', actor: tess, daysAgo: 6, changes: { about: { title: 'Our family bakery', body: base.about.body + '\n\nWe bake with Texas flour from a mill in New Braunfels and buy our pecans in Seguin.' } } },
  { id: '43d5b979-78c3-4ac3-8076-353d37f62ab3', actor: mateo, daysAgo: 0.0007, changes: { services: { title: 'Catering and wedding cakes', body: base.services.body.replace('\nCatering pickup', `\n${weddings}\nCatering pickup`) }, home: { title: 'Baked in San Antonio', body: 'Pan de muerto is back from Thursday, October 15 to Monday, November 2. Order a dozen for your ofrenda.\n\n' + base.home.body + '\n\nNew: wedding cakes, with tastings Tuesday to Saturday. See Catering and wedding cakes.' } } },
]

/** Owner approvals, in order: version index, days before now, and the one restore. */
export const decisions: { id: string; version: number; daysAgo: number; action: 'publish' | 'rollback' }[] = [
  { id: 'b3074bdb-bd61-4231-8687-b6da2d6c3bea', version: 0, daysAgo: 62.9, action: 'publish' },
  { id: '33d50ad7-764d-44b2-8261-8e267bcc2f67', version: 1, daysAgo: 48.8, action: 'publish' },
  { id: 'e122d5e7-3b8c-4659-87c1-476d80fe2429', version: 2, daysAgo: 34.7, action: 'publish' },
  { id: '3fc226d9-ccf6-4304-8001-6ff1db5fc9ea', version: 3, daysAgo: 20.9, action: 'publish' },
  // "Closed on Saturday" was wrong: the remodel runs on weekday evenings, so Elena restored the earlier live site.
  { id: '107444b8-caa8-405b-8da2-7a7c3d34ce9f', version: 2, daysAgo: 20.8, action: 'rollback' },
  { id: '75818a5e-9fd0-428b-84aa-0390e6f361c4', version: 4, daysAgo: 19.9, action: 'publish' },
  { id: '0a4f7c1e-2b6d-4e8a-9c35-7d1f0b2e6a48', version: 5, daysAgo: 12.9, action: 'publish' },
  { id: '8c4e893f-56dc-4714-8e0a-2b031f1976e0', version: 6, daysAgo: 5.9, action: 'publish' },
]

export const site = { name: 'Ortega Bakery', description: 'A family bakery and cake shop in San Antonio, Texas, baking since 2004.' }
