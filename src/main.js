import './style.css'
import { initIntro, markSiteBrowsedInTab, dismissIntroShell } from './intro.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Mark browsing as early as possible on every page
const isHome =
  (window.location.pathname.replace(/\/+$/, '') || '/') === '/' ||
  /index\.html$/i.test(window.location.pathname)

if (!isHome) {
  markSiteBrowsedInTab()
  dismissIntroShell()
}

initIntro()

const header = document.querySelector('.site-header')
const toggle = document.querySelector('.nav-toggle')
const nav = document.querySelector('.nav')
const discover = document.querySelector('.nav__discover')
const discoverTrigger = document.querySelector('.nav__discover-trigger')
const discoverMega = document.querySelector('.nav__mega')
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

let discoverCloseTimer = null

const setDiscoverOpen = (open) => {
  if (!discover || !discoverTrigger) return
  discover.classList.toggle('is-open', open)
  discoverTrigger.setAttribute('aria-expanded', String(open))
  if (open && header) header.classList.remove('is-hidden')
}

const closeDiscover = () => {
  clearTimeout(discoverCloseTimer)
  setDiscoverOpen(false)
}

const openDiscover = () => {
  clearTimeout(discoverCloseTimer)
  setDiscoverOpen(true)
}

const scheduleCloseDiscover = () => {
  clearTimeout(discoverCloseTimer)
  discoverCloseTimer = window.setTimeout(() => setDiscoverOpen(false), 160)
}

const revealHeader = () => {
  if (!header) return
  requestAnimationFrame(() => {
    header.classList.add('is-ready')
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', revealHeader, { once: true })
} else {
  revealHeader()
}

if (toggle && nav) {
  const setOpen = (open) => {
    nav.classList.toggle('is-open', open)
    toggle.setAttribute('aria-expanded', String(open))
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
    if (open && header) header.classList.remove('is-hidden')
    if (!open) closeDiscover()
  }

  toggle.addEventListener('click', () => {
    setOpen(!nav.classList.contains('is-open'))
  })

  nav.querySelectorAll('a.nav__link, a.nav__cta').forEach((link) => {
    link.addEventListener('click', () => setOpen(false))
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (discover?.classList.contains('is-open')) {
        closeDiscover()
        discoverTrigger?.focus()
      } else {
        setOpen(false)
      }
    }
  })
}

if (discover && discoverTrigger && discoverMega) {
  discoverTrigger.addEventListener('click', (event) => {
    event.preventDefault()
    setDiscoverOpen(!discover.classList.contains('is-open'))
  })

  discover.addEventListener('mouseenter', openDiscover)
  discover.addEventListener('mouseleave', scheduleCloseDiscover)

  discoverTrigger.addEventListener('focus', openDiscover)

  document.addEventListener('click', (event) => {
    if (!discover.contains(event.target)) closeDiscover()
  })

  discoverMega.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      closeDiscover()
      if (nav?.classList.contains('is-open') && toggle) {
        nav.classList.remove('is-open')
        toggle.setAttribute('aria-expanded', 'false')
        toggle.setAttribute('aria-label', 'Open menu')
      }
    })
  })
}

/* Floating glass navbar — denser glass on scroll; hide on scroll down, show on scroll up */
if (header) {
  let lastY = window.scrollY
  let ticking = false

  const isNavBusy = () =>
    Boolean(nav?.classList.contains('is-open') || discover?.classList.contains('is-open'))

  const showHeader = () => {
    header.classList.remove('is-hidden')
  }

  const hideHeader = () => {
    if (isNavBusy()) return
    header.classList.add('is-hidden')
    closeDiscover()
  }

  const syncHeader = () => {
    ticking = false

    const y = Math.max(0, window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0)
    const delta = y - lastY
    lastY = y

    header.classList.toggle('is-scrolled', y > 12)

    /* Always visible at top or while menus are open */
    if (y < 48 || isNavBusy()) {
      showHeader()
      return
    }

    /* Ignore micro jitter */
    if (Math.abs(delta) < 4) return

    /* Scroll down → hide once past hero strip */
    if (delta > 0 && y > 72) {
      hideHeader()
      return
    }

    /* Scroll up → reveal */
    if (delta < 0) {
      showHeader()
    }
  }

  const onScroll = () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(syncHeader)
  }

  /* Keep visible while focusing inside the bar, but never block scroll-hide */
  header.addEventListener('focusin', showHeader)

  syncHeader()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', () => {
    lastY = Math.max(0, window.scrollY || 0)
    syncHeader()
  }, { passive: true })
}

const reveals = document.querySelectorAll('.reveal')

if (reveals.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -5% 0px' },
  )

  reveals.forEach((el) => observer.observe(el))
} else {
  reveals.forEach((el) => el.classList.add('is-visible'))
}

const parallaxRoot = document.querySelector('[data-parallax]')

if (parallaxRoot && !prefersReducedMotion) {
  let frame = 0

  const onMove = (event) => {
    const rect = parallaxRoot.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5

    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      parallaxRoot.style.setProperty('--parallax-x', `${x * 12}px`)
      parallaxRoot.style.setProperty('--parallax-y', `${y * 10}px`)
    })
  }

  const onLeave = () => {
    parallaxRoot.style.setProperty('--parallax-x', '0px')
    parallaxRoot.style.setProperty('--parallax-y', '0px')
  }

  parallaxRoot.addEventListener('pointermove', onMove)
  parallaxRoot.addEventListener('pointerleave', onLeave)
}

const whoSection = document.querySelector('[data-who]')

if (whoSection && !prefersReducedMotion && window.matchMedia('(pointer: fine)').matches) {
  let whoFrame = 0

  const onWhoMove = (event) => {
    const rect = whoSection.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5

    cancelAnimationFrame(whoFrame)
    whoFrame = requestAnimationFrame(() => {
      whoSection.style.setProperty('--who-mx', x.toFixed(3))
      whoSection.style.setProperty('--who-my', y.toFixed(3))
    })
  }

  const onWhoLeave = () => {
    cancelAnimationFrame(whoFrame)
    whoSection.style.setProperty('--who-mx', '0')
    whoSection.style.setProperty('--who-my', '0')
  }

  whoSection.addEventListener('pointermove', onWhoMove)
  whoSection.addEventListener('pointerleave', onWhoLeave)
}

const heroSection = document.querySelector('.hero')
const heroLayers = heroSection ? [...heroSection.querySelectorAll('[data-hpar]')] : []

