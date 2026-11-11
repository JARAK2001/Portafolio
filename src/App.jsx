import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import TreeViewer from './components/TreeViewer.jsx'
import { PROFILE, PROJECT_STATS, SECTIONS, TIER_META } from './content/profile.js'
import { STOP_IDS, getJourney } from './three/cameraJourney.js'
import './App.css'

const NAV = [{ id: 'inicio', label: 'Inicio' }, ...SECTIONS.map((section) => ({ id: section.id, label: section.nav }))]

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'alto', label: TIER_META.alto.short },
  { id: 'medio', label: TIER_META.medio.short },
  { id: 'bajo', label: TIER_META.bajo.short },
]

/**
 * Progreso del viaje 3D alineado a las secciones reales.
 *
 * Antes se repartía el scroll total en partes iguales; con una sección de
 * proyectos más alta que las demás, la cámara se desincronizaba. Ahora cada
 * sección ocupa un tramo del recorrido y la cámara llega a su parada cuando
 * esa sección entra en pantalla.
 */
function journeyProgressForScroll() {
  const sections = Array.from(document.querySelectorAll('[data-spy]'))
  if (sections.length < 2) return 0

  const tops = sections.map((section) => section.getBoundingClientRect().top + window.scrollY)
  const y = window.scrollY
  if (y <= tops[0]) return 0
  if (y >= tops[tops.length - 1]) return 1

  let index = 0
  while (index < tops.length - 2 && y >= tops[index + 1]) index += 1

  const span = Math.max(1, tops[index + 1] - tops[index])
  const local = Math.min(1, Math.max(0, (y - tops[index]) / span))
  return (index + local) / (tops.length - 1)
}

function useScrollJourney(calm) {
  const journeyRef = useRef(getJourney(0))
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const nextProgress = journeyProgressForScroll()
        journeyRef.current = getJourney(calm ? 0 : nextProgress)
        setProgress(nextProgress)
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [calm])

  return { journeyRef, progress }
}

function useActiveSection() {
  const [active, setActive] = useState('inicio')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActive(entry.target.id)),
      { rootMargin: '-38% 0px -52% 0px' },
    )
    document.querySelectorAll('[data-spy]').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return active
}

function TierBadge({ tier, label }) {
  return (
    <span className={`tier-badge tier-${tier}`}>
      <span className="tier-dot" aria-hidden="true" />
      {label ?? TIER_META[tier]?.label ?? tier}
    </span>
  )
}

function ProjectCard({ project, index, onOpen }) {
  const featured = project.tier === 'alto'
  const tech = project.stack ?? []

  return (
    <article className={`project ${featured ? 'project-featured' : ''} project-tier-${project.tier}`}>
      <div className="project-body">
        <div className="project-top">
          <span className="project-index">Proyecto · {String(index + 1).padStart(2, '0')}</span>
          <TierBadge tier={project.tier} label={project.tierLabel} />
        </div>
        <h3>{project.nombre}</h3>
        <p className="project-subtitle">{project.subtitulo}</p>
        <p className="project-description">{project.resumen}</p>
        {featured && project.destacados?.[0] && (
          <p className="project-highlight"><span aria-hidden="true">✳</span>{project.destacados[0]}</p>
        )}
        <div className="chips" aria-label="Tecnologías">
          {tech.slice(0, 4).map((technology) => (
            <span key={technology} className="chip dim">{technology}</span>
          ))}
          {tech.length > 4 && <span className="chip dim">+{tech.length - 4}</span>}
        </div>
        <div className="project-footer">
          <span className="project-state">{project.estado}</span>
          <button
            type="button"
            className="project-open"
            aria-haspopup="dialog"
            onClick={() => onOpen(project)}
          >
            Ver ficha <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </article>
  )
}

function ProjectDialog({ project, onClose }) {
  const panelRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

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
      if (opener instanceof HTMLElement) opener.focus()
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
          <p className="dialog-summary">{project.resumen}</p>

          <dl className="dialog-facts">
            <div><dt>Periodo</dt><dd>{project.periodo}</dd></div>
            <div><dt>Rol</dt><dd>{project.rol}</dd></div>
            <div><dt>Nivel</dt><dd>{project.tierLabel}</dd></div>
            <div><dt>Puntaje</dt><dd>{Number(project.puntaje).toFixed(2)} / 5</dd></div>
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
                Abrir demo <span aria-hidden="true">↗</span>
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

function ProjectsExplorer({ projects, note, series }) {
  const [tier, setTier] = useState('todos')
  const [selected, setSelected] = useState(null)
  const closeDialog = useCallback(() => setSelected(null), [])

  const counts = {
    todos: projects.length,
    alto: projects.filter((project) => project.tier === 'alto').length,
    medio: projects.filter((project) => project.tier === 'medio').length,
    bajo: projects.filter((project) => project.tier === 'bajo').length,
  }
  const visible = tier === 'todos' ? projects : projects.filter((project) => project.tier === tier)

  return (
    <>
      {series && (
        <aside className="project-series" aria-label={`Serie ${series.title}`}>
          <p className="project-series-kicker">Serie · {series.title}</p>
          <p>{series.text}</p>
        </aside>
      )}

      <div className="project-filters" role="group" aria-label="Filtrar proyectos por nivel">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`filter-chip filter-${filter.id} ${tier === filter.id ? 'on' : ''}`}
            aria-pressed={tier === filter.id}
            onClick={() => setTier(filter.id)}
          >
            {filter.label}
            <span>{counts[filter.id]}</span>
          </button>
        ))}
      </div>

      <p className="filter-summary" role="status" aria-live="polite">
        {tier === 'todos'
          ? `${projects.length} proyectos · ${counts.alto} de alto impacto, ${counts.medio} en evolución y ${counts.bajo} experimentos`
          : `${visible.length} ${visible.length === 1 ? 'proyecto' : 'proyectos'} · ${TIER_META[tier]?.label}`}
      </p>

      {visible.length > 0 ? (
        <div className="projects">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={project.orden - 1}
              onOpen={setSelected}
            />
          ))}
        </div>
      ) : (
        <p className="projects-empty">No hay proyectos en este nivel todavía.</p>
      )}

      {note && <p className="section-note"><span aria-hidden="true">✳</span>{note}</p>}

      {selected && <ProjectDialog project={selected} onClose={closeDialog} />}
    </>
  )
}

