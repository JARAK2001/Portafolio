import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * Escena nocturna del guayacán: cielo violeta, cordilleras en capas y acentos
 * florales instanciados para enriquecer el GLB sin aumentar su peso.
 */

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`

const SKY_FRAG = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uMoonDir;
  uniform vec3 uMoonColor;
  uniform float uTime;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHorizon, uMid, smoothstep(-0.06, 0.4, h));
    col = mix(col, uTop, smoothstep(0.3, 0.82, h));
    col = mix(vec3(0.012, 0.012, 0.035), col, smoothstep(-0.3, 0.02, h));

    float horizonGlow = exp(-abs(h - 0.035) * 15.0);
    col += vec3(0.055, 0.025, 0.12) * horizonGlow;

    float ang = atan(d.x, d.z);
    float band = sin(h * 46.0 + sin(ang * 2.8 + uTime * 0.009) * 1.1 + sin(ang * 6.0) * 0.5);
    float clouds = smoothstep(0.58, 0.97, band)
      * smoothstep(0.035, 0.14, h) * (1.0 - smoothstep(0.2, 0.48, h));
    col = mix(col, vec3(0.27, 0.2, 0.43), clouds * 0.14);

    float moonDot = max(dot(d, normalize(uMoonDir)), 0.0);
    float moonHalo = pow(moonDot, 18.0) * 0.2 + pow(moonDot, 5.0) * 0.035;
    float moonDisc = smoothstep(cos(0.012), cos(0.006), moonDot);
    col += uMoonColor * moonHalo;
    col = mix(col, uMoonColor, moonDisc * 0.95);
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * 0.009;
    gl_FragColor = vec4(col, 1.0);
  }
`

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function terrainHeight(x, z) {
  const r = Math.hypot(x, z)
  const mound = 0.98 * Math.exp(-(r * r) / 28) - 0.58
  const rootRise = 0.2 * Math.exp(-((r - 2.2) ** 2) / 1.8)
  const dip = -smoothstep(7, 19, r) * 1.15
  const noise = 0.14 * Math.sin(x * 0.9 + 1.7) * Math.cos(z * 0.8 - 0.6) * smoothstep(1.2, 6, r)
  return mound + rootRise + dip + noise
}

function buildSky() {
  const mat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: {
      uTop: { value: new THREE.Color('#050713') },
      uMid: { value: new THREE.Color('#11142f') },
      uHorizon: { value: new THREE.Color('#2b204b') },
      uMoonDir: { value: new THREE.Vector3(-0.45, 0.26, -0.86).normalize() },
      uMoonColor: { value: new THREE.Color('#e5e4ff') },
      uTime: { value: 0 },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(70, 40, 28), mat)
  mesh.frustumCulled = false
  return { mesh, mat }
}

function buildStars(count = 360) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const palette = ['#dedcff', '#aaa9e8', '#f1caff'].map((color) => new THREE.Color(color))
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const y = 0.16 + Math.random() * 0.84
    const radius = Math.sqrt(Math.max(0, 1 - y * y)) * 64
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = y * 64
    positions[i * 3 + 2] = Math.sin(angle) * radius
    palette[Math.floor(Math.random() * palette.length)].toArray(colors, i * 3)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size: 1.25,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    fog: false,
  })
  return new THREE.Points(geometry, material)
}

function buildHill() {
  const geometry = new THREE.PlaneGeometry(46, 46, 88, 88)
  const positions = geometry.attributes.position
  const colors = new Float32Array(positions.count * 3)
  const forest = new THREE.Color('#29243f')
  const edge = new THREE.Color('#111322')
  const soil = new THREE.Color('#30233e')
  const warmMoss = new THREE.Color('#725b9c')
  const color = new THREE.Color()

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const z = -positions.getY(i)
    const r = Math.hypot(x, z)
    positions.setZ(i, terrainHeight(x, z))

    color.copy(forest).lerp(edge, smoothstep(7, 19, r))
    color.lerp(soil, 0.8 * (1 - smoothstep(1.1, 4.8, r)))
    const patch = Math.max(0, Math.sin(x * 1.7 + 1.1) * Math.cos(z * 1.45 - 0.8))
      * (1 - smoothstep(2, 13, r))
    color.lerp(warmMoss, patch * 0.18)
    color.toArray(colors, i * 3)
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.98,
    metalness: 0,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  return mesh
}