if (
  heroSection &&
  heroLayers.length &&
  !prefersReducedMotion &&
  window.matchMedia('(pointer: fine)').matches
) {
  let hx = 0
  let hy = 0
  let cx = 0
  let cy = 0
  let intensity = 0
  let heroFrame = 0

  const applyHero = () => {
    heroLayers.forEach((layer) => {
      const depth = parseFloat(layer.dataset.hpar) || 0
      layer.style.transform = `translate3d(${(hx * depth).toFixed(2)}px, ${(hy * depth).toFixed(2)}px, 0)`
    })
    heroSection.style.setProperty('--cx', `${cx.toFixed(1)}px`)
    heroSection.style.setProperty('--cy', `${cy.toFixed(1)}px`)
    heroSection.style.setProperty('--hnx', hx.toFixed(3))
    heroSection.style.setProperty('--hny', hy.toFixed(3))
    heroSection.style.setProperty('--heart-intensity', intensity.toFixed(3))
  }

  const onHeroMove = (event) => {
    const rect = heroSection.getBoundingClientRect()
    cx = event.clientX - rect.left
    cy = event.clientY - rect.top
    hx = (cx / rect.width - 0.5) * 2
    hy = (cy / rect.height - 0.5) * 2

    // Warm response when the cursor nears the figure's heart
    const heartX = rect.width * 0.72
    const heartY = rect.height * 0.5
    const dist = Math.hypot(cx - heartX, cy - heartY)
    intensity = Math.max(0, Math.min(1, 1 - dist / 320))

    heroSection.classList.add('is-pointer')
    cancelAnimationFrame(heroFrame)
    heroFrame = requestAnimationFrame(applyHero)
  }

  const onHeroLeave = () => {
    hx = 0
    hy = 0
    intensity = 0
    heroSection.classList.remove('is-pointer')
    cancelAnimationFrame(heroFrame)
    heroFrame = requestAnimationFrame(applyHero)
  }

  heroSection.addEventListener('pointermove', onHeroMove)
  heroSection.addEventListener('pointerleave', onHeroLeave)
}

const journeySection = document.querySelector('[data-journey]') || document.querySelector('.journey')
if (journeySection) {
  if (prefersReducedMotion) {
    journeySection.classList.add('is-drawn')
  } else if ('IntersectionObserver' in window) {
    const drawObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            journeySection.classList.add('is-drawn')
            drawObserver.disconnect()
          }
        })
      },
      { threshold: 0.22, rootMargin: '0px 0px -8% 0px' },
    )
    drawObserver.observe(journeySection)
  } else {
    journeySection.classList.add('is-drawn')
  }

  if (!prefersReducedMotion) {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const lerp = (a, b, t) => a + (b - a) * t
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

    const depthNodes = [...journeySection.querySelectorAll('[data-jy-depth]')].map((el) => ({
      el,
      depth: Number(el.dataset.jyDepth) || 2,
      mx: 0,
      my: 0,
      magnet: el.hasAttribute('data-jy-magnet'),
      cta: el.hasAttribute('data-jy-cta'),
    }))

    const ringHit = journeySection.querySelector('[data-jy-ring]')

    const state = {
      mx: 0.5,
      my: 0.5,
      tx: 0.5,
      ty: 0.5,
      path: 0,
      dest: 0,
      ring: 0,
      glow: 0,
      artX: 0,
      artY: 0,
      mistX: 0,
      mistY: 0,
      veilX: 0,
      veilY: 0,
      active: false,
      frame: 0,
      sparkAt: 0,
      sparks: 0,
    }

    const applyProps = () => {
      const s = journeySection.style
      s.setProperty('--jy-mx', state.mx.toFixed(4))
      s.setProperty('--jy-my', state.my.toFixed(4))
      s.setProperty('--jy-path', state.path.toFixed(3))
      s.setProperty('--jy-dest', state.dest.toFixed(3))
      s.setProperty('--jy-ring', state.ring.toFixed(3))
      s.setProperty('--jy-glow', state.glow.toFixed(3))
      s.setProperty('--jy-art-x', `${state.artX.toFixed(2)}px`)
      s.setProperty('--jy-art-y', `${state.artY.toFixed(2)}px`)
      s.setProperty('--jy-mist-x', `${state.mistX.toFixed(2)}px`)
      s.setProperty('--jy-mist-y', `${state.mistY.toFixed(2)}px`)
      s.setProperty('--jy-veil-x', `${state.veilX.toFixed(2)}px`)
      s.setProperty('--jy-veil-y', `${state.veilY.toFixed(2)}px`)
    }

    const spawnSpark = (clientX, clientY) => {
      const now = performance.now()
      if (state.sparks >= 3 || now - state.sparkAt < 140) return
      state.sparkAt = now
      state.sparks += 1

      const rect = journeySection.getBoundingClientRect()
      const spark = document.createElement('span')
      spark.className = 'journey__spark'
      spark.style.left = `${clientX - rect.left}px`
      spark.style.top = `${clientY - rect.top}px`
      spark.style.opacity = '0.22'
      journeySection.appendChild(spark)

      const life = 420 + Math.random() * 320
      const driftX = (Math.random() - 0.5) * 16
      const driftY = -6 - Math.random() * 12
      const start = now

      const tickSpark = (t) => {
        const p = clamp((t - start) / life, 0, 1)
        const ease = 1 - (1 - p) * (1 - p)
        spark.style.transform = `translate3d(${driftX * ease}px, ${driftY * ease}px, 0) scale(${1 - p * 0.45})`
        spark.style.opacity = String(0.22 * (1 - p))
        if (p < 1) {
          requestAnimationFrame(tickSpark)
        } else {
          spark.remove()
          state.sparks = Math.max(0, state.sparks - 1)
        }
      }
      requestAnimationFrame(tickSpark)
    }

    const tick = () => {
      state.mx = lerp(state.mx, state.tx, 0.08)
      state.my = lerp(state.my, state.ty, 0.08)

      const nx = (state.mx - 0.5) * 2
      const ny = (state.my - 0.5) * 2

      state.artX = lerp(state.artX, nx * 3.2, 0.07)
      state.artY = lerp(state.artY, ny * 2.4, 0.07)
      state.mistX = lerp(state.mistX, nx * 8, 0.06)
      state.mistY = lerp(state.mistY, ny * 6.5, 0.06)
      state.veilX = lerp(state.veilX, nx * 3.5, 0.07)
      state.veilY = lerp(state.veilY, ny * 2.8, 0.07)

      if (canHover && state.active) {
        const sideBias = clamp(nx, -1, 1)
        const pathTarget = sideBias < -0.08 ? clamp(-sideBias, 0, 1) : sideBias > 0.08 ? 0 : 0.15
        const destTarget = sideBias > 0.08 ? clamp(sideBias, 0, 1) : sideBias < -0.08 ? 0 : 0.15
        const center = 1 - Math.min(1, Math.hypot(nx, ny) / 0.55)
        const ringTarget = clamp(center * 0.85 + (ringHit?.matches(':hover') ? 0.35 : 0), 0, 1)

        state.path = lerp(state.path, pathTarget, 0.06)
        state.dest = lerp(state.dest, destTarget, 0.06)
        state.ring = lerp(state.ring, ringTarget, 0.08)
        state.glow = lerp(state.glow, 0.55 + center * 0.45, 0.08)
      } else if (!canHover) {
        const t = performance.now() * 0.00022
        state.tx = 0.5 + Math.sin(t) * 0.08
        state.ty = 0.5 + Math.cos(t * 0.85) * 0.06
        state.path = lerp(state.path, 0.12, 0.04)
        state.dest = lerp(state.dest, 0.12, 0.04)
        state.ring = lerp(state.ring, 0.2 + Math.sin(t * 1.4) * 0.08, 0.04)
        state.glow = lerp(state.glow, 0.28, 0.04)
      } else {
        state.path = lerp(state.path, 0, 0.05)
        state.dest = lerp(state.dest, 0, 0.05)
        state.ring = lerp(state.ring, 0, 0.05)
        state.glow = lerp(state.glow, 0, 0.06)
      }

      applyProps()

      const rect = journeySection.getBoundingClientRect()
      const cursorX = rect.left + state.mx * rect.width
      const cursorY = rect.top + state.my * rect.height

      depthNodes.forEach((node) => {
        const depth = node.depth
        let ox = nx * depth
        let oy = ny * depth * 0.85

        if (canHover && state.active && (node.magnet || node.cta)) {
          const box = node.el.getBoundingClientRect()
          const cx = box.left + box.width * 0.5
          const cy = box.top + box.height * 0.5
          const dx = cursorX - cx
          const dy = cursorY - cy
          const dist = Math.hypot(dx, dy)
          const radius = node.cta ? 120 : 160
          const strength = dist < radius ? 1 - dist / radius : 0
          const pull = node.cta ? 3.2 : 4.2
          ox += (dx / (dist || 1)) * pull * strength
          oy += (dy / (dist || 1)) * pull * strength
          node.el.classList.toggle('is-near', strength > 0.35)
        } else if (node.magnet || node.cta) {
          node.el.classList.remove('is-near')
        }

        node.mx = lerp(node.mx, ox, 0.1)
        node.my = lerp(node.my, oy, 0.1)
        node.el.style.transform = `translate3d(${node.mx.toFixed(2)}px, ${node.my.toFixed(2)}px, 0)`
      })

      state.frame = requestAnimationFrame(tick)
    }

    const onPointerMove = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return
      const rect = journeySection.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      state.tx = clamp((event.clientX - rect.left) / rect.width, 0, 1)
      state.ty = clamp((event.clientY - rect.top) / rect.height, 0, 1)
      state.active = true
      journeySection.classList.add('is-cursor')
      spawnSpark(event.clientX, event.clientY)
    }

    const onPointerLeave = () => {
      state.active = false
      state.tx = 0.5
      state.ty = 0.5
      journeySection.classList.remove('is-cursor')
      depthNodes.forEach((node) => node.el.classList.remove('is-near'))
    }

    const setZoneFocus = (prop, value) => {
      if (prop === 'path') state.path = value
      if (prop === 'dest') state.dest = value
      if (prop === 'ring') state.ring = value
    }

    const bindZone = (selector, prop) => {
      const el = journeySection.querySelector(selector)
      if (!el) return
      el.addEventListener('focusin', () => setZoneFocus(prop, 1))
      el.addEventListener('focusout', () => setZoneFocus(prop, 0))
    }

    bindZone('[data-journey-zone="start"]', 'path')
    bindZone('[data-journey-zone="end"]', 'dest')
    bindZone('[data-journey-zone="ring"]', 'ring')

    if (canHover) {
      journeySection.addEventListener('pointermove', onPointerMove, { passive: true })
      journeySection.addEventListener('pointerleave', onPointerLeave)
    }

    state.frame = requestAnimationFrame(tick)

    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          cancelAnimationFrame(state.frame)
          state.frame = 0
        } else if (!state.frame) {
          state.frame = requestAnimationFrame(tick)
        }
      },
      { passive: true },
    )
  }
}

