// 11 · Interlude (Saturday's class from overhead) and 12 · Owning it: four
// businesses' product objects over the one-line start.
import { eyebrow, heading, nb, ok, picture, tick } from './parts'

export function interlude(): string {
  return `<section class="pn-interlude" aria-label="Saturday Community Flow at Brightside Yoga">
  ${picture('interlude-plate', 'Overhead view of a yoga studio floor: a teacher on a pink mat and sixteen mats in four rows, fourteen with students and two empty.', 1536, 1024, { widths: [1152, 1536], sizes: '100vw', className: 'pn-interlude-plate' })}
  ${picture('interlude', '', 1536, 905, { widths: [768, 1152, 1536], sizes: '100vw', className: 'pn-interlude-art' })}
  ${picture('interlude-phone', '', 671, 905, { widths: [448, 671], sizes: '100vw', className: 'pn-interlude-phone' })}
  <p class="pn-interlude-card"><span>Saturday Community Flow · ${nb('9:00 AM')} · ${nb('14 of 16')}<small>Brightside Yoga · ${nb('Sat Oct 24')} · its first Saturday live</small></span>${tick()}</p>
</section>`
}

// The one start line every Run Edit Run page shows (the Copy button copies it), and the alternative for people who already have Node.
const START = 'curl -fsSL https://runeditrun.com/install.sh | sh -s -- dev just-every/run-pane'
const ALTERNATIVE = 'Already have Node 22 or later? npx -y @runeditrun/rer dev just-every/run-pane'
// Words stay whole when a line wraps, and the installer's `install.sh | sh` stays together.
const words = (line: string) => line.split(/(\S*install\.sh \| sh|\S+)/).map(part => {
  const pipe = /^(.*\/)(install\.sh \| sh)$/.exec(part)
  return pipe ? `<span class="pn-nb">${pipe[1]}</span><wbr><span class="pn-nb">${pipe[2]}</span>` : part.trim() ? `<span class="pn-nb">${part}</span>` : part
}).join('')

export function owning(): string {
  return `<section class="pn-sec pn-own" aria-labelledby="pn-own-title">
  <div class="pn-wrap">
    <div class="pn-split-head">
      <div>${eyebrow('sky', ['Owning it', 'October – November'])}${heading('pn-own-title', 'Every page, every version,', 'theirs.')}</div>
      <p class="pn-lede">Each business keeps every published version, restores one page in one action, takes everything out in open formats and closes the old site on its own day.</p>
    </div>
    <div class="pn-own-grid">
      <article class="pn-card pn-own-card pn-own-ortega"><div><p class="pn-biz pn-biz-ortega">Ortega Bakery</p>
        <p>${nb('Tue Oct 27')} · ${nb('4:12 PM')} · ${nb('/holiday-orders')} restored to Monday's version and republished ${nb('4:14 PM')} · the other 86 pages untouched ${ok} · 418 published versions since ${nb('Aug 18')}</p></div>
        <ol class="pn-revs" aria-label="Published versions"><li class="is-on"><span class="pn-doc" aria-hidden="true"></span>rev 418<span class="pn-revs-back" aria-hidden="true">↺</span></li><li><span class="pn-doc" aria-hidden="true"></span>rev 417</li><li><span class="pn-doc" aria-hidden="true"></span>rev 416</li></ol>
      </article>
      <article class="pn-card pn-own-card pn-own-kim"><div><p class="pn-biz pn-biz-kim">Kim Law</p><p class="pn-own-title">Export · ${nb('Fri Oct 30')}</p>
        <ul class="pn-files"><li><span class="pn-file">WXR</span><span>22 pages and 64 posts (WordPress WXR)</span></li><li><span class="pn-file">CSV</span><span>3 forms, 1,206 inquiries</span></li><li><span class="pn-file">ZIP</span><span>318 media files</span></li><li><span class="pn-file">HTML</span><span>a static copy of the live site ${ok}</span></li></ul></div>
      </article>
      <article class="pn-card pn-own-card pn-own-hollis"><div><p class="pn-biz pn-biz-hollis">Hollis &amp; Pine Florist</p><p class="pn-own-title">Old site kept until you close it</p>
        <p>Squarespace closed by June Hollis ${nb('Mon Nov 2')} · 14 days after cutover ${ok}</p></div>
        <div class="pn-oldsite">${picture('tile-hollis', 'The old Squarespace site of Hollis & Pine Florist', 201, 189)}<span class="pn-stamp">closed ${nb('Mon Nov 2')}</span></div>
      </article>
      <article class="pn-card pn-own-card pn-own-delgado"><div><p class="pn-biz pn-biz-delgado">Delgado Plumbing</p>
        <p>${nb('Thu Oct 29')} · Pane update applied · signature verified · health ${ok} · no plugins to update</p></div>
        <div class="pn-release" aria-label="Signed release note"><p class="pn-release-head">Pane update · release note</p><span class="pn-release-line"></span><span class="pn-release-line pn-short"></span><span class="pn-release-line"></span><p class="pn-release-sig">${tick('pn-tick-sm')}signature verified</p></div>
      </article>
    </div>
    <div class="pn-term" aria-label="Start Pane on your computer">
      <div class="pn-term-dots" aria-hidden="true"><i></i><i></i><i></i></div>
      <pre><code><span class="pn-term-prompt" aria-hidden="true">$ </span>${words(START)}
<span class="pn-term-note"># ${words('installs rer, then gets and starts Pane on your computer')}</span>
<span class="pn-term-note"># ${words(ALTERNATIVE)}</span></code></pre>
      <button class="pn-copy" type="button" data-copy="${START}">Copy</button>
    </div>
  </div>
</section>`
}
