import { useEffect, useMemo, useRef } from "react";
import type { ComponentRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MathUtils, PerspectiveCamera, Spherical, Vector3 } from "three";
import type { PartId } from "../data/questions";
import type { FocusTarget, ModelBounds } from "./ModelLoader";
import { constrainObservation, observationFrame, observationLimits, overviewCamera, overviewProjectionFov, shortestAzimuthDelta } from "../utils/observationCamera";

export type ViewerControls = { zoomIn: () => void; zoomOut: () => void };

type Props = {
  selectedPart: PartId | null;
  focus: FocusTarget | null;
  bounds: ModelBounds | null;
  resetSignal: number;
  enabled: boolean;
  panelOpen: boolean;
  onControlsReady: (controls: ViewerControls | null) => void;
};

type CameraFlight = {
  fromTarget: Vector3;
  toTarget: Vector3;
  fromAngles: Spherical;
  toAngles: Spherical;
  fromDistance: number;
  toDistance: number;
  elapsed: number;
};

export function CameraRig({ selectedPart, focus, bounds, resetSignal, enabled, panelOpen, onControlsReady }: Props) {
  const { camera, size, gl, invalidate } = useThree();
  const orbit = useRef<ComponentRef<typeof OrbitControls>>(null);
  const positioned = useRef(false);
  const flight = useRef<CameraFlight | null>(null);
  const frame = useMemo(() => observationFrame(size.width, size.height, panelOpen), [panelOpen, size.width, size.height]);
  const initial = useMemo(() => bounds ? overviewCamera(bounds, frame, size.height) : null, [bounds, frame, size.height]);
  const maxDistance = initial?.maxDistance ?? observationLimits.maxDistance;

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || !initial) return;
    camera.fov = initial.fov;
    // Place the cat in the available view beside or above the notes sheet.
    camera.setViewOffset(
      size.width, size.height,
      size.width / 2 - frame.centerX,
      size.height / 2 - frame.centerY,
      size.width, size.height,
    );
    camera.far = 70;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, frame, initial, invalidate, size.height, size.width]);

  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    if (enabled) {
      gl.shadowMap.needsUpdate = true;
      invalidate();
    }
  }, [enabled, gl, invalidate]);

  useEffect(() => {
    if (!enabled || !initial || !bounds || !orbit.current || !(camera instanceof PerspectiveCamera)) return;
    const target = selectedPart && focus ? focus.target : initial.target;
    const direction = selectedPart && focus ? focus.dir : initial.direction;
    const detailFraction = selectedPart === "eyes" ? 0.24 : selectedPart === "ears" ? 0.3 : 0.36;
    const detailAngle = Math.atan(
      Math.tan(MathUtils.degToRad(initial.fov / 2))
        * Math.min(frame.height / size.height, frame.width / size.height) * 0.86,
    );
    const requestedDistance = selectedPart && focus
      ? bounds.radius * detailFraction / Math.sin(detailAngle)
      : initial.distance;
    const destination = constrainObservation(target, direction, requestedDistance, bounds, maxDistance);
    if (!positioned.current) {
      orbit.current.target.copy(destination.target);
      camera.position.copy(destination.target).addScaledVector(destination.direction, destination.distance);
      orbit.current.update();
      positioned.current = true;
      invalidate();
      return;
    }
    // Start from an already constrained pose, including after a panel resize.
    const offset = camera.position.clone().sub(orbit.current.target);
    const current = constrainObservation(orbit.current.target, offset, offset.length(), bounds, maxDistance);
    orbit.current.target.copy(current.target);
    camera.position.copy(current.target).addScaledVector(current.direction, current.distance);
    orbit.current.update();
    const fromAngles = new Spherical().setFromVector3(current.direction);
    const toAngles = new Spherical().setFromVector3(destination.direction);
    toAngles.theta = fromAngles.theta + shortestAzimuthDelta(fromAngles.theta, toAngles.theta);
    flight.current = {
      fromTarget: current.target,
      toTarget: destination.target,
      fromAngles,
      toAngles,
      fromDistance: current.distance,
      toDistance: destination.distance,
      elapsed: 0,
    };
    invalidate();
  }, [bounds, camera, enabled, focus, frame, initial, invalidate, maxDistance, resetSignal, selectedPart, size.height]);

  useFrame((_, delta) => {
    if (!enabled || !bounds || !orbit.current) return;
    const move = flight.current;
    if (move) {
      move.elapsed = Math.min(1, move.elapsed + Math.min(delta, 0.05) / 0.6);
      const ease = 1 - Math.pow(1 - move.elapsed, 3);
      const angles = new Spherical(
        1,
        MathUtils.lerp(move.fromAngles.phi, move.toAngles.phi, ease),
        MathUtils.lerp(move.fromAngles.theta, move.toAngles.theta, ease),
      );
      const target = move.fromTarget.clone().lerp(move.toTarget, ease);
      const pose = constrainObservation(
        target,
        new Vector3().setFromSpherical(angles),
        MathUtils.lerp(move.fromDistance, move.toDistance, ease),
        bounds,
        maxDistance,
      );
      orbit.current.target.copy(pose.target);
      camera.position.copy(pose.target).addScaledVector(pose.direction, pose.distance);
      orbit.current.update();
      if (move.elapsed >= 1) flight.current = null;
      else invalidate();
    } else {
      // Wheel/touch and buttons share the same physical safety limits.
      const offset = camera.position.clone().sub(orbit.current.target);
      const pose = constrainObservation(orbit.current.target, offset, offset.length(), bounds, maxDistance);
      const nextPosition = pose.target.clone().addScaledVector(pose.direction, pose.distance);
      if (nextPosition.distanceToSquared(camera.position) > 0.00000001) {
        orbit.current.target.copy(pose.target);
        camera.position.copy(nextPosition);
        orbit.current.update();
        invalidate();
      }
    }
    if (initial && camera instanceof PerspectiveCamera) {
      const direction = camera.position.clone().sub(orbit.current.target).normalize();
      const fov = overviewProjectionFov(bounds, direction, initial.distance, frame, size.height);
      if (Math.abs(camera.fov - fov) > 0.001) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
        invalidate();
      }
    }
  });

  useEffect(() => {
    const zoom = (factor: number) => {
      if (!orbit.current || !enabled || !bounds) return;
      flight.current = null;
      const offset = camera.position.clone().sub(orbit.current.target);
      const pose = constrainObservation(orbit.current.target, offset, offset.length() * factor, bounds, maxDistance);
      orbit.current.target.copy(pose.target);
      camera.position.copy(pose.target).addScaledVector(pose.direction, pose.distance);
      orbit.current.update();
      invalidate();
    };
    onControlsReady({ zoomIn: () => zoom(0.82), zoomOut: () => zoom(1.22) });
    return () => onControlsReady(null);
  }, [bounds, camera, enabled, invalidate, maxDistance, onControlsReady]);

  return (
    <OrbitControls
      ref={orbit}
      enabled={enabled}
      enablePan={false}
      enableDamping={false}
      minDistance={observationLimits.minDistance}
      maxDistance={maxDistance}
      minPolarAngle={observationLimits.minPolar}
      maxPolarAngle={observationLimits.maxPolar}
      rotateSpeed={0.75}
      zoomSpeed={0.9}
      onStart={() => { flight.current = null; }}
    />
  );
}