const storyBridge = document.querySelector('[data-story-bridge]')
if (storyBridge && !prefersReducedMotion) {
  const depthNodes = storyBridge.querySelectorAll('[data-depth]')
  let bridgeFrame = 0

  const syncBridge = () => {
    const rect = storyBridge.getBoundingClientRect()
    const vh = window.innerHeight || 1
    const start = vh * 0.85
    const end = -rect.height * 0.2
    const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)))
    storyBridge.style.setProperty('--bridge-progress', progress.toFixed(3))

    const shift = (vh * 0.5 - (rect.top + rect.height * 0.5)) * 0.04
    depthNodes.forEach((node) => {
      const depth = Number(node.getAttribute('data-depth') || 0.2)
      node.style.transform = `translate3d(0, ${shift * depth * 18}px, 0)`
    })
  }

  const onBridgeScroll = () => {
    cancelAnimationFrame(bridgeFrame)
    bridgeFrame = requestAnimationFrame(syncBridge)
  }

  syncBridge()
  window.addEventListener('scroll', onBridgeScroll, { passive: true })
  window.addEventListener('resize', onBridgeScroll)
} else if (storyBridge) {
  storyBridge.style.setProperty('--bridge-progress', '1')
}

/* Privacy Policy — sticky TOC active section */
const privacyToc = document.querySelector('[data-privacy-toc]')
if (privacyToc) {
  const tocLinks = [...privacyToc.querySelectorAll('.privacy-toc__link')]
  const sections = tocLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean)

  const setActive = (id) => {
    tocLinks.forEach((link) => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`)
    })
  }

  if (sections.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target?.id) setActive(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.35, 0.6] },
    )
    sections.forEach((section) => spy.observe(section))
  }

  tocLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'))
      if (!target) return
      event.preventDefault()
      const id = target.id
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })
      history.replaceState(null, '', `#${id}`)
      setActive(id)
    })
  })
}

/* FAQ page — search, categories, empty state */
const faqPage = document.querySelector('.faq')
if (faqPage) {
  const input = faqPage.querySelector('[data-faq-input]')
  const catButtons = [...faqPage.querySelectorAll('[data-faq-cat]')]
  const blocks = [...faqPage.querySelectorAll('[data-faq-block]')]
  const items = [...faqPage.querySelectorAll('[data-faq-item]')]
  const empty = faqPage.querySelector('[data-faq-empty]')
  let activeCat = 'all'

  const normalize = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9&\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const applyFaqFilters = () => {
    const query = normalize(input?.value || '')
    const terms = query ? query.split(' ').filter(Boolean) : []

    items.forEach((item) => {
      const haystack = normalize(`${item.getAttribute('data-faq-tags') || ''} ${item.textContent || ''}`)
      const matches = !terms.length || terms.every((term) => haystack.includes(term))
      item.classList.toggle('is-filtered-out', !matches)
    })

    blocks.forEach((block) => {
      const blockCats = (block.getAttribute('data-faq-cats') || '')
        .split(/\s+/)
        .filter(Boolean)
      const catOk = activeCat === 'all' || blockCats.includes(activeCat)
      const blockItems = [...block.querySelectorAll('[data-faq-item]')]
      let shouldShow = catOk

      if (blockItems.length) {
        shouldShow = catOk && blockItems.some((item) => !item.classList.contains('is-filtered-out'))
      } else if (terms.length) {
        shouldShow = false
      }

      block.classList.toggle('faq-block-hidden', !shouldShow)
    })

    const anyVisible = items.some(
      (item) =>
        !item.classList.contains('is-filtered-out') &&
        !item.closest('.faq-block-hidden'),
    )

    if (empty) {
      empty.hidden = !(terms.length && !anyVisible)
    }
  }

  catButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeCat = button.getAttribute('data-faq-cat') || 'all'
      catButtons.forEach((other) => {
        other.classList.toggle('is-active', other === button)
      })
      applyFaqFilters()
    })
  })

  input?.addEventListener('input', applyFaqFilters)
}

