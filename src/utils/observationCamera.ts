import { Box3, MathUtils, Ray, Spherical, Vector3 } from "three";
import { roomConfig } from "../config/room";
import type { ModelBounds } from "./catModel";

export type ObservationFrame = { width: number; height: number; centerX: number; centerY: number };

export const observationLimits = {
  minPolar: MathUtils.degToRad(40),
  maxPolar: MathUtils.degToRad(80),
  minDistance: 1.1,
  maxDistance: 8.5,
  overviewMaxDistance: 6.7,
  minHeight: Math.max(0.3, roomConfig.floorY + 0.05),
  modelClearance: 0.25,
  minFov: 38,
  maxFov: 78,
} as const;

const worldUp = new Vector3(0, 1, 0);
const cameraRoomBounds = new Box3(
  new Vector3(roomConfig.minX + roomConfig.cameraMargin, observationLimits.minHeight, roomConfig.minZ + roomConfig.cameraMargin),
  new Vector3(roomConfig.maxX - roomConfig.cameraMargin, roomConfig.ceilingY - roomConfig.cameraMargin, roomConfig.maxZ - roomConfig.cameraMargin),
);
const cameraObstacles = roomConfig.cameraObstacles.map(({ min, max }) => new Box3(new Vector3(...min), new Vector3(...max)));

