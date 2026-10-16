const navigation = document.querySelector('nav[aria-label="Workspace"]')
if (navigation) {
  const update = () => {
    const current = location.hash || '#overview'
    for (const link of navigation.querySelectorAll('a')) {
      if (link.hash === current) {
        link.setAttribute('aria-current', 'location')
        if (matchMedia('(max-width: 700px)').matches) {
          navigation.scrollTo({ left: link.offsetLeft - navigation.offsetLeft - 16, behavior: 'instant' })
        }
      } else link.removeAttribute('aria-current')
    }
  }
  update()
  addEventListener('hashchange', update)
}