/* Testimonials — rotate, moments line, light parallax */
const voicesRotate = document.querySelector('[data-voices-rotate]')
if (voicesRotate) {
  const slides = [...voicesRotate.querySelectorAll('[data-rotate-slide]')]
  const dots = [...voicesRotate.querySelectorAll('[data-rotate-progress] span')]
  const prev = voicesRotate.querySelector('[data-rotate-prev]')
  const next = voicesRotate.querySelector('[data-rotate-next]')
  let index = 0
  let timer = 0

  const show = (nextIndex) => {
    index = (nextIndex + slides.length) % slides.length
    slides.forEach((slide, i) => {
      const active = i === index
      slide.classList.toggle('is-active', active)
      slide.hidden = !active
    })
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index)
    })
  }

  const restart = () => {
    window.clearInterval(timer)
    if (prefersReducedMotion || slides.length < 2) return
    timer = window.setInterval(() => show(index + 1), 7000)
  }

  prev?.addEventListener('click', () => {
    show(index - 1)
    restart()
  })
  next?.addEventListener('click', () => {
    show(index + 1)
    restart()
  })

  // swipe on mobile when arrows hidden
  let touchX = 0
  voicesRotate.addEventListener(
    'touchstart',
    (event) => {
      touchX = event.changedTouches[0]?.clientX || 0
    },
    { passive: true },
  )
  voicesRotate.addEventListener(
    'touchend',
    (event) => {
      const dx = (event.changedTouches[0]?.clientX || 0) - touchX
      if (Math.abs(dx) < 40) return
      show(index + (dx < 0 ? 1 : -1))
      restart()
    },
    { passive: true },
  )

  show(0)
  restart()
}

const momentsTrack = document.querySelector('[data-moments-line]')
if (momentsTrack && 'IntersectionObserver' in window) {
  const momentsSpy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) momentsTrack.classList.add('is-drawn')
      })
    },
    { threshold: 0.45 },
  )
  momentsSpy.observe(momentsTrack)
}

const voicesParallax = document.querySelector('[data-voices-parallax]')
if (voicesParallax && !prefersReducedMotion && window.matchMedia('(min-width: 981px)').matches) {
  let frame = 0
  const onScroll = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const rect = voicesParallax.getBoundingClientRect()
      const offset = Math.max(-24, Math.min(24, (window.innerHeight * 0.4 - rect.top) * 0.04))
      voicesParallax.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
}

/* Newsletter — receive line draw */
const letterLine = document.querySelector('[data-letter-line]')
if (letterLine && 'IntersectionObserver' in window) {
  const letterSpy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) letterLine.classList.add('is-drawn')
      })
    },
    { threshold: 0.4 },
  )
  letterSpy.observe(letterLine)
}

/* Release — living editorial micro-interactions */
const initRelease = () => {
  const section = document.querySelector('[data-release]')
  if (!section) return

  const desktopMq = window.matchMedia('(min-width: 861px)')
  let scrollRaf = 0
  let cursorRaf = 0
  let cursorX = 0.5
  let cursorY = 0.5
  let targetX = 0.5
  let targetY = 0.5

  const updateScrollProgress = () => {
    scrollRaf = 0
    const rect = section.getBoundingClientRect()
    const view = window.innerHeight || 1
    const total = rect.height + view
    const traveled = view - rect.top
    const progress = Math.max(0, Math.min(1, traveled / total))
    section.style.setProperty('--scroll', progress.toFixed(4))
  }

  const onScroll = () => {
    if (prefersReducedMotion) return
    if (scrollRaf) return
    scrollRaf = requestAnimationFrame(updateScrollProgress)
  }

  const tickCursor = () => {
    cursorRaf = 0
    cursorX += (targetX - cursorX) * 0.1
    cursorY += (targetY - cursorY) * 0.1
    section.style.setProperty('--rx', cursorX.toFixed(4))
    section.style.setProperty('--ry', cursorY.toFixed(4))
    if (Math.abs(targetX - cursorX) > 0.001 || Math.abs(targetY - cursorY) > 0.001) {
      cursorRaf = requestAnimationFrame(tickCursor)
    }
  }

  const onPointerMove = (event) => {
    if (prefersReducedMotion || !desktopMq.matches) return
    const rect = section.getBoundingClientRect()
    if (rect.height <= 0) return
    targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    targetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    section.classList.add('is-cursor')
    if (!cursorRaf) cursorRaf = requestAnimationFrame(tickCursor)
  }

  const onPointerLeave = () => {
    section.classList.remove('is-cursor')
    targetX = 0.5
    targetY = 0.5
    if (!cursorRaf) cursorRaf = requestAnimationFrame(tickCursor)
  }

  if (!prefersReducedMotion) {
    updateScrollProgress()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
  } else {
    section.style.setProperty('--scroll', '0.45')
  }

  const syncDesktopInteraction = () => {
    if (prefersReducedMotion) return
    section.removeEventListener('pointermove', onPointerMove)
    section.removeEventListener('pointerleave', onPointerLeave)
    if (desktopMq.matches) {
      section.addEventListener('pointermove', onPointerMove, { passive: true })
      section.addEventListener('pointerleave', onPointerLeave)
    } else {
      section.classList.remove('is-cursor')
      section.style.setProperty('--rx', '0.5')
      section.style.setProperty('--ry', '0.5')
    }
  }

  syncDesktopInteraction()
  if (typeof desktopMq.addEventListener === 'function') {
    desktopMq.addEventListener('change', syncDesktopInteraction)
  }

  const tiltCards = section.querySelectorAll('[data-release-tilt]')
  const resetTilt = (card) => {
    card.classList.remove('is-tilting')
    gsap.to(card, {
      '--tilt-x': '0deg',
      '--tilt-y': '0deg',
      '--tilt-lift': '0px',
      '--sheen-x': '50%',
      '--sheen-y': '50%',
      duration: 0.7,
      ease: 'power3.out',
      overwrite: 'auto',
    })
  }

  const attachTilt = () => {
    if (prefersReducedMotion || !desktopMq.matches) {
      tiltCards.forEach(resetTilt)
      return
    }
    tiltCards.forEach((card) => {
      if (card.dataset.tiltBound === '1') return
      card.dataset.tiltBound = '1'
      card.addEventListener('pointerenter', () => card.classList.add('is-tilting'))
      card.addEventListener('pointerleave', () => resetTilt(card))
      card.addEventListener(
        'pointermove',
        (event) => {
          if (!desktopMq.matches) return
          const rect = card.getBoundingClientRect()
          const px = (event.clientX - rect.left) / Math.max(rect.width, 1)
          const py = (event.clientY - rect.top) / Math.max(rect.height, 1)
          gsap.to(card, {
            '--tilt-x': `${((0.5 - py) * 8).toFixed(2)}deg`,
            '--tilt-y': `${((px - 0.5) * 10).toFixed(2)}deg`,
            '--tilt-lift': '-7px',
            '--sheen-x': `${(px * 100).toFixed(1)}%`,
            '--sheen-y': `${(py * 100).toFixed(1)}%`,
            duration: 0.45,
            ease: 'power3.out',
            overwrite: 'auto',
          })
        },
        { passive: true },
      )
    })
  }

  attachTilt()

  const canvas = section.querySelector('[data-release-particles]')
  let particleRaf = 0

  const initParticles = () => {
    if (!canvas || prefersReducedMotion || !desktopMq.matches) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let ctx = canvas.getContext('2d')
    const resize = () => {
      const rect = section.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    const area = Math.max(1, section.clientWidth * section.clientHeight)
    const count = Math.min(120, Math.max(80, Math.floor(area / 12000)))
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * section.clientWidth,
      y: Math.random() * section.clientHeight,
      r: 0.55 + Math.random() * 1.35,
      vx: -0.07 + Math.random() * 0.14,
      vy: -0.1 - Math.random() * 0.16,
      a: 0.07 + Math.random() * 0.2,
    }))

    const tick = () => {
      particleRaf = 0
      if (!ctx) return
      const w = section.clientWidth
      const h = section.clientHeight
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -4) {
          p.y = h + 4
          p.x = Math.random() * w
        }
        if (p.x < -4) p.x = w + 4
        if (p.x > w + 4) p.x = -4
        ctx.beginPath()
        ctx.fillStyle = `rgba(224, 188, 120, ${p.a})`
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      particleRaf = requestAnimationFrame(tick)
    }
    particleRaf = requestAnimationFrame(tick)
  }

  initParticles()

  const butterfly = section.querySelector('[data-release-butterfly]')
  const flyButterfly = () => {
    if (!butterfly || prefersReducedMotion || !desktopMq.matches) return
    const w = section.clientWidth
    const h = section.clientHeight
    const startY = h * (0.3 + Math.random() * 0.3)
    const midY = startY - h * 0.08
    const endY = h * (0.28 + Math.random() * 0.35)

    gsap.killTweensOf(butterfly)
    gsap.set(butterfly, { x: -48, y: startY, opacity: 0, rotate: -6 })
    gsap
      .timeline({
        onComplete: () => gsap.delayedCall(9 + Math.random() * 9, flyButterfly),
      })
      .to(butterfly, { opacity: 0.55, duration: 0.9, ease: 'power2.out' })
      .to(
        butterfly,
        {
          keyframes: [
            { x: w * 0.28, y: midY, rotate: 4, duration: 4.5, ease: 'sine.inOut' },
            { x: w * 0.62, y: midY + 24, rotate: -3, duration: 4.5, ease: 'sine.inOut' },
            { x: w + 56, y: endY, rotate: 5, duration: 5, ease: 'sine.inOut' },
          ],
        },
        0,
      )
      .to(butterfly, { opacity: 0, duration: 1.1, ease: 'power2.in' }, '-=1.3')
  }

  const revealNodes = section.querySelectorAll('[data-reveal]')
  const markAll = () => {
    section.classList.add('is-ready')
    revealNodes.forEach((el) => el.classList.add('is-visible'))
  }

  if (prefersReducedMotion) {
    markAll()
    return
  }

  section.classList.add('is-ready')
  section.classList.add('is-gsap')
  gsap.set(revealNodes, { opacity: 0, y: 16, filter: 'blur(5px)' })

  ScrollTrigger.create({
    trigger: section,
    start: 'top 74%',
    once: true,
    onEnter: () => {
      gsap.to(revealNodes, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1.05,
        stagger: 0.09,
        ease: 'power3.out',
        onStart: markAll,
        onComplete: () => {
          section.querySelectorAll('[data-release-tilt]').forEach((el) => {
            gsap.set(el, { clearProps: 'transform,filter' })
          })
        },
      })
      gsap.delayedCall(1.3, flyButterfly)
    },
  })
}