function buildTreeRoots(count = 7) {
  const group = new THREE.Group()
  const materials = [
    new THREE.MeshStandardMaterial({ color: '#422f48', roughness: 0.96 }),
    new THREE.MeshStandardMaterial({ color: '#604267', roughness: 0.96 }),
  ]
  const rings = 20
  const sides = 8
  const center = new THREE.Vector3()

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.sin(i * 2.1) * 0.16 + (Math.random() - 0.5) * 0.16
    const length = (0.85 + Math.random() * 0.72) * (i % 3 === 0 ? 1.14 : 1)
    const bend = (Math.random() - 0.5) * 0.86
    const points = []
    for (let step = 0; step <= 5; step++) {
      const t = step / 5
      const radius = 0.15 + length * t
      const direction = angle + bend * t
      const x = Math.cos(direction) * radius
      const z = Math.sin(direction) * radius
      const lift = (1 - t) * 0.14 + 0.008
      points.push(new THREE.Vector3(x, terrainHeight(x, z) + lift, z))
    }

    const curve = new THREE.CatmullRomCurve3(points)
    const geometry = new THREE.TubeGeometry(curve, rings, 1, sides, false)
    const position = geometry.attributes.position
    const ringSize = sides + 1
    for (let ring = 0; ring <= rings; ring++) {
      const t = ring / rings
      curve.getPointAt(t, center)
      const radius = (0.11 + 0.025 * Math.sin(i * 1.7)) * Math.pow(1 - t, 1.18) + 0.004
      for (let side = 0; side <= sides; side++) {
        const vertex = ring * ringSize + side
        const offsetX = position.getX(vertex) - center.x
        const offsetY = position.getY(vertex) - center.y
        const offsetZ = position.getZ(vertex) - center.z
        const lengthToCenter = Math.hypot(offsetX, offsetY, offsetZ) || 1
        position.setXYZ(
          vertex,
          center.x + (offsetX / lengthToCenter) * radius,
          center.y + (offsetY / lengthToCenter) * radius,
          center.z + (offsetZ / lengthToCenter) * radius,
        )
      }
    }
    geometry.computeVertexNormals()
    group.add(new THREE.Mesh(geometry, materials[i % materials.length]))
  }
  return group
}

function buildGroundRocks(count = 46) {
  const geometry = new THREE.IcosahedronGeometry(1, 0)
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    roughness: 0.98,
    flatShading: true,
  })
  const rocks = new THREE.InstancedMesh(geometry, material, count)
  rocks.instanceMatrix.setUsage(THREE.StaticDrawUsage)
  const palette = ['#3b3449', '#51435e', '#393b52', '#62506d', '#4b4056'].map((color) => new THREE.Color(color))
  const object = new THREE.Object3D()

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 1.8 + Math.random() * 5.8
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const sx = 0.07 + Math.random() * 0.22
    const sy = 0.045 + Math.random() * 0.13
    const sz = 0.08 + Math.random() * 0.24
    object.position.set(x, terrainHeight(x, z) + sy * 0.36, z)
    object.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.35)
    object.scale.set(sx, sy, sz)
    object.updateMatrix()
    rocks.setMatrixAt(i, object.matrix)
    rocks.setColorAt(i, palette[Math.floor(Math.random() * palette.length)])
  }
  rocks.instanceMatrix.needsUpdate = true
  rocks.instanceColor.needsUpdate = true
  return rocks
}

