// The run site's identity: the installed edition's, with the site's own tokens
// (public/site/theme.css) and floor art for Base's /run, /contract and not-found pages.
import type { EditionIdentity } from '../base/identity'
import { identity } from '../identity'

export const siteIdentity: EditionIdentity = {
  ...identity,
  tagline: 'Your website, finally yours. Pane builds your business site visually, moves it over with old links and email kept, and checks every inquiry reaches a person.',
  theme: '/site/theme.css',
  band: '/site/band.svg',
}
