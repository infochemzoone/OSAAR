/**
 * O-SAAR cinematic intro — moth flight
 * Plays only on a fresh new-tab landing on the homepage.
 * Skips: refresh, Home clicks, any in-site navigation in the same tab.
 * Force with ?intro=1 — Dev: window.__osaarResetIntro()
 */

const INTRO_KEY = 'osaar-intro-tab'
const SITE_KEY = 'osaar-site-tab'
const DURATION = 6500
const REDUCE_DURATION = 1600

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
const isMobile = window.matchMedia('(max-width: 720px)').matches

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const lerp = (a, b, t) => a + (b - a) * t
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

const cubicBezier = (p0, p1, p2, p3, t) => {
  const u = 1 - t
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
}

const cubicBezierDerivative = (p0, p1, p2, p3, t) => {
  const u = 1 - t
  return 3 * u * u * (p1 - p0) + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2)
}

const shouldForceIntro = () => {
  try {
    const q = new URLSearchParams(window.location.search)
    return q.get('intro') === '1' || q.get('play-intro') === '1'
  } catch {
    return false
  }
}

const isPageReload = () => {
  try {
    const nav = performance.getEntriesByType('navigation')[0]
    if (nav) return nav.type === 'reload'
    if (typeof performance.navigation !== 'undefined') {
      return performance.navigation.type === 1
    }
  } catch {
    /* ignore */
  }
  return false
}

/** Came from another page on this same website (e.g. clicked Home). */
const isInternalNavigation = () => {
  try {
    if (!document.referrer) return false
    const ref = new URL(document.referrer)
    return ref.origin === window.location.origin
  } catch {
    return false
  }
}

