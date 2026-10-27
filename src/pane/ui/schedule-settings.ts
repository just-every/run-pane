import type { Site } from '../model'
import { escape } from './kit'

const businessZones = [
 ['America/Chicago', 'Central — Chicago'],
 ['America/New_York', 'Eastern — New York'],
 ['America/Denver', 'Mountain — Denver'],
 ['America/Los_Angeles', 'Pacific — Los Angeles'],
 ['America/Phoenix', 'Arizona — Phoenix'],
 ['America/Anchorage', 'Alaska — Anchorage'],
 ['Pacific/Honolulu', 'Hawaii — Honolulu'],
]

export function timeZoneOptions(zone:string):string {
 const zones=businessZones.some(([value])=>value===zone)?businessZones:[[zone,zone],...businessZones]
 return zones.map(([value,label])=>`<option value="${escape(value)}"${value===zone?' selected':''}>${escape(label)} (${escape(value)})</option>`).join('')
}

/** Named controls join the editor's existing autosave, undo and reconnect flow. */
export function scheduleSettings(site: Site): string {
 const automation = site.automations, zone = automation?.timeZone ?? 'America/Chicago'
 const zones = businessZones.some(([value]) => value === zone) ? businessZones : [[zone, zone], ...businessZones]
 const dateField = (name: string, label: string, value: string) => `<label>${label}<input type="datetime-local" name="${name}" value="${escape(value)}" step="60" aria-describedby="schedule-clock-help"></label>`
 const banner = (id: 'holiday' | 'promotion', label: string) => {
  const entry = automation?.banners.find(item => item.id === id)
  return `<fieldset><legend>${label} banner</legend><label>${label} banner<input name="automation.${id}.text" value="${escape(entry?.text ?? '')}" aria-describedby="schedule-banner-help"></label>${dateField(`automation.${id}.start`, `${label} starts`, entry?.start ?? '')}${dateField(`automation.${id}.end`, `${label} ends`, entry?.end ?? '')}</fieldset>`
 }
 return `<details class="site-fields" data-schedule-settings><summary>Schedules</summary><div class="edit-form"><p class="help">The owner approves these schedules by publishing the draft. Approved banners appear on the public site at their start and disappear at their end. Review reminders stay in this workspace; no email is sent.</p><label for="schedule-time-zone">Business time zone</label><select id="schedule-time-zone" name="automation.timeZone" aria-describedby="schedule-clock-help">${zones.map(([value, label]) => `<option value="${escape(value)}"${value === zone ? ' selected' : ''}>${escape(label)} (${escape(value)})</option>`).join('')}</select><p class="help" id="schedule-clock-help">All schedule times use this business time zone. Choose a different time if daylight saving makes a local time nonexistent or ambiguous.</p><p class="help" id="schedule-banner-help">Leave a banner's text blank to turn that schedule off. Add its start and end when entering text.</p>${banner('holiday', 'Holiday')}${banner('promotion', 'Promotion')}${dateField('automation.review.start', 'Quarterly review starts', automation?.review?.start ?? '')}<p class="help">Remind the team to review stale pages every three months from this start. Leave the review start blank to turn recurring reminders off.</p></div></details>`
}