function buildGroundFlowers(count = 58) {
  const petalsPerFlower = 5
  const geometry = new THREE.SphereGeometry(1, 6, 4)
  const petalMesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#381632',
      emissiveIntensity: 0.42,
      roughness: 0.7,
    }),
    count * petalsPerFlower,
  )
  const centers = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: '#ffd16c',
      emissive: '#ff9c36',
      emissiveIntensity: 0.36,
      roughness: 0.7,
    }),
    count,
  )
  const palette = ['#ffc04c', '#f05cb2', '#bc70f3', '#f18b62'].map((color) => new THREE.Color(color))
  const object = new THREE.Object3D()
  let index = 0

  for (let flower = 0; flower < count; flower++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 2.25 + Math.random() * 5.1
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const size = 0.72 + Math.random() * 0.72
    const color = palette[Math.floor(Math.random() * palette.length)]

    object.position.set(x, terrainHeight(x, z) + 0.02, z)
    object.scale.setScalar(0.026 * size)
    object.updateMatrix()
    centers.setMatrixAt(flower, object.matrix)

    for (let petal = 0; petal < petalsPerFlower; petal++) {
      const petalAngle = (petal / petalsPerFlower) * Math.PI * 2
      const petalX = x + Math.cos(petalAngle) * 0.052 * size
      const petalZ = z + Math.sin(petalAngle) * 0.052 * size
      object.position.set(petalX, terrainHeight(petalX, petalZ) + 0.012, petalZ)
      object.rotation.set(0, -petalAngle, 0)
      object.scale.set(0.05 * size, 0.014 * size, 0.028 * size)
      object.updateMatrix()
      petalMesh.setMatrixAt(index, object.matrix)
      petalMesh.setColorAt(index, color)
      index++
    }
  }
  petalMesh.instanceMatrix.needsUpdate = true
  centers.instanceMatrix.needsUpdate = true
  petalMesh.instanceColor.needsUpdate = true
  return new THREE.Group().add(petalMesh, centers)
}

function ridgeProfile(angle, phase) {
  const broad = Math.sin(angle * 2.6 + phase) * 0.22
  const middle = Math.sin(angle * 5.4 - phase * 1.5) * 0.13
  const fine = Math.cos(angle * 9.2 + phase * 0.8) * 0.065
  const summits = Math.pow(Math.max(0, Math.sin(angle * 7.1 + phase * 0.45)), 4) * 0.14
  return Math.min(0.98, Math.max(0.3, 0.58 + broad + middle + fine + summits))
}

function buildMountainRange({ innerRadius, peakRadius, outerRadius, height, baseY, phase, baseColor, peakColor }) {
  const angularSegments = 224
  const radialSegments = 16
  const positions = []
  const colors = []
  const indices = []
  const low = new THREE.Color(baseColor)
  const high = new THREE.Color(peakColor)
  const vertexColor = new THREE.Color()
  const peakT = (peakRadius - innerRadius) / (outerRadius - innerRadius)

  for (let aIndex = 0; aIndex <= angularSegments; aIndex++) {
    const angle = (aIndex / angularSegments) * Math.PI * 2
    const ridge = ridgeProfile(angle, phase)
    const ridgeHeight = height * ridge
    for (let rIndex = 0; rIndex <= radialSegments; rIndex++) {
      const t = rIndex / radialSegments
      const radius = THREE.MathUtils.lerp(innerRadius, outerRadius, t)
      const rise = smoothstep(0, peakT, t)
      const fall = 1 - smoothstep(peakT, 1, t)
      const profile = rise * fall
      const y = baseY + ridgeHeight * profile
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius)

      const altitude = Math.min(1, profile * ridge * 0.72)
      vertexColor.copy(low).lerp(high, altitude)
      vertexColor.multiplyScalar(0.9 + ridge * 0.1)
      vertexColor.toArray(colors, (aIndex * (radialSegments + 1) + rIndex) * 3)
    }
  }

  const row = radialSegments + 1
  for (let aIndex = 0; aIndex < angularSegments; aIndex++) {
    for (let rIndex = 0; rIndex < radialSegments; rIndex++) {
      const i = aIndex * row + rIndex
      const nextAngle = i + row
      // Orden de vértices hacia arriba para una iluminación natural.
      indices.push(i, nextAngle, i + 1, nextAngle, nextAngle + 1, i + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    flatShading: false,
    emissive: '#17112f',
    emissiveIntensity: 0.18,
  }))
}

