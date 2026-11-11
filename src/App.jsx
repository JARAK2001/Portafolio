import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import TreeViewer from './components/TreeViewer.jsx'
import CloudIntro from './components/CloudIntro.jsx'
import { PROFILE, SECTIONS, TIER_META } from './content/profile.js'
import { STOP_IDS } from './three/cameraJourney.js'
import { useScrollJourney } from './useScrollJourney.js'
import './App.css'

const NAV = [{ id: 'inicio', label: 'Inicio' }, ...SECTIONS.map((section) => ({ id: section.id, label: section.nav }))]
const CURRENT_YEAR = 2026

function TierBadge({ tier, label }) {
  return (
    <span className={`tier-badge tier-${tier}`}>
      <span className="tier-dot" aria-hidden="true" />
      {label ?? TIER_META[tier]?.label ?? tier}
    </span>
  )
}

function ProjectDialog({ project: mainProject, onClose }) {
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const [subproject, setSubproject] = useState(null)
  const project = subproject ?? mainProject

  function showSubproject(next) {
    setSubproject(next)
    panelRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    closeRef.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus({ preventScroll: true })

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true })
    }
  }, [onClose])

  return createPortal(
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="project-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-dialog-title"
        ref={panelRef}
      >
        <header className="dialog-head">
          <div className="dialog-heading">
            <div className="dialog-badges">
              <TierBadge tier={project.tier} label={project.tierLabel} />
              <span className="dialog-state">{project.estado}</span>
            </div>
            <h3 id="project-dialog-title">{project.nombre}</h3>
            <p className="dialog-subtitle">{project.subtitulo}</p>
          </div>
          <button className="dialog-close" type="button" onClick={onClose} ref={closeRef} aria-label="Cerrar ficha">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="dialog-body">
          {subproject && (
            <button type="button" className="editorial-trigger-btn" onClick={() => showSubproject(null)}>
              ← Volver a {mainProject.nombre}
            </button>
          )}
          <p className="dialog-summary">{project.resumen}</p>

          {project.subProjects?.length > 0 && (
            <section className="dialog-section">
              <h4>Simuladores</h4>
              <div className="chips">
                {project.subProjects.map((item) => (
                  <button key={item.id} type="button" className="btn ghost" onClick={() => showSubproject(item)}>
                    {item.nombre} <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <dl className="dialog-facts">
            <div><dt>Periodo</dt><dd>{project.periodo}</dd></div>
            <div><dt>Rol</dt><dd>{project.rol}</dd></div>
            <div><dt>Nivel</dt><dd>{project.tierLabel}</dd></div>
            {project.puntaje != null && (
              <div><dt>Puntaje</dt><dd>{Number(project.puntaje).toFixed(2)} / 5</dd></div>
            )}
          </dl>

          <section className="dialog-section">
            <h4>El problema</h4>
            <p>{project.problema}</p>
          </section>

          <section className="dialog-section">
            <h4>La propuesta</h4>
            <p>{project.propuesta}</p>
          </section>

          {project.destacados?.length > 0 && (
            <section className="dialog-section">
              <h4>Decisiones y destacados</h4>
              <ul className="dialog-list">
                {project.destacados.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          )}

          {project.evidencia?.length > 0 && (
            <section className="dialog-section">
              <h4>Evidencia</h4>
              <ul className="evidence-list">
                {project.evidencia.map((item) => (
                  <li key={`${item.tipo}-${item.detalle}`}>
                    <span className="evidence-type">{item.tipo}</span>
                    <span>{item.detalle}</span>
                    {item.verificado && <span className="evidence-check" title="Verificado" aria-label="Verificado">✓</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {project.stack?.length > 0 && (
            <section className="dialog-section">
              <h4>Stack</h4>
              <div className="chips">
                {project.stack.map((technology) => <span key={technology} className="chip">{technology}</span>)}
              </div>
            </section>
          )}

          {project.pendientes?.length > 0 && (
            <section className="dialog-section">
              <h4>Lo que sigue</h4>
              <ul className="dialog-list dialog-list-pending">
                {project.pendientes.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          )}

          {project.sensible && (
            <p className="dialog-note">
              Contenido para adultos. La ficha describe el producto y su arquitectura, sin imágenes explícitas.
            </p>
          )}

          <div className="dialog-actions">
            {project.hasDemo && (
              <a className="btn solid" href={project.demo} target="_blank" rel="noreferrer noopener">
                {project.demoLabel ?? 'Abrir demo'} <span aria-hidden="true">↗</span>
              </a>
            )}
            {project.hasRepo && (
              <a className="btn ghost" href={project.repositorio} target="_blank" rel="noreferrer noopener">
                Ver repositorio <span aria-hidden="true">↗</span>
              </a>
            )}
            {!project.hasDemo && !project.hasRepo && (
              <span className="dialog-muted">Demo y repositorio disponibles al solicitar.</span>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function EditorialHeading({ kicker, titleLead, titleEmphasis, id }) {
  return (
    <header className="editorial-head">
      <p className="editorial-kicker">{kicker}</p>
      <h2 id={id} className="editorial-title">
        {titleLead} <em>{titleEmphasis}</em>
      </h2>
    </header>
  )
}

function EditorialSection({ section }) {
  return (
    <section
      id={section.id}
      data-spy
      className={`stop stop-${section.id} editorial-stop`}
      aria-labelledby={`${section.id}-title`}
    >
      <div data-scene={section.id} className={`editorial-scene editorial-story editorial-${section.id}`}>
        <EditorialHeading
          id={`${section.id}-title`}
          kicker={section.kicker}
          titleLead={section.titleLead}
          titleEmphasis={section.titleEmphasis}
        />
        <p className="editorial-lead">{section.intro}</p>
        {section.id === 'ramas' && (
          <a className="editorial-trigger-btn" href="#flores">
            <span>Ver proyectos</span>
            <span aria-hidden="true">↓</span>
          </a>
        )}
      </div>
    </section>
  )
}

function FloresSection({ section, onSyncFlowerState, inView }) {
  const stageRef = useRef(null)
  const flowerNodeRefs = useRef([])

  const protagonists = section.protagonists ?? []

  const [activeFlowerIndex, setActiveFlowerIndex] = useState(-1)
  const [hoveredFlowerIndex, setHoveredFlowerIndex] = useState(-1)
  const [selectedDialogProject, setSelectedDialogProject] = useState(null)

  const closeDialog = useCallback(() => setSelectedDialogProject(null), [setSelectedDialogProject])

  useEffect(() => {
    onSyncFlowerState?.({
      stageEl: stageRef.current,
      flowerNodes: flowerNodeRefs.current,
      enabled: inView,
      activeIndex: activeFlowerIndex,
      hoveredIndex: hoveredFlowerIndex,
    })
    return () => {
      onSyncFlowerState?.({ stageEl: null })
    }
  }, [onSyncFlowerState, activeFlowerIndex, hoveredFlowerIndex, inView])

  const handleSelectFlower = (flowerIndex) => {
    setActiveFlowerIndex(flowerIndex)
  }

  const openFlower = (index) => {
    handleSelectFlower(index)
    setSelectedDialogProject(protagonists[index])
  }

  const handleHoverFlower = (flowerIndex) => {
    setHoveredFlowerIndex(flowerIndex)
    onSyncFlowerState?.({ hoveredIndex: flowerIndex })
  }

  const handleFlowerKeyDown = (event, flowerIndex, controls = flowerNodeRefs.current) => {
    const count = protagonists.length
    if (!count) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      const next = (flowerIndex + 1) % count
      handleSelectFlower(next)
      controls[next]?.focus({ preventScroll: true })
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      const prev = (flowerIndex - 1 + count) % count
      handleSelectFlower(prev)
      controls[prev]?.focus({ preventScroll: true })
    }
  }

  return (
    <section
      id={section.id}
      data-spy
      className="stop stop-flores editorial-stop"
      aria-labelledby="flores-title"
    >
      <div ref={stageRef} className="flores-stage">
        <div data-scene="flores" className="editorial-scene editorial-flores">
          <h2 id="flores-title" className="editorial-title flores-title">{section.kicker}</h2>
          <ul className="flores-projects">
            {protagonists.map((flower, index) => (
              <li key={flower.id}>
                <button
                  type="button"
                  className="flores-project"
                  style={{ '--flower-accent': flower.accentColor }}
                  aria-haspopup="dialog"
                  onPointerEnter={() => handleHoverFlower(index)}
                  onPointerLeave={() => handleHoverFlower(-1)}
                  onFocus={() => handleHoverFlower(index)}
                  onBlur={() => handleHoverFlower(-1)}
                  onClick={() => openFlower(index)}
                >
                  <span className="flores-project-index" aria-hidden="true">{flower.flowerNumber}</span>
                  <span className="flores-project-copy">
                    <span className="flores-project-name">{flower.nombre}</span>
                    <span className="flores-project-summary">{flower.preview}</span>
                  </span>
                  <span className="flores-project-arrow" aria-hidden="true">↗</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Copa interactiva del guayacán: 4 flores visibles, solo 1 protagonista activa */}
        <div
          className={`flores-canopy-map ${hoveredFlowerIndex >= 0 && hoveredFlowerIndex !== activeFlowerIndex ? 'has-preview' : ''}`}
          hidden={!inView}
          role="group"
          aria-label="Flores interactivas en la copa del guayacán"
        >
          {protagonists.map((flower, fIndex) => {
            const isSelected = activeFlowerIndex === fIndex
            const isHovered = hoveredFlowerIndex === fIndex
            return (
              <button
                key={flower.id}
                ref={(el) => {
                  flowerNodeRefs.current[fIndex] = el
                }}
                type="button"
                className={`canopy-flower-node ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}`}
                style={{
                  '--flower-accent': flower.accentColor,
                  '--flower-glow': flower.glowColor,
                  '--fallback-x': `${flower.fallbackScreen.x}%`,
                  '--fallback-y': `${flower.fallbackScreen.y}%`,
                }}
                aria-label={`Flor ${flower.flowerNumber}: ${flower.nombre}`}
                aria-haspopup="dialog"
                onClick={() => openFlower(fIndex)}
                onMouseEnter={() => handleHoverFlower(fIndex)}
                onMouseLeave={() => handleHoverFlower(-1)}
                onFocus={() => handleHoverFlower(fIndex)}
                onBlur={() => handleHoverFlower(-1)}
                onKeyDown={(event) => handleFlowerKeyDown(event, fIndex)}
              >
                <span className="canopy-flower-ring" aria-hidden="true">
                  <span className="canopy-flower-num">{flower.flowerNumber}</span>
                </span>
                <span className="canopy-flower-callout" aria-hidden="true">
                  <span className="canopy-flower-leader" />
                  <span className="canopy-flower-callout-num">{flower.flowerNumber}</span>
                  <strong>{flower.nombre}</strong>
                </span>
              </button>
            )
          })}
        </div>
      </div>
      {selectedDialogProject && (
        <ProjectDialog project={selectedDialogProject} onClose={closeDialog} />
      )}
    </section>
  )
}

function SemillasSection({ section }) {
  const validChannels = (section.channels ?? []).filter(
    (channel) => channel.href !== '#' && !channel.d.includes('ejemplo') && !channel.d.includes('tu-usuario'),
  )

  return (
    <section
      id={section.id}
      data-spy
      className="stop stop-semillas editorial-stop"
      aria-labelledby={`${section.id}-title`}
    >
      <div data-scene="semillas" className="editorial-scene editorial-semillas">
        <EditorialHeading
          id={`${section.id}-title`}
          kicker={section.kicker}
          titleLead={section.titleLead}
          titleEmphasis={section.titleEmphasis}
        />

        <p className="editorial-lead semillas-intro">{section.intro}</p>

        {validChannels.length > 0 && (
          <ul className="channels semillas-channels" aria-label="Canales de contacto">
            {validChannels.map((channel) => (
              <li key={channel.t}>
                <a href={channel.href}>
                  <strong>{channel.t}</strong>
                  <span>{channel.d}</span>
                  <span className="channel-arrow" aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="semillas-links">
          <a className="editorial-trigger-btn" href="#flores">
            <span>Explorar los proyectos</span>
            <span aria-hidden="true">↑</span>
          </a>
          <a className="semillas-secondary-link" href="#inicio">
            Volver al inicio ↑
          </a>
        </div>
      </div>
    </section>
  )
}

function SectionCard({ section, onSyncFlowerState, inView }) {
  if (section.id === 'flores') {
    return <FloresSection section={section} onSyncFlowerState={onSyncFlowerState} inView={inView} />
  }
  if (section.id === 'semillas') {
    return <SemillasSection section={section} />
  }
  return <EditorialSection section={section} />
}

export default function App() {
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const [introPhase, setIntroPhase] = useState('loading')
  const introLocked = introPhase === 'loading' || introPhase === 'ready'
  const onSceneReady = useCallback(() => setIntroPhase('ready'), [setIntroPhase])
  const onSceneError = useCallback(() => setIntroPhase('error'), [setIntroPhase])
  const { journeyRef, active } = useScrollJourney(reduceMotion)
  const flowerStateRef = useRef({ activeIndex: -1, hoveredIndex: -1, stageEl: null })
  const syncFlowerState = useCallback((patch) => {
    Object.assign(flowerStateRef.current, patch)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reduceMotion)
    return () => document.documentElement.classList.remove('reduced-motion')
  }, [reduceMotion])

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onPreferenceChange = (event) => setReduceMotion(event.matches)
    preference.addEventListener('change', onPreferenceChange)
    return () => preference.removeEventListener('change', onPreferenceChange)
  }, [])

  return (
    <>
      <TreeViewer
        journeyRef={journeyRef}
        flowerStateRef={flowerStateRef}
        calm={reduceMotion}
        onSceneReady={onSceneReady}
        onSceneError={onSceneError}
        chromeless
      />
      <CloudIntro phase={introPhase} setPhase={setIntroPhase} calm={reduceMotion} />

      <nav className="topnav" aria-label="Navegación principal" inert={introLocked}>
        <a className="brand" href="#inicio" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span>{PROFILE.name}</span>
        </a>
        <button
          className={`menu-toggle ${menuOpen ? 'open' : ''}`}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
        >
          <span /><span />
        </button>
        <div id="site-menu" className={`links ${menuOpen ? 'open' : ''}`}>
          {NAV.map((item) => (
            <a
              key={item.id}
              className={active === item.id ? 'on' : ''}
              href={`#${item.id}`}
              aria-current={active === item.id ? 'location' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <button
            className="motion-toggle"
            type="button"
            aria-pressed={reduceMotion}
            onClick={() => setReduceMotion((current) => !current)}
          >
            <span aria-hidden="true">◌</span>{reduceMotion ? 'Movimiento reducido' : 'Reducir movimiento'}
          </button>
        </div>
      </nav>

      <aside className="rail" aria-label="Progreso del recorrido" inert={introLocked}>
        <div className="rail-line" />
        <div className="rail-fill" />
        <div className="rail-leaf" aria-hidden="true">✳</div>
        {STOP_IDS.map((id, index) => {
          const item = NAV.find((navItem) => navItem.id === id)
          return (
            <a
              key={id}
              className={`rail-dot ${active === id ? 'on' : ''}`}
              style={{ top: `${(index / (STOP_IDS.length - 1)) * 100}%` }}
              href={`#${id}`}
              aria-label={`Ir a ${item.label}`}
              aria-current={active === id ? 'location' : undefined}
              title={item.label}
            />
          )
        })}
      </aside>

      <main className="content" inert={introLocked}>
        <header id="inicio" data-spy className="hero" aria-labelledby="hero-title">
          <div data-scene="hero" className="hero-text">
            <p className="eyebrow">
              <span>{PROFILE.name}</span>
              <i aria-hidden="true" />
              <span>{PROFILE.role}</span>
            </p>
            <h1 id="hero-title">
              Ideas que<br /><em>echan raíces.</em>
            </h1>
            <p className="lede">{PROFILE.subtitle}</p>
            <div className="hero-scroll-row">
              <a className="hero-scroll-link" href="#raices">
                <span>Explorar el recorrido</span>
                <span className="hero-scroll-arrow" aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </header>

        {SECTIONS.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            onSyncFlowerState={syncFlowerState}
            inView={active === section.id && (introPhase === 'revealing' || introPhase === 'complete')}
          />
        ))}

        <footer className="footer">
          <span>© {CURRENT_YEAR} {PROFILE.name}</span>
        </footer>
      </main>
    </>
  )
}
