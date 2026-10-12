import * as THREE from "three";

export type VectorTuple = [number, number, number];

// Rounded ears with thickness, a raised fur rim, and a recessed inner surface.
export function createEarGeometry() {
  const outline = new THREE.Shape();
  outline.moveTo(-0.225, 0);
  outline.quadraticCurveTo(-0.21, 0.27, -0.065, 0.54);
  outline.quadraticCurveTo(0, 0.605, 0.065, 0.54);
  outline.quadraticCurveTo(0.21, 0.27, 0.225, 0);
  outline.quadraticCurveTo(0, -0.06, -0.225, 0);
  return new THREE.ExtrudeGeometry(outline, {
    depth: 0.055, steps: 1, bevelEnabled: true, bevelSegments: 3,
    bevelSize: 0.025, bevelThickness: 0.022, curveSegments: 18,
  });
}

export function createInnerEarGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.14, 0.055);
  shape.quadraticCurveTo(-0.12, 0.24, -0.035, 0.445);
  shape.quadraticCurveTo(0, 0.48, 0.035, 0.445);
  shape.quadraticCurveTo(0.12, 0.24, 0.14, 0.055);
  shape.quadraticCurveTo(0, 0.005, -0.14, 0.055);
  const geometry = new THREE.ShapeGeometry(shape, 18);
  const position = geometry.getAttribute("position");
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index);
    const y = position.getY(index);
    position.setZ(index, 0.084 - 0.026 * Math.sin(y / 0.48 * Math.PI) * Math.max(0, 1 - Math.abs(x) / 0.14));
  }
  geometry.computeVertexNormals();
  return geometry;
}

// A convex almond-shaped lens with planar UVs for a crisp iris and slit pupil.
export function createEyeGeometry() {
  const positions = [0, 0, 0.024];
  const uvs = [0.5, 0.5];
  const indices: number[] = [];
  const rings = 8;
  const segments = 48;
  for (let ring = 1; ring <= rings; ring++) {
    const radius = ring / rings;
    for (let segment = 0; segment <= segments; segment++) {
      const angle = segment / segments * Math.PI * 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle) * (0.72 + 0.28 * Math.abs(Math.sin(angle)));
      const eyeX = x * 0.18;
      const eyeY = y * 0.108;
      positions.push(eyeX, eyeY, 0.024 * (1 - radius * radius) - (eyeX * eyeX + eyeY * eyeY) / 0.84);
      uvs.push(x * 0.5 + 0.5, y * 0.5 + 0.5);
      const current = 1 + (ring - 1) * (segments + 1) + segment;
      if (segment === segments) continue;
      if (ring === 1) indices.push(0, current, current + 1);
      else {
        const previous = current - segments - 1;
        indices.push(previous, current, current + 1, previous, current + 1, previous + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createNoseGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.079, 0.025);
  shape.quadraticCurveTo(-0.05, 0.045, 0, 0.032);
  shape.quadraticCurveTo(0.05, 0.045, 0.079, 0.025);
  shape.quadraticCurveTo(0.069, -0.002, 0.015, -0.048);
  shape.quadraticCurveTo(0, -0.06, -0.015, -0.048);
  shape.quadraticCurveTo(-0.069, -0.002, -0.079, 0.025);
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.023, bevelEnabled: true, bevelSize: 0.007,
    bevelThickness: 0.008, bevelSegments: 3, curveSegments: 12,
  });
}

export function createCurveGeometry(points: VectorTuple[], radius: number, segments = 24) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return new THREE.TubeGeometry(curve, segments, radius, 6, false);
}

export function createTailGeometry(curve: THREE.CatmullRomCurve3) {
  const geometry = new THREE.TubeGeometry(curve, 64, 1, 16, false);
  const positions = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  for (let ring = 0; ring <= 64; ring++) {
    const t = ring / 64;
    const center = curve.getPointAt(t);
    const radius = 0.12 * Math.pow(1 - t, 0.42) + 0.012;
    for (let segment = 0; segment <= 16; segment++) {
      const index = ring * 17 + segment;
      positions.setXYZ(index,
        center.x + normal.getX(index) * radius,
        center.y + normal.getY(index) * radius,
        center.z + normal.getZ(index) * radius,
      );
    }
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export type FurSurface = { center: VectorTuple; scale: VectorTuple; count: number; cream?: boolean };

// Batch all short guard hairs into one draw call and keep their positions stable.
export function createFurGeometry(surfaces: FurSurface[], seed: number) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const positions: number[] = [];
  const colors: number[] = [];
  const normal = new THREE.Vector3();
  const strand = new THREE.Vector3();
  const color = new THREE.Color();
  for (const surface of surfaces) {
    const [sx, sy, sz] = surface.scale;
    for (let index = 0; index < surface.count; index++) {
      const y = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const radial = Math.sqrt(1 - y * y);
      const x = Math.cos(angle) * radial;
      const z = Math.sin(angle) * radial;
      normal.set(x / sx, y / sy, z / sz).normalize();
      const root = new THREE.Vector3(surface.center[0] + x * sx, surface.center[1] + y * sy, surface.center[2] + z * sz).addScaledVector(normal, 0.001);
      const length = 0.013 + random() * 0.021;
      strand.copy(normal).multiplyScalar(0.65).add(new THREE.Vector3(0, -0.24, -0.38)).normalize();
      const tip = root.clone().addScaledVector(strand, length);
      positions.push(...root.toArray(), ...tip.toArray());
      color.set(surface.cream ? "#efe0c1" : "#c38e52").multiplyScalar(0.88 + random() * 0.26);
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}
