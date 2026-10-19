// The run-site homepage (desk-approved page s1, 18 Oct 2026): five businesses
// through October 2026, one stage of owning a website per section.
import metadata from '../../../package.json'
import { closing, footer } from './closing'
import { directory } from './directory'
import { editor } from './editor'
import { email } from './email'
import { hero } from './hero'
import { inquiries } from './inquiries'
import { interview } from './interview'
import { launch } from './launch'
import { movein } from './movein'
import { interlude, owning } from './owning'
import { results } from './results'
import { search } from './search'

const source = metadata.repository

/** The Copy button on the start line; the command stays selectable without script. */
export const landingScript = "document.addEventListener('click',async e=>{const b=e.target.closest('.pn-copy');if(!b)return;try{await navigator.clipboard.writeText(b.dataset.copy);b.textContent='Copied';setTimeout(()=>{b.textContent='Copy'},1600)}catch{}})"

/** Body of the homepage. Load /site/theme.css, /site/site.css and /site/sections.css. */
export function landingHtml(): string {
  return `<div class="pn-page">${hero(source)}<main>${directory()}${interview()}${editor()}${movein()}${email()}${launch()}${inquiries()}${search()}${results()}${interlude()}${owning()}${closing()}</main>${footer(source)}</div>`
}
