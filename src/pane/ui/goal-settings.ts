import { goalsToText } from '../goals'
import type { Site } from '../model'
import { escape } from './kit'

export function goalSettings(site: Site): string {
 return `<label for="conversion-goals">Conversion goals</label><textarea id="conversion-goals" name="goals" rows="4" maxlength="2400" aria-describedby="goal-help">${escape(goalsToText(site.goals))}</textarea><p class="help" id="goal-help">One goal per line: name | type | page | site. Types are form (the page holding a contact form), phone, email and outbound; page limits where a click counts and site limits an outbound goal, such as example.com. Publish to start counting. Counts are totals by page, channel and campaign with no visitor identifiers.</p>`
}
