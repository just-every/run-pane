import type { Site } from '../model'
import { escape } from './kit'

export function trafficSettings(site: Site): string {
 return `<label for="analytics-campaigns">Analytics campaign labels</label><textarea id="analytics-campaigns" name="analyticsCampaigns" rows="3" maxlength="2600" aria-describedby="campaign-help">${escape((site.analyticsCampaigns ?? []).join('\n'))}</textarea><p class="help" id="campaign-help">Optional business campaign names, one per line. Use these labels in utm_campaign or utm_source links (case-insensitive). Publish to approve them; approved labels are public on live pages. Never enter a person's name, email, phone or customer ID. Unapproved campaign tags count separately with no text retained.</p>`
}
