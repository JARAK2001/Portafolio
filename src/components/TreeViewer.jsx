import { useEffect, useRef, useState } from 'react'
import { createBaseScene, disposeObjectResources } from '../three/createBaseScene'
import { loadTreeModel } from '../three/loadTreeModel'

/**
 * Presentación — lienzo 3D del portafolio.
 * Modo fondo fijo: la cámara sigue el viaje del scroll (journeyRef),
 * con interpolación suave.
 */
export default function TreeViewer({ journeyRef, flowerStateRef = null, calm = false, chromeless = false }) {
  const canvasRef = useRef(null)
  const foregroundCanvasRef = useRef(null)
  const containerRef = useRef(null)
  const calmRef = useRef(calm)
  const [status, setStatus] = useState('Cargando modelo…')
  const [progress, setProgress] = useState(0)
  const [fps, setFps] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    calmRef.current = calm
  }, [calm])

  useEffect(() => {
    const canvas = canvasRef.current
    const foregroundCanvas = chromeless ? foregroundCanvasRef.current : null
    const container = containerRef.current
    if (!canvas || !container) return

    let sceneApi
    try {
      sceneApi = createBaseScene(canvas, foregroundCanvas)
    } catch (err) {
      console.warn('[Portafolio] WebGL no está disponible:', err)
      setError('La escena 3D no está disponible en este dispositivo.')
      setStatus('Escena simplificada')
      return () => {}
    }

    const { renderer, scene, camera, controls, foregroundRenderer, foregroundScene, resize, tick, dispose } = sceneApi
    let root = null
    let rafId = null
    let disposed = false
    let last = null
    let time = performance.now() / 1000
    let lastFpsUpdate = 0
    let ema = 60
    let viewportWidth = 1
    let viewportHeight = 1
    const pointer = { x: 0, y: 0, active: false }

    const onPointerMove = (event) => {
      if (event.pointerType !== 'mouse' || calmRef.current) return
      pointer.x = event.clientX / viewportWidth * 2 - 1
      pointer.y = 1 - event.clientY / viewportHeight * 2
      pointer.active = true
    }
    const resetPointer = () => { pointer.active = false }
    const onPointerOut = (event) => {
      if (!event.relatedTarget) resetPointer()
    }
    if (chromeless) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('pointerout', onPointerOut, { passive: true })
      window.addEventListener('blur', resetPointer)
    }

    const scheduleFrame = () => {
      if (disposed || document.hidden || rafId !== null) return
      rafId = requestAnimationFrame(loop)
    }

    const cancelFrame = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }

    const onVisibilityChange = () => {
      last = null
      if (document.hidden) {
        resetPointer()
        cancelFrame()
      } else {
        scheduleFrame()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const fit = () => {
      if (disposed) return
      const { clientWidth: w, clientHeight: h } = container
      viewportWidth = w || 1
      viewportHeight = h || 1
      if (w > 0 && h > 0 && resize(w, h)) {
        scheduleFrame()
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(container)

    function loop(now) {
      rafId = null
      if (disposed || document.hidden) return
      const dt = last === null ? 1000 / 60 : now - last
      last = now
      const frameSeconds = Math.min(dt / 1000, 0.05)
      time += frameSeconds
      if (!chromeless && dt > 0) {
        ema += (1000 / dt - ema) * 0.05
        if (now - lastFpsUpdate > 250) {
          lastFpsUpdate = now
          setFps(Math.round(ema))
        }
      }
      if (journeyRef?.current && !calmRef.current) {
        const k = 1 - Math.pow(1 - 0.055, frameSeconds * 60)
        camera.position.lerp(journeyRef.current.position, k)
        controls.target.lerp(journeyRef.current.target, k)
      }
      controls.update()
      if (calmRef.current) resetPointer()
      tick?.(calmRef.current ? 0 : time, flowerStateRef?.current, pointer, frameSeconds)
      renderer.render(scene, camera)
      if (foregroundRenderer && foregroundScene) foregroundRenderer.render(foregroundScene, camera)
      scheduleFrame()
    }

    Promise.resolve().then(() => {
      if (disposed) return null
      return loadTreeModel(
        scene,
        chromeless ? undefined : (p) => { if (!disposed) setProgress(p) },
        () => disposed,
      )
    })
      .then((stats) => {
        if (!stats) return
        if (disposed) {
          if (stats.root) {
            scene.remove(stats.root)
            disposeObjectResources(stats.root)
          }
          return
        }
        root = stats.root
        if (!chromeless) setStatus('Árbol cargado correctamente')
        scheduleFrame()
      })
      .catch((err) => {
        if (disposed) return
        console.error('[Etapa2] Error cargando GLB:', err)
        setError('No se pudo cargar /models/tree.glb. Revisa que el archivo exista en public/models/.')
        setStatus('Error de carga')
      })

    // Bucle de render incluso antes de cargar, para ver fondo y rejilla.
    scheduleFrame()

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener('blur', resetPointer)
      cancelFrame()
      observer.disconnect()
      dispose()
      if (root) {
        scene.remove(root)
        root = null
      }
    }
  }, [journeyRef, chromeless, flowerStateRef])

  if (chromeless) {
    return (
      <>
        <div ref={containerRef} className="viewer-canvas-box fixed" aria-hidden="true">
          <canvas ref={canvasRef} className="viewer-canvas" />
          <div className="viewer-vignette" />
        </div>
        <canvas ref={foregroundCanvasRef} className="viewer-foreground-canvas" aria-hidden="true" />
      </>
    )
  }

  return (
    <div className="viewer-wrap">
      <div ref={containerRef} className="viewer-canvas-box">
        <canvas ref={canvasRef} className="viewer-canvas" aria-label="Árbol 3D sobre una colina bajo la luna" />
        <div className="viewer-vignette" aria-hidden="true" />
      </div>
      <div className="viewer-hud" role="status" aria-live="polite">
        <span className={`dot ${error ? 'dot-error' : progress >= 1 ? 'dot-ok' : 'dot-loading'}`} />
        <span>{error ?? `${status} · ${Math.round(progress * 100)}% · ${fps} FPS`}</span>
      </div>
      <p className="viewer-hint">
        Escena base · arrastra para orbitar · rueda para zoom. La cámara final será fija cinematográfica.
      </p>
    </div>
  )
}
