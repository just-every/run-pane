// Local schedule values deliberately have no UTC offset. Resolve them in the
// owner's US zone and require exactly one instant, including at DST changes.
const usZones = new Set(`America/New_York America/Detroit America/Kentucky/Louisville America/Louisville America/Kentucky/Monticello America/Indiana/Indianapolis America/Indianapolis America/Indiana/Vincennes America/Indiana/Winamac America/Indiana/Marengo America/Indiana/Petersburg America/Indiana/Vevay America/Chicago America/Indiana/Tell_City America/Indiana/Knox America/Knox_IN America/Menominee America/North_Dakota/Center America/North_Dakota/New_Salem America/North_Dakota/Beulah America/Denver America/Boise America/Phoenix America/Los_Angeles America/Anchorage America/Juneau America/Sitka America/Metlakatla America/Yakutat America/Nome America/Adak America/Atka Pacific/Honolulu Pacific/Johnston America/Puerto_Rico America/St_Thomas America/Virgin Pacific/Guam Pacific/Saipan Pacific/Pago_Pago Pacific/Samoa Pacific/Midway Pacific/Wake US/Eastern US/Central US/Mountain US/Pacific US/Alaska US/Aleutian US/Hawaii US/Arizona US/East-Indiana US/Indiana-Starke US/Michigan US/Samoa`.split(' '))
const formatters = new Map<string, Intl.DateTimeFormat>()
function formatter(zone: string) {
 let value = formatters.get(zone)
 if (!value) { value = new Intl.DateTimeFormat('en-CA', {timeZone: zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}); formatters.set(zone,value) }
 return value
}
export function normalizeTimeZone(value: unknown): string {
 if (typeof value !== 'string' || !usZones.has(value)) throw Error('Choose a US IANA time zone, such as America/Chicago, America/New_York or Pacific/Guam.')
 try { return formatter(value).resolvedOptions().timeZone } catch { throw Error(`The time zone ${value} is unavailable. Choose another US IANA time zone.`) }
}
function parts(at: number, zone: string): Record<string, number> {
 return Object.fromEntries(formatter(zone).formatToParts(at).filter(part => part.type !== 'literal').map(part => [part.type,Number(part.value)]))
}
export function localAt(at: number, zone: string): string {
 const p = parts(at,zone), pad = (v:number) => String(v).padStart(2,'0')
 return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}
export function localInstant(value: unknown, zone: string): number {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw Error('Schedule times need a local date and time, YYYY-MM-DDTHH:mm.')
 const [year,month,day,hour,minute] = value.split(/[-T:]/).map(Number)
 const naive = Date.UTC(year,month-1,day,hour,minute)
 if (year < 1000 || new Date(naive).toISOString().slice(0,16) !== value) throw Error(`Invalid local schedule date: ${value}.`)
 const offsets = new Set<number>()
 for (let delta=-36;delta<=36;delta+=6) {
  const at = naive + delta*3_600_000, p = parts(at,zone)
  offsets.add(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-at)
 }
 const matches = [...offsets].map(offset => naive-offset).filter(at => localAt(at,zone) === value)
 if (matches.length !== 1) throw Error(`${value} is ${matches.length ? 'ambiguous because the clock repeats' : 'not a real local time because the clock advances'} in ${zone}. Choose a time outside the daylight-saving transition, such as 03:00.`)
 return matches[0]
}
/** Preserve the original day, clamping only the individual shorter month. */
export function addMonths(start: string, months: number): string {
 const [year,month,day] = start.slice(0,10).split('-').map(Number)
 const next = new Date(Date.UTC(year,month-1+months,1))
 const last = new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate()
 return `${String(next.getUTCFullYear()).padStart(4,'0')}-${String(next.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}${start.slice(10)}`
}
