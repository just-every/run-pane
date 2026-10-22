import type { Site } from '../model'
import { escape } from './kit'

export function inquirySettings(site: Site): string {
 return `<label for="response-days">Reply window (business days)</label><input id="response-days" name="responseDays" type="number" min="1" max="10" step="1" value="${escape(site.responseDays ?? 1)}" aria-describedby="response-help"><p class="help" id="response-help">An enquiry with no reply after this many weekdays, counted in the business time zone from Schedules (US Eastern until one is set), reminds its owner, then the site owner. Publish to apply it to new enquiries.</p>`
}
