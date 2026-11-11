import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { disposeObjectResources, terrainHeight } from './createBaseScene.js'

const MODEL_URL = `${import.meta.env.BASE_URL}models/tree.glb`
const TARGET_HEIGHT = 4.2
const IDENTITY_MATRIX = new THREE.Matrix4()

function hasBranchMaterial(material) {
  if (Array.isArray(material)) {
    for (let i = 0; i < material.length; i++) {
      if (material[i]?.name?.toLowerCase().includes('branch')) return true
    }
    return false
  }
  return Boolean(material?.name?.toLowerCase().includes('branch'))
}

function findTrunkBaseAnchor(root, fallback, precomputedRootBox = null) {
  if (!precomputedRootBox) {
    root.updateMatrixWorld(true)
  }
  const inverseRoot = root.matrixWorld.clone().invert()
  const branchMeshes = []
  const allMeshes = []

  // Intenta primero con mallas de ramas/tronco; si el modelo es horneado o de una sola malla, usa todo el modelo.
  root.traverse((child) => {
    if (!child.isMesh) return
    const positions = child.geometry?.attributes?.position
    if (!positions || positions.count === 0) return
    allMeshes.push(child)
    if (hasBranchMaterial(child.material)) {
      branchMeshes.push(child)
    }
  })

  const targetMeshes = branchMeshes.length > 0 ? branchMeshes : allMeshes
  if (targetMeshes.length === 0) return fallback.clone()

  const point = new THREE.Vector3()
  const meshEntries = targetMeshes.map((mesh) => {
    const toRoot = new THREE.Matrix4().multiplyMatrices(inverseRoot, mesh.matrixWorld)
    const isIdentity = toRoot.equals(IDENTITY_MATRIX)
    return {
      positions: mesh.geometry.attributes.position,
      boundingBox: mesh.geometry.boundingBox,
      toRoot,
      isIdentity,
    }
  })

  let minY = Infinity
  let maxY = -Infinity

  const canUsePrecomputedRootBox =
    precomputedRootBox &&
    !precomputedRootBox.isEmpty() &&
    branchMeshes.length === 0 &&
    root.matrixWorld.equals(IDENTITY_MATRIX) &&
    meshEntries.every((entry) => entry.isIdentity && entry.boundingBox && !entry.boundingBox.isEmpty())

  if (canUsePrecomputedRootBox) {
    minY = precomputedRootBox.min.y
    maxY = precomputedRootBox.max.y
  } else {
    for (let m = 0; m < meshEntries.length; m++) {
      const { positions, boundingBox, toRoot, isIdentity } = meshEntries[m]
      if (isIdentity && boundingBox && !boundingBox.isEmpty()) {
        if (boundingBox.min.y < minY) minY = boundingBox.min.y
        if (boundingBox.max.y > maxY) maxY = boundingBox.max.y
        continue
      }
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(toRoot)
        if (point.y < minY) minY = point.y
        if (point.y > maxY) maxY = point.y
      }
    }
  }

  // El centro de los vértices bajos del tronco da un anclaje más fiel que
  // el centro de la copa, que suele estar desplazado por el volumen de hojas.
  const baseLimit = minY + Math.max((maxY - minY) * 0.065, 0.01)
  let sumX = 0
  let sumZ = 0
  let count = 0

  for (let m = 0; m < meshEntries.length; m++) {
    const { positions, toRoot, isIdentity } = meshEntries[m]
    if (isIdentity) {
      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i)
        if (y > baseLimit) continue
        sumX += positions.getX(i)
        sumZ += positions.getZ(i)
        count++
      }
    } else {
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(toRoot)
        if (point.y > baseLimit) continue
        sumX += point.x
        sumZ += point.z
        count++
      }
    }
  }

  if (!count) return fallback.clone()
  return new THREE.Vector3(sumX / count, minY, sumZ / count)
}

