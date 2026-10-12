import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Minus, Plus } from "lucide-react";
import { ACESFilmicToneMapping, MathUtils, PerspectiveCamera, Quaternion, Vector3 } from "three";
import type { PartId } from "../data/questions";
import { ModelLoader } from "./ModelLoader";
import type { FocusTarget, ModelBounds } from "./ModelLoader";

type Controls = { zoomIn: () => void; zoomOut: () => void };
type Props = {
  selectedPart: PartId | null;
  onPartSelect: (part: PartId) => void;
  onOverallSelect: () => void;
  onReady: () => void;
  resetSignal: number;
  panelOpen?: boolean;
};

type Frame = { width: number; height: number; centerX: number; centerY: number };

function observationFrame(width: number, height: number, panelOpen: boolean): Frame {
  const narrow = width <= 700;
  const left = 22;
  const right = width - (panelOpen && !narrow ? Math.min(394, width * 0.45) : 22);
  const top = Math.min(narrow ? 116 : 90, height * 0.26);
  const bottom = panelOpen && narrow ? height * 0.38 - 14 : height - 54;
  return {
    width: Math.max(8, right - left),
    height: Math.max(8, bottom - top),
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

function fitModelDistance(bounds: ModelBounds, direction: Vector3, frame: Frame, height: number, fov: number): number {
  const right = new Vector3().crossVectors(new Vector3(0, 1, 0), direction).normalize();
  const up = new Vector3().crossVectors(direction, right).normalize();
  const focalLength = height / (2 * Math.tan(MathUtils.degToRad(fov / 2)));
  const halfWidth = frame.width * 0.45;
  const halfHeight = frame.height * 0.45;
  let distance = bounds.radius * 1.15;
  // Fit all corners after the camera turns, including the fur and tail silhouette.
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const corner = new Vector3(bounds.size.x * x / 2, bounds.size.y * y / 2, bounds.size.z * z / 2);
    const depth = corner.dot(direction);
    distance = Math.max(
      distance,
      depth + Math.abs(corner.dot(right)) * focalLength / halfWidth,
      depth + Math.abs(corner.dot(up)) * focalLength / halfHeight,
    );
  }
  return distance;
}

function CameraRig({
  selectedPart,
  focus,
  bounds,
  resetSignal,
  enabled,
  panelOpen,
  onControlsReady,
}: {
  selectedPart: PartId | null;
  focus: FocusTarget | null;
  bounds: ModelBounds | null;
  resetSignal: number;
  enabled: boolean;
  panelOpen: boolean;
  onControlsReady: (controls: Controls | null) => void;
}) {
  const { camera, size, gl, invalidate } = useThree();
  const orbit = useRef<ComponentRef<typeof OrbitControls>>(null);
  const positioned = useRef(false);
  const flight = useRef<{
    fromTarget: Vector3;
    toTarget: Vector3;
    fromDirection: Vector3;
    rotation: Quaternion;
    fromDistance: number;
    toDistance: number;
    elapsed: number;
  } | null>(null);
  const frame = useMemo(
    () => observationFrame(size.width, size.height, panelOpen),
    [panelOpen, size.width, size.height],
  );
  const initial = useMemo(() => {
    if (!bounds || !(camera instanceof PerspectiveCamera)) return null;
    const target = bounds.center.clone();
    const direction = new Vector3(1, 0.25, 1.25).normalize();
    const distance = fitModelDistance(bounds, direction, frame, size.height, camera.fov);
    return { target, direction, distance };
  }, [bounds, camera, frame, size.height]);
  const minDistance = Math.max(0.8, (bounds?.radius ?? 2) * 0.42);
  const maxDistance = Math.max(18, (initial?.distance ?? 8) * 2.2);

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    // Centre the model in the visible area above / beside the notes panel.
    camera.setViewOffset(
      size.width, size.height,
      size.width / 2 - frame.centerX,
      size.height / 2 - frame.centerY,
      size.width, size.height,
    );
    camera.far = Math.max(100, maxDistance + (bounds?.radius ?? 3) * 4);
    camera.updateProjectionMatrix();
    invalidate();
  }, [bounds, camera, frame, invalidate, maxDistance, size.height, size.width]);

  useEffect(() => {
    // The Loader refreshes shadows while the model's native idle animation plays.
    gl.shadowMap.autoUpdate = false;
    if (enabled) {
      gl.shadowMap.needsUpdate = true;
      invalidate();
    }
  }, [enabled, gl, invalidate]);

  useEffect(() => {
    if (!enabled || !initial || !bounds || !orbit.current || !(camera instanceof PerspectiveCamera)) return;
    const target = selectedPart && focus ? focus.target.clone() : initial.target.clone();
    const direction = selectedPart && focus ? focus.dir.clone().normalize() : initial.direction.clone();
    // Keep detail views tied to the model anatomy, with enough room for the notes.
    const detailFraction = selectedPart === "eyes" ? 0.24 : selectedPart === "ears" ? 0.3 : 0.36;
    const detailAngle = Math.atan(
      Math.tan(MathUtils.degToRad(camera.fov / 2))
        * Math.min(frame.height / size.height, frame.width / size.height) * 0.9,
    );
    const distance = selectedPart && focus
      ? Math.max(minDistance, bounds.radius * detailFraction / Math.sin(detailAngle))
      : initial.distance;
    // Keep the orbit above the floor, even when a selected surface points down.
    direction.y = Math.max(0.08, direction.y);
    direction.normalize();
    if (!positioned.current) {
      orbit.current.target.copy(target);
      camera.position.copy(target).addScaledVector(direction, distance);
      orbit.current.update();
      positioned.current = true;
      invalidate();
      return;
    }
    const fromOffset = camera.position.clone().sub(orbit.current.target);
    const fromDistance = fromOffset.length();
    const fromDirection = fromOffset.normalize();
    flight.current = {
      fromTarget: orbit.current.target.clone(),
      toTarget: target,
      fromDirection,
      rotation: new Quaternion().setFromUnitVectors(fromDirection, direction),
      fromDistance,
      toDistance: distance,
      elapsed: 0,
    };
    invalidate();
  }, [bounds, camera, enabled, focus, frame, initial, invalidate, minDistance, resetSignal, selectedPart, size.height]);

  useFrame((_, delta) => {
    const move = flight.current;
    if (!move || !orbit.current) return;
    move.elapsed = Math.min(1, move.elapsed + Math.min(delta, 0.05) / 0.65);
    const ease = 1 - Math.pow(1 - move.elapsed, 3);
    const direction = move.fromDirection.clone().applyQuaternion(
      new Quaternion().slerp(move.rotation, ease),
    );
    const distance = move.fromDistance + (move.toDistance - move.fromDistance) * ease;
    orbit.current.target.copy(move.fromTarget).lerp(move.toTarget, ease);
    camera.position.copy(orbit.current.target).addScaledVector(direction, distance);
    orbit.current.update();
    if (move.elapsed >= 1) flight.current = null;
    else invalidate();
  });

  useEffect(() => {
    const zoom = (factor: number) => {
      if (!orbit.current || !enabled) return;
      flight.current = null;
      const offset = camera.position.clone().sub(orbit.current.target);
      const distance = Math.max(minDistance, Math.min(maxDistance, offset.length() * factor));
      camera.position.copy(orbit.current.target).add(offset.setLength(distance));
      orbit.current.update();
      invalidate();
    };
    onControlsReady({ zoomIn: () => zoom(0.78), zoomOut: () => zoom(1.28) });
    return () => onControlsReady(null);
  }, [camera, enabled, invalidate, maxDistance, minDistance, onControlsReady]);

  return (
    <OrbitControls
      ref={orbit}
      enabled={enabled}
      enablePan={false}
      enableDamping={false}
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2 - 0.04}
      onStart={() => { flight.current = null; }}
    />
  );
}

