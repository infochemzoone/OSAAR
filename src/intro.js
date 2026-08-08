/**
 * O-SAAR cinematic intro — From Darkness to Light
 * Plays only on a fresh new-tab landing on the homepage.
 * Force with ?intro=1 — Dev: window.__osaarResetIntro()
 */

const INTRO_KEY = 'osaar-intro-tab'
const SITE_KEY = 'osaar-site-tab'
const DURATION = 7600
const REDUCE_DURATION = 1200
const EXIT_MS = 1200
const LOAD_TIMEOUT_MS = 2800

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isMobile = window.matchMedia('(max-width: 720px)').matches

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const lerp = (a, b, t) => a + (b - a) * t
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const easeIn = (t) => t * t

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

const isInternalNavigation = () => {
  try {
    if (!document.referrer) return false
    return new URL(document.referrer).origin === window.location.origin
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

export const dismissIntroShell = () => {
  document.documentElement.classList.remove('intro-pending', 'intro-active', 'intro-exit')
  document.body.classList.add('intro-complete')
  const root = document.querySelector('[data-osaar-intro]')
  if (!root) return
  root.hidden = true
  root.setAttribute('aria-hidden', 'true')
  root.classList.add('is-gone')
  root.classList.remove('is-exiting', 'is-done-instant', 'is-skipping', 'is-reduced', 'is-playing')
}

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

const preloadImages = (urls, timeoutMs) =>
  new Promise((resolve) => {
    let settled = false
    let remaining = urls.length
    const done = (ok) => {
      if (settled) return
      settled = true
      resolve(ok)
    }
    if (!urls.length) {
      done(true)
      return
    }
    const timer = window.setTimeout(() => done(false), timeoutMs)
    urls.forEach((src) => {
      const img = new Image()
      const finishOne = () => {
        remaining -= 1
        if (remaining <= 0) {
          window.clearTimeout(timer)
          done(true)
        }
      }
      img.onload = finishOne
      img.onerror = finishOne
      img.src = src
    })
  })

export function initIntro() {
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

  root.classList.remove('is-gone', 'is-exiting', 'is-done-instant', 'is-skipping', 'is-reduced', 'is-playing')
  document.documentElement.classList.add('intro-active')
  document.documentElement.classList.remove('intro-pending', 'intro-exit')
  document.body.classList.remove('intro-complete')
  root.hidden = false
  root.setAttribute('aria-hidden', 'false')

  let finished = false
  let raf = 0
  let safetyTimer = 0
  let exitTimer = 0
  let audioCtx = null
  let audioNodes = null
  let muted = true
  let startTime = 0

  const cinema = root.querySelector('[data-intro-cinema]')
  const frameDark = root.querySelector('[data-intro-frame="dark"]')
  const framePath = root.querySelector('[data-intro-frame="path"]')
  const frameWalk = root.querySelector('[data-intro-frame="walk"]')
  const beam = root.querySelector('[data-intro-beam]')
  const bloom = root.querySelector('[data-intro-bloom]')
  const haze = root.querySelector('[data-intro-haze]')
  const brand = root.querySelector('[data-intro-brand]')
  const skipBtn = root.querySelector('[data-intro-skip]')
  const muteBtn = root.querySelector('[data-intro-mute]')

  const stopAudio = () => {
    if (!audioCtx) return
    try {
      const now = audioCtx.currentTime
      if (audioNodes?.master) {
        audioNodes.master.gain.cancelScheduledValues(now)
        audioNodes.master.gain.setValueAtTime(audioNodes.master.gain.value, now)
        audioNodes.master.gain.linearRampToValueAtTime(0.0001, now + 0.35)
      }
      window.setTimeout(() => {
        try {
          audioNodes?.noise?.stop()
          audioNodes?.osc?.stop()
          audioCtx?.close()
        } catch {
          /* ignore */
        }
        audioCtx = null
        audioNodes = null
      }, 400)
    } catch {
      audioCtx = null
      audioNodes = null
    }
  }

  const cleanup = () => {
    cancelAnimationFrame(raf)
    window.clearTimeout(safetyTimer)
    window.clearTimeout(exitTimer)
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
    markSiteBrowsedInTab()
    stopAudio()

    root.classList.add(instant ? 'is-done-instant' : 'is-exiting')
    document.documentElement.classList.add('intro-exit')

    exitTimer = window.setTimeout(
      () => {
        dismissIntroShell()
        window.dispatchEvent(new CustomEvent('osaar:intro-complete'))
      },
      instant ? 40 : EXIT_MS,
    )
  }

  const skip = () => {
    if (finished) return
    root.classList.add('is-skipping')
    finish(false)
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
      master.gain.value = 0.001
      master.connect(audioCtx.destination)

      /* Soft room tone */
      const bufferSize = audioCtx.sampleRate * 2
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i += 1) {
        data[i] = (Math.random() * 2 - 1) * 0.035
      }
      const noise = audioCtx.createBufferSource()
      noise.buffer = buffer
      noise.loop = true
      const noiseFilter = audioCtx.createBiquadFilter()
      noiseFilter.type = 'lowpass'
      noiseFilter.frequency.value = 480
      const noiseGain = audioCtx.createGain()
      noiseGain.gain.value = 0.45
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(master)
      noise.start()

      /* Distant warm tonal swell */
      const osc = audioCtx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 196
      const oscGain = audioCtx.createGain()
      oscGain.gain.value = 0.001
      const oscFilter = audioCtx.createBiquadFilter()
      oscFilter.type = 'lowpass'
      oscFilter.frequency.value = 520
      osc.connect(oscGain)
      oscGain.connect(oscFilter)
      oscFilter.connect(master)
      osc.start()

      const t0 = audioCtx.currentTime
      master.gain.linearRampToValueAtTime(0.022, t0 + 1.2)
      oscGain.gain.setValueAtTime(0.001, t0)
      oscGain.gain.linearRampToValueAtTime(0.012, t0 + 3.8)
      oscGain.gain.linearRampToValueAtTime(0.018, t0 + 5.4)
      oscGain.gain.linearRampToValueAtTime(0.004, t0 + 7.2)

      audioNodes = { master, noise, osc, oscGain }
    } catch {
      audioCtx = null
      audioNodes = null
    }
  }

  const applyScene = (elapsed) => {
    const t = clamp(elapsed / DURATION, 0, 1)

    /* Scene opacities */
    let darkOp = 1
    let pathOp = 0
    let walkOp = 0
    let beamOp = 0
    let bloomOp = 0
    let brandOp = 0
    let push = 1
    let warm = 0
    let hazeOp = 0.55

    if (elapsed < 1500) {
      /* Scene 1 — darkness */
      const local = elapsed / 1500
      darkOp = 1
      beamOp = local * 0.12
      push = 1 + local * 0.012
      warm = local * 0.08
      hazeOp = 0.6 - local * 0.05
    } else if (elapsed < 3500) {
      /* Scene 2 — path appears */
      const local = (elapsed - 1500) / 2000
      const e = easeInOut(local)
      darkOp = 1 - e * 0.85
      pathOp = e
      beamOp = 0.12 + e * 0.35
      push = 1.012 + e * 0.028
      warm = 0.08 + e * 0.28
      hazeOp = 0.55 - e * 0.12
    } else if (elapsed < 5000) {
      /* Scene 3 — movement */
      const local = (elapsed - 3500) / 1500
      const e = easeInOut(local)
      darkOp = 0.15 * (1 - e)
      pathOp = 1 - e * 0.75
      walkOp = e
      beamOp = 0.47 + e * 0.25
      push = 1.04 + e * 0.035
      warm = 0.36 + e * 0.28
      hazeOp = 0.43 - e * 0.1
    } else if (elapsed < 6500) {
      /* Scene 4 — light dissolve + brand */
      const local = (elapsed - 5000) / 1500
      const e = easeOut(local)
      darkOp = 0
      pathOp = Math.max(0, 0.25 * (1 - e))
      walkOp = 1 - e * 0.55
      beamOp = 0.72 + e * 0.28
      bloomOp = easeIn(local) * 0.95
      brandOp = clamp((local - 0.28) / 0.45, 0, 1)
      push = 1.075 + e * 0.03
      warm = 0.64 + e * 0.36
      hazeOp = 0.33 - e * 0.2
    } else {
      /* Scene 5 — homepage reveal begins */
      const local = (elapsed - 6500) / Math.max(1, DURATION - 6500)
      const e = easeIn(local)
      walkOp = 0.45 * (1 - e)
      bloomOp = 0.95 + e * 0.05
      brandOp = 1 - e * 0.85
      beamOp = 1 - e * 0.4
      push = 1.105 + e * 0.02
      warm = 1
      hazeOp = 0.13 * (1 - e)
    }

    if (frameDark) frameDark.style.opacity = String(darkOp)
    if (framePath) framePath.style.opacity = String(pathOp)
    if (frameWalk) frameWalk.style.opacity = String(walkOp)

    if (cinema) {
      cinema.style.transform = `scale(${push.toFixed(4)})`
    }
    if (beam) {
      beam.style.opacity = String(beamOp)
      beam.style.transform = `translate(-50%, -50%) scale(${(0.7 + beamOp * 0.55).toFixed(3)})`
    }
    if (bloom) {
      bloom.style.opacity = String(bloomOp)
    }
    if (haze) {
      haze.style.opacity = String(hazeOp)
    }
    if (brand) {
      brand.style.opacity = String(brandOp)
      brand.style.transform = `translateY(${((1 - brandOp) * 12).toFixed(1)}px)`
      brand.classList.toggle('is-visible', brandOp > 0.08)
    }

    root.style.setProperty('--intro-warm', warm.toFixed(3))
    root.style.filter = elapsed > 6500 ? `blur(${(easeIn((elapsed - 6500) / 1100) * 6).toFixed(2)}px)` : 'blur(0px)'
  }

  const tick = (now) => {
    if (finished) return
    raf = requestAnimationFrame(tick)
    const elapsed = now - startTime
    try {
      applyScene(elapsed)
    } catch (err) {
      console.warn('[osaar-intro]', err)
      finish(true)
      return
    }
    if (elapsed >= DURATION) finish(false)
  }

  const startPlayback = () => {
    if (finished) return
    root.classList.add('is-playing')
    markSiteBrowsedInTab()
    startTime = performance.now()
    raf = requestAnimationFrame(tick)
    safetyTimer = window.setTimeout(() => {
      if (!finished) finish(true)
    }, DURATION + 2500)
  }

  skipBtn?.addEventListener('click', skip)
  muteBtn?.addEventListener('click', onMute)

  if (prefersReducedMotion) {
    root.classList.add('is-reduced')
    if (frameDark) frameDark.style.opacity = '1'
    if (framePath) framePath.style.opacity = '0'
    if (frameWalk) frameWalk.style.opacity = '0'
    if (brand) {
      brand.style.opacity = '1'
      brand.classList.add('is-visible')
    }
    markSiteBrowsedInTab()
    startTime = performance.now()
    const reducedTick = (now) => {
      if (finished) return
      const elapsed = now - startTime
      root.style.setProperty('--intro-warm', clamp(elapsed / REDUCE_DURATION, 0, 1).toFixed(3))
      if (brand) brand.style.opacity = String(clamp(elapsed / 400, 0, 1))
      if (elapsed >= REDUCE_DURATION) {
        finish(false)
        return
      }
      raf = requestAnimationFrame(reducedTick)
    }
    raf = requestAnimationFrame(reducedTick)
    return
  }

  const sources = isMobile
    ? ['/images/intro-darkness.webp', '/images/intro-path.webp', '/images/intro-walk.webp']
    : [
        '/images/intro-darkness.webp',
        '/images/intro-path.webp',
        '/images/intro-walk.webp',
        '/images/intro-darkness.jpg',
      ]

  preloadImages(sources, LOAD_TIMEOUT_MS).then((ok) => {
    if (finished) return
    if (!ok) {
      /* Graceful fallback — do not block the homepage */
      finish(true)
      return
    }
    startPlayback()
  })
}
