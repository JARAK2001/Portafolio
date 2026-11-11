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
  lede:
    'Desarrollo software para entender y para usar: IA aplicada, simulación educativa y plataformas con impacto. Una conversación que se vuelve compra, una voz que se vuelve memoria, un río que se vuelve mapa.',
  availability: 'Abierto a oportunidades',
}

/** Proyectos ordenados por relevancia (campo `orden` de la fuente). */
export const PROJECTS = [...proyectosData.proyectos]
  .sort((a, b) => a.orden - b.orden)
  .map((project) => ({
    ...project,
    tierLabel: TIER_META[project.tier]?.label ?? project.tier,
    tierShort: TIER_META[project.tier]?.short ?? project.tier,
    hasDemo: Boolean(project.demo),
    hasRepo: Boolean(project.repositorio),
  }))

export const PROJECT_STATS = {
  total: PROJECTS.length,
  alto: PROJECTS.filter((project) => project.tier === 'alto').length,
  medio: PROJECTS.filter((project) => project.tier === 'medio').length,
  bajo: PROJECTS.filter((project) => project.tier === 'bajo').length,
}

export const SECTIONS = [
  {
    id: 'raices',
    nav: 'Sobre mí',
    kicker: 'Raíces · Origen y fundamentos',
    title: 'Hola, soy Andrés',
    intro:
      'Soy Andrés Cifuentes, desarrollador de software. Aprendo construyendo: simuladores, plataformas y sistemas de IA. Disfruto tanto el dominio —un motor de lógica, un circuito, un embudo de ventas— como la interfaz que lo hace comprensible.',
    points: [
      {
        t: 'Primero el problema, después el stack',
        d: 'La tecnología se elige por lo que el sistema necesita, no por moda.',
      },
      {
        t: 'El dominio manda',
        d: 'Motores puros e interfaces delgadas. Si la regla de negocio no se puede probar sin la UI, está en el lugar equivocado.',
      },
      {
        t: 'La IA propone, el sistema valida',
        d: 'Un modelo no fija precios, no inventa productos y no oculta fallos.',
      },
      {
        t: 'Lo que falla debe verse',
        d: 'Mejor un error visible que un dato falso con la forma correcta.',
      },
      {
        t: 'Documentar es construir',
        d: 'Un README, un diagrama y una decisión escrita valen tanto como el código.',
      },
    ],
  },
  {
    id: 'tronco',
    nav: 'Recorrido',
    kicker: 'Tronco · Camino recorrido',
    title: 'Cómo llegué aquí',
    intro:
      'El tronco sostiene el árbol: la formación, la práctica y las decisiones que fueron dando forma a mi manera de construir.',
    points: [
      {
        t: 'Formación',
        d: 'Bases en desarrollo de software, con práctica constante en proyectos reales y laboratorios propios.',
      },
      {
        t: 'Evolución',
        d: 'De simuladores educativos a plataformas full-stack con IA, pagos y trabajo comunitario.',
      },
      {
        t: 'Aprendizaje clave',
        d: 'Primero que funcione, después que brille: claridad y rendimiento antes que efectos.',
      },
      {
        t: 'Forma de trabajar',
        d: 'Del problema al dominio, del dominio a la interfaz. Documentar mientras se construye.',
      },
    ],
  },
  {
    id: 'ramas',
    nav: 'Habilidades',
    kicker: 'Ramas · Áreas de conocimiento',
    title: 'Con qué construyo',
    intro:
      'Tecnologías que puedo defender con un proyecto. Cada grupo incluye dónde se ve, porque una habilidad sin evidencia es solo una lista.',
    groups: [
      {
        t: 'Frontend',
        items: ['React', 'Vite', 'Next.js', 'TypeScript', 'Tailwind', 'Zustand', 'TanStack Query'],
        where: 'Fantasías, Guardianes, Árbol de las Estaciones',
      },
      {
        t: 'Backend',
        items: ['Node / Express', 'FastAPI', 'Prisma', 'SQLAlchemy', 'Zod', 'Pydantic'],
        where: 'Fantasías, Cerebro Voz, Guardianes',
      },
      {
        t: 'Datos',
        items: ['PostgreSQL', 'SQLite', 'Qdrant', 'Alembic', 'Prisma Migrate', 'pgvector'],
        where: 'Cerebro Voz, Fantasías',
      },
      {
        t: 'IA',
        items: ['OpenAI', 'OpenRouter', 'Groq', 'AssemblyAI', 'Jina', 'Embeddings', 'RAG', 'Diarización'],
        where: 'Fantasías, Cerebro Voz, NutriIA',
      },
      {
        t: 'Móvil',
        items: ['Kotlin', 'Jetpack Compose', 'Retrofit', 'Servicios en primer plano'],
        where: 'Cerebro Voz',
      },
      {
        t: '3D',
        items: ['Three.js', 'React Three Fiber', 'drei', 'rapier', 'GLB'],
        where: 'Árbol de las Estaciones, Guardianes, Tridente',
      },
      {
        t: 'Infraestructura',
        items: ['Docker', 'Railway', 'Vercel', 'Sentry', 'Cloudinary', 'Wompi'],
        where: 'Fantasías, Cerebro Voz, Guardianes',
      },
      {
        t: 'Prácticas',
        items: ['Vitest', 'Cypress', 'pytest', 'Monorepos', 'Documentación', 'Análisis de riesgo'],
        where: 'Fantasías, Cerebro Voz, Tridente',
      },
    ],
  },
  {
    id: 'flores',
    nav: 'Proyectos',
    kicker: 'Flores · Proyectos',
    title: 'Lo que he construido',
    intro:
      `${PROJECT_STATS.total} proyectos ordenados por impacto: ${PROJECT_STATS.alto} de alto impacto, ${PROJECT_STATS.medio} en evolución y ${PROJECT_STATS.bajo} experimentos. Abre una ficha para ver el problema, la propuesta y la evidencia.`,
    series: {
      title: 'Tridente Tecnológico',
      text:
        'Electric Lab, Logic Forge y Packet Forge comparten una tesis: aprender construyendo. Un circuito, una computadora y una red que se pueden tocar, medir y romper sin miedo.',
    },
    note:
      'Fantasías es contenido para adultos. Su ficha describe el producto y la arquitectura, sin imágenes explícitas. Los proyectos sin demo publicada se presentan con su estado real.',
    projects: PROJECTS,
  },
  {
    id: 'semillas',
    nav: 'Contacto',
    kicker: 'Semillas · Futuro y contacto',
    title: 'Hablemos',
    intro:
      'Estoy abierto a oportunidades donde pueda construir sistemas con impacto: productos con IA, plataformas educativas o herramientas para comunidades. Si tienes una idea o un proyecto, hablemos.',
    channels: [
      { t: 'Correo', d: 'correo@ejemplo.com', href: 'mailto:correo@ejemplo.com' }, // TODO: correo real
      { t: 'LinkedIn', d: '/in/tu-usuario', href: '#' }, // TODO: enlace real
      { t: 'GitHub', d: '@tu-usuario', href: '#' }, // TODO: enlace real
    ],
    contactNote:
      'Los canales directos se publicarán antes del lanzamiento. Mientras tanto, cada ficha reúne la evidencia disponible del proyecto.',
  },
]
