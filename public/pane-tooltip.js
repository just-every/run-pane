// Icon-only controls carry data-tip: it shows after 300 ms of hover and at once on keyboard focus.
let tip, owner, timer
const hide = () => { clearTimeout(timer); tip?.remove(); tip = owner = undefined }
function show(target) {
 hide()
 owner = target
 tip = document.createElement('div')
 tip.className = 'pane-tooltip'
 tip.setAttribute('role', 'tooltip')
 tip.textContent = target.dataset.tip
 document.body.append(tip)
 const box = target.getBoundingClientRect(), width = tip.offsetWidth, height = tip.offsetHeight
 tip.style.left = Math.max(8, Math.min(innerWidth - width - 8, box.left + box.width / 2 - width / 2)) + 'px'
 tip.style.top = (box.bottom + height + 12 > innerHeight && box.top > height + 12 ? box.top - height - 6 : box.bottom + 6) + 'px'
}
const tipTarget = event => event.target.closest?.('[data-tip]')
document.addEventListener('pointerover', event => {
 const target = tipTarget(event)
 if (!target || target === owner || event.pointerType === 'touch') return
 clearTimeout(timer)
 timer = setTimeout(() => show(target), 300)
})
document.addEventListener('pointerout', event => { const target = tipTarget(event); if (target && !target.contains(event.relatedTarget)) hide() })
document.addEventListener('focusin', event => { const target = tipTarget(event); if (target?.matches(':focus-visible')) show(target) })
document.addEventListener('focusout', hide)
document.addEventListener('keydown', event => { if (event.key === 'Escape') hide() })
window.addEventListener('resize', () => { if (owner) show(owner) })

window.addEventListener('scroll', () => { if (owner) show(owner) }, true)
