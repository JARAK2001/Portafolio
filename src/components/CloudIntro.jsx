import { useEffect } from 'react'
import './CloudIntro.css'

const REVEAL_MS = 2400

export default function CloudIntro({ phase, setPhase, calm }) {
  useEffect(() => {
    if (phase === 'loading') {
      // Leave a still background if the connection stalls. A late model can still reveal.
      const timeout = setTimeout(() => {
        setPhase((current) => current === 'loading' ? 'error' : current)
      }, 25000)
      return () => clearTimeout(timeout)
    }

    if (phase === 'ready') {
      const frame = requestAnimationFrame(() => {
        setPhase((current) => current === 'ready' ? 'revealing' : current)
      })
      return () => cancelAnimationFrame(frame)
    }

    if (phase === 'revealing') {
      const timeout = setTimeout(() => {
        setPhase((current) => current === 'revealing' ? 'complete' : current)
      }, calm ? 180 : REVEAL_MS + 100)
      return () => clearTimeout(timeout)
    }
  }, [phase, calm, setPhase])

  if (phase === 'complete') return null

  return (
    <div
      className="cloud-intro"
      data-phase={phase}
      data-calm={calm ? '' : undefined}
      style={{ '--cloud-reveal-duration': `${REVEAL_MS}ms` }}
    >
      <div className="cloud-intro__mist cloud-intro__mist--rear" aria-hidden="true" />
      <div className="cloud-intro__mist cloud-intro__mist--middle" aria-hidden="true" />
      <div className="cloud-intro__mist cloud-intro__mist--front" aria-hidden="true" />
      {phase !== 'error' && (
        <p className="cloud-intro__status" role="status">La mente no tiene límites. El tiempo sí.</p>
      )}
    </div>
  )
}
