// 04 · Edit & publish: one editor window for Ortega Bakery's page 87 with the
// brick tray, six labelled blocks, the inspector, Elena's phone approval and the
// publish strip. Every block, field and chip is HTML; only the hands and the
// cake drawings are art.
import { eyebrow, heading, nb, ok, picture, tick } from './parts'

const block = (label: string, body: string, extra = '') => `<div class="pn-blk${extra ? ' ' + extra : ''}"><span class="pn-blk-tag">${label}</span>${body}</div>`
const field = (label: string, kind: 'text' | 'date' | 'select' | 'file') => `<span class="pn-field"><span class="pn-field-label">${label}</span>`
  + (kind === 'file' ? '<span class="pn-input pn-input-file">Choose file</span>' : `<span class="pn-input pn-input-${kind}"></span>`) + '</span>'
const cakes = [1, 2, 3, 4, 5, 6].map(n => picture(`cake-${n}`, '', 101, 74, { className: 'pn-cake' })).join('')

export function editor(): string {
  const canvas = [
    block('Hero · image background · focal point set · height Large', `<div class="pn-ed-hero"><div><p class="pn-ed-hero-title">Wedding cakes</p><span class="pn-btn-fu">Book a tasting</span></div>${picture('cake-hero', '', 180, 94, { className: 'pn-ed-hero-cake' })}</div>`),
    block('Columns 2:1', `<div class="pn-ed-cols"><div><p class="pn-ed-h">Tastings Tuesday to Saturday</p><span class="pn-ed-link">Wedding cake price list (PDF)</span></div><div class="pn-ed-slice">${picture('04-slice', '', 104, 82)}</div></div>`),
    block('Gallery · 18 photos · 3 columns · lightbox', `<div class="pn-ed-gal">${cakes}</div>`),
    block('Booking · Book a tasting · Dial · 45 min', `<div class="pn-ed-book">${['Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<span class="pn-day">${day}</span>`).join('')}<span class="pn-btn-fu">Book a tasting</span></div>`),
    block('Form · Cake inquiry', `<div class="pn-ed-form">${field('Names', 'text')}${field('Wedding date', 'date')}${field('Guests', 'select')}${field('Tiers', 'select')}${field('Flavors', 'select')}${field('Inspiration photo', 'file')}</div><p class="pn-ed-route">→ Orbit · owner Mateo Ortega</p>`),
    block('FAQ · 6 questions', `<div class="pn-ed-faq">${[62, 48].map(w => `<span class="pn-faq-row"><i style="width:${w}%"></i></span>`).join('')}<span class="pn-faq-more">and 4 more questions</span></div>`),
  ].join('')
  return `<section class="pn-sec pn-tint pn-edit" aria-labelledby="pn-edit-title">
  <div class="pn-wrap pn-center">
    ${eyebrow('fuchsia', ['Edit &amp; publish', 'Ortega Bakery', 'Thu Oct 22'])}
    ${heading('pn-edit-title', 'Page 87,', 'block by block.')}
    <p class="pn-lede">Mateo built the wedding cakes page by dropping in blocks, set its phone layout and sent it for review. Elena approved it from her phone, and it went live in English and Spanish.</p>
  </div>
  <div class="pn-wrap pn-ed-stage">
    <div class="pn-ed" aria-label="Pane editor: page 87 of Ortega Bakery">
      <div class="pn-ed-bar"><p><strong>Pane</strong> · ${nb('/catering/wedding-cakes')} · Ortega Bakery</p><span class="pn-seg"><span class="is-on">Desktop</span><span>Phone</span></span></div>
      <div class="pn-ed-cols3">
        <div class="pn-tray" aria-label="Blocks">
          <span class="pn-brick pn-brick-gallery pn-brick-held">gallery</span>
          <span class="pn-brick pn-brick-contact">contact form</span>
          <span class="pn-brick pn-brick-booking">booking</span>
          <span class="pn-brick pn-brick-map">map</span>
          <span class="pn-brick pn-brick-blog">blog</span>
          <span class="pn-brick pn-brick-menu">menu</span>
        </div>
        <div class="pn-canvas">${canvas}</div>
        <aside class="pn-insp" aria-label="Inspector">
          <p class="pn-insp-title">Section 1 · Hero</p>
          <table class="pn-insp-table"><tbody><tr><td colspan="2">Background image</td></tr><tr><td>Focal point</td><td>52% / 38%</td></tr><tr><td>Overlay</td><td>20%</td></tr><tr><td>Padding</td><td>Large</td></tr></tbody></table>
          <p class="pn-insp-chip">${tick()}<span>Phone layout · gallery 1 column · FAQ above form · 2 overrides</span></p>
          <p class="pn-insp-chip">${tick()}<span>18 of 18 images have alt text ${ok}</span></p>
          <p class="pn-insp-chip">${tick()}<span>Search title: Wedding Cakes in San Antonio&nbsp;| Ortega Bakery</span></p>
        </aside>
      </div>
      <div class="pn-ed-held" aria-hidden="true">${picture('04-hand', '', 365, 119)}<span>gallery</span></div>
    </div>
    <div class="pn-approve">
      ${picture('04-phone', '', 376, 433, { className: 'pn-approve-art' })}
      <div class="pn-approve-screen">
        <p class="pn-approve-app"><img src="/brand/mark.svg" width="27" height="20" alt="">Pane</p>
        <p class="pn-approve-msg">Mateo sent Wedding cakes for review · ${nb('3:10 PM')}</p>
        <div class="pn-approve-mini" aria-hidden="true"><span class="pn-mini-hero"><b>Wedding cakes</b><i></i></span><span class="pn-mini-gal"><i></i><i></i><i></i><i></i><i></i></span></div>
        <p class="pn-approve-btns"><span class="pn-btn-fu">Approve</span><span class="pn-btn-ghost">View</span></p>
        <p class="pn-approve-by">Approved by Elena Ortega · ${nb(`3:24 PM ${ok}`)}</p>
      </div>
    </div>
    <p class="pn-publish">${tick()}<span>Published ${nb('3:24 PM')} · revision 412 · page 87 of 87 · ${nb('/catering/wedding-cakes')} · Spanish ${nb('/es/catering/pasteles-de-boda')}, translated as a draft and approved ${ok}</span></p>
  </div>
</section>`
}
