/**
 * Dominio — contenido del portafolio en un solo lugar.
 *
 * Los proyectos vienen de `proyectos.json`, la fuente de verdad compartida con
 * la carpeta `investigacion/portafolio`. El script `npm run sync:content`
 * mantiene la copia local actualizada.
 *
 * Los enlaces de contacto marcados con TODO los completa el dueño antes de
 * publicar. Los campos `rutaLocal` del JSON no se muestran en el sitio.
 */
import proyectosData from './proyectos.json'

export const TIER_META = {
  alto: { label: 'Alto impacto', short: 'Alto', order: 0 },
  medio: { label: 'En evolución', short: 'Medio', order: 1 },
  bajo: { label: 'Experimento', short: 'Bajo', order: 2 },
}

export const PROFILE = {
  name: 'Andrés Cifuentes',
  role: 'Desarrollador de Software',
  tagline: 'Ideas que echan raíces',
  subtitle: 'Desarrollo plataformas, simuladores y herramientas interactivas.',
  availability: 'Abierto a oportunidades',
}

/** Proyectos ordenados por relevancia (campo `orden` de la fuente). */
const PROJECTS = [...proyectosData.proyectos]
  .sort((a, b) => a.orden - b.orden)
  .map((project) => ({
    ...project,
    tierLabel: TIER_META[project.tier]?.label ?? project.tier,
    tierShort: TIER_META[project.tier]?.short ?? project.tier,
    hasDemo: Boolean(project.demo),
    hasRepo: Boolean(project.repositorio),
  }))

const LAB_PROJECT_IDS = ['electric-lab', 'logic-forge', 'packet-forge', 'truthforge']

const LAB_SUBPROJECTS = LAB_PROJECT_IDS
  .map((id) => PROJECTS.find((project) => project.id === id))
  .filter(Boolean)

const guardianesBase = PROJECTS.find((project) => project.id === 'guardianes') ?? {}

