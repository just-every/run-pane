// 03 · Build: Naomi's interview beside the site the agent drafted from it.
import { eyebrow, heading, nb, ok, picture, tick } from './parts'

const agent = (text: string, flag = false) =>
  `<li class="pn-msg pn-msg-agent"><span class="pn-avatar pn-avatar-mark" aria-hidden="true"><img src="/brand/mark.svg" width="27" height="20" alt=""></span><p>${flag ? '<span class="pn-flag" aria-hidden="true"></span>' : ''}${text}</p></li>`
const naomi = (text: string) => `<li class="pn-msg pn-msg-owner"><p>${text}</p><span class="pn-avatar pn-avatar-nf" aria-label="Naomi Fields">NF</span></li>`

const chip = (key: string, text: string) => `<span class="pn-src pn-src-${key}">${text}</span>`

export function interview(): string {
  return `<section class="pn-sec pn-build" aria-labelledby="pn-build-title">
  <div class="pn-wrap">
    <div class="pn-split-head">
      <div>${eyebrow('leaf', ['Build', 'Brightside Yoga', 'Mon Oct 12'])}${heading('pn-build-title', 'Twelve answers,', 'one whole site.')}</div>
      <p class="pn-lede">Naomi answered the agent's questions about her new studio. It checked each fact against her Google profile, asked about the one that disagreed, and drafted the site from what she confirmed.</p>
    </div>
    <div class="pn-build-grid">
      <article class="pn-card pn-chat" aria-label="Pane agent interview">
        <h3 class="pn-card-title">Pane agent · interview</h3>
        <ol class="pn-msgs">
          ${agent("What's the studio called, and where is it?")}
          ${naomi('Brightside Yoga, Asheville.')}
          ${agent('Which classes run each week?')}
          ${naomi("Eleven. They're already in Strap.")}
          ${agent(`Your Google profile opens Saturdays at ${nb('8:00 AM')}. You said 9:00. Which is right?`, true)}
          ${naomi('9:00. Please fix the profile.')}
          ${agent('Prices?')}
          ${naomi('Drop-in $20, ten classes $170, unlimited $129 a month.')}
        </ol>
        <p class="pn-chat-foot">12 of 12 answered · ${nb('8:05 – 8:21 AM')}</p>
        <p class="pn-chat-confirm">${tick('pn-tick-green')}<span>Confirmed ${nb('9:00 AM')} · profile update approved ${nb(`8:24 AM ${ok}`)}</span></p>
      </article>
      <article class="pn-card pn-draft" aria-label="The drafted site">
        <h3 class="pn-card-title">Draft ready ${nb('8:23 AM')} · built in ${nb('1 min 46 s')} · Studio template · 8 pages</h3>
        <ul class="pn-tabs" aria-label="Drafted pages"><li class="is-on">Home</li><li>Classes</li><li>Schedule</li><li>Teachers</li><li>Pricing</li><li>New here?</li><li>About</li><li>Contact</li></ul>
        <div class="pn-draft-body">
          <div class="pn-draft-site">
            <div class="pn-draft-chips pn-draft-chips-top">${chip('sat', 'Sat 9:00 AM · confirmed by Naomi')}${chip('price', "$20 drop-in · Naomi's answer")}</div>
            <div class="pn-yoga-site">
              <div class="pn-yoga-bar" aria-hidden="true"><span></span><i></i><i></i><i></i><i></i></div>
              <p class="pn-yoga-name">Brightside Yoga</p>
              <table class="pn-yoga-times"><tbody><tr><td>Sat</td><td>9:00 AM</td><td>Community Flow</td></tr><tr><td>Mon</td><td>6:00 PM</td><td>Slow Flow</td></tr><tr><td>Wed</td><td>7:00 AM</td><td>Sunrise</td></tr></tbody></table>
              <span class="pn-yoga-book">Book a class</span>
              ${picture('yoga', '', 200, 288, { className: 'pn-yoga-art' })}
            </div>
            <div class="pn-draft-chips pn-draft-chips-bottom">${chip('classes', '11 classes · Strap')}${chip('teachers', "4 teachers · Naomi's answer")}</div>
          </div>
          <div class="pn-draft-notes">
            <p class="pn-note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.5h8l4.5 4.5v14.5h-12.5z M14 2.5v4.5h4.5 M9 11h6 M9 14.5h6 M9 18h4"/></svg><span>31 facts · 24 from Naomi's answers · 6 from her Google profile · 1 from Strap (11 weekly classes) · every one confirmed ${ok}</span></p>
            <p class="pn-note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4.5h18v15h-18z M3 16l5-5 4 4 3-3 6 6 M15.5 9.5a1.5 1.5 0 1 0 0-.01"/></svg><span>3 photos marked placeholder → replaced with Naomi's own ${nb(`Tue Oct 13 ${ok}`)}</span></p>
          </div>
        </div>
      </article>
    </div>
    <p class="pn-strip">Draft in private preview until launch day · ${nb('Fri Oct 23')}</p>
  </div>
</section>`
}