function addCanopyFlowers(leavesMesh, clusterCount = 24) {
  const geometry = leavesMesh.geometry
  const positions = geometry.attributes.position
  if (!positions || positions.count < 3) return

  if (!geometry.attributes.normal) geometry.computeVertexNormals()
  const normals = geometry.attributes.normal
  const index = geometry.index
  const triangleCount = index ? Math.floor(index.count / 3) : Math.floor(positions.count / 3)
  if (!triangleCount) return

  const petalsPerFlower = 5
  const flowerPetals = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 6, 4),
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#4d183d',
      emissiveIntensity: 0.32,
      roughness: 0.62,
    }),
    clusterCount * petalsPerFlower,
  )
  const flowerCenters = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 6, 4),
    new THREE.MeshStandardMaterial({
      color: '#ffd36d',
      emissive: '#ff9a2d',
      emissiveIntensity: 0.24,
      roughness: 0.65,
    }),
    clusterCount,
  )
  flowerPetals.instanceMatrix.setUsage(THREE.StaticDrawUsage)
  flowerCenters.instanceMatrix.setUsage(THREE.StaticDrawUsage)

  const palette = ['#ff46ad', '#ef3f70', '#bf62ff', '#ffbd36'].map((color) => new THREE.Color(color))
  const up = new THREE.Vector3(0, 0, 1)
  const normal = new THREE.Vector3()
  const point = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const na = new THREE.Vector3()
  const nb = new THREE.Vector3()
  const nc = new THREE.Vector3()
  const alignment = new THREE.Quaternion()
  const turn = new THREE.Quaternion()
  const zAxis = new THREE.Vector3(0, 0, 1)
  const instance = new THREE.Object3D()
  let petalIndex = 0

  for (let flower = 0; flower < clusterCount; flower++) {
    const triangle = Math.floor(Math.random() * triangleCount)
    const i0 = index ? index.getX(triangle * 3) : triangle * 3
    const i1 = index ? index.getX(triangle * 3 + 1) : triangle * 3 + 1
    const i2 = index ? index.getX(triangle * 3 + 2) : triangle * 3 + 2
    let u = Math.random()
    let v = Math.random()
    if (u + v > 1) {
      u = 1 - u
      v = 1 - v
    }
    const w = 1 - u - v

    a.fromBufferAttribute(positions, i0)
    b.fromBufferAttribute(positions, i1)
    c.fromBufferAttribute(positions, i2)
    point.copy(a).multiplyScalar(w).addScaledVector(b, u).addScaledVector(c, v)

    na.fromBufferAttribute(normals, i0)
    nb.fromBufferAttribute(normals, i1)
    nc.fromBufferAttribute(normals, i2)
    normal.copy(na).multiplyScalar(w).addScaledVector(nb, u).addScaledVector(nc, v)
    if (normal.lengthSq() < 1e-6) normal.set(point.x, point.y - 74, point.z)
    normal.normalize()
    point.addScaledVector(normal, 0.8)
    alignment.setFromUnitVectors(up, normal)

    instance.position.copy(point)
    instance.quaternion.copy(alignment)
    instance.scale.setScalar(0.48)
    instance.updateMatrix()
    flowerCenters.setMatrixAt(flower, instance.matrix)

    const color = palette[Math.floor(Math.random() * palette.length)]
    for (let petal = 0; petal < petalsPerFlower; petal++) {
      const angle = (petal / petalsPerFlower) * Math.PI * 2
      tangent.set(Math.cos(angle), Math.sin(angle), 0).applyQuaternion(alignment)
      instance.position.copy(point).addScaledVector(tangent, 0.58)
      turn.setFromAxisAngle(zAxis, angle)
      instance.quaternion.copy(alignment).multiply(turn)
      instance.scale.set(0.82, 0.48, 1.15)
      instance.updateMatrix()
      flowerPetals.setMatrixAt(petalIndex, instance.matrix)
      flowerPetals.setColorAt(petalIndex, color)
      petalIndex++
    }
  }

  flowerPetals.instanceMatrix.needsUpdate = true
  flowerCenters.instanceMatrix.needsUpdate = true
  flowerPetals.instanceColor.needsUpdate = true
  flowerPetals.computeBoundingSphere()
  flowerCenters.computeBoundingSphere()
  leavesMesh.add(flowerPetals, flowerCenters)
}

/**
 * Carga el GLB del árbol y lo normaliza:
 * alinea la base del tronco con las raíces y escala a una altura objetivo.
 */
export async function loadTreeModel(scene, onProgress, shouldAbort) {
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(MODEL_URL, (e) => {
    if (shouldAbort?.()) return
    if (e.total > 0) onProgress?.(e.loaded / e.total)
  })

  const root = gltf.scene
  if (shouldAbort?.()) {
    disposeObjectResources(root)
    return null
  }
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const trunkBase = findTrunkBaseAnchor(root, new THREE.Vector3(center.x, box.min.y, center.z), box)

  const scale = TARGET_HEIGHT / Math.max(size.y, 0.001)
  root.scale.setScalar(scale)
  // Alinea el centro del tronco (no el centro visual de la copa) con las raíces.
  root.position.set(
    -trunkBase.x * scale,
    terrainHeight(0, 0) - trunkBase.y * scale,
    -trunkBase.z * scale,
  )

  scene.add(root)
  let meshCount = 0
  const materials = new Set()
  let canopyFlowersAdded = false

  // Conserva la textura del GLB y suma los reflejos dorados/violetas del escenario.
  root.traverse((child) => {
    if (!child.isMesh) return
    const mats = Array.isArray(child.material) ? child.material : [child.material]
    if (!child.isInstancedMesh) {
      meshCount++
      mats.forEach((m) => m && materials.add(m))
    }
    mats.forEach((m) => {
      if (!m || !('emissive' in m)) return

      if (m.name === 'leaves') {
        m.color.set('#e5dcff')
        m.emissive.set('#4c3478')
        m.emissiveIntensity = 0.24
        m.roughness = 0.92
        addCanopyFlowers(child, window.matchMedia?.('(max-width: 700px)').matches ? 14 : 24)
        canopyFlowersAdded = true
      } else if (m.name === 'branches') {
        m.color.set('#b49bbc')
        m.emissive.set('#1c122a')
        m.emissiveIntensity = 0.18
        m.roughness = 0.88
      }
    })
  })
  const finalSize = canopyFlowersAdded
    ? new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3())
    : size.clone().multiplyScalar(scale)

  return {
    root,
    meshCount,
    materialCount: materials.size,
    scaleApplied: scale,
    size: { x: +finalSize.x.toFixed(2), y: +finalSize.y.toFixed(2), z: +finalSize.z.toFixed(2) },
  }
}
