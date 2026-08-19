let tip

function ensure() {
  if (tip && document.body.contains(tip)) return tip
  tip = document.createElement('div')
  tip.className = 'dashboard-tooltip'
  tip.setAttribute('role', 'tooltip')
  document.body.appendChild(tip)
  return tip
}

export function showTooltip(event, html) {
  const el = ensure()
  el.innerHTML = html
  el.classList.add('is-visible')
  moveTooltip(event)
}

export function moveTooltip(event) {
  const el = ensure()
  const pad = 14
  const rect = el.getBoundingClientRect()
  let x = event.clientX + 14
  let y = event.clientY + 14
  if (x + rect.width + pad > window.innerWidth) x = event.clientX - rect.width - 14
  if (y + rect.height + pad > window.innerHeight) y = event.clientY - rect.height - 14
  el.style.left = `${Math.max(pad, x)}px`
  el.style.top = `${Math.max(pad, y)}px`
}

export function hideTooltip() {
  if (tip) tip.classList.remove('is-visible')
}
