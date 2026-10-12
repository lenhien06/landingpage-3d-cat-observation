import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Minus, Plus } from "lucide-react";
import { Quaternion, Vector3 } from "three";
import type { PartId } from "../data/questions";
import { ProceduralCat } from "./ProceduralCat";

type Controls = { zoomIn: () => void; zoomOut: () => void };
type Props = {
  selectedPart: PartId | null;
  onPartSelect: (part: PartId) => void;
  onOverallSelect: () => void;
  onReady: () => void;
  resetSignal: number;
};

const focusViews: Record<PartId, { target: [number, number, number]; position: [number, number, number] }> = {
  eyes: { target: [0, 1.85, 1.5], position: [1.2, 2.3, 4.4] },
  ears: { target: [0, 2.25, 1.05], position: [1.2, 3.1, 4.8] },
  legs: { target: [0, 0.55, 0.7], position: [2.3, 2.0, 4.6] },
  tail: { target: [0, 1.8, -1.5], position: [3.1, 2.8, -4.4] },
};

function CameraRig({
  selectedPart,
  resetSignal,
  enabled,
  onControlsReady,
}: {
  selectedPart: PartId | null;
  resetSignal: number;
  enabled: boolean;
  onControlsReady: (controls: Controls | null) => void;
}) {
  const { camera, size, invalidate } = useThree();
  const orbit = useRef<ComponentRef<typeof OrbitControls>>(null);
  const flight = useRef<{
    fromTarget: Vector3;
    toTarget: Vector3;
    fromDirection: Vector3;
    rotation: Quaternion;
    fromDistance: number;
    toDistance: number;
    elapsed: number;
  } | null>(null);
  const initial = useMemo(() => {
    const distance = size.width / size.height < 0.75 ? 9.5 : 7.5;
    const target = new Vector3(0, 1.2, 0);
    const position = new Vector3(0.5, 0.25, 1).normalize().multiplyScalar(distance).add(target);
    return { target, position };
  }, [size.width, size.height]);

  useEffect(() => {
    camera.position.copy(initial.position);
    orbit.current?.target.copy(initial.target);
    orbit.current?.update();
    invalidate();
    // The camera is first positioned when the canvas is mounted.
    // Subsequent view changes are handled by the flight effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!enabled || !orbit.current) return;
    const view = selectedPart ? focusViews[selectedPart] : null;
    const target = view ? new Vector3(...view.target) : initial.target.clone();
    const position = view ? new Vector3(...view.position) : initial.position.clone();
    const fromOffset = camera.position.clone().sub(orbit.current.target);
    const toOffset = position.sub(target);
    const fromDistance = fromOffset.length();
    const toDistance = toOffset.length();
    const fromDirection = fromOffset.normalize();
    flight.current = {
      fromTarget: orbit.current.target.clone(),
      toTarget: target,
      fromDirection,
      rotation: new Quaternion().setFromUnitVectors(fromDirection, toOffset.normalize()),
      fromDistance,
      toDistance,
      elapsed: 0,
    };
    invalidate();
  }, [camera, enabled, initial, invalidate, resetSignal, selectedPart]);

  useFrame((_, delta) => {
    const move = flight.current;
    if (!move || !orbit.current) return;
    move.elapsed = Math.min(1, move.elapsed + delta / 0.85);
    const ease = 1 - Math.pow(1 - move.elapsed, 3);
    const direction = move.fromDirection.clone().applyQuaternion(
      new Quaternion().slerp(move.rotation, ease),
    );
    const distance = move.fromDistance + (move.toDistance - move.fromDistance) * ease;
    orbit.current.target.copy(move.fromTarget).lerp(move.toTarget, ease);
    camera.position.copy(orbit.current.target).addScaledVector(direction, distance);
    orbit.current.update();
    if (move.elapsed >= 1) flight.current = null;
  });

  useEffect(() => {
    const zoom = (factor: number) => {
      if (!orbit.current || !enabled) return;
      flight.current = null;
      const offset = camera.position.clone().sub(orbit.current.target);
      const distance = Math.max(2.2, Math.min(14, offset.length() * factor));
      camera.position.copy(orbit.current.target).add(offset.setLength(distance));
      orbit.current.update();
      invalidate();
    };
    onControlsReady({ zoomIn: () => zoom(0.78), zoomOut: () => zoom(1.28) });
    return () => onControlsReady(null);
  }, [camera, enabled, invalidate, onControlsReady]);

  return (
    <OrbitControls
      ref={orbit}
      enabled={enabled}
      enablePan={false}
      enableDamping={false}
      minDistance={2.2}
      maxDistance={14}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI - 0.2}
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

export function CatViewer({ selectedPart, onPartSelect, onOverallSelect, onReady, resetSignal }: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const supported = useMemo(hasWebGL, []);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const controls = useRef<Controls | null>(null);
  const onControlsReady = useCallback((value: Controls | null) => { controls.current = value; }, []);
  const handleReady = useCallback(() => { setReady(true); onReady(); }, [onReady]);

  return (
    <div className="cat-stage" aria-label="Quan sát chú mèo 3D">
      {supported && !error ? (
        <ViewerErrorBoundary onError={setError}>
          <Canvas
            flat
            dpr={[1, 1.7]}
            camera={{ fov: 45, near: 0.1, far: 100, position: [3.3, 2.8, 7] }}
            gl={{ antialias: true }}
            onPointerDownCapture={(event) => {
              pointerDown.current = { x: event.clientX, y: event.clientY };
            }}
          >
            <color attach="background" args={["#fff4e5"]} />
            <fog attach="fog" args={["#fff4e5", 14, 60]} />
            <ambientLight intensity={0.75} />
            <hemisphereLight args={["#ffffff", "#e8c9a0", 1.0]} />
            <directionalLight position={[4, 8, 6]} intensity={1.1} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, 0]}>
              <planeGeometry args={[200, 200]} />
              <meshBasicMaterial color="#ffffff" fog={false} />
            </mesh>
            <ProceduralCat
              selectedPart={selectedPart}
              onPartSelect={onPartSelect}
              onOverallSelect={onOverallSelect}
              onReady={handleReady}
              pointerDown={pointerDown}
            />
            <CameraRig
              selectedPart={selectedPart}
              resetSignal={resetSignal}
              enabled={ready}
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
        <div className="cat-intro-hint" role="status">Chú mèo đang chạy tới…</div>
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