function SectionCard({ section, align, index, total }) {
  return (
    <section
      id={section.id}
      data-spy
      className={`stop ${align} ${section.projects ? 'stop-projects' : ''}`}
      aria-labelledby={`${section.id}-title`}
    >
      <div className="chapter-index" aria-hidden="true">
        <span>{String(index + 1).padStart(2, '0')}</span>
        <i />
        <span className="chapter-total">{String(total).padStart(2, '0')}</span>
      </div>
      <div className="card">
        <div className="card-meta">
          <p className="kicker">{section.kicker}</p>
          <span className="card-marker" aria-hidden="true">✳</span>
        </div>
        <h2 id={`${section.id}-title`}>{section.title}</h2>
        <p className="intro">{section.intro}</p>

        {section.points && (
          <ul className="points">
            {section.points.map((point, pointIndex) => (
              <li key={point.t}>
                <span className="point-index">0{pointIndex + 1}</span>
                <div><strong>{point.t}</strong><span>{point.d}</span></div>
              </li>
            ))}
          </ul>
        )}

        {section.groups && (
          <div className="skills">
            {section.groups.map((group, groupIndex) => (
              <div key={group.t} className="skill-group">
                <span className="skill-index">0{groupIndex + 1}</span>
                <h3>{group.t}</h3>
                <div className="chips">
                  {group.items.map((item) => <span key={item} className="chip">{item}</span>)}
                </div>
                {group.where && <p className="skill-evidence">{group.where}</p>}
              </div>
            ))}
          </div>
        )}

        {section.projects && (
          <ProjectsExplorer projects={section.projects} note={section.note} series={section.series} />
        )}

        {section.channels && (
          <>
            {section.channels.some((channel) => channel.href !== '#' && !channel.d.includes('ejemplo') && !channel.d.includes('tu-usuario')) ? (
              <ul className="channels">
                {section.channels
                  .filter((channel) => channel.href !== '#' && !channel.d.includes('ejemplo') && !channel.d.includes('tu-usuario'))
                  .map((channel) => (
                    <li key={channel.t}><a href={channel.href}><strong>{channel.t}</strong><span>{channel.d}</span><span className="channel-arrow" aria-hidden="true">↗</span></a></li>
                  ))}
              </ul>
            ) : (
              <p className="contact-note"><span className="contact-spark" aria-hidden="true">✳</span>{section.contactNote ?? 'Los canales de contacto se actualizarán aquí.'}</p>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default function App() {
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const { journeyRef, progress } = useScrollJourney(reduceMotion)
  const active = useActiveSection()

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reduceMotion)
    return () => document.documentElement.classList.remove('reduced-motion')
  }, [reduceMotion])

  return (
    <>
      <TreeViewer journeyRef={journeyRef} calm={reduceMotion} chromeless />

      <nav className="topnav" aria-label="Navegación principal">
        <a className="brand" href="#inicio" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span>{PROFILE.name}<small>PORTAFOLIO · DESARROLLO DE SOFTWARE</small></span>
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

      <aside className="rail" aria-label="Progreso del recorrido">
        <div className="rail-line" />
        <div className="rail-fill" style={{ height: `${progress * 100}%` }} />
        <div className="rail-leaf" style={{ top: `${progress * 100}%` }} aria-hidden="true">✳</div>
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

      <main className="content">
        <header id="inicio" data-spy className="hero" aria-labelledby="hero-title">
          <div className="hero-text">
            <p className="eyebrow"><span className="eyebrow-mark" />{PROFILE.name} <i /> {PROFILE.role}</p>
            <h1 id="hero-title">Ideas que<br /><em>echan raíces.</em></h1>
            <p className="lede">{PROFILE.lede}</p>
            <ul className="hero-stats" aria-label="Resumen del portafolio">
              <li><strong>{PROJECT_STATS.total}</strong><span>proyectos</span></li>
              <li><strong>{PROJECT_STATS.alto}</strong><span>proyectos destacados</span></li>
              <li><strong>3</strong><span>ejes de trabajo</span></li>
            </ul>
            <div className="cta">
              <a className="btn solid" href="#raices">Recorrer el árbol <span aria-hidden="true">↓</span></a>
              <a className="btn ghost" href="#flores">Explorar proyectos <span aria-hidden="true">↗</span></a>
            </div>
            <p className="scroll-hint"><span className="scroll-line" />Desliza para comenzar el recorrido</p>
          </div>
          <div className="scene-note" aria-label="Escena 3D del guayacán">
            <span className="scene-note-dot" />
            <span>Un guayacán en flor<small>ESCENA INTERACTIVA · THREE.JS</small></span>
          </div>
        </header>

        {SECTIONS.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            index={index}
            total={SECTIONS.length}
            align={index % 2 ? 'right' : 'left'}
          />
        ))}

        <footer className="footer">
          <span className="footer-mark" aria-hidden="true">✳</span>
          <p>{PROFILE.tagline}</p>
          <span>© {new Date().getFullYear()} {PROFILE.name}</span>
        </footer>
      </main>
    </>
  )
}