const getFlag = (key) => {
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

const setFlag = (key) => {
  try {
    sessionStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
}

export const markSiteBrowsedInTab = () => {
  setFlag(SITE_KEY)
  setFlag(INTRO_KEY)
}

const hasBrowsedSiteInTab = () => getFlag(SITE_KEY) || getFlag(INTRO_KEY)

/** Hard-clear maroon intro shell so the real homepage is always reachable. */
export const dismissIntroShell = () => {
  document.documentElement.classList.remove('intro-pending', 'intro-active', 'intro-exit')
  document.body.classList.add('intro-complete')
  const root = document.querySelector('[data-osaar-intro]')
  if (!root) return
  root.hidden = true
  root.setAttribute('aria-hidden', 'true')
  root.classList.add('is-gone')
  root.classList.remove('is-exiting', 'is-done-instant', 'is-skipping', 'is-reduced')
}

/** Fresh external/new-tab home landing only. */
const shouldPlayIntro = () => {
  if (shouldForceIntro()) return true
  if (isPageReload()) return false
  if (isInternalNavigation()) return false
  if (hasBrowsedSiteInTab()) return false
  return true
}

window.__osaarResetIntro = () => {
  try {
    sessionStorage.removeItem(INTRO_KEY)
    sessionStorage.removeItem(SITE_KEY)
  } catch {
    /* ignore */
  }
  window.location.href = `${window.location.pathname}?intro=1`
}

const isHomePage = () => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return path === '/' || /index\.html$/i.test(path)
}

export function initIntro() {
  // Already inside the site (any page) → lock tab + never show maroon shell
  if (!isHomePage()) {
    markSiteBrowsedInTab()
    dismissIntroShell()
    return
  }

  if (!shouldPlayIntro()) {
    markSiteBrowsedInTab()
    dismissIntroShell()
    return
  }

  const root = document.querySelector('[data-osaar-intro]')
  if (!root) {
    markSiteBrowsedInTab()
    dismissIntroShell()
    return
  }

  if (typeof window.__osaarIntroCleanup === 'function') {
    window.__osaarIntroCleanup()
  }

  root.classList.remove('is-gone', 'is-exiting', 'is-done-instant', 'is-skipping', 'is-reduced')
  document.documentElement.classList.add('intro-active')
  document.documentElement.classList.remove('intro-pending', 'intro-exit')
  document.body.classList.remove('intro-complete')
  root.hidden = false
  root.setAttribute('aria-hidden', 'false')

  let finished = false
  let raf = 0
  let safetyTimer = 0
  let exitTimer = 0
  let loopTimer = 0
  let audioCtx = null
  let audioNodes = null
  let muted = true
  let skipped = false
  let startTime = 0
  let width = 0
  let height = 0
  let lastTick = 0

  const canvas = root.querySelector('[data-intro-canvas]')
  const moth = root.querySelector('[data-intro-moth]')
  const mothImg = root.querySelector('.osaar-intro__moth-img')
  const wingL = root.querySelector('[data-wing="left"]')
  const wingR = root.querySelector('[data-wing="right"]')
  const ripple = root.querySelector('[data-intro-ripple]')
  const glow = root.querySelector('[data-intro-glow]')
  const skipBtn = root.querySelector('[data-intro-skip]')
  const muteBtn = root.querySelector('[data-intro-mute]')
  const stage = root.querySelector('[data-intro-stage]')

  const stopAudio = () => {
    if (!audioCtx) return
    try {
      audioNodes?.osc?.stop()
      audioNodes?.osc2?.stop()
      audioCtx.close()
    } catch {
      /* ignore */
    }
    audioCtx = null
    audioNodes = null
  }

  const onPointerMove = (event) => {
    if (!canHover || isMobile || !width) return
    cursor.x = event.clientX / width
    cursor.y = event.clientY / height
    cursor.active = true
  }

  const resize = () => {
    width = window.innerWidth
    height = window.innerHeight
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const cleanup = () => {
    cancelAnimationFrame(raf)
    window.clearTimeout(safetyTimer)
    window.clearTimeout(exitTimer)
    window.clearInterval(loopTimer)
    root.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('resize', resize)
    skipBtn?.removeEventListener('click', skip)
    muteBtn?.removeEventListener('click', onMute)
    stopAudio()
  }

  window.__osaarIntroCleanup = cleanup

  const finish = (instant = false) => {
    if (finished) return
    finished = true
    cancelAnimationFrame(raf)
    window.clearTimeout(safetyTimer)
    window.clearInterval(loopTimer)
    markSiteBrowsedInTab()
    stopAudio()

    root.classList.add(instant ? 'is-done-instant' : 'is-exiting')
    document.documentElement.classList.add('intro-exit')

    exitTimer = window.setTimeout(() => {
      dismissIntroShell()
      window.dispatchEvent(new CustomEvent('osaar:intro-complete'))
    }, instant ? 40 : 900)
  }

  const skip = () => {
    if (finished) return
    skipped = true
    root.classList.add('is-skipping')
    window.setTimeout(() => finish(false), 280)
  }

  const onMute = async () => {
    muted = !muted
    muteBtn?.setAttribute('aria-pressed', String(!muted))
    muteBtn?.classList.toggle('is-on', !muted)
    if (muteBtn) muteBtn.textContent = muted ? 'Sound' : 'Mute'
    if (muted) stopAudio()
    else await ensureAudio()
  }

  const ensureAudio = async () => {
    if (muted || audioCtx) return
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const master = audioCtx.createGain()
      master.connect(audioCtx.destination)

      const osc = audioCtx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 196
      const oscGain = audioCtx.createGain()
      oscGain.gain.value = 0.35
      const filter = audioCtx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 420
      osc.connect(oscGain)
      oscGain.connect(filter)
      filter.connect(master)
      osc.start()

      const osc2 = audioCtx.createOscillator()
      osc2.type = 'triangle'
      osc2.frequency.value = 392
      const g2 = audioCtx.createGain()
      g2.gain.value = 0.1
      osc2.connect(g2)
      g2.connect(master)
      osc2.start()

      audioNodes = { osc, osc2 }
      master.gain.setValueAtTime(0.001, audioCtx.currentTime)
      master.gain.linearRampToValueAtTime(0.035, audioCtx.currentTime + 1.2)
    } catch {
      audioCtx = null
    }
  }

  if (!canvas || !moth) {
    finish(true)
    return
  }

  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    finish(true)
    return
  }

  const cursor = { x: 0.5, y: 0.5, active: false }
  const mothState = { x: 0, y: 0, angle: 0, progress: 0 }
  const particles = []
  const trail = []
  const dust = []
  const particleBudget = isMobile ? 26 : 48
  const dustCount = isMobile ? 16 : 32

  const path = {
    x0: 0.12,
    y0: 0.84,
    x1: 0.3,
    y1: 0.56,
    x2: 0.56,
    y2: 0.36,
    x3: 0.88,
    y3: 0.12,
  }

  const seedDust = () => {
    dust.length = 0
    for (let i = 0; i < dustCount; i += 1) {
      dust.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.4 + Math.random() * 1.2,
        a: 0.1 + Math.random() * 0.2,
        s: 0.00008 + Math.random() * 0.00022,
        p: Math.random() * Math.PI * 2,
      })
    }
  }

  const spawnParticle = (x, y, progress, strength = 1) => {
    if (particles.length >= particleBudget) return
    const kinds = ['dust', 'petal', 'fragment', 'stroke', 'glow']
    const kind = kinds[Math.floor(Math.random() * kinds.length)]
    const angle = Math.random() * Math.PI * 2
    const speed = (0.15 + Math.random() * 0.55) * strength
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed * (0.4 + Math.random()),
      vy: 0.2 + Math.random() * 0.9 + Math.sin(angle) * 0.25,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.04,
      life: 0,
      max: 900 + Math.random() * 1400,
      size: kind === 'stroke' ? 8 + Math.random() * 14 : 2 + Math.random() * 5,
      kind,
      progress,
      side: Math.random() > 0.5 ? 1 : -1,
    })
  }

  const colorForProgress = (p, alpha) => {
    const r = Math.round(lerp(90, 232, p))
    const g = Math.round(lerp(48, 196, p))
    const b = Math.round(lerp(58, 140, p))
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const drawParticle = (p) => {
    const t = p.life / p.max
    const fade = t < 0.15 ? t / 0.15 : t > 0.65 ? (1 - t) / 0.35 : 1
    const alpha = fade * (0.2 + p.progress * 0.5)
    if (alpha <= 0.01) return

    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)

    if (p.kind === 'petal') {
      ctx.fillStyle = colorForProgress(p.progress, alpha * 0.85)
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size * 0.55, p.size * 1.1, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.kind === 'fragment') {
      ctx.fillStyle = colorForProgress(Math.min(1, p.progress + 0.1), alpha)
      ctx.fillRect(-p.size * 0.4, -p.size * 0.15, p.size * 0.8, p.size * 0.3)
    } else if (p.kind === 'stroke') {
      ctx.strokeStyle = colorForProgress(p.progress, alpha * 0.7)
      ctx.lineWidth = 0.7
      ctx.beginPath()
      ctx.moveTo(-p.size * 0.5, 0)
      ctx.quadraticCurveTo(0, p.side * 3, p.size * 0.5, p.side * 1.5)
      ctx.stroke()
    } else if (p.kind === 'glow') {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2.2)
      g.addColorStop(0, colorForProgress(Math.max(p.progress, 0.55), alpha * 0.9))
      g.addColorStop(1, 'rgba(216,180,106,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, p.size * 2.2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillStyle = colorForProgress(p.progress, alpha)
      ctx.beginPath()
      ctx.arc(0, 0, p.size * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  const drawTrail = () => {
    const now = performance.now()
    for (let i = 0; i < trail.length; i += 1) {
      const point = trail[i]
      const age = (now - point.t) / 900
      if (age >= 1) continue
      const alpha = (1 - age) * (0.1 + point.p * 0.18)
      const radius = 12 + point.p * 30 + age * 18
      const g = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius)
      g.addColorStop(0, `rgba(232, 208, 150, ${alpha})`)
      g.addColorStop(0.45, `rgba(184, 120, 72, ${alpha * 0.35})`)
      g.addColorStop(1, 'rgba(90, 30, 45, 0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const drawDust = (now) => {
    dust.forEach((d) => {
      const x = ((d.x + Math.sin(now * d.s + d.p) * 0.02 + 1) % 1) * width
      const y = ((d.y + Math.cos(now * d.s * 0.8 + d.p) * 0.015 + 1) % 1) * height
      ctx.fillStyle = `rgba(232, 210, 170, ${d.a})`
      ctx.beginPath()
      ctx.arc(x, y, d.r, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  const mothProgressFromTime = (elapsed) => {
    const start = 1100
    const end = 5000
    if (elapsed < start) return 0
    if (elapsed > end) return 1
    let t = (elapsed - start) / (end - start)
    if (t > 0.42 && t < 0.58) {
      const local = (t - 0.42) / 0.16
      t = 0.42 + easeInOut(local) * 0.16 * 0.55 + local * 0.16 * 0.45
    }
    return easeInOut(clamp(t, 0, 1))
  }

  const updateMoth = (elapsed, now) => {
    let progress = mothProgressFromTime(elapsed)
    if (skipped) progress = Math.max(progress, 0.92)

    let nx = cubicBezier(path.x0, path.x1, path.x2, path.x3, progress)
    let ny = cubicBezier(path.y0, path.y1, path.y2, path.y3, progress)

    nx += Math.sin(elapsed * 0.0022) * 0.012 + Math.sin(elapsed * 0.0011) * 0.008
    ny += Math.cos(elapsed * 0.0017) * 0.01

    if (canHover && cursor.active && !isMobile) {
      const dx = cursor.x - nx
      const dy = cursor.y - ny
      const dist = Math.hypot(dx, dy)
      if (dist < 0.28) {
        const pull = (1 - dist / 0.28) * 0.035
        nx += dx * pull
        ny += dy * pull
      }
    }

    const dx = cubicBezierDerivative(path.x0, path.x1, path.x2, path.x3, progress)
    const dy = cubicBezierDerivative(path.y0, path.y1, path.y2, path.y3, progress)
    const angle = (Math.atan2(dy * height, dx * width) * 180) / Math.PI

    mothState.x = nx * width
    mothState.y = ny * height
    mothState.angle = angle
    mothState.progress = progress

    const enter = clamp((elapsed - 900) / 450, 0, 1)
    const leave = elapsed > 5100 ? clamp(1 - (elapsed - 5100) / 500, 0, 1) : 1
    const visible = elapsed > 900 && elapsed < 5600
    moth.style.opacity = visible ? String(enter * leave) : '0'
    moth.style.transform = `translate3d(${mothState.x}px, ${mothState.y}px, 0) translate(-50%, -50%) rotate(${angle + 8}deg)`

    const flap = Math.sin(now * 0.011) * 16 + Math.sin(now * 0.007) * 5
    if (wingL) wingL.style.transform = `rotate(${-10 + flap}deg)`
    if (wingR) wingR.style.transform = `rotate(${10 - flap * 0.9}deg)`
    if (mothImg) {
      const breathe = 1 + Math.sin(now * 0.011) * 0.035
      mothImg.style.transform = `scale(${breathe})`
    }

    if (visible && progress > 0.02 && progress < 0.98) {
      if (trail.length === 0 || now - trail[trail.length - 1].t > 34) {
        trail.push({ x: mothState.x, y: mothState.y, t: now, p: progress })
        if (trail.length > 42) trail.shift()
      }

      if (Math.random() < (isMobile ? 0.32 : 0.55)) {
        spawnParticle(
          mothState.x + (Math.random() - 0.5) * 30,
          mothState.y + (Math.random() - 0.5) * 18 + 10,
          progress,
        )
      }
    }

    if (ripple && progress > 0.46 && progress < 0.56 && !ripple.classList.contains('is-on')) {
      ripple.classList.add('is-on')
      ripple.style.left = `${mothState.x}px`
      ripple.style.top = `${mothState.y}px`
    }

    if (glow) {
      glow.style.opacity = String(0.35 + progress * 0.55)
      glow.style.transform = `translate3d(${(nx - 0.5) * 40}px, ${(ny - 0.5) * 30}px, 0) scale(${1 + progress * 0.18})`
    }

    if (stage) {
      stage.style.transform = `scale(${1 + progress * 0.016})`
    }
  }

  const updateParticles = (dt) => {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i]
      p.life += dt
      p.x += p.vx * (dt * 0.06)
      p.y += p.vy * (dt * 0.06)
      p.vx += p.side * 0.004
      p.vy += 0.012
      p.rot += p.vr
      if (p.life >= p.max) particles.splice(i, 1)
    }
  }

  const tick = (now = performance.now()) => {
    if (finished) return
    if (now - lastTick < 16) return
    lastTick = now
    const elapsed = skipped ? Math.max(now - startTime, DURATION - 900) : now - startTime

    try {
      if (width < 1 || height < 1) resize()

      ctx.clearRect(0, 0, width, height)
      drawDust(now)
      drawTrail()

      if (!prefersReducedMotion) {
        updateMoth(elapsed, now)
        updateParticles(16.7)
        particles.forEach(drawParticle)
      }

      root.style.setProperty('--intro-warm', mothState.progress.toFixed(3))
      root.style.setProperty('--intro-mx', cursor.x.toFixed(3))
      root.style.setProperty('--intro-my', cursor.y.toFixed(3))
    } catch (err) {
      console.warn('[osaar-intro]', err)
      window.__osaarIntroLastError = String(err)
      finish(true)
      return
    }

    if (elapsed >= (prefersReducedMotion ? REDUCE_DURATION : DURATION)) {
      finish(false)
    }
  }

  const startLoop = () => {
    cancelAnimationFrame(raf)
    window.clearInterval(loopTimer)
    loopTimer = window.setInterval(() => tick(), 33)
    const boost = () => {
      if (finished) return
      tick()
      raf = requestAnimationFrame(boost)
    }
    raf = requestAnimationFrame(boost)
  }

  /* Reduced motion: short atmospheric hold, then homepage */
  if (prefersReducedMotion) {
    root.classList.add('is-reduced')
    moth.style.opacity = '0'
    startTime = performance.now()
    loopTimer = window.setInterval(() => {
      const elapsed = performance.now() - startTime
      root.style.setProperty('--intro-warm', clamp(elapsed / REDUCE_DURATION, 0, 1).toFixed(3))
      if (elapsed >= REDUCE_DURATION) {
        window.clearInterval(loopTimer)
        finish(false)
      }
    }, 33)
    skipBtn?.addEventListener('click', () => finish(true))
    markSiteBrowsedInTab()
    return
  }

  resize()
  seedDust()
  window.addEventListener('resize', resize, { passive: true })
  root.addEventListener('pointermove', onPointerMove, { passive: true })
  skipBtn?.addEventListener('click', skip)
  muteBtn?.addEventListener('click', onMute)

  ;['/images/hero-scene.jpg', '/images/journey-scene.jpg', '/images/logo-icon-clear.png'].forEach((src) => {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
  })

  // Lock this tab immediately so Home / refresh never re-triggers mid-play
  markSiteBrowsedInTab()

  startTime = performance.now()
  moth.style.opacity = '0'

  startLoop()
  tick(startTime)

  const baseCleanup = cleanup
  window.__osaarIntroCleanup = () => {
    window.clearInterval(loopTimer)
    baseCleanup()
  }

  safetyTimer = window.setTimeout(() => {
    if (!finished) finish(true)
  }, DURATION + 2500)
}
