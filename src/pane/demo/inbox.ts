// What the live site has collected: contact messages from the last six weeks
// (a wedding-tasting request is the newest) and daily page visits.
import type { Stamp } from './clock'

const day = 86400000

export const messages: { name: string; email: string; at: Stamp; message: string }[] = [
  { name: 'Lucia Ramirez', email: 'lucia.ramirez@example.com', at: [0, '11:52'], message: 'We are getting married on Saturday, April 17 at the Pearl. About 140 guests. Could we come in for a tasting next week? Tres leches and lemon are our favorites.' },
  { name: 'Daniel Park', email: 'dpark@example.net', at: [1, '16:40'], message: 'Hi! I need two dozen conchas and a coffee tray for a staff meeting on Friday morning at 8 AM, for 30 people. Can I pick up at the side door?' },
  { name: 'Marisol Vega', email: 'marisol.vega@example.org', at: [1, '10:15'], message: 'My daughter\'s quinceañera is Saturday, December 5. We would like a three-tier cake for 120 guests in lavender and white. What would that cost?' },
  { name: 'Grant Hollister', email: 'grant@hollisterdental.example', at: [2, '13:20'], message: 'Could you deliver a sheet cake to our office on Wurzbach Road on October 30 for a retirement party? 40 servings, chocolate, "Happy Retirement, Linda".' },
  { name: 'Ana Gutierrez', email: 'ana.g@example.com', at: [4, '09:47'], message: 'Do you make pan de muerto without nuts? My son has a tree nut allergy and we would like a dozen for our ofrenda.' },
  { name: 'Chris Whitaker', email: 'cwhitaker@example.net', at: [5, '12:30'], message: 'Is the bakery open on Sunday, November 1? We are hosting family after church and would like to pick up empanadas around noon.' },
  { name: 'Priya Desai', email: 'priya.desai@example.org', at: [8, '17:05'], message: 'Thank you for the birthday cake on Saturday. The strawberry filling was perfect and there was not a crumb left.' },
  { name: 'Robert Nguyen', email: 'robert.nguyen@example.com', at: [11, '10:38'], message: 'Our church is planning a fall festival on Saturday, October 24. Could you quote 300 cookies and 10 dozen empanadas for pickup that morning?' },
  { name: 'Jasmine Torres', email: 'jasmine.t@example.net', at: [15, '14:12'], message: 'Do you offer gluten-free cake? A small one for six people is all we need.' },
  { name: 'Mike Brennan', email: 'mike.brennan@example.org', at: [19, '08:56'], message: 'Can I order Thanksgiving pies yet? I would like two pecan and one pumpkin for Wednesday, November 25.' },
  { name: 'Teresa Lopez', email: 'teresa.lopez@example.com', at: [24, '15:33'], message: 'Do you still bake the anise cookies my grandmother used to buy from you? Hers were called pan de polvo.' },
  { name: 'Kevin Shaw', email: 'kevin@shawrealty.example', at: [31, '11:09'], message: 'We host an open house every month. Could you set up a standing order for three dozen pastries on the first Saturday?' },
  { name: 'Sofia Martinez', email: 'sofia.m@example.net', at: [38, '08:20'], message: 'What time does the morning bake come out? I would like the conchas while they are still warm.' },
]

const paths = [['home', 26], ['services', 14], ['hours', 11], ['contact', 6], ['about', 5]] as const

/** Daily visits per page for the last 42 days: busier on Fridays and Saturdays, a fixed pattern. */
export function visits(now: Date): { day: string; path: string; count: number }[] {
  const rows = []
  for (let back = 41; back >= 0; back--) {
    const date = new Date(now.getTime() - back * day), weekday = date.getUTCDay(), busy = weekday === 5 || weekday === 6 ? 1.5 : weekday === 0 ? 0.6 : 1
    for (const [index, [path, typical]] of paths.entries()) {
      // A deterministic wobble so the totals look like real traffic, not a ruler.
      const wobble = ((back * 7 + index * 13) % 9) - 4
      rows.push({ day: date.toISOString().slice(0, 10), path, count: Math.max(1, Math.round(typical * busy + wobble * typical / 10)) })
    }
  }
  // Today only counts the hours so far.
  const today = rows.slice(-paths.length), share = now.getUTCHours() / 24
  for (const row of today) row.count = Math.max(0, Math.round(row.count * share))
  return rows.filter(row => row.count > 0)
}
