import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { Box3, MathUtils, PerspectiveCamera, Ray, Spherical, Vector3 } from "three";

const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const roomUrl = moduleUrl(compile(await readFile(new URL("../src/config/room.ts", import.meta.url), "utf8")));
const { roomConfig } = await import(roomUrl);
const source = await readFile(new URL("../src/utils/observationCamera.ts", import.meta.url), "utf8");
const compiled = compile(source)
  .replace('from "three"', `from ${JSON.stringify(import.meta.resolve("three"))}`)
  .replace('from "../config/room"', `from ${JSON.stringify(roomUrl)}`);
const {
  constrainObservation,
  observationDistanceLimit,
  observationFrame,
  observationLimits,
  overviewCamera,
  overviewProjectionFov,
  shortestAzimuthDelta,
} = await import(moduleUrl(compiled));

const bounds = {
  center: new Vector3(0, 0.79, 0),
  size: new Vector3(0.6135, 1.6425, 3.15),
  radius: 1.8025,
};
const modelBox = new Box3().setFromCenterAndSize(bounds.center, bounds.size);
const obstacles = roomConfig.cameraObstacles.map(({ min, max }) => new Box3(new Vector3(...min), new Vector3(...max)));
const nearTargets = [
  bounds.center.clone(),
  new Vector3(0, 1.42, 1.2), // Eyes
  new Vector3(0, 1.58, 1.1), // Ears
  new Vector3(0.2, 0.12, 0.8), // Paws
  new Vector3(0.1, 0.46, -1.42), // Tail
  new Vector3(0, bounds.center.y, modelBox.max.z), // Exact face looking inward
  new Vector3(0, bounds.center.y, modelBox.min.z),
  modelBox.min.clone(),
  modelBox.max.clone(),
];
const directionAt = (azimuth, polar) => new Vector3().setFromSpherical(new Spherical(1, MathUtils.degToRad(polar), MathUtils.degToRad(azimuth)));
const directions = [new Vector3(1, 0.1, -0.3), new Vector3(-2, -1, -1), new Vector3(0, 10, 0), new Vector3(0, 0, 0)];
for (let azimuth = -180; azimuth < 180; azimuth += 15) {
  for (const polar of [40, 72, 80]) directions.push(directionAt(azimuth, polar));
}

let checked = 0;
let projected = 0;
function assertSafePose(pose) {
  const angles = new Spherical().setFromVector3(pose.direction);
  const position = pose.target.clone().addScaledVector(pose.direction, pose.distance);
  assert(angles.phi >= observationLimits.minPolar - 1e-8 && angles.phi <= observationLimits.maxPolar + 1e-8);
  assert(pose.distance >= observationLimits.minDistance - 1e-8 && pose.distance <= pose.maxDistance + 1e-8);
  assert(pose.distance <= observationLimits.maxDistance + 1e-8);
  assert(position.x >= roomConfig.minX + roomConfig.cameraMargin - 1e-8 && position.x <= roomConfig.maxX - roomConfig.cameraMargin + 1e-8);
  assert(position.z >= roomConfig.minZ + roomConfig.cameraMargin - 1e-8 && position.z <= roomConfig.maxZ - roomConfig.cameraMargin + 1e-8);
  assert(position.y >= observationLimits.minHeight - 1e-8 && position.y <= roomConfig.ceilingY - roomConfig.cameraMargin + 1e-8);
  assert(!modelBox.containsPoint(position), "Camera lens entered the cat bounds");
  const ray = new Ray(pose.target, pose.direction);
  const modelExit = ray.intersectBox(modelBox, new Vector3());
  if (modelExit) assert(pose.distance >= pose.target.distanceTo(modelExit) + observationLimits.modelClearance - 1e-8);
  for (const obstacle of obstacles) {
    assert(!obstacle.containsPoint(position), "Camera lens entered furniture");
    const entry = ray.intersectBox(obstacle, new Vector3());
    if (entry) assert(pose.distance + observationLimits.modelClearance <= pose.target.distanceTo(entry) + 1e-8, "Furniture occluded the target-to-camera segment");
  }
  checked += 1;
}

