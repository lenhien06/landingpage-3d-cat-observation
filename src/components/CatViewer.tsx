import { Component, Suspense, useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Minus, Plus } from "lucide-react";
import { ACESFilmicToneMapping } from "three";
import type { PartId } from "../data/questions";
import { ModelLoader } from "./ModelLoader";
import { RoomEnvironment } from "./RoomEnvironment";
import { ObservationLighting } from "./ObservationLighting";
import { CameraRig, type ViewerControls } from "./CameraRig";
import type { FocusTarget, ModelBounds } from "./ModelLoader";

type Props = {
  selectedPart: PartId | null;
  onPartSelect: (part: PartId) => void;
  onOverallSelect: () => void;
  onReady: () => void;
  resetSignal: number;
  panelOpen?: boolean;
};

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
  const controls = useRef<ViewerControls | null>(null);
  const onControlsReady = useCallback((value: ViewerControls | null) => { controls.current = value; }, []);
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
            gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
            onPointerDownCapture={(event) => {
              pointerDown.current = { x: event.clientX, y: event.clientY };
            }}
          >
            <color attach="background" args={["#e5dfd2"]} />
            <fog attach="fog" args={["#e5dfd2", 20, 58]} />
            <ObservationLighting />
            {ready && (
              <ContactShadows frames={Infinity} position={[0, 0.006, 0]} scale={12} far={4.5} blur={2.2} opacity={0.32} color="#4f402e" resolution={512} />
            )}
            <Suspense fallback={null}>
              <RoomEnvironment />
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
          <div className="cat-gesture-hint">Kéo để đổi góc nhìn · Cuộn chuột để phóng to / thu nhỏ</div>
          <div className="cat-zoom-controls" aria-label="Điều khiển phóng to thu nhỏ">
            <button type="button" aria-label="Phóng to" onClick={() => controls.current?.zoomIn()}><Plus size={18} /></button>
            <button type="button" aria-label="Thu nhỏ" onClick={() => controls.current?.zoomOut()}><Minus size={18} /></button>
          </div>
        </>
      )}
    </div>
  );
}