function buildMountains() {
  const group = new THREE.Group()
  group.add(
    buildMountainRange({
      innerRadius: 14,
      peakRadius: 18.5,
      outerRadius: 24,
      height: 3.55,
      baseY: -2.05,
      phase: 0.7,
      baseColor: '#17182d',
      peakColor: '#39345b',
    }),
    buildMountainRange({
      innerRadius: 21,
      peakRadius: 28,
      outerRadius: 36,
      height: 4.6,
      baseY: -2.55,
      phase: 2.1,
      baseColor: '#15172c',
      peakColor: '#4c3d72',
    }),
    buildMountainRange({
      innerRadius: 32,
      peakRadius: 40,
      outerRadius: 52,
      height: 5.65,
      baseY: -3.1,
      phase: 4.2,
      baseColor: '#0c1022',
      peakColor: '#34365f',
    }),
  )
  return group
}

function buildLightPool() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(196, 174, 255, 0.34)')
  gradient.addColorStop(0.34, 'rgba(151, 115, 226, 0.19)')
  gradient.addColorStop(0.68, 'rgba(175, 88, 198, 0.07)')
  gradient.addColorStop(1, 'rgba(175, 88, 198, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    opacity: 0.42,
  })
  const geometry = new THREE.PlaneGeometry(11, 11, 32, 32)
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const z = -positions.getY(i)
    positions.setZ(i, terrainHeight(x, z) + 0.025)
  }
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  return mesh
}

function buildFireflies(count = 100) {
  const base = new Float32Array(count * 3)
  const phase = new Float32Array(count)
  const colors = new Float32Array(count * 3)
  const palette = ['#d7c9ff', '#ff78d1', '#a991ff'].map((color) => new THREE.Color(color))

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 1.6 + Math.random() * 4.9
    base[i * 3] = Math.cos(angle) * radius
    base[i * 3 + 1] = 0.35 + Math.random() * 3.9
    base[i * 3 + 2] = Math.sin(angle) * radius
    phase[i] = Math.random() * Math.PI * 2
    const paletteIndex = Math.random() < 0.55 ? 0 : Math.random() < 0.72 ? 1 : 2
    palette[paletteIndex].toArray(colors, i * 3)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size: 0.075,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  return { points: new THREE.Points(geometry, material), base, phase, count }
}

function buildValleyLights(count = 120) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const palette = ['#c6b7ff', '#a890ed', '#f09add'].map((color) => new THREE.Color(color))

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 8.2 + Math.random() * 8.5
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    positions[i * 3] = x
    positions[i * 3 + 1] = terrainHeight(x, z) + 0.045 + Math.random() * 0.09
    positions[i * 3 + 2] = z
    const paletteIndex = Math.random() < 0.72 ? 0 : Math.random() < 0.8 ? 1 : 2
    palette[paletteIndex].toArray(colors, i * 3)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size: 0.09,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  return new THREE.Points(geometry, material)
}

function createPetalGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(-0.08, 0.06, -0.13, 0.18, -0.035, 0.31)
  shape.bezierCurveTo(-0.005, 0.35, 0.005, 0.35, 0.035, 0.31)
  shape.bezierCurveTo(0.13, 0.18, 0.08, 0.06, 0, 0)
  return new THREE.ShapeGeometry(shape, 6)
}

