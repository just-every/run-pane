// Cedar Street Studio, the workshop on Pane's homepage: its people and every
// version of its five pages, oldest first. The first is fixtures/static-site.json
// (copied, since `vite dev` serves only src); the newest is the admin's pending
// Saturday-hours draft the homepage shows.
import type { Page } from '../model'

export const owner = 'Maya Ortiz'
export const team = [
  { id: '279a060f-e9f3-4b3b-832f-2eab950d511e', email: 'tom@cedarstreetstudio.example', name: 'Tom Becker', role: 'admin', status: 'active' },
  { id: '38e7796f-c32f-4228-86dd-3e9ef567fb11', email: 'jonah@cedarstreetstudio.example', name: 'Jonah Reyes', role: 'member', status: 'active' },
]
const tom = team[0].id

type Pages = Record<string, Omit<Page, 'slug'>>
const base: Pages = {
  home: { title: "Made to last", body: "Welcome to Cedar Street Studio. We repair well-loved furniture and build practical pieces for everyday life." },
  about: { title: "Our studio", body: "We are a small independent workshop. Every project begins with a conversation about what you need and what is worth preserving." },
  services: { title: "Repairs and commissions", body: "Furniture repairs\nSmall custom furniture\nFinishing and restoration\nContact us with a description of your project to arrange an estimate." },
  hours: { title: "Visit the workshop", body: "Monday to Friday: 9 AM to 5 PM\nSaturday: by appointment\nSunday: closed" },
  contact: { title: "Start a conversation", body: "Tell us about your project using the contact form. Include the kind of piece, the work needed, and when you hope to have it ready." },
}
const services = (extra: string) => ({ title: 'Repairs and commissions', body: `Furniture repairs: loose joints, broken rails, split seats and wobbly legs.\nSmall custom furniture: side tables, benches, shelving and step stools.\nFinishing and restoration: hand-rubbed oil, shellac and color matching.${extra}\n\nContact us with a description of your project and a photo if you have one. We reply with an estimate within two business days.` })
const hours = (saturday: string, note = '') => ({ title: 'Visit the workshop', body: `Monday to Friday: 9 AM to 5 PM\nSaturday: ${saturday}\nSunday: closed\n\nWe are at 42 Cedar Street, behind the green gate. Park on the street; the workshop door is at the back of the yard.${note}` })

/** Each version: who prepared it (null: the owner), days before now, and the pages it changes. */
export const versions: { id: string; actor: string | null; daysAgo: number; changes: Pages }[] = [
  { id: '8612a725-0e60-4360-8b66-38a2af4c720a', actor: null, daysAgo: 121, changes: base },
  { id: 'cc4eab99-2c9c-4055-85f6-ce3a730084f1', actor: tom, daysAgo: 88, changes: { hours: hours('10 AM to 2 PM through the summer') } },
  { id: 'e1921582-ecc0-45c4-8ae6-c7f543a16200', actor: tom, daysAgo: 71, changes: { home: { title: 'Made to last', body: 'Spring clear-out: offcut boards and seconds stools at half price in the yard every Saturday in March.\n\n' + base.home.body } } },
  { id: '6b2addd4-421d-4702-884a-155e4fb6bfb9', actor: tom, daysAgo: 57, changes: { services: services('\nChair caning and rush seating, by the seat.') } },
  { id: 'ee075573-f701-494f-8a30-0d38472cebd8', actor: null, daysAgo: 33, changes: { hours: hours('closed until spring') } },
  { id: '4d40800b-d64f-4f1c-87f5-68d5a3fb2342', actor: tom, daysAgo: 32, changes: { hours: hours('by appointment through the winter', '\n\nWinter evening class: beginners\' joinery, Thursdays 6 PM to 8 PM. Ask us for a place.') } },
  { id: '9782ffb7-c6d5-45ee-8db9-74c1fa4ee777', actor: null, daysAgo: 11, changes: { about: { title: 'Our studio', body: 'We are a small independent workshop on Cedar Street. Every project begins with a conversation about what you need and what is worth preserving.\n\nMaya Ortiz started the studio in 2014 after twelve years restoring chairs for a museum. Tom Becker runs the bench and the evening class. Jonah Reyes is our apprentice and does most of the caning.' } } },
  { id: '43d5b979-78c3-4ac3-8076-353d37f62ab3', actor: tom, daysAgo: 0.08, changes: { hours: hours('9 AM to 1 PM', '\n\nWinter evening class: beginners\' joinery, Thursdays 6 PM to 8 PM. Ask us for a place.'), home: { title: 'Made to last', body: base.home.body + '\n\nHoliday commissions: order by December 1 for delivery before the holidays.' } } },
]

/** Owner approvals, in order: version index, days before now, and the one restore. */
export const decisions: { id: string; version: number; daysAgo: number; action: 'publish' | 'rollback' }[] = [
  { id: 'b3074bdb-bd61-4231-8687-b6da2d6c3bea', version: 0, daysAgo: 120.9, action: 'publish' },
  { id: '33d50ad7-764d-44b2-8261-8e267bcc2f67', version: 1, daysAgo: 87.8, action: 'publish' },
  { id: 'e122d5e7-3b8c-4659-87c1-476d80fe2429', version: 3, daysAgo: 56.7, action: 'publish' },
  { id: '3fc226d9-ccf6-4304-8001-6ff1db5fc9ea', version: 4, daysAgo: 32.9, action: 'publish' },
  // Saturday "closed" was wrong while the winter class still ran: the owner restored the earlier live site.
  { id: '107444b8-caa8-405b-8da2-7a7c3d34ce9f', version: 3, daysAgo: 32.8, action: 'rollback' },
  { id: '75818a5e-9fd0-428b-84aa-0390e6f361c4', version: 5, daysAgo: 31.9, action: 'publish' },
  { id: '8c4e893f-56dc-4714-8e0a-2b031f1976e0', version: 6, daysAgo: 10.9, action: 'publish' },
]

export const site = { name: "Cedar Street Studio", description: "A neighbourhood studio for thoughtful repairs and handmade furniture." }