initRelease()

/* Note — Cinematic founder composition (Ref2 exact) */
const initNote = () => {
  const section = document.querySelector('[data-note]')
  if (!section) return

  const desktopMq = window.matchMedia('(min-width: 861px)')
  let cursorRaf = 0
  let cursorX = 0.5
  let cursorY = 0.5
  let targetX = 0.5
  let targetY = 0.5
  let mothBoost = 1
  let waveBoost = 1
  let portraitBoost = 1
  let mothBoostT = 1
  let waveBoostT = 1
  let portraitBoostT = 1

  const mothStage = section.querySelector('.note__moth-stage')
  const wavesEl = section.querySelector('.note__waves')
  const heroEl = section.querySelector('.note__hero')

  const layers = Array.from(section.querySelectorAll('[data-note-layer]')).map((el) => ({
    el,
    depth: Number(el.getAttribute('data-note-layer')) || 0.05,
    zone: el.getAttribute('data-note-zone') || '',
  }))

  const revealOrder = ['portrait', 'credit', 'eyebrow', 'headline', 'lede', 'axioms', 'cta']
  const reveals = revealOrder
    .map((key) => section.querySelector(`[data-note-reveal="${key}"]`))
    .filter(Boolean)

  const zoneProximity = (el, nx, ny, radius = 0.28) => {
    if (!el) return 0
    const sec = section.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const cx = (r.left + r.width * 0.5 - sec.left) / Math.max(1, sec.width)
    const cy = (r.top + r.height * 0.5 - sec.top) / Math.max(1, sec.height)
    const dx = nx - cx
    const dy = ny - cy
    const d = Math.sqrt(dx * dx + dy * dy)
    return Math.max(0, 1 - d / radius)
  }

  const applyLayers = () => {
    const dx = cursorX - 0.5
    const dy = cursorY - 0.5
    layers.forEach(({ el, depth, zone }) => {
      let scale = depth >= 0.12 ? 34 : depth >= 0.08 ? 26 : depth >= 0.05 ? 18 : 12
      if (zone === 'moth') scale *= 1 + (mothBoost - 1) * 0.55
      if (zone === 'waves') scale *= 1 + (waveBoost - 1) * 0.45
      if (zone === 'portrait') scale *= 1 + (portraitBoost - 1) * 0.35
      el.style.setProperty('--plx', `${(dx * depth * scale).toFixed(2)}px`)
      el.style.setProperty('--ply', `${(dy * depth * scale * 0.7).toFixed(2)}px`)
    })
    if (mothStage) mothStage.style.setProperty('--moth-boost', mothBoost.toFixed(3))
    if (wavesEl) wavesEl.style.setProperty('--wave-boost', waveBoost.toFixed(3))
    if (heroEl) heroEl.style.setProperty('--portrait-boost', portraitBoost.toFixed(3))
  }

  const tickCursor = () => {
    cursorRaf = 0
    cursorX += (targetX - cursorX) * 0.08
    cursorY += (targetY - cursorY) * 0.08
    mothBoost += (mothBoostT - mothBoost) * 0.1
    waveBoost += (waveBoostT - waveBoost) * 0.1
    portraitBoost += (portraitBoostT - portraitBoost) * 0.1
    section.style.setProperty('--nx', cursorX.toFixed(4))
    section.style.setProperty('--ny', cursorY.toFixed(4))
    if (desktopMq.matches && !prefersReducedMotion) applyLayers()
    const still =
      Math.abs(targetX - cursorX) > 0.001 ||
      Math.abs(targetY - cursorY) > 0.001 ||
      Math.abs(mothBoostT - mothBoost) > 0.002 ||
      Math.abs(waveBoostT - waveBoost) > 0.002 ||
      Math.abs(portraitBoostT - portraitBoost) > 0.002
    if (still) cursorRaf = requestAnimationFrame(tickCursor)
  }

  const onPointerMove = (event) => {
    if (prefersReducedMotion || !desktopMq.matches) return
    const rect = section.getBoundingClientRect()
    if (rect.height <= 0) return
    targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    targetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))

    const nearMoth = zoneProximity(mothStage, targetX, targetY, 0.32)
    const nearWaves = zoneProximity(wavesEl, targetX, targetY, 0.4)
    const nearPortrait = zoneProximity(heroEl, targetX, targetY, 0.3)
    mothBoostT = 1 + nearMoth * 0.85
    waveBoostT = 1 + nearWaves * 0.7
    portraitBoostT = 1 + nearPortrait * 0.55

    if (!cursorRaf) cursorRaf = requestAnimationFrame(tickCursor)
  }

  const onPointerLeave = () => {
    targetX = 0.5
    targetY = 0.5
    mothBoostT = 1
    waveBoostT = 1
    portraitBoostT = 1
    if (!cursorRaf) cursorRaf = requestAnimationFrame(tickCursor)
  }

  const syncDesktopInteraction = () => {
    if (prefersReducedMotion) return
    section.removeEventListener('pointermove', onPointerMove)
    section.removeEventListener('pointerleave', onPointerLeave)
    if (desktopMq.matches) {
      section.addEventListener('pointermove', onPointerMove, { passive: true })
      section.addEventListener('pointerleave', onPointerLeave)
    } else {
      section.style.setProperty('--nx', '0.5')
      section.style.setProperty('--ny', '0.5')
      layers.forEach(({ el }) => {
        el.style.setProperty('--plx', '0px')
        el.style.setProperty('--ply', '0px')
      })
    }
  }

  syncDesktopInteraction()
  if (typeof desktopMq.addEventListener === 'function') {
    desktopMq.addEventListener('change', syncDesktopInteraction)
  }

  const magnetic = section.querySelector('[data-note-magnetic]')
  if (magnetic && !prefersReducedMotion) {
    magnetic.addEventListener(
      'pointermove',
      (event) => {
        if (!desktopMq.matches) return
        const rect = magnetic.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width - 0.5
        const y = (event.clientY - rect.top) / rect.height - 0.5
        gsap.to(magnetic, {
          x: x * 10,
          y: y * 5,
          duration: 0.4,
          ease: 'power3.out',
          overwrite: 'auto',
        })
      },
      { passive: true },
    )
    magnetic.addEventListener('pointerleave', () => {
      gsap.to(magnetic, { x: 0, y: 0, duration: 0.65, ease: 'power3.out', overwrite: 'auto' })
    })
  }

  const canvas = section.querySelector('[data-note-particles]')
  if (canvas && !prefersReducedMotion && desktopMq.matches) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let ctx = canvas.getContext('2d')
    const resize = () => {
      const rect = section.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    const makeAmbient = (kind) => {
      const soft = kind === 'soft'
      return {
        kind,
        x: Math.random() * section.clientWidth,
        y: Math.random() * section.clientHeight,
        r: soft ? 1.5 + Math.random() * 3 : 0.4 + Math.random() * 1.35,
        vx: 0.012 + Math.random() * 0.04,
        vy: -0.018 - Math.random() * (soft ? 0.035 : 0.07),
        a: soft ? 0.035 + Math.random() * 0.06 : 0.07 + Math.random() * 0.15,
        depth: soft ? 0.3 + Math.random() * 0.35 : 0.65 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
      }
    }

    const makeTrail = () => ({
      kind: 'trail',
      t: Math.random(),
      r: 0.7 + Math.random() * 2.4,
      a: 0.14 + Math.random() * 0.4,
      age: Math.random(),
      wobble: 5 + Math.random() * 12,
      phase: Math.random() * Math.PI * 2,
      depth: 0.85 + Math.random() * 0.15,
    })

    const area = section.clientWidth * section.clientHeight
    const countSharp = Math.min(84, Math.max(42, Math.floor(area / 16000)))
    const countSoft = Math.min(32, Math.max(16, Math.floor(countSharp * 0.4)))
    const countTrail = Math.min(64, Math.max(36, Math.floor(countSharp * 0.75)))
    const particles = [
      ...Array.from({ length: countSharp }, () => makeAmbient('sharp')),
      ...Array.from({ length: countSoft }, () => makeAmbient('soft')),
      ...Array.from({ length: countTrail }, () => makeTrail()),
    ]

    let time = 0

    const trailPoint = (t, w, h, mothRect, secRect) => {
      const mx = mothRect
        ? mothRect.left - secRect.left + mothRect.width * 0.55
        : w * 0.86
      const my = mothRect
        ? mothRect.top - secRect.top + mothRect.height * 0.38
        : h * 0.14
      const sx = w * 0.52
      const sy = h * 0.62
      const cx = w * 0.74
      const cy = h * 0.3
      const u = 1 - t
      return {
        x: u * u * sx + 2 * u * t * cx + t * t * mx,
        y: u * u * sy + 2 * u * t * cy + t * t * my,
      }
    }

    const tick = () => {
      if (!ctx) return
      const w = section.clientWidth
      const h = section.clientHeight
      const secRect = section.getBoundingClientRect()
      const mothRect = mothStage ? mothStage.getBoundingClientRect() : null
      time += 0.016
      ctx.clearRect(0, 0, w, h)
      const driftX = (cursorX - 0.5) * 16
      const driftY = (cursorY - 0.5) * 10
      const mx = cursorX * w
      const my = cursorY * h
      const trailAmp = 0.85 + (mothBoost - 1) * 0.9

      for (const p of particles) {
        if (p.kind === 'trail') {
          p.age += 0.0048
          if (p.age > 1) {
            p.age = 0
            p.t = Math.random() * 0.85
            p.a = 0.14 + Math.random() * 0.4
            p.r = 0.55 + Math.random() * 2.6
          }
          const prog = Math.min(1, p.t + p.age * 0.35)
          const pt = trailPoint(prog, w, h, mothRect, secRect)
          const wob =
            Math.sin(time * 1.7 + p.phase) * p.wobble * (1 - prog) +
            Math.cos(time * 1.15 + p.phase * 0.7) * (p.wobble * 0.45)
          const px = pt.x + wob + driftX * p.depth
          const py = pt.y + wob * 0.55 + driftY * p.depth
          const fade = Math.sin(p.age * Math.PI) * (0.35 + prog * 0.65) * trailAmp
          const alpha = p.a * fade
          const g = ctx.createRadialGradient(px, py, 0, px, py, p.r * 3.4)
          g.addColorStop(0, `rgba(255, 236, 200, ${alpha})`)
          g.addColorStop(0.45, `rgba(232, 200, 140, ${alpha * 0.55})`)
          g.addColorStop(1, 'rgba(224, 188, 120, 0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(px, py, p.r * 3.4, 0, Math.PI * 2)
          ctx.fill()
          continue
        }

        const fdx = p.x - mx
        const fdy = p.y - my
        const fdist = Math.sqrt(fdx * fdx + fdy * fdy) || 1
        if (fdist < 120) {
          const force = ((120 - fdist) / 120) * 0.55 * p.depth
          p.x += (fdx / fdist) * force
          p.y += (fdy / fdist) * force
        }

        p.x += p.vx * p.depth
        p.y += p.vy * p.depth
        p.x += 0.014 * p.depth
        p.x += Math.sin(time * 0.7 + p.phase) * 0.09 * p.depth
        if (p.y < -10) {
          p.y = h + 8
          p.x = Math.random() * w * 0.75
        }
        if (p.x > w + 10) {
          p.x = -8
          p.y = Math.random() * h
        }

        const px = p.x + driftX * p.depth
        const py = p.y + driftY * p.depth

        if (p.kind === 'soft') {
          const g = ctx.createRadialGradient(px, py, 0, px, py, p.r * 3.5)
          g.addColorStop(0, `rgba(224, 188, 120, ${p.a})`)
          g.addColorStop(1, 'rgba(224, 188, 120, 0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(px, py, p.r * 3.5, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.fillStyle = `rgba(240, 214, 160, ${p.a})`
          ctx.arc(px, py, p.r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  if (prefersReducedMotion) {
    section.classList.add('is-ready')
    reveals.forEach((el) => {
      el.style.opacity = '1'
    })
    return
  }

  gsap.set(reveals, { opacity: 0, y: 16, filter: 'blur(5px)' })
  const portrait = section.querySelector('[data-note-reveal="portrait"]')
  if (portrait) gsap.set(portrait, { y: 22 })

  const mothImg = section.querySelector('.note__moth')
  const mothGlow = section.querySelector('.note__moth-glow')
  const wavesPhoto = section.querySelector('.note__waves-photo')
  if (mothImg) gsap.set([mothImg, mothGlow].filter(Boolean), { opacity: 0 })
  if (wavesPhoto) gsap.set(wavesPhoto, { opacity: 0 })

  ScrollTrigger.create({
    trigger: section,
    start: 'top 72%',
    once: true,
    onEnter: () => {
      section.classList.add('is-ready')
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      if (wavesPhoto) {
        tl.to(
          wavesPhoto,
          {
            opacity: 0.88,
            duration: 1.4,
            ease: 'power2.out',
            onComplete: () => gsap.set(wavesPhoto, { clearProps: 'opacity' }),
          },
          0,
        )
      }
      if (mothImg) {
        tl.to(
          mothImg,
          {
            opacity: 1,
            duration: 1.3,
            ease: 'power2.out',
            onComplete: () => gsap.set(mothImg, { clearProps: 'opacity' }),
          },
          0.2,
        )
        if (mothGlow) {
          tl.to(
            mothGlow,
            {
              opacity: 1,
              duration: 1.15,
              ease: 'power2.out',
              onComplete: () => gsap.set(mothGlow, { clearProps: 'opacity' }),
            },
            0.35,
          )
        }
      }
      reveals.forEach((el, i) => {
        const isPortrait = el.getAttribute('data-note-reveal') === 'portrait'
        tl.to(
          el,
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: isPortrait ? 1.15 : 0.85,
            onComplete: () => {
              gsap.set(el, { clearProps: 'transform,filter' })
            },
          },
          i === 0 ? 0 : `-=${isPortrait ? 0.35 : 0.55}`,
        )
      })
    },
  })
}


initNote()


/* Approach — Our Approach to Therapy */
const initApproach = () => {
  const section = document.querySelector('[data-approach]')
  if (!section) return

  const desktopMq = window.matchMedia('(min-width: 861px)')
  let cursorRaf = 0
  let cursorX = 0.5
  let cursorY = 0.5
  let targetX = 0.5
  let targetY = 0.5

  const tickCursor = () => {
    cursorRaf = 0
    cursorX += (targetX - cursorX) * 0.08
    cursorY += (targetY - cursorY) * 0.08
    section.style.setProperty('--ax', cursorX.toFixed(4))
    section.style.setProperty('--ay', cursorY.toFixed(4))
    if (Math.abs(targetX - cursorX) > 0.001 || Math.abs(targetY - cursorY) > 0.001) {
      cursorRaf = requestAnimationFrame(tickCursor)
    }
  }

  const onPointerMove = (event) => {
    if (prefersReducedMotion || !desktopMq.matches) return
    const rect = section.getBoundingClientRect()
    if (rect.height <= 0) return
    targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    targetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    section.classList.add('is-cursor')
    if (!cursorRaf) cursorRaf = requestAnimationFrame(tickCursor)
  }

  const onPointerLeave = () => {
    section.classList.remove('is-cursor')
    targetX = 0.5
    targetY = 0.5
    if (!cursorRaf) cursorRaf = requestAnimationFrame(tickCursor)
  }

  const syncDesktopInteraction = () => {
    if (prefersReducedMotion) return
    section.removeEventListener('pointermove', onPointerMove)
    section.removeEventListener('pointerleave', onPointerLeave)
    if (desktopMq.matches) {
      section.addEventListener('pointermove', onPointerMove, { passive: true })
      section.addEventListener('pointerleave', onPointerLeave)
    } else {
      section.classList.remove('is-cursor')
      section.style.setProperty('--ax', '0.5')
      section.style.setProperty('--ay', '0.5')
    }
  }

  syncDesktopInteraction()
  if (typeof desktopMq.addEventListener === 'function') {
    desktopMq.addEventListener('change', syncDesktopInteraction)
  }

  const reveals = section.querySelectorAll('.reveal')
  const markReady = () => {
    section.classList.add('is-ready')
    reveals.forEach((el) => el.classList.add('is-visible'))
  }

  if (reveals.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          markReady()
          spy.disconnect()
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -6% 0px' },
    )
    spy.observe(section)
  } else {
    markReady()
  }
}

initApproach()

/* Breathing Sanctuary */
const initSanctuary = () => {
  const section = document.querySelector('[data-sanctuary]')
  if (!section) return

  const orb = section.querySelector('[data-sanctuary-orb]')
  const phaseEl = section.querySelector('[data-sanctuary-phase]')
  const beginBtn = section.querySelector('[data-sanctuary-begin]')
  const skipBtn = section.querySelector('[data-sanctuary-skip]')
  const dustHost = section.querySelector('[data-sanctuary-dust]')
  const moteHost = section.querySelector('[data-sanctuary-motes]')
  const chips = [...section.querySelectorAll('[data-sound]')]
  const desktopMq = window.matchMedia('(min-width: 861px)')

  const phases = [
    { id: 'inhale', label: 'Inhale', ms: 4000 },
    { id: 'hold', label: 'Hold', ms: 4000 },
    { id: 'exhale', label: 'Exhale', ms: 6000 },
    { id: 'rest', label: 'Rest', ms: 2000 },
  ]

  let running = false
  let phaseIndex = 0
  let phaseTimer = 0
  let cursorRaf = 0
  let cursorX = 0.5
  let cursorY = 0.45
  let targetX = 0.5
  let targetY = 0.45

  const seedDust = () => {
    if (!dustHost || prefersReducedMotion) return
    dustHost.innerHTML = ''
    const count = desktopMq.matches ? 42 : 18
    for (let i = 0; i < count; i += 1) {
      const mote = document.createElement('span')
      mote.className = 'sanctuary__mote'
      const size = 1 + Math.random() * 2.2
      const left = Math.random() * 100
      const top = Math.random() * 100
      const duration = 14 + Math.random() * 18
      const delay = -Math.random() * duration
      const opacity = 0.12 + Math.random() * 0.35
      const dx = (Math.random() - 0.5) * 28
      mote.style.cssText = `
        width:${size}px;height:${size}px;left:${left}%;top:${top}%;
        --mote-op:${opacity.toFixed(3)};--mote-dx:${dx.toFixed(1)}px;
        animation-duration:${duration.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s;
      `
      dustHost.appendChild(mote)
    }
  }

  const seedOrbMotes = () => {
    if (!moteHost) return
    moteHost.innerHTML = ''
    for (let i = 0; i < 12; i += 1) {
      const mote = document.createElement('span')
      mote.className = 'sanctuary__orb-mote'
      const angle = (i / 12) * Math.PI * 2
      const radius = 28 + (i % 3) * 10
      mote.dataset.baseX = String(50 + Math.cos(angle) * radius)
      mote.dataset.baseY = String(50 + Math.sin(angle) * radius)
      mote.dataset.spread = String(1 + (i % 4) * 0.12)
      mote.style.left = `${mote.dataset.baseX}%`
      mote.style.top = `${mote.dataset.baseY}%`
      mote.style.opacity = String(0.35 + (i % 3) * 0.15)
      moteHost.appendChild(mote)
    }
  }

  const syncOrbMotes = (phase) => {
    if (!moteHost) return
    moteHost.querySelectorAll('.sanctuary__orb-mote').forEach((mote) => {
      const baseX = Number(mote.dataset.baseX || 50)
      const baseY = Number(mote.dataset.baseY || 50)
      const spread = Number(mote.dataset.spread || 1)
      const factor = phase === 'inhale' || phase === 'hold' ? 1.18 * spread : phase === 'exhale' ? 0.82 : 1
      const x = 50 + (baseX - 50) * factor
      const y = 50 + (baseY - 50) * factor
      mote.style.transform = `translate(${(x - baseX).toFixed(2)}%, ${(y - baseY).toFixed(2)}%)`
      mote.style.opacity = phase === 'inhale' || phase === 'hold' ? '0.75' : '0.4'
    })
  }

  const setPhase = (phase) => {
    section.dataset.phase = phase.id
    if (orb) orb.dataset.phase = phase.id
    if (phaseEl) {
      phaseEl.classList.add('is-swap')
      window.setTimeout(() => {
        phaseEl.textContent = phase.label
        phaseEl.classList.remove('is-swap')
      }, 220)
    }
    syncOrbMotes(phase.id)
  }

  const clearPhaseTimer = () => {
    if (phaseTimer) {
      window.clearTimeout(phaseTimer)
      phaseTimer = 0
    }
  }

  const runPhase = () => {
    if (!running) return
    const phase = phases[phaseIndex]
    setPhase(phase)
    phaseTimer = window.setTimeout(() => {
      phaseIndex = (phaseIndex + 1) % phases.length
      runPhase()
    }, phase.ms)
  }

  const startBreathing = () => {
    if (prefersReducedMotion) {
      setPhase(phases[0])
      return
    }
    running = true
    section.classList.add('is-breathing')
    phaseIndex = 0
    if (beginBtn) beginBtn.querySelector('span').textContent = 'Continue Softly'
    runPhase()
  }

  const stopBreathing = () => {
    running = false
    clearPhaseTimer()
    section.classList.remove('is-breathing')
    setPhase({ id: 'rest', label: 'Rest', ms: 0 })
    if (beginBtn) beginBtn.querySelector('span').textContent = 'Begin Breathing'
  }

  beginBtn?.addEventListener('click', () => {
    if (running) return
    startBreathing()
  })

  skipBtn?.addEventListener('click', () => {
    stopBreathing()
    window.location.href = '/resources.html'
  })

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => {
        c.classList.toggle('is-active', c === chip)
        c.setAttribute('aria-pressed', c === chip ? 'true' : 'false')
      })
    })
  })

  const tickCursor = () => {
    cursorRaf = 0
    cursorX += (targetX - cursorX) * 0.06
    cursorY += (targetY - cursorY) * 0.06
    section.style.setProperty('--sx', cursorX.toFixed(4))
    section.style.setProperty('--sy', cursorY.toFixed(4))
    if (Math.abs(targetX - cursorX) > 0.001 || Math.abs(targetY - cursorY) > 0.001) {
      cursorRaf = requestAnimationFrame(tickCursor)
    }
  }

  const onPointerMove = (event) => {
    if (prefersReducedMotion || !desktopMq.matches) return
    const rect = section.getBoundingClientRect()
    if (rect.height <= 0) return
    targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    targetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    section.classList.add('is-cursor')
    if (!cursorRaf) cursorRaf = requestAnimationFrame(tickCursor)
  }

  const onPointerLeave = () => {
    section.classList.remove('is-cursor')
    targetX = 0.5
    targetY = 0.45
    if (!cursorRaf) cursorRaf = requestAnimationFrame(tickCursor)
  }

  const syncDesktop = () => {
    section.removeEventListener('pointermove', onPointerMove)
    section.removeEventListener('pointerleave', onPointerLeave)
    if (!prefersReducedMotion && desktopMq.matches) {
      section.addEventListener('pointermove', onPointerMove, { passive: true })
      section.addEventListener('pointerleave', onPointerLeave)
    }
  }

  seedDust()
  seedOrbMotes()
  syncDesktop()
  if (typeof desktopMq.addEventListener === 'function') {
    desktopMq.addEventListener('change', () => {
      seedDust()
      syncDesktop()
    })
  }

  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            section.classList.add('is-ready')
            spy.disconnect()
          }
        })
      },
      { threshold: 0.2 }
    )
    spy.observe(section)
  } else {
    section.classList.add('is-ready')
  }

  setPhase({ id: 'rest', label: 'Rest', ms: 0 })
}

initSanctuary()

const initMeetStatCounts = () => {
  const roots = document.querySelectorAll('[data-meet-stats]')
  if (!roots.length) return

  const animateCount = (el) => {
    const target = Number(el.getAttribute('data-count') || 0)
    if (!Number.isFinite(target) || target <= 0) {
      el.textContent = String(target || 0)
      return
    }

    if (prefersReducedMotion) {
      el.textContent = String(target)
      return
    }

    const duration = target >= 800 ? 1600 : 1200
    const start = performance.now()

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      el.textContent = String(Math.round(target * eased))
      if (t < 1) requestAnimationFrame(tick)
      else el.textContent = String(target)
    }

    requestAnimationFrame(tick)
  }

  const run = (root) => {
    if (root.dataset.counted === 'true') return
    root.dataset.counted = 'true'
    root.querySelectorAll('[data-count]').forEach(animateCount)
  }

  if (!('IntersectionObserver' in window)) {
    roots.forEach(run)
    return
  }

  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          run(entry.target)
          spy.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.35 },
  )

  roots.forEach((root) => spy.observe(root))
}

initMeetStatCounts()

