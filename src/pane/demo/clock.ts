// The demo's clock: dates count back from the bakery's latest finished workday,
// and every time of day is a fixed office hour in San Antonio (America/Chicago),
// so the history reads the same whenever the demo is opened.
const zone = 'America/Chicago', minute = 60000, day = 1440 * minute
const wall = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })

/** San Antonio's wall clock at this instant, as a UTC timestamp of the same digits. */
function local(date: Date): number {
  const part = Object.fromEntries(wall.formatToParts(date).map(entry => [entry.type, Number(entry.value)]))
  return Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute)
}

/** [days before the demo's today, 'HH:MM' in San Antonio] */
export type Stamp = [daysAgo: number, time: string]

/**
 * The instant of each stamp. The demo's today is today in San Antonio once its
 * office day ends at 4 PM, otherwise yesterday, so nothing is later than `now`.
 */
export function demoClock(now: Date): (stamp: Stamp) => string {
  const today = Math.floor(local(now) / day) * day, anchor = local(now) - today >= 16 * 60 * minute ? today : today - day
  return ([daysAgo, time]) => {
    const [hours, minutes] = time.split(':').map(Number), target = anchor - daysAgo * day + (hours * 60 + minutes) * minute
    // Shift by the zone's offset, then once more in case that crosses a daylight-saving change.
    const guess = target - (local(new Date(target)) - Math.floor(target / minute) * minute)
    return new Date(target - (local(new Date(guess)) - guess)).toISOString()
  }
}