const viewports = [[320, 568], [390, 570], [500, 480], [500, 450], [640, 400], [700, 400], [701, 1024], [768, 1024], [900, 1200], [720, 600], [1280, 720]];
for (const [width, height] of viewports) {
  for (const panelOpen of [false, true]) {
    const frame = observationFrame(width, height, panelOpen);
    const initial = overviewCamera(bounds, frame, height);
    assert(initial.distance <= observationLimits.overviewMaxDistance);
    assert.equal(initial.maxDistance, observationLimits.maxDistance);
    const camera = new PerspectiveCamera(initial.fov, width / height, 0.05, 70);
    camera.setViewOffset(width, height, width / 2 - frame.centerX, height / 2 - frame.centerY, width, height);
    let widestFov = initial.fov;
    for (let azimuth = -180; azimuth < 180; azimuth += 5) for (const polar of [40, 45, 50, 55, 60, 65, 70, 72, 75, 80]) {
      const direction = directionAt(azimuth, polar);
      const pose = constrainObservation(bounds.center, direction, initial.distance, bounds, initial.maxDistance);
      assertSafePose(pose);
      camera.fov = overviewProjectionFov(bounds, direction, initial.distance, frame, height);
      widestFov = Math.max(widestFov, camera.fov);
      assert(camera.fov >= observationLimits.minFov && camera.fov <= observationLimits.maxFov);
      camera.updateProjectionMatrix();
      camera.position.copy(pose.target).addScaledVector(pose.direction, pose.distance);
      camera.lookAt(pose.target);
      camera.updateMatrixWorld();
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        const point = bounds.center.clone().add(new Vector3(bounds.size.x * x / 2, bounds.size.y * y / 2, bounds.size.z * z / 2)).project(camera);
        const pixelX = (point.x + 1) * width / 2;
        const pixelY = (1 - point.y) * height / 2;
        assert(Math.abs(pixelX - frame.centerX) <= frame.width / 2, `Overview horizontal clipping: ${width}×${height}, notes=${panelOpen}, azimuth=${azimuth}, polar=${polar}`);
        assert(Math.abs(pixelY - frame.centerY) <= frame.height / 2, `Overview vertical clipping: ${width}×${height}, notes=${panelOpen}, azimuth=${azimuth}, polar=${polar}`);
        projected += 1;
      }
    }
    for (const target of nearTargets) for (const direction of directions) for (const requestedDistance of [0.05, 1.1, 2.2, 6.7, 30]) {
      assertSafePose(constrainObservation(target, direction, requestedDistance, bounds, initial.maxDistance));
    }
    // Flights take the shortest path across ±π and apply all radial limits on every frame.
    for (const [fromAngle, toAngle] of [[179, -179], [-179, 179], [38, -155]]) {
      const from = MathUtils.degToRad(fromAngle);
      const change = shortestAzimuthDelta(from, MathUtils.degToRad(toAngle));
      assert(Math.abs(change) <= Math.PI);
      if (Math.abs(fromAngle) === 179) assert(Math.abs(change) <= MathUtils.degToRad(2) + 1e-8);
      for (let step = 0; step <= 30; step++) {
        const t = step / 30;
        const target = nearTargets[0].clone().lerp(nearTargets[4], t);
        const direction = new Vector3().setFromSpherical(new Spherical(1, MathUtils.degToRad(72 + 8 * t), from + change * t));
        assertSafePose(constrainObservation(target, direction, MathUtils.lerp(initial.distance, 1.1, t), bounds, initial.maxDistance));
      }
    }
    console.log(`${width}×${height} notes=${panelOpen}: overview=${initial.distance.toFixed(2)}, initial FOV=${initial.fov.toFixed(1)}°, full-orbit max FOV=${widestFov.toFixed(1)}°`);
  }
}

// A frame clamp must settle, so wheel/touch gestures do not oscillate at a limit.
for (const target of nearTargets) for (const direction of directions) {
  let pose = constrainObservation(target, direction, 30, bounds, observationLimits.maxDistance);
  for (let frame = 0; frame < 20; frame++) {
    const next = constrainObservation(pose.target, pose.direction, pose.distance, bounds, observationLimits.maxDistance);
    assert(Math.abs(next.distance - pose.distance) < 1e-8);
    assert(next.direction.distanceTo(pose.direction) < 1e-8);
    assertSafePose(next);
    pose = next;
  }
}

const behind = constrainObservation(bounds.center, directionAt(180, 72), 5, bounds, observationLimits.maxDistance);
assert(behind.target.clone().addScaledVector(behind.direction, behind.distance).z < 0, "Full horizontal orbit must include the back of the cat");
assert(observationDistanceLimit(bounds.center, directionAt(-135, 80)) < observationLimits.maxDistance, "Furniture must limit radial zoom");
assert(shortestAzimuthDelta(MathUtils.degToRad(179), MathUtils.degToRad(-179)) > 0);
assert(shortestAzimuthDelta(MathUtils.degToRad(-179), MathUtils.degToRad(179)) < 0);
assert(Math.abs(shortestAzimuthDelta(0, 8 * Math.PI)) < 1e-8);
console.log(`Camera checks passed: ${checked} safe poses, ${projected} projected corners, 360° orbit in ${viewports.length * 2} viewport/panel combinations, shortest-wrap flights and stable zoom limits.`);
