import { useEffect, useRef, useState } from 'react'
import { createBaseScene } from '../three/createBaseScene'
import { loadTreeModel } from '../three/loadTreeModel'

/**
 * Presentación — lienzo 3D del portafolio.
 * Modo fondo fijo: la cámara sigue el viaje del scroll (journeyRef),
 * con interpolación suave; el usuario aún puede orbitar encima.
 */
export default function TreeViewer({ journeyRef, calm = false, chromeless = false }) {
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
    let raf = 0
    let disposed = false
    let last = performance.now()
    let ema = 60

    const fit = () => {
      const { clientWidth: w, clientHeight: h } = container
      if (w > 0 && h > 0) resize(w, h)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(container)

    const loop = (now) => {
      if (disposed) return
      const dt = now - last
      last = now
      if (dt > 0) {
        ema += (1000 / dt - ema) * 0.05
        if (!chromeless) setFps(Math.round(ema))
      }
      // Viaje guiado: acercamiento suave a la parada del scroll.
      if (journeyRef?.current) {
        const k = calmRef.current ? 0 : 0.055
        camera.position.lerp(journeyRef.current.position, k)
        controls.target.lerp(journeyRef.current.target, k)
      }
      controls.update()
      if (!calmRef.current) tick?.(now / 1000)
      else tick?.(0)
      renderer.render(scene, camera)
      if (foregroundRenderer && foregroundScene) foregroundRenderer.render(foregroundScene, camera)
      raf = requestAnimationFrame(loop)
    }

    loadTreeModel(scene, setProgress)
      .then((stats) => {
        if (disposed) return
        root = stats.root
        setStatus('Árbol cargado correctamente')
        raf = requestAnimationFrame(loop)
      })
      .catch((err) => {
        console.error('[Etapa2] Error cargando GLB:', err)
        setError('No se pudo cargar /models/tree.glb. Revisa que el archivo exista en public/models/.')
        setStatus('Error de carga')
      })

    // Bucle de render incluso antes de cargar, para ver fondo y rejilla.
    raf = requestAnimationFrame(loop)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      if (root) scene.remove(root)
      dispose()
    }
  }, [journeyRef, chromeless])

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
