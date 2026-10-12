import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { modelConfig } from "../config/model";
import type { PartId } from "../data/questions";
import type { Hotspot } from "../utils/hotspots";

export type FocusTarget = { target: THREE.Vector3; dir: THREE.Vector3 };

// Hiệu ứng mèo chạy từ xa vào giữa màn hình.
const INTRO_SECONDS = 3.6;
const INTRO_START_Z = -30;

type Props = {
  introDone: boolean;
  onIntroDone: () => void;
  onFocus: (focus: FocusTarget | null) => void;
  selectedPart: PartId | null;
  hotspots: Hotspot[];
  setupPart: PartId | null;
  onPartSelect: (partId: PartId) => void;
  onSurfacePick?: (
    position: [number, number, number],
    normal: [number, number, number],
  ) => void;
  onBounds: (radius: number) => void;
  pointerDown: React.RefObject<{ x: number; y: number } | null>;
};

export function ModelLoader({
  introDone,
  onIntroDone,
  onFocus,
  selectedPart,
  hotspots,
  setupPart,
  onPartSelect,
  onSurfacePick,
  onBounds,
  pointerDown,
}: Props) {
  const { scene } = useGLTF(modelConfig.url);
  const prepared = useMemo(() => {
    const root = new THREE.Group();
    const content = new THREE.Group();
    // Cloning the hierarchy leaves the GLB geometry and PBR materials intact.
    const clone = scene.clone(true);
    content.add(clone);
    content.rotation.set(...modelConfig.rotation);
    content.scale.setScalar(modelConfig.scale);
    root.add(content);
    root.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(content);
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(maxSize) || maxSize <= 0)
      throw new Error("Mô hình không có kích thước hợp lệ.");

    const factor = modelConfig.displaySize / maxSize;
    root.scale.setScalar(factor);
    root.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-factor);
    root.updateMatrixWorld(true);
    const radius = new THREE.Box3()
      .setFromObject(root)
      .getBoundingSphere(new THREE.Sphere()).radius;
    return { root, radius, factor };
  }, [scene]);

  useEffect(() => {
    onBounds(prepared.radius);
  }, [onBounds, prepared.radius]);

  // ---- Hiệu ứng chạy vào ----
  const outer = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const finished = useRef(introDone);
  useLayoutEffect(() => {
    if (!outer.current || finished.current) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      finished.current = true;
      onIntroDone();
      return;
    }
    outer.current.position.z = INTRO_START_Z;
  }, [onIntroDone]);
  useFrame((state, delta) => {
    const group = outer.current;
    if (!group || finished.current) return;
    elapsed.current += Math.min(delta, 0.05);
    const k = Math.min(elapsed.current / INTRO_SECONDS, 1);
    const ease = 1 - Math.pow(1 - k, 2.2);
    const speed = 0.25 + 0.75 * (1 - k);
    const phase = elapsed.current * 13;
    group.position.set(
      0,
      Math.abs(Math.sin(phase)) * 0.07 * speed,
      INTRO_START_Z * (1 - ease),
    );
    group.rotation.z = Math.sin(phase) * 0.04 * speed;
    group.rotation.x = Math.sin(phase * 2) * 0.02 * speed;
    if (k >= 1) {
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      finished.current = true;
      onIntroDone();
    }
    state.invalidate();
  });

  // ---- Chọn bộ phận: camera bay tới gần bộ phận đó ----
  useEffect(() => {
    if (!introDone || setupPart) return;
    const point = selectedPart
      ? hotspots.find((item) => item.partId === selectedPart)
      : undefined;
    if (!point) {
      onFocus(null);
      return;
    }
    prepared.root.updateMatrixWorld(true);
    const target = prepared.root.localToWorld(new THREE.Vector3(...point.position));
    const flat = (v: THREE.Vector3) =>
      new THREE.Vector3(v.x, v.y * 0.3, v.z).normalize();
    const normal = new THREE.Vector3(...point.normal).transformDirection(
      prepared.root.matrixWorld,
    );
    const dir = flat(normal).add(flat(target));
    if (dir.length() < 0.05) dir.set(0.18, 0.12, 1);
    onFocus({ target, dir: dir.normalize() });
  }, [introDone, setupPart, selectedPart, hotspots, prepared, onFocus]);

  const isClick = (event: ThreeEvent<PointerEvent>) => {
    const start = pointerDown.current;
    return (
      !!start &&
      Math.hypot(
        event.nativeEvent.clientX - start.x,
        event.nativeEvent.clientY - start.y,
      ) < 7
    );
  };

  const handleModelUp = (event: ThreeEvent<PointerEvent>) => {
    // The frontmost mesh intercepts pointer events before an occluded hotspot.
    event.stopPropagation();
    if (!isClick(event) || !setupPart || !onSurfacePick) return;
    const localPoint = prepared.root.worldToLocal(event.point.clone());
    const worldNormal =
      event.face?.normal.clone().transformDirection(event.object.matrixWorld) ??
      new THREE.Vector3(0, 1, 0);
    const localNormal = worldNormal
      .transformDirection(
        new THREE.Matrix4().copy(prepared.root.matrixWorld).invert(),
      )
      .normalize();
    onSurfacePick(localPoint.toArray(), localNormal.toArray());
  };

  return (
    <group ref={outer}>
    <primitive object={prepared.root} dispose={null} onPointerUp={handleModelUp}>
      {introDone && hotspots.map((point) => {
        const normal = new THREE.Vector3(...point.normal).normalize();
        const position = new THREE.Vector3(...point.position).addScaledVector(
          normal,
          0.035 / prepared.factor,
        );
        const orientation = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          normal,
        );
        return (
          <group
            key={point.id}
            position={position.toArray()}
            quaternion={orientation}
            scale={1 / prepared.factor}
            onPointerUp={(event) => {
              event.stopPropagation();
              if (isClick(event)) onPartSelect(point.partId);
            }}
          >
            <mesh>
              <sphereGeometry args={[0.11, 12, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh>
              <torusGeometry args={[0.075, 0.017, 8, 24]} />
              <meshBasicMaterial
                color={selectedPart === point.partId ? "#087b80" : "#ffffff"}
                depthTest
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </primitive>
    </group>
  );
}
