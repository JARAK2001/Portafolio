import * as THREE from 'three'

/**
 * Aplicación — viaje de cámara guiado por el scroll.
 * 6 paradas: hero + 5 secciones (raíces → semillas).
 * Interpolación con suavizado para no marear (doc §9).
 */
const STOPS = [
  { pos: [5.4, 2.5, 7.4], tgt: [0, 2.0, 0] }, // hero: plano general
  { pos: [2.6, 0.7, 4.4], tgt: [0, 0.7, 0] }, // raíces: bajo, cerca del suelo
  { pos: [-3.6, 1.7, 4.4], tgt: [0, 1.8, 0] }, // tronco: lateral medio
  { pos: [4.6, 2.9, 4.6], tgt: [0, 2.8, 0] }, // ramas: alto, copa
  { pos: [-2.9, 3.5, 4.0], tgt: [0, 3.2, 0] }, // flores: entre la copa
  { pos: [6.4, 3.6, 8.8], tgt: [0, 2.2, 0] }, // semillas: retirada final
].map((s) => ({ pos: new THREE.Vector3(...s.pos), tgt: new THREE.Vector3(...s.tgt) }))

function smootherstep(x) {
  const t = Math.min(1, Math.max(0, x))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/** progress 0..1 → { position, target } (vectores nuevos). */
export function getJourney(progress) {
  const p = Math.min(1, Math.max(0, progress)) * (STOPS.length - 1)
  const i = Math.min(STOPS.length - 2, Math.floor(p))
  const f = smootherstep(p - i)
  return {
    position: STOPS[i].pos.clone().lerp(STOPS[i + 1].pos, f),
    target: STOPS[i].tgt.clone().lerp(STOPS[i + 1].tgt, f),
  }
}

export const STOP_IDS = ['inicio', 'raices', 'tronco', 'ramas', 'flores', 'semillas']
