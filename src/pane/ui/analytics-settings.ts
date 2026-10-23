import type { Site } from '../model'
import { escape } from './kit'

export function analyticsSettings(site: Site): string {
  const vane = site.analytics?.vane
  return `<label for="analytics-vane-url">Vane address</label><input id="analytics-vane-url" name="analytics.vane.url" type="url" maxlength="200" placeholder="https://vane.example.com" value="${escape(vane?.origin ?? '')}" aria-describedby="analytics-help"><label for="analytics-vane-site">Vane site ID</label><input id="analytics-vane-site" name="analytics.vane.site" maxlength="64" autocomplete="off" value="${escape(vane?.site ?? '')}" aria-describedby="analytics-help"><label for="analytics-ga4">Google Analytics 4 measurement ID</label><input id="analytics-ga4" name="analytics.ga4" maxlength="20" placeholder="G-ABC123XYZ4" autocomplete="off" value="${escape(site.analytics?.ga4 ?? '')}" aria-describedby="analytics-help"><p class="help" id="analytics-help">Publish to connect. Vane is your own cookie-free analytics: its script loads on live pages and each conversion goal is sent to it as an event. Google Analytics 4 shows a choice banner, loads only after a visitor allows it, sends page views and goals, and never loads for visitors who send Global Privacy Control or Do Not Track. Leave a field empty to disconnect.</p>`
}
