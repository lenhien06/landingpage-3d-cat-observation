import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";

type VectorTuple = readonly [number, number, number];
type Ellipsoid = { center: VectorTuple; radii: VectorTuple };
type Sculpt = { min: VectorTuple; max: VectorTuple; parts: Ellipsoid[]; blend: number };

const RESOLUTION = 56;
const MAX_TRIANGLES = 50000;

// Distance approximation stays in world units, so blend widths remain predictable.
function ellipsoidDistance(x: number, y: number, z: number, part: Ellipsoid) {
  const dx = x - part.center[0];
  const dy = y - part.center[1];
  const dz = z - part.center[2];
  const [rx, ry, rz] = part.radii;
  const radial = Math.hypot(dx / rx, dy / ry, dz / rz);
  const gradient = Math.hypot(dx / (rx * rx), dy / (ry * ry), dz / (rz * rz));
  return gradient > 1e-12 ? radial * (radial - 1) / gradient : -Math.min(rx, ry, rz);
}

function smoothMinimum(a: number, b: number, width: number) {
  const h = Math.max(0, Math.min(1, 0.5 + (b - a) / (2 * width)));
  return b + (a - b) * h - width * h * (1 - h);
}

function sculptDistance(x: number, y: number, z: number, sculpt: Sculpt) {
  let distance = Infinity;
  for (const part of sculpt.parts) {
    const next = ellipsoidDistance(x, y, z, part);
    distance = Number.isFinite(distance) ? smoothMinimum(distance, next, sculpt.blend) : next;
  }
  return distance;
}

