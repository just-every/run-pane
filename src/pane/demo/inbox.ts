// What the live site has collected: contact messages from the last six weeks
// (the homepage's Priya Nair is the newest) and daily page visits.
const hour = 3600000, day = 24 * hour

export const messages: { name: string; email: string; hoursAgo: number; message: string }[] = [
  { name: 'Priya Nair', email: 'priya.nair@example.com', hoursAgo: 3, message: 'Could you repair a dining chair? One of our six oak chairs has a cracked back rail and the joints are loose. Happy to bring it in on Saturday morning if that works.' },
  { name: 'Daniel Okafor', email: 'd.okafor@example.net', hoursAgo: 26, message: 'Hello, I am looking for a small walnut side table, about 20 inches square, to sit beside a reading chair. Do you take commissions that size, and roughly what would it cost?' },
  { name: 'Helen Marsh', email: 'helen.marsh@example.org', hoursAgo: 49, message: 'Thank you for the rocking chair. It is back in the living room and doesn\'t creak at all. My granddaughter has already claimed it.' },
  { name: 'Sam Whitfield', email: 'sam@whitfieldcafe.example', hoursAgo: 75, message: 'We run the cafe on Beacon Road and need eight bench seats re-oiled before the holidays. Could someone come and look at them, or should we bring one in?' },
  { name: 'Grace Liu', email: 'grace.liu@example.com', hoursAgo: 4 * 24 + 5, message: 'Is there still a place in the Thursday evening joinery class? I have never used a chisel but I would love to learn.' },
  { name: 'Marco Bellini', email: 'marco.bellini@example.net', hoursAgo: 6 * 24 + 2, message: 'Our cane seat has a hole in it after years with the cat. It is a standard bentwood chair. How long does re-caning take?' },
  { name: 'Aisha Rahman', email: 'aisha.r@example.org', hoursAgo: 8 * 24 + 7, message: 'Do you restore painted furniture too? I have a 1950s kitchen dresser with chipped green paint that I would like to keep the color of.' },
  { name: 'Peter Lindqvist', email: 'peter.lindqvist@example.com', hoursAgo: 11 * 24 + 4, message: 'I picked up the bookshelf on Friday. It fits the alcove perfectly. Please send the invoice to this address.' },
  { name: 'Nora Fitzgerald', email: 'nora.fitz@example.net', hoursAgo: 15 * 24 + 1, message: 'A drawer in my grandmother\'s desk sticks badly in wet weather. Is that something you could fix in an afternoon, or does the desk need to stay with you?' },
  { name: 'James Carter', email: 'jcarter@example.org', hoursAgo: 19 * 24 + 6, message: 'Could you quote for a step stool for a small kitchen? Two steps, light enough to carry, ideally in ash.' },
  { name: 'Mei Tanaka', email: 'mei.tanaka@example.com', hoursAgo: 24 * 24 + 3, message: 'Are you open on the public holiday Monday? I would like to drop off two chairs.' },
  { name: 'Oliver Grant', email: 'oliver.grant@example.net', hoursAgo: 31 * 24 + 8, message: 'Our school would like to donate some old desks for your offcut sale. Would you be able to collect them?' },
  { name: 'Rosa Delgado', email: 'rosa.delgado@example.org', hoursAgo: 38 * 24 + 2, message: 'The table you refinished for us last year has a water ring from a vase. Can that be fixed without stripping the whole top?' },
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

export const at = (now: Date, hoursAgo: number) => new Date(now.getTime() - hoursAgo * hour).toISOString()
export const daysBefore = (now: Date, days: number) => new Date(now.getTime() - days * day).toISOString()
