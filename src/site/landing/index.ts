import metadata from '../../../package.json'
import { closingDrawing, featureDrawings, heroDrawing } from './illustrations'
import { icon } from './icons'

const source = metadata.repository

const features = [
  ['free', '100% free.', 'Free as in code and free as in cost. MIT licensed, with no fees.'],
  ['versions', 'Every version, kept.', 'Each publish saves the whole site. Restore an earlier version in one step.'],
  ['messages', 'Messages come to you.', 'Visitors write from your Contact page. You read them in your inbox.'],
  ['visits', 'Visits, without cookies.', 'See which pages people read. No cookies and no visitor IDs.'],
  ['agent', 'Let your agent do the typing.', 'Your agent prepares the draft. You preview it and publish.'],
] as const

const included = [
  ['page', 'Five pages: Home, About, Services, Hours and Contact.'],
  ['clock', 'Every publish recorded with who and when.'],
  ['people', 'Admins prepare, members read, owners publish.'],
  ['upload', 'Move in from a site export, as a draft.'],
  ['bin', "Erase a message and its sender's details."],
  ['archive', 'Back up and restore your site and inbox.'],
] as const

function actions(): string {
  return '<div class="lp-actions"><a class="lp-run" href="/run">Run Pane <span aria-hidden="true">→</span></a><a class="lp-run" href="https://demo.run-pane.com/">Try the demo</a><a class="lp-docs" href="/docs">Read the docs</a></div>'
}

/** Body fragment for the public run site. Load /design-assets/landing.css. */
export function landingHtml(): string {
  return `<div class="lp-page">
    <header class="lp-header lp-container">
      <a class="lp-brand" href="/" aria-label="Pane home"><img src="/brand/mark.svg" width="28" height="28" alt="">Pane</a>
      <nav aria-label="Main navigation"><a href="/docs">Docs</a><a href="/contract">Contract</a><a href="${source}">Source</a></nav>
    </header>
    <main class="lp-container">
      <section class="lp-hero" aria-labelledby="lp-title">
        <h1 id="lp-title"><span>Your website,</span> <span>open for business.</span></h1>
        <p class="lp-lead">Five pages and a contact inbox. Preview every change, publish, and roll back in one step.</p>
        <p class="lp-alternative">100% free, open source alternative to <strong>Squarespace</strong> and <strong>Wix</strong></p>
        ${actions()}
        <p class="lp-fine">Free and open source, MIT licensed.</p>
        ${heroDrawing()}
      </section>
      <div class="lp-features">${features.map(([id, heading, body], index) => `<section class="lp-feature${index % 2 ? ' lp-feature-reverse' : ''}" id="${id}" aria-labelledby="lp-${id}-title"><div class="lp-feature-copy"><h2 id="lp-${id}-title">${heading}</h2><p>${body}</p></div>${featureDrawings[id]}</section>`).join('')}</div>
      <section class="lp-included" id="included" aria-labelledby="lp-included-title"><h2 id="lp-included-title">Also included</h2><ul>${included.map(([name, text]) => `<li>${icon(name)}<p>${text}</p></li>`).join('')}</ul></section>
      <section class="lp-closing" id="run" aria-labelledby="lp-closing-title">${closingDrawing()}<h2 id="lp-closing-title"><span>Your website,</span> <span>open for business.</span></h2>${actions()}</section>
    </main>
    <footer class="lp-footer lp-container"><img src="/brand/mark.svg" width="22" height="22" alt=""><p>Pane <span>·</span> MIT licence <span>·</span> <a href="${source}">Source</a></p></footer>
  </div>`
}