function createSculptGeometry(sculpt: Sculpt): THREE.BufferGeometry {
  const material = new THREE.MeshBasicMaterial();
  const cubes = new MarchingCubes(RESOLUTION, material, false, false, MAX_TRIANGLES);
  cubes.isolation = 0;
  const halfX = (sculpt.max[0] - sculpt.min[0]) * 0.5;
  const halfY = (sculpt.max[1] - sculpt.min[1]) * 0.5;
  const halfZ = (sculpt.max[2] - sculpt.min[2]) * 0.5;
  const centerX = sculpt.min[0] + halfX;
  const centerY = sculpt.min[1] + halfY;
  const centerZ = sculpt.min[2] + halfZ;

  try {
    for (let iz = 0; iz < RESOLUTION; iz += 1) {
      const z = sculpt.min[2] + iz / RESOLUTION * halfZ * 2;
      for (let iy = 0; iy < RESOLUTION; iy += 1) {
        const y = sculpt.min[1] + iy / RESOLUTION * halfY * 2;
        const row = iz * RESOLUTION * RESOLUTION + iy * RESOLUTION;
        for (let ix = 0; ix < RESOLUTION; ix += 1) {
          const x = sculpt.min[0] + ix / RESOLUTION * halfX * 2;
          // MarchingCubes expects a positive interior; its normals point toward
          // decreasing field values, which is outward for this negated SDF.
          cubes.field[row + ix] = -sculptDistance(x, y, z, sculpt);
        }
      }
    }
    cubes.update();
    if (!cubes.count || cubes.count > MAX_TRIANGLES * 3) {
      throw new Error("Không thể dựng bề mặt mèo hợp lệ.");
    }

    const positions = new Float32Array(cubes.count * 3);
    const normals = new Float32Array(cubes.count * 3);
    const uvs = new Float32Array(cubes.count * 2);
    const primary = sculpt.parts[0]!;
    for (let vertex = 0; vertex < cubes.count; vertex += 1) {
      const offset = vertex * 3;
      const x = cubes.positionArray[offset]! * halfX + centerX;
      const y = cubes.positionArray[offset + 1]! * halfY + centerY;
      const z = cubes.positionArray[offset + 2]! * halfZ + centerZ;
      let nx = cubes.normalArray[offset]! / halfX;
      let ny = cubes.normalArray[offset + 1]! / halfY;
      let nz = cubes.normalArray[offset + 2]! / halfZ;
      let length = Math.hypot(nx, ny, nz);
      if (length < 1e-12) {
        const epsilon = 0.001;
        nx = sculptDistance(x + epsilon, y, z, sculpt) - sculptDistance(x - epsilon, y, z, sculpt);
        ny = sculptDistance(x, y + epsilon, z, sculpt) - sculptDistance(x, y - epsilon, z, sculpt);
        nz = sculptDistance(x, y, z + epsilon, sculpt) - sculptDistance(x, y, z - epsilon, sculpt);
        length = Math.hypot(nx, ny, nz);
      }
      if (![x, y, z, nx, ny, nz, length].every(Number.isFinite) || length < 1e-12) {
        throw new Error("Bề mặt mèo chứa tọa độ không hợp lệ.");
      }
      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = z;
      normals[offset] = nx / length;
      normals[offset + 1] = ny / length;
      normals[offset + 2] = nz / length;

      const px = (x - primary.center[0]) / primary.radii[0];
      const py = (y - primary.center[1]) / primary.radii[1];
      const pz = (z - primary.center[2]) / primary.radii[2];
      const radius = Math.hypot(px, py, pz);
      let longitude = Math.atan2(pz, -px);
      if (longitude < 0) longitude += Math.PI * 2;
      uvs[vertex * 2] = longitude / (Math.PI * 2);
      // CanvasTexture flips Y; match the existing THREE.SphereGeometry mapping.
      uvs[vertex * 2 + 1] = 1 - Math.acos(Math.max(-1, Math.min(1, py / radius))) / Math.PI;
    }

    for (let vertex = 0; vertex < cubes.count; vertex += 3) {
      const uvOffset = vertex * 2;
      const ua = uvs[uvOffset]!;
      const ub = uvs[uvOffset + 2]!;
      const uc = uvs[uvOffset + 4]!;
      if (Math.max(ua, ub, uc) - Math.min(ua, ub, uc) > 0.5) {
        for (let corner = 0; corner < 3; corner += 1) {
          const offset = uvOffset + corner * 2;
          if (uvs[offset]! < 0.5) uvs[offset] = uvs[offset]! + 1;
        }
      }
      // Keep triangle winding consistent with the smooth outward field normals.
      const a = vertex * 3;
      const abx = positions[a + 3]! - positions[a]!;
      const aby = positions[a + 4]! - positions[a + 1]!;
      const abz = positions[a + 5]! - positions[a + 2]!;
      const acx = positions[a + 6]! - positions[a]!;
      const acy = positions[a + 7]! - positions[a + 1]!;
      const acz = positions[a + 8]! - positions[a + 2]!;
      const faceX = aby * acz - abz * acy;
      const faceY = abz * acx - abx * acz;
      const faceZ = abx * acy - aby * acx;
      const outward = faceX * (normals[a]! + normals[a + 3]! + normals[a + 6]!)
        + faceY * (normals[a + 1]! + normals[a + 4]! + normals[a + 7]!)
        + faceZ * (normals[a + 2]! + normals[a + 5]! + normals[a + 8]!);
      if (outward < 0) {
        for (const array of [positions, normals]) {
          for (let axis = 0; axis < 3; axis += 1) {
            const old = array[a + 3 + axis]!;
            array[a + 3 + axis] = array[a + 6 + axis]!;
            array[a + 6 + axis] = old;
          }
        }
        for (let axis = 0; axis < 2; axis += 1) {
          const old = uvs[uvOffset + 2 + axis]!;
          uvs[uvOffset + 2 + axis] = uvs[uvOffset + 4 + axis]!;
          uvs[uvOffset + 4 + axis] = old;
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  } finally {
    cubes.geometry.dispose();
    material.dispose();
  }
}

export function createBodyGeometry(): THREE.BufferGeometry {
  return createSculptGeometry({
    min: [-0.72, 0.5, -1.32], max: [0.72, 2.12, 1.32], blend: 0.1,
    parts: [
      { center: [0, 1.2, -0.12], radii: [0.56, 0.59, 1.08] },
      { center: [0, 1.43, 0.57], radii: [0.43, 0.51, 0.46] },
      { center: [0, 1.6, 0.84], radii: [0.35, 0.44, 0.36] },
    ],
  });
}

export function createHeadGeometry(): THREE.BufferGeometry {
  return createSculptGeometry({
    min: [-0.65, 1.36, 0.48], max: [0.65, 2.42, 1.65], blend: 0.08,
    parts: [
      { center: [0, 1.91, 1.025], radii: [0.505, 0.455, 0.495] },
      { center: [-0.32, 1.76, 1.2], radii: [0.195, 0.22, 0.235] },
      { center: [0.32, 1.76, 1.2], radii: [0.195, 0.22, 0.235] },
    ],
  });
}
