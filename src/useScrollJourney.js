import { useEffect, useRef, useState } from 'react'
import { getJourney } from './three/cameraJourney.js'

function clamp(value) {
  return Math.min(1, Math.max(0, value))
}

function fade(value) {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}

function progressForScroll(y, stops) {
  if (y >= stops.at(-1).top) return 1

  let index = 0
  while (index < stops.length - 2 && y >= stops[index + 1].top) index++
  const span = Math.max(1, stops[index + 1].top - stops[index].top)
  const local = clamp((y - stops[index].top) / span)

  // Recupera el ritmo del viaje original, con un breve reposo antes de avanzar.
  const hold = index === 0 ? 0.12 : 0.3
  const arrival = index === 0 ? 0.72 : 0.8
  const camera = local <= hold ? local / hold * 0.05 : 0.05 + clamp((local - hold) / (arrival - hold)) * 0.95
  return (index + camera) / (stops.length - 1)
}

export function useScrollJourney(calm) {
  const journeyRef = useRef(getJourney(0))
  const restoredHash = useRef(false)
  const [active, setActive] = useState('inicio')

  useEffect(() => {
    const root = document.documentElement
    const nav = document.querySelector('.topnav')
    const stops = [...document.querySelectorAll('[data-spy]')].map((section) => ({
      section,
      scene: section.querySelector('[data-scene]'),
    }))
    const compact = window.matchMedia('(max-width: 620px), (max-height: 620px)')
    let currentId
    let previousProgress
    let needsMeasure = true
    let frame = null
    let navHeight

    function update() {
      frame = null
      const y = window.scrollY
      const height = window.innerHeight

      if (needsMeasure) {
        needsMeasure = false
        const measuredNavHeight = nav.offsetHeight
        if (navHeight !== measuredNavHeight) {
          navHeight = measuredNavHeight
          root.style.setProperty('--nav-height', `${navHeight}px`)
        }
        const maxScroll = root.scrollHeight - height
        stops.forEach((stop) => {
          const bounds = stop.section.getBoundingClientRect()
          stop.top = Math.min(maxScroll, bounds.top + y)
          stop.bottom = bounds.bottom + y
          stop.restTop = parseFloat(getComputedStyle(stop.scene).top) || height * 0.24
        })
      }

      const current = stops.findLast((stop) => stop.top <= y + height * 0.35) ?? stops[0]
      if (currentId !== current.section.id) {
        currentId = current.section.id
        setActive(currentId)
      }

      const progress = progressForScroll(y, stops)
      const values = stops.map(({ section, scene, top, bottom, restTop }, index) => {
        if (calm || compact.matches) return [1, 0]
        const enter = index === 0 ? 1 : fade((height * 0.62 - (top - y)) / (height * 0.4))
        if (index === stops.length - 1) return [enter, 0]
        if (enter === 0) return [0, 0]
        if (bottom < y) return [enter, 1]
        const rect = scene.getBoundingClientRect()
        if (index === 0) return [enter, fade((navHeight + 40 - rect.bottom) / 64)]
        if (section.id === 'flores') return [enter, fade((navHeight + 56 - rect.bottom) / 56)]
        const start = restTop - 2
        const exit = rect.height < height - restTop - 24
          ? fade((start - rect.top) / Math.max(16, start - navHeight - 8))
          : fade((height * 0.42 - rect.bottom) / (height * 0.22))
        return [enter, exit]
      })

      if (progress !== previousProgress) {
        previousProgress = progress
        if (!calm) journeyRef.current = getJourney(progress)
        root.style.setProperty('--journey-progress', `${progress * 100}%`)
      }
      stops.forEach((stop, index) => {
        const [enter, exit] = values[index]
        const enterValue = enter.toFixed(3)
        const exitValue = exit.toFixed(3)
        if (stop.enterValue !== enterValue) {
          stop.scene.style.setProperty('--section-enter', enterValue)
          stop.enterValue = enterValue
        }
        if (stop.exitValue !== exitValue) {
          stop.scene.style.setProperty('--scene-exit', exitValue)
          stop.exitValue = exitValue
        }
      })
    }

    function schedule() {
      if (frame === null) frame = requestAnimationFrame(update)
    }

    function onLayoutChange() {
      needsMeasure = true
      schedule()
    }

    const observer = new ResizeObserver(onLayoutChange)
    observer.observe(nav)
    stops.forEach(({ section }) => observer.observe(section))
    if (!restoredHash.current) {
      restoredHash.current = true
      if (window.scrollY === 0) {
        const destination = stops.find(({ section }) => `#${section.id}` === window.location.hash)
        destination?.section.scrollIntoView({ block: 'start', behavior: 'instant' })
      }
    }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onLayoutChange)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onLayoutChange)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [calm])

  return { journeyRef, active }
}