export const PROTAGONIST_FLOWERS = [
  {
    id: 'gxnova',
    flowerIndex: 0,
    flowerNumber: '01',
    flowerTone: 'Ámbar Solar',
    branchLabel: 'Rama Noroeste · Talento y Oportunidad',
    accentColor: '#ffd166',
    glowColor: '#ff9f1c',
    fallbackScreen: { x: 52.5, y: 31.0 },
    nombre: 'GXNova',
    preview: 'Habilidades verificables y oportunidades laborales.',
    subtitulo: 'Plataforma de habilidades y oportunidades laborales',
    editorialHook:
      'Conecta personas, habilidades verificables y oportunidades laborales en un recorrido claro de principio a fin.',
    coreStack: ['React', 'TypeScript', 'PostgreSQL'],
    tier: 'alto',
    tierLabel: 'Flor protagonista',
    tierShort: 'Protagonista',
    puntaje: 4.6,
    estado: 'Plataforma full-stack desarrollada',
    periodo: '2026',
    rol: 'Producto, arquitectura, backend y frontend',
    demo: null,
    repositorio: null,
    hasDemo: false,
    hasRepo: false,
    resumen:
      'Plataforma que conecta personas con habilidades y oportunidades laborales mediante perfiles verificables, emparejamiento por capacidades y seguimiento de postulaciones.',
    problema:
      'Quienes buscan oportunidades laborales o encargos técnicos suelen depender de canales informales donde es difícil demostrar habilidades concretas y dar seguimiento transparente a cada postulación.',
    propuesta:
      'Estructurar perfiles por capacidades reales, publicar oportunidades con criterios claros y conectar talento con empleadores dentro de un flujo trazable de principio a fin.',
    stack: ['React', 'TypeScript', 'Node / Express', 'Prisma', 'PostgreSQL', 'Tailwind', 'JWT'],
    destacados: [
      'Dominio centrado en perfiles de habilidades, vacantes, postulaciones y estados de selección.',
      'Control de acceso por rol para talento, publicadores de oportunidades y administración.',
      'Búsqueda y filtrado por habilidades técnicas, modalidad y disponibilidad.',
      'Arquitectura modular pensada para crecer desde encargos locales hasta contratación continua.',
    ],
    evidencia: [
      {
        tipo: 'arquitectura',
        detalle: 'Modelado relacional de perfiles, habilidades, vacantes y flujo de postulación',
        verificado: true,
      },
      {
        tipo: 'fullstack',
        detalle: 'Interfaz reactiva conectada a API REST con validación de esquemas y sesiones',
        verificado: true,
      },
    ],
    pendientes: ['Publicar demo con perfiles de ejemplo', 'Enlazar repositorio público'],
    sensible: false,
  },
  {
    id: 'arami',
    flowerIndex: 1,
    flowerNumber: '02',
    flowerTone: 'Coral Guayacán',
    branchLabel: 'Rama Central · Operación Gastronómica',
    accentColor: '#ff70a6',
    glowColor: '#ff9ebb',
    fallbackScreen: { x: 57.5, y: 54.0 },
    nombre: 'Arami',
    preview: 'Pedidos e inventario para el día a día de un restaurante.',
    subtitulo: 'Sistema de gestión de restaurante, pedidos e inventario',
    editorialHook:
      'Sincroniza salón, cocina, administración e inventario para operar un restaurante en tiempo real sin fricción.',
    coreStack: ['TypeScript', 'Node / Express', 'Prisma'],
    tier: 'alto',
    tierLabel: 'Flor protagonista',
    tierShort: 'Protagonista',
    puntaje: 4.5,
    estado: 'Sistema full-stack desarrollado',
    periodo: '2026',
    rol: 'Arquitectura, dominio operativo, backend y frontend',
    demo: null,
    repositorio: null,
    hasDemo: false,
    hasRepo: false,
    resumen:
      'Sistema de gestión de restaurante, pedidos, administración e inventario diseñado para sincronizar salón, cocina y control de insumos en tiempo real.',
    problema:
      'Cuando las comandas, la caja y el inventario de un restaurante se gestionan por separado, aparecen errores en cocina, platillos vendidos sin existencias y cierres de turno lentos.',
    propuesta:
      'Unificar la operación diaria en un solo sistema: toma de pedidos ágil, estados de preparación en cocina, control de inventario e insumos y panel administrativo de ventas.',
    stack: ['React', 'Vite', 'TypeScript', 'Node / Express', 'Prisma', 'PostgreSQL', 'Tailwind'],
    destacados: [
      'Flujo operativo completo desde la toma del pedido hasta la entrega y el cierre de cuenta.',
      'Control de catálogo gastronómico, categorías, existencias e insumos críticos.',
      'Panel de administración con seguimiento de órdenes activas y resumen operativo.',
      'Validación de disponibilidad en el dominio antes de confirmar cada comanda.',
    ],
    evidencia: [
      {
        tipo: 'dominio',
        detalle: 'Módulos integrados de pedidos, carta, administración e inventario',
        verificado: true,
      },
      {
        tipo: 'interfaz',
        detalle: 'Flujo optimizado para operación rápida en salón, cocina y caja',
        verificado: true,
      },
    ],
    pendientes: ['Desplegar entorno de demostración con carta de prueba', 'Agregar capturas operativas'],
    sensible: false,
  },
  {
    id: 'laboratorios-interactivos',
    flowerIndex: 2,
    flowerNumber: '03',
    flowerTone: 'Violeta Amatista',
    branchLabel: 'Rama Alta · Simulación Educativa',
    accentColor: '#c77dff',
    glowColor: '#e0aaff',
    fallbackScreen: { x: 64.5, y: 26.5 },
    nombre: 'Laboratorios Interactivos',
    preview: 'Simuladores para experimentar con circuitos, redes y lógica.',
    subtitulo: 'Simuladores de computación, redes, electricidad y lógica',
    editorialHook:
      'Cuatro simuladores donde la electricidad, la arquitectura de computadores, las redes y la lógica se aprenden viendo el sistema por dentro.',
    coreStack: ['Three.js', 'TypeScript', 'Vitest'],
    tier: 'alto',
    tierLabel: 'Flor protagonista',
    tierShort: 'Protagonista',
    puntaje: 4.4,
    estado: '4 laboratorios funcionales (Tridente + TruthForge)',
    periodo: '2026',
    rol: 'Dominio, motores de simulación, frontend 2D/3D e IA',
    demo: null,
    repositorio: null,
    hasDemo: false,
    hasRepo: false,
    resumen:
      'Proyecto educativo con simuladores de computación, redes, electricidad y lógica donde cada concepto se aprende armando, midiendo y viendo el sistema por dentro en 2D y 3D.',
    problema:
      'La electricidad, la arquitectura de computadores, las redes y la lógica suelen enseñarse con diagramas estáticos y cajas negras; el estudiante memoriza fórmulas sin ver qué ocurre cuando falla un componente.',
    propuesta:
      'Construir motores de dominio puros (análisis nodal, compuertas a CPU, enrutamiento salto a salto y AST lógico) conectados a vistas 2D para construir y 3D para comprender sobre un mismo estado.',
    stack: ['React', 'Vite', 'TypeScript', 'Three.js', 'Express', 'PostgreSQL', 'Groq', 'Vitest', 'Docker'],
    destacados: [
      'Electric Lab: motor puro en src/domain/circuit/solve.ts con análisis nodal, Ley de Ohm, multímetro, osciloscopio, 8 lecciones y vistas 2D/3D.',
      'Logic Forge: progresión desde una señal y una compuerta hasta ALU, CPU y programa, con tutor de IA en Groq y 14 archivos de prueba.',
      'Packet Forge: simulación de redes donde cada envío mueve un paquete un salto por vez en 2D y 3D solo si el camino existe.',
      'TruthForge: motor de lógica proposicional aislado en packages/@truthforge/logic-engine con parser, AST y evaluador compartido.',
    ],
    evidencia: [
      {
        tipo: 'tests',
        detalle: '25 archivos de prueba entre Logic Forge (14), TruthForge (5), Electric Lab (4) y Packet Forge (2)',
        verificado: true,
      },
      {
        tipo: 'arquitectura',
        detalle: 'docs/arquitectura.md, docs/construccion.md, PRD v1.0 y motores desacoplados de la UI',
        verificado: true,
      },
      {
        tipo: 'docker',
        detalle: 'Entornos reproducibles con Docker Compose y paquetes compartidos en monorepo',
        verificado: true,
      },
    ],
    pendientes: ['Publicar demos unificadas del Tridente Tecnológico', 'Agregar capturas comparativas 2D/3D'],
    sensible: false,
    subProjects: LAB_SUBPROJECTS,
  },
  {
    ...guardianesBase,
    id: 'guardianes',
    flowerIndex: 3,
    flowerNumber: '04',
    flowerTone: 'Turquesa del Cauca',
    branchLabel: 'Rama Oriental · Territorio y Memoria',
    accentColor: '#72efdd',
    glowColor: '#a9def9',
    fallbackScreen: { x: 75.0, y: 44.5 },
    nombre: 'Guardianes de los Ríos de Caldono',
    preview: 'Observación ambiental y cartografía comunitaria.',
    subtitulo: guardianesBase.subtitulo ?? 'Plataforma comunitaria de Caldono',
    editorialHook:
      'Plataforma comunitaria de observación ambiental, cartografía y memoria viva para proteger los ríos de Caldono.',
    coreStack: ['React', 'Three.js', 'FastAPI / Node'],
    tier: 'alto',
    tierLabel: 'Flor protagonista',
    tierShort: 'Protagonista',
    resumen:
      guardianesBase.resumen ??
      'Plataforma comunitaria de observación ambiental, memoria y protección de los ríos de Caldono, Cauca.',
  },
]