export function observationFrame(width: number, height: number, panelOpen: boolean): ObservationFrame {
  const landscape = width <= 700 && width >= 500 && width > height;
  const narrow = (width <= 700 && !landscape) || (width <= 900 && width <= height);
  const left = 22;
  const sidePanelWidth = landscape ? Math.min(280, width * 0.45) + 24 : 394;
  const right = width - (panelOpen && !narrow ? sidePanelWidth : 22);
  const top = Math.min(narrow ? 116 : 90, height * 0.26);
  // Match the mobile notes sheet while retaining a useful view on short screens.
  const panelHeight = Math.min(height * 0.38, Math.max(0, height - 375));
  const bottom = panelOpen && narrow ? height - panelHeight - 14 : height - 54;
  return {
    width: Math.max(8, right - left),
    height: Math.max(8, bottom - top),
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

export function clampObservationDirection(direction: Vector3): Vector3 {
  const spherical = new Spherical().setFromVector3(direction.lengthSq() > 0.0001 ? direction : new Vector3(0, 0.3, 1));
  spherical.radius = 1;
  spherical.phi = MathUtils.clamp(spherical.phi, observationLimits.minPolar, observationLimits.maxPolar);
  return new Vector3().setFromSpherical(spherical);
}

export function shortestAzimuthDelta(from: number, to: number): number {
  return MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
}

function rayExitDistance(box: Box3, target: Vector3, direction: Vector3): number {
  let distance = Infinity;
  for (const axis of ["x", "y", "z"] as const) {
    if (Math.abs(direction[axis]) < 1e-8) continue;
    const boundary = direction[axis] > 0 ? box.max[axis] : box.min[axis];
    distance = Math.min(distance, (boundary - target[axis]) / direction[axis]);
  }
  return Math.max(0, distance);
}

/** Radius available along an orbit ray before a wall, ceiling or furnishing. */
export function observationDistanceLimit(target: Vector3, direction: Vector3, requestedMax: number = observationLimits.maxDistance): number {
  // Use the exit of the ray/room slabs, also when a paw target is below the
  // lens's floor clearance. The floor sets a minimum radius separately.
  let distance = Math.min(requestedMax, observationLimits.maxDistance, rayExitDistance(cameraRoomBounds, target, direction));
  const ray = new Ray(target, direction);
  for (const obstacle of cameraObstacles) {
    const entry = ray.intersectBox(obstacle, new Vector3());
    if (entry) distance = Math.min(distance, target.distanceTo(entry) - observationLimits.modelClearance);
  }
  return Math.max(0, distance);
}

function eachCorner(bounds: ModelBounds, visit: (corner: Vector3) => void) {
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    visit(new Vector3(bounds.size.x * x / 2, bounds.size.y * y / 2, bounds.size.z * z / 2));
  }
}

export function fitModelDistance(bounds: ModelBounds, direction: Vector3, frame: ObservationFrame, height: number, fov: number): number {
  const right = new Vector3().crossVectors(worldUp, direction).normalize();
  const up = new Vector3().crossVectors(direction, right).normalize();
  const focalLength = height / (2 * Math.tan(MathUtils.degToRad(fov / 2)));
  let distance: number = observationLimits.minDistance;
  eachCorner(bounds, (corner) => {
    const depth = corner.dot(direction);
    distance = Math.max(
      distance,
      depth + Math.abs(corner.dot(right)) * focalLength / (frame.width * 0.43),
      depth + Math.abs(corner.dot(up)) * focalLength / (frame.height * 0.43),
    );
  });
  return distance;
}

export function fitModelFov(bounds: ModelBounds, direction: Vector3, distance: number, frame: ObservationFrame, height: number): number {
  const right = new Vector3().crossVectors(worldUp, direction).normalize();
  const up = new Vector3().crossVectors(direction, right).normalize();
  let tangent = Math.tan(MathUtils.degToRad(observationLimits.minFov / 2));
  eachCorner(bounds, (corner) => {
    const depth = Math.max(0.2, distance - corner.dot(direction));
    tangent = Math.max(
      tangent,
      Math.abs(corner.dot(right)) * height / (depth * frame.width * 0.86),
      Math.abs(corner.dot(up)) * height / (depth * frame.height * 0.86),
    );
  });
  return MathUtils.clamp(MathUtils.radToDeg(2 * Math.atan(tangent)), observationLimits.minFov, observationLimits.maxFov);
}

export function overviewCamera(bounds: ModelBounds, frame: ObservationFrame, height: number) {
  const direction = new Vector3().setFromSpherical(new Spherical(1, MathUtils.degToRad(72), MathUtils.degToRad(38)));
  const permittedDirections: Vector3[] = [];
  for (let azimuth = -180; azimuth < 180; azimuth += 5) {
    for (let polar = 40; polar <= 80; polar += 5) {
      permittedDirections.push(new Vector3().setFromSpherical(new Spherical(1, MathUtils.degToRad(polar), MathUtils.degToRad(azimuth))));
    }
  }
  // Fit the full circle, including useful views above the back and paws.
  const distance = MathUtils.clamp(
    Math.max(...permittedDirections.map((view) => fitModelDistance(bounds, view, frame, height, observationLimits.minFov))),
    3.8,
    observationLimits.overviewMaxDistance,
  );
  return {
    target: bounds.center.clone(),
    direction,
    distance,
    fov: overviewProjectionFov(bounds, direction, distance, frame, height),
    maxDistance: observationLimits.maxDistance,
  };
}

export function overviewProjectionFov(bounds: ModelBounds, direction: Vector3, overviewDistance: number, frame: ObservationFrame, height: number): number {
  const safeDirection = clampObservationDirection(direction);
  // When furniture shortens an orbit, widen the projection enough to keep the
  // cat framed. Use the overview radius so a deliberate zoom still zooms in.
  const referenceDistance = Math.min(overviewDistance, observationDistanceLimit(bounds.center, safeDirection));
  return fitModelFov(bounds, safeDirection, referenceDistance, frame, height);
}

/** Keep user gestures and focus flights inside the complete furnished room. */
export function constrainObservation(
  target: Vector3,
  direction: Vector3,
  requestedDistance: number,
  bounds: ModelBounds,
  maxDistance: number,
) {
  const box = new Box3().setFromCenterAndSize(bounds.center, bounds.size);
  const safeTarget = target.clone().clamp(box.min, box.max);
  const safeDirection = clampObservationDirection(direction);
  // Use the far slab, including when a surface target sits exactly on a box
  // face and looks into the model; an entry intersection would return zero.
  const clearance = rayExitDistance(box, safeTarget, safeDirection) + observationLimits.modelClearance;
  const safeMaxDistance = observationDistanceLimit(safeTarget, safeDirection, maxDistance);
  const minDistance = Math.min(safeMaxDistance, Math.max(
    observationLimits.minDistance,
    clearance,
    (observationLimits.minHeight - safeTarget.y) / safeDirection.y,
  ));
  const distance = MathUtils.clamp(requestedDistance, minDistance, safeMaxDistance);
  return { target: safeTarget, direction: safeDirection, distance, minDistance, maxDistance: safeMaxDistance };
}