function buildPetals(count = 54) {
  const geometry = createPetalGeometry()
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#59213e',
    emissiveIntensity: 0.34,
    roughness: 0.55,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
  })
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false

  const baseX = new Float32Array(count)
  const baseY = new Float32Array(count)
  const baseZ = new Float32Array(count)
  const phase = new Float32Array(count)
  const speed = new Float32Array(count)
  const scale = new Float32Array(count)
  const tilt = new Float32Array(count)
  const palette = ['#ffc84d', '#ff62b4', '#d176ff', '#f75c7d'].map((color) => new THREE.Color(color))

  for (let i = 0; i < count; i++) {
    baseX[i] = (Math.random() * 2 - 1) * 6.4
    baseY[i] = 0.55 + Math.random() * 4.6
    baseZ[i] = (Math.random() * 2 - 1) * 5.6
    phase[i] = Math.random()
    speed[i] = 0.12 + Math.random() * 0.11
    scale[i] = 0.38 + Math.random() * 0.78
    tilt[i] = (Math.random() * 2 - 1) * 0.55
    mesh.setColorAt(i, palette[Math.floor(Math.random() * palette.length)])
  }
  mesh.instanceColor.needsUpdate = true

  const object = new THREE.Object3D()
  function update(time) {
    for (let i = 0; i < count; i++) {
      const fall = (time * speed[i] + phase[i]) % 1
      object.position.set(
        baseX[i] + Math.sin(time * 0.42 + phase[i] * 8) * 0.55,
        0.45 + ((baseY[i] - 0.45 - fall * 3.5 + 7.0) % 4.8),
        baseZ[i] + Math.cos(time * 0.31 + phase[i] * 6) * 0.38,
      )
      object.rotation.set(tilt[i] + Math.sin(time * 0.7 + phase[i] * 5) * 0.28, 0, phase[i] * Math.PI * 2 + time * 0.2)
      object.scale.setScalar(scale[i])
      object.updateMatrix()
      mesh.setMatrixAt(i, object.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  update(0)
  return { mesh, update }
}

function buildForegroundPetals(count = 12) {
  const scene = new THREE.Scene()
  const mesh = new THREE.InstancedMesh(
    createPetalGeometry(),
    new THREE.MeshBasicMaterial({
      color: '#ffffff',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      toneMapped: false,
    }),
    count,
  )
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false
  const startX = new Float32Array(count)
  const startY = new Float32Array(count)
  const depth = new Float32Array(count)
  const speed = new Float32Array(count)
  const size = new Float32Array(count)
  const phase = new Float32Array(count)
  const spin = new Float32Array(count)
  const palette = ['#e1d4ff', '#f59bdf', '#ae9aff', '#ffe0b4'].map((color) => new THREE.Color(color))

  for (let i = 0; i < count; i++) {
    startX[i] = (Math.random() * 2 - 1) * 1.24
    startY[i] = (Math.random() * 2 - 1) * 2.45
    depth[i] = 1.65 + Math.random() * 1.35
    speed[i] = 0.28 + Math.random() * 0.28
    size[i] = 0.15 + Math.random() * 0.12
    phase[i] = Math.random() * Math.PI * 2
    spin[i] = (Math.random() * 2 - 1) * 0.8
    mesh.setColorAt(i, palette[Math.floor(Math.random() * palette.length)])
  }
  mesh.instanceColor.needsUpdate = true
  scene.add(mesh)

  const cameraPosition = new THREE.Vector3()
  const forward = new THREE.Vector3()
  const right = new THREE.Vector3()
  const up = new THREE.Vector3()
  const worldPosition = new THREE.Vector3()
  const localZ = new THREE.Vector3(0, 0, 1)
  const rotation = new THREE.Quaternion()
  const turn = new THREE.Quaternion()
  const instance = new THREE.Object3D()

  function update(time, camera) {
    camera.updateMatrixWorld()
    camera.getWorldPosition(cameraPosition)
    camera.getWorldDirection(forward)
    right.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
    up.setFromMatrixColumn(camera.matrixWorld, 1).normalize()
    rotation.copy(camera.quaternion)

    for (let i = 0; i < count; i++) {
      const d = depth[i]
      const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * d
      const halfWidth = halfHeight * camera.aspect
      const x = startX[i] + Math.sin(time * 0.46 + phase[i]) * 0.11
      const y = (((startY[i] - time * speed[i] + 2.55) % 5.1) + 5.1) % 5.1 - 2.55
      worldPosition.copy(cameraPosition)
        .addScaledVector(forward, d)
        .addScaledVector(right, x * halfWidth)
        .addScaledVector(up, y * halfHeight)

      instance.position.copy(worldPosition)
      instance.quaternion.copy(rotation)
      turn.setFromAxisAngle(localZ, time * spin[i] + phase[i])
      instance.quaternion.multiply(turn)
      instance.scale.setScalar(size[i])
      instance.updateMatrix()
      mesh.setMatrixAt(i, instance.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  return { scene, update }
}

export function createBaseScene(canvas, foregroundCanvas = null) {
  const isSmallScreen = window.matchMedia?.('(max-width: 700px)').matches ?? false
  const pixelRatio = Math.min(window.devicePixelRatio || 1, isSmallScreen ? 1.35 : 1.65)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(pixelRatio)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08

  let foregroundRenderer = null
  if (foregroundCanvas) {
    try {
      foregroundRenderer = new THREE.WebGLRenderer({ canvas: foregroundCanvas, alpha: true, antialias: true })
      foregroundRenderer.setPixelRatio(pixelRatio)
      foregroundRenderer.outputColorSpace = THREE.SRGBColorSpace
      foregroundRenderer.setClearColor(0x000000, 0)
    } catch (err) {
      console.warn('[Portafolio] No se pudo crear la capa frontal de pétalos:', err)
    }
  }

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog('#151428', 30, 78)

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 180)
  camera.position.set(5.4, 2.5, 7.4)

  const ambient = new THREE.HemisphereLight('#c5b9ff', '#191426', 0.78)
  const moonlight = new THREE.DirectionalLight('#c8caff', 1.15)
  moonlight.position.set(-9, 10, -18)
  const violetRim = new THREE.DirectionalLight('#a875ff', 0.82)
  violetRim.position.set(-6, 5, -7)
  const pinkFill = new THREE.DirectionalLight('#e283d2', 0.34)
  pinkFill.position.set(7, 2.5, 4)
  const bloomLight = new THREE.PointLight('#c76cff', 6, 9, 2)
  bloomLight.position.set(1.1, 3.1, -0.6)
  scene.add(ambient, moonlight, violetRim, pinkFill, bloomLight)

  const { mesh: sky, mat: skyMaterial } = buildSky()
  const stars = buildStars(isSmallScreen ? 260 : 440)
  const hill = buildHill()
  const roots = buildTreeRoots(isSmallScreen ? 6 : 7)
  const rocks = buildGroundRocks(isSmallScreen ? 30 : 46)
  const groundFlowers = buildGroundFlowers(isSmallScreen ? 36 : 58)
  const mountains = buildMountains()
  const pool = buildLightPool()
  const fire = buildFireflies(isSmallScreen ? 64 : 100)
  const valleyLights = buildValleyLights(isSmallScreen ? 72 : 120)
  const petals = buildPetals(isSmallScreen ? 30 : 54)
  const foregroundPetals = foregroundRenderer
    ? buildForegroundPetals(isSmallScreen ? 7 : 12)
    : null
  scene.add(sky, stars, hill, mountains, pool, roots, rocks, groundFlowers, fire.points, valleyLights, petals.mesh)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.target.set(0, 2.0, 0)
  controls.minDistance = 3
  controls.maxDistance = 14
  controls.maxPolarAngle = Math.PI * 0.495
  controls.enablePan = false
  controls.autoRotate = false

  function resize(width, height) {
    renderer.setSize(width, height, false)
    foregroundRenderer?.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  function tick(time) {
    skyMaterial.uniforms.uTime.value = time
    const positions = fire.points.geometry.attributes.position
    for (let i = 0; i < fire.count; i++) {
      positions.array[i * 3] = fire.base[i * 3] + Math.sin(time * 0.23 + fire.phase[i] * 1.7) * 0.28
      positions.array[i * 3 + 1] = fire.base[i * 3 + 1] + Math.sin(time * 0.7 + fire.phase[i]) * 0.22
    }
    positions.needsUpdate = true
    petals.update(time)
    foregroundPetals?.update(time, camera)
    pool.material.opacity = 0.38 + 0.06 * Math.sin(time * 0.72)
  }

  function dispose() {
    controls.dispose()
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : []
      materials.forEach((material) => {
        if (material.map) material.map.dispose()
        material.dispose()
      })
    })
    if (foregroundPetals) {
      foregroundPetals.scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) object.material.dispose()
      })
    }
    foregroundRenderer?.dispose()
    renderer.dispose()
  }

  return {
    renderer,
    scene,
    camera,
    controls,
    foregroundRenderer,
    foregroundScene: foregroundPetals?.scene,
    resize,
    tick,
    dispose,
  }
}