export const SECTIONS = [
  {
    id: 'raices',
    nav: 'Raíces',
    kicker: 'Sobre mí',
    titleLead: 'Me interesa lo que ocurre',
    titleEmphasis: 'antes del código.',
    intro:
      'Soy Andrés, desarrollador de software. Cuando empiezo un proyecto, quiero entender quién lo va a usar, qué intenta hacer y en qué punto se le complica.',
  },
  {
    id: 'tronco',
    nav: 'Tronco',
    kicker: 'Trayectoria',
    titleLead: 'Aprendí',
    titleEmphasis: 'construyendo.',
    intro:
      'Empecé haciendo simuladores para entender cómo funcionan los circuitos y las redes. Luego llevé esa curiosidad a proyectos con problemas muy distintos, desde conectar talento con oportunidades hasta apoyar el monitoreo de ríos en Caldono.',
  },
  {
    id: 'ramas',
    nav: 'Ramas',
    kicker: 'Lo que hago',
    titleLead: 'Me gusta hacer software',
    titleEmphasis: 'que se pueda explorar.',
    intro:
      'Trabajo tanto en la interfaz que tienes delante como en el sistema que la sostiene. Según el proyecto, eso implica modelar datos, diseñar un simulador o integrar IA para resolver una tarea concreta.',
  },
  {
    id: 'flores',
    nav: 'Flores',
    kicker: 'Proyectos',
    protagonists: PROTAGONIST_FLOWERS,
  },
  {
    id: 'semillas',
    nav: 'Semillas',
    kicker: 'Lo que sigue',
    titleLead: '¿Qué podríamos',
    titleEmphasis: 'construir?',
    intro:
      'Me interesa colaborar en productos interactivos, herramientas de aprendizaje y proyectos que acerquen la tecnología a quienes la necesitan.',
    channels: [
      { t: 'Correo', d: 'correo@ejemplo.com', href: 'mailto:correo@ejemplo.com' }, // TODO: correo real
      { t: 'LinkedIn', d: '/in/tu-usuario', href: '#' }, // TODO: enlace real
      { t: 'GitHub', d: '@tu-usuario', href: '#' }, // TODO: enlace real
    ],
  },
]
