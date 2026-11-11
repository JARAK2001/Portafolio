/**
 * Sincroniza la fuente de verdad del portafolio con el contenido del sitio.
 *
 * La base vive en `investigacion/portafolio/datos/proyectos.json`; este script
 * la copia a `src/content/proyectos.json` para que Vite la empaquete.
 *
 * Uso:
 *   npm run sync:content
 *
 * Si la fuente no existe (por ejemplo, al clonar solo el sitio), se conserva
 * la copia local y se avisa sin romper el build.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const source = process.env.PORTFOLIO_DATA
  ? path.resolve(process.env.PORTFOLIO_DATA)
  : path.resolve(projectRoot, '../../investigacion/portafolio/datos/proyectos.json')
const targetDir = path.resolve(projectRoot, 'src/content')
const target = path.join(targetDir, 'proyectos.json')

if (!existsSync(source)) {
  console.warn(
    `[sync-content] No se encontró la fuente en ${source}.\n` +
      'Se conserva la copia local de src/content/proyectos.json.',
  )
  process.exit(0)
}

await mkdir(targetDir, { recursive: true })
const data = JSON.parse(await readFile(source, 'utf8'))
// Elimina rutas locales privadas del sistema recursivamente antes de empaquetar para producción
function stripRutaLocal(obj) {
  if (!obj || typeof obj !== 'object') return
  for (const k of Object.keys(obj)) {
    if (k === 'rutaLocal') {
      delete obj[k]
    } else {
      stripRutaLocal(obj[k])
    }
  }
}
stripRutaLocal(data)
await writeFile(target, JSON.stringify(data, null, 2) + '\n', 'utf8')

const total = data.proyectos?.length ?? 0
const tiers = (data.proyectos ?? []).reduce((acc, project) => {
  acc[project.tier] = (acc[project.tier] ?? 0) + 1
  return acc
}, {})

console.log(
  `[sync-content] ${total} proyectos sincronizados ` +
    `(alto: ${tiers.alto ?? 0}, medio: ${tiers.medio ?? 0}, bajo: ${tiers.bajo ?? 0}).`,
)
