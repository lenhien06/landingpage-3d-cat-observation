import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { PartId } from "../data/questions";
import type { Hotspot } from "./hotspots";

export type ModelBounds = { radius: number; size: THREE.Vector3; center: THREE.Vector3 };
export type FocusTarget = { target: THREE.Vector3; dir: THREE.Vector3 };

type ModelSettings = {
  rotation: [number, number, number];
  scale: number;
  displaySize: number;
  groundY: number;
};

export function prepareCatModel(scene: THREE.Object3D, settings: ModelSettings) {
  // Preserve joint bindings as well as the imported geometry and texture UVs.
  const content = new THREE.Group();
  const imported = clone(scene);
  const ownedMaterials = new Set<THREE.Material>();
  const ownedSkeletons = new Set<THREE.Skeleton>();
  const materialCopies = new Map<THREE.Material, THREE.Material>();
  imported.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (object instanceof THREE.SkinnedMesh) ownedSkeletons.add(object.skeleton);
    const copyMaterial = (source: THREE.Material) => {
      const existing = materialCopies.get(source);
      if (existing) return existing;
      const material = source.clone();
      if (material instanceof THREE.MeshStandardMaterial) {
        material.metalness = 0;
        if (source.name === "cat_diffuse") {
          // The original game material is quite shiny; fur needs a matte response.
          material.roughness = 0.92;
          material.normalScale.set(0.65, 0.65);
          material.envMapIntensity = 0.35;
        } else {
          // Retain the cornea's highlights without a mirror-like reflection.
          material.roughness = Math.max(0.13, material.roughness);
        }
      }
      materialCopies.set(source, material);
      ownedMaterials.add(material);
      return material;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(copyMaterial)
      : copyMaterial(object.material);
  });
  content.add(imported);
  content.rotation.set(...settings.rotation);
  content.scale.setScalar(settings.scale);
  content.updateMatrixWorld(true);
  const sourceBox = new THREE.Box3().setFromObject(content, true);
  const sourceSize = sourceBox.getSize(new THREE.Vector3());
  const maxSize = Math.max(sourceSize.x, sourceSize.y, sourceSize.z);
  if (!Number.isFinite(maxSize) || maxSize <= 0) throw new Error("Mô hình mèo không có kích thước hợp lệ.");
  const factor = settings.displaySize / maxSize;
  const sourceCenter = sourceBox.getCenter(new THREE.Vector3());
  const root = new THREE.Group();
  root.add(content);
  root.scale.setScalar(factor);
  root.position.set(-sourceCenter.x * factor, settings.groundY - sourceBox.min.y * factor, -sourceCenter.z * factor);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true);
  const bounds: ModelBounds = {
    radius: box.getBoundingSphere(new THREE.Sphere()).radius * 1.05,
    size: box.getSize(new THREE.Vector3()).multiplyScalar(1.05),
    center: box.getCenter(new THREE.Vector3()),
  };
  return { root, content, imported, bounds, factor, ownedMaterials, ownedSkeletons };
}

// These small hit regions follow the model's original coordinates. The rendered
// model itself receives clicks, so hidden or rear-facing parts cannot be picked.
const hitRadii: Record<PartId, [number, number, number]> = {
  eyes: [0.021, 0.022, 0.034],
  ears: [0.032, 0.04, 0.035],
  legs: [0.045, 0.145, 0.075],
  tail: [0.055, 0.105, 0.16],
};

export function findCatPart(point: THREE.Vector3, hotspots: Hotspot[]): PartId | null {
  let selected: PartId | null = null;
  let nearest = 1;
  for (const hotspot of hotspots) {
    const [rx, ry, rz] = hitRadii[hotspot.partId];
    const score = ((point.x - hotspot.position[0]) / rx) ** 2
      + ((point.y - hotspot.position[1]) / ry) ** 2
      + ((point.z - hotspot.position[2]) / rz) ** 2;
    if (score < nearest) {
      nearest = score;
      selected = hotspot.partId;
    }
  }
  return selected;
}

export function getCatFocus(content: THREE.Object3D, hotspots: Hotspot[], part: PartId): FocusTarget | null {
  const points = hotspots.filter((point) => point.partId === part);
  if (!points.length) return null;
  content.updateWorldMatrix(true, false);
  const target = new THREE.Vector3();
  const dir = new THREE.Vector3();
  points.forEach((point) => {
    target.add(content.localToWorld(new THREE.Vector3(...point.position)));
    dir.add(new THREE.Vector3(...point.normal).transformDirection(content.matrixWorld));
  });
  target.divideScalar(points.length);
  if (dir.lengthSq() < 0.001) dir.set(0.4, 0.2, 1);
  dir.y = Math.max(dir.y, dir.length() * 0.12);
  return { target, dir: dir.normalize() };
}

type BoundHotspot = { hotspot: Hotspot; mesh: THREE.Mesh; vertex: number };

// Bind each anatomy anchor to a real surface vertex. Mesh.getVertexPosition
// includes morph targets and skinning, so anchors follow the authored animation.
export function bindCatHotspots(content: THREE.Object3D, hotspots: Hotspot[]): BoundHotspot[] {
  content.updateWorldMatrix(true, true);
  const meshes: THREE.Mesh[] = [];
  content.traverse((object) => { if (object instanceof THREE.Mesh) meshes.push(object); });
  const position = new THREE.Vector3();
  return hotspots.map((hotspot) => {
    const target = content.localToWorld(new THREE.Vector3(...hotspot.position));
    let nearest: BoundHotspot | null = null;
    let distance = Infinity;
    for (const mesh of meshes) {
      const vertices = mesh.geometry.getAttribute("position");
      for (let vertex = 0; vertex < vertices.count; vertex++) {
        mesh.getVertexPosition(vertex, position);
        mesh.localToWorld(position);
        const next = target.distanceToSquared(position);
        if (next < distance) {
          distance = next;
          nearest = { hotspot, mesh, vertex };
        }
      }
    }
    if (!nearest) throw new Error("Không tìm thấy bề mặt mô hình mèo.");
    return nearest;
  });
}

export function resolveCatHotspots(content: THREE.Object3D, bindings: BoundHotspot[]): Hotspot[] {
  content.updateWorldMatrix(true, true);
  return bindings.map(({ hotspot, mesh, vertex }) => {
    const point = mesh.getVertexPosition(vertex, new THREE.Vector3());
    mesh.localToWorld(point);
    content.worldToLocal(point);
    return { ...hotspot, position: point.toArray() };
  });
}
