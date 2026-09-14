/**
 * O-SAAR shared UI components (v3 inner pages)
 *
 * Static HTML pages use these class names directly. Helpers below are for
 * programmatic rendering or documentation — copy the returned HTML into pages.
 */

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * @param {{ eyebrow: string, title: string, lead?: string, accent?: string, variant?: 'maroon'|'cream', compact?: boolean, id?: string }} opts
 */
export function pageHero(opts) {
  const {
    eyebrow,
    title,
    lead = '',
    accent = '',
    variant = 'maroon',
    compact = false,
    id = 'page-hero-title',
  } = opts

  const titleHtml = accent
    ? esc(title).replace(esc(accent), `<em>${esc(accent)}</em>`)
    : esc(title)

  return `
<section class="page-hero page-hero--${variant}${compact ? ' page-hero--compact' : ''}" aria-labelledby="${id}">
  <div class="page-hero__atmosphere" aria-hidden="true">
    <span class="page-hero__glow page-hero__glow--1"></span>
    <span class="page-hero__glow page-hero__glow--2"></span>
    <span class="page-hero__grain"></span>
    <span class="page-hero__dust page-hero__dust--1"></span>
    <span class="page-hero__dust page-hero__dust--2"></span>
    <span class="page-hero__dust page-hero__dust--3"></span>
    <span class="page-hero__dust page-hero__dust--4"></span>
    <svg class="page-hero__lotus" viewBox="0 0 48 28" width="80" height="46" aria-hidden="true">
      <path d="M24 26c-6-8-4-16 0-20 4 4 6 12 0 20z" fill="#D9B97C" opacity=".85"/>
      <path d="M24 26c-10-6-12-14-8-18 6 4 8 10 8 18z" fill="#C4A890" opacity=".55"/>
      <path d="M24 26c10-6 12-14 8-18-6 4-8 10-8 18z" fill="#7A2438" opacity=".28"/>
    </svg>
  </div>
  <div class="page-hero__inner">
    <p class="section-label section-label--light">
      <span class="section-label__text">${esc(eyebrow)}</span>
      <span class="section-label__mark" aria-hidden="true">+</span>
    </p>
    <h1 class="page-hero__title" id="${id}">${titleHtml}</h1>
    ${lead ? `<p class="page-hero__lead">${esc(lead)}</p>` : ''}
  </div>
</section>`.trim()
}

/**
 * @param {{ eyebrow: string, title: string, lead?: string, center?: boolean, light?: boolean, id?: string }} opts
 */
export function sectionHeader(opts) {
  const {
    eyebrow,
    title,
    lead = '',
    center = true,
    light = false,
    id = '',
  } = opts

  return `
<header class="section-header${center ? ' section-header--center' : ''}${light ? ' section-header--light' : ''}">
  <p class="section-label${light ? ' section-label--light' : ''}">
    <span class="section-label__text">${esc(eyebrow)}</span>
    <span class="section-label__mark" aria-hidden="true">+</span>
  </p>
  <div class="section-header__divider" aria-hidden="true">
    <span></span>
    <svg viewBox="0 0 48 28" width="20" height="12">
      <path d="M24 26c-6-8-4-16 0-20 4 4 6 12 0 20z" fill="#D9B97C" opacity=".85"/>
    </svg>
    <span></span>
  </div>
  <h2 class="section-header__title"${id ? ` id="${id}"` : ''}>${esc(title)}</h2>
  ${lead ? `<p class="section-header__lead">${esc(lead)}</p>` : ''}
</header>`.trim()
}

/**
 * @param {{ icon?: string, label: string, cream?: boolean }} opts
 */
export function featureBadge(opts) {
  const { icon = '✓', label, cream = false } = opts
  return `<li class="feature-badge${cream ? ' feature-badge--cream' : ''}">
  <span class="feature-badge__icon" aria-hidden="true">${icon}</span>
  ${esc(label)}
</li>`
}