class ViewerErrorBoundary extends Component<
  { children: ReactNode; onError: (message: string) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onError(error.message); }
  render() { return this.state.failed ? null : this.props.children; }
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!context;
  } catch {
    return false;
  }
}

export function CatViewer({ selectedPart, onPartSelect, onOverallSelect, onReady, resetSignal, panelOpen = false }: Props) {
  const [ready, setReady] = useState(false);
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const [bounds, setBounds] = useState<ModelBounds | null>(null);
  const [error, setError] = useState("");
  const supported = useMemo(hasWebGL, []);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const controls = useRef<Controls | null>(null);
  const onControlsReady = useCallback((value: Controls | null) => { controls.current = value; }, []);
  const handleReady = useCallback(() => { setReady(true); onReady(); }, [onReady]);

  return (
    <div className={`cat-stage${panelOpen ? " has-notes" : ""}`} aria-label="Quan sát chú mèo 3D">
      {supported && !error ? (
        <ViewerErrorBoundary onError={setError}>
          <Canvas
            frameloop="demand"
            shadows="soft"
            dpr={[1, 1.7]}
            camera={{ fov: 42, near: 0.05, far: 100, position: [2.4, 2.4, 6.5] }}
            gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.93 }}
            onPointerDownCapture={(event) => {
              pointerDown.current = { x: event.clientX, y: event.clientY };
            }}
          >
            <color attach="background" args={["#f5f3ef"]} />
            <ambientLight intensity={0.18} />
            <hemisphereLight args={["#ffffff", "#c7c1b8", 0.5]} />
            <directionalLight
              castShadow
              color="#ffffff"
              position={[-3.5, 6, 5]}
              intensity={1.6}
              shadow-mapSize={[2048, 2048]}
              shadow-camera-left={-4}
              shadow-camera-right={4}
              shadow-camera-top={4}
              shadow-camera-bottom={-4}
              shadow-camera-near={0.5}
              shadow-camera-far={20}
              shadow-bias={-0.00015}
              shadow-normalBias={0.012}
              shadow-radius={3}
            />
            <directionalLight color="#e8edf5" position={[4, 3, 2]} intensity={0.6} />
            <directionalLight color="#ffffff" position={[-1, 4, -4]} intensity={1.1} />
            <Environment resolution={128} environmentIntensity={0.35}>
              <Lightformer form="rect" color="#ffffff" intensity={1.6} position={[-3, 5, 4]} scale={[4, 5, 1]} target={[0, 1.5, 0]} />
              <Lightformer form="rect" color="#e8edf5" intensity={0.8} position={[4, 2, 1]} scale={[3, 4, 1]} target={[0, 1.5, 0]} />
              <Lightformer form="rect" color="#ffffff" intensity={1.2} position={[0, 4, -4]} scale={[3, 3, 1]} target={[0, 1.5, 0]} />
            </Environment>
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
              <planeGeometry args={[200, 200]} />
              <meshStandardMaterial color="#f5f3ef" roughness={1} metalness={0} />
            </mesh>
            {ready && (
              <ContactShadows frames={Infinity} position={[0, 0.009, 0]} scale={7} far={3.2} blur={2.4} opacity={0.24} color="#77716a" resolution={512} />
            )}
            <Suspense fallback={null}>
              <ModelLoader
                selectedPart={selectedPart}
                onPartSelect={onPartSelect}
                onOverallSelect={onOverallSelect}
                onReady={handleReady}
                onFocus={setFocus}
                onBounds={setBounds}
                pointerDown={pointerDown}
              />
            </Suspense>
            <CameraRig
              selectedPart={selectedPart}
              focus={focus}
              bounds={bounds}
              resetSignal={resetSignal}
              enabled={ready}
              panelOpen={panelOpen}
              onControlsReady={onControlsReady}
            />
          </Canvas>
        </ViewerErrorBoundary>
      ) : (
        <div className="cat-unavailable" role="alert">
          {error ? `Không thể hiển thị mèo 3D: ${error}` : "Trình duyệt không hỗ trợ WebGL."}
        </div>
      )}
      {!ready && supported && !error && (
        <div className="cat-intro-hint" role="status">Đang tải mô hình mèo…</div>
      )}
      {ready && (
        <>
          <div className="cat-gesture-hint">Kéo để xoay · Cuộn chuột để phóng to / thu nhỏ</div>
          <div className="cat-zoom-controls" aria-label="Điều khiển phóng to thu nhỏ">
            <button type="button" aria-label="Phóng to" onClick={() => controls.current?.zoomIn()}><Plus size={18} /></button>
            <button type="button" aria-label="Thu nhỏ" onClick={() => controls.current?.zoomOut()}><Minus size={18} /></button>
          </div>
        </>
      )}
    </div>
  );
}
