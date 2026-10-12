import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { PartId } from "../data/questions";

const FUR = "#ffe084";
const LIGHT = "#fff0dc";
const INTRO_SECONDS = 4.2;
const INTRO_START_Z = -45;

type Props = {
  selectedPart: PartId | null;
  onPartSelect: (part: PartId) => void;
  onOverallSelect: () => void;
  onReady: () => void;
  pointerDown: React.RefObject<{ x: number; y: number } | null>;
};

export function ProceduralCat({
  selectedPart,
  onPartSelect,
  onOverallSelect,
  onReady,
  pointerDown,
}: Props) {
  const cat = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const legs = useRef<THREE.Group[]>([]);
  const elapsed = useRef(0);
  const ready = useRef(false);
  const reducedMotion = useRef(false);
  const tailCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          [0, 0, 0],
          [0, 0.3, -0.6],
          [0, 0.9, -0.95],
          [0, 1.5, -0.8],
          [0, 1.8, -0.4],
        ].map((point) => new THREE.Vector3(...point)),
      ),
    [],
  );

  useLayoutEffect(() => {
    reducedMotion.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reducedMotion.current) {
      ready.current = true;
      onReady();
    } else if (cat.current) {
      cat.current.position.z = INTRO_START_Z;
    }
  }, [onReady]);

  useFrame((_, delta) => {
    const group = cat.current;
    if (!group) return;
    elapsed.current += Math.min(delta, 0.05);
    const time = elapsed.current;
    if (!ready.current) {
      const progress = Math.min(time / INTRO_SECONDS, 1);
      const ease = 1 - Math.pow(1 - progress, 2.2);
      const speed = (1 - progress) * 0.8 + 0.2;
      const swing = Math.sin(time * 14) * 0.7 * speed;
      group.position.z = INTRO_START_Z * (1 - ease);
      group.position.y = Math.abs(Math.sin(time * 14)) * 0.12 * speed;
      legs.current.forEach((leg, index) => {
        if (leg) leg.rotation.x = index === 0 || index === 3 ? swing : -swing;
      });
      if (tail.current) tail.current.rotation.z = Math.sin(time * 7) * 0.15;
      if (progress >= 1) {
        ready.current = true;
        group.position.set(0, 0, 0);
        legs.current.forEach((leg) => {
          if (leg) leg.rotation.x = 0;
        });
        onReady();
      }
    } else if (!reducedMotion.current) {
      group.position.y = Math.sin(time * 2) * 0.015;
      if (tail.current) tail.current.rotation.z = Math.sin(time * 2) * 0.35;
    }
  });

  const isClick = (event: ThreeEvent<PointerEvent>) => {
    const start = pointerDown.current;
    return (
      !!start &&
      Math.hypot(event.nativeEvent.clientX - start.x, event.nativeEvent.clientY - start.y) < 7
    );
  };
  const select = (event: ThreeEvent<PointerEvent>, part: PartId) => {
    event.stopPropagation();
    if (ready.current && isClick(event)) onPartSelect(part);
  };
  const selectOverall = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (ready.current && isClick(event)) onOverallSelect();
  };
  const selectedGlow = (part: PartId) =>
    selectedPart === part ? "#5c310d" : "#000000";

  return (
    <group ref={cat} onPointerUp={selectOverall}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} scale={[1, 1.4, 1]}>
        <circleGeometry args={[1.6, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} depthWrite={false} />
      </mesh>

      <mesh position={[0, 1, 0]} scale={[0.8, 0.8, 1.3]}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshStandardMaterial color={FUR} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.8, 0.2]} scale={[0.7, 0.5, 1]}>
        <sphereGeometry args={[0.5, 24, 18]} />
        <meshStandardMaterial color={LIGHT} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.75, 1.1]}>
        <sphereGeometry args={[0.65, 24, 18]} />
        <meshStandardMaterial color={FUR} roughness={0.85} />
      </mesh>

      {([-1, 1] as const).map((side) => (
        <group key={`ear-${side}`} onPointerUp={(event) => select(event, "ears")}>
          <mesh position={[side * 0.4, 2.3, 1.05]} rotation={[0, Math.PI / 4, -side * 0.2]}>
            <coneGeometry args={[0.28, 0.55, 4]} />
            <meshStandardMaterial color={FUR} roughness={0.85} emissive={selectedGlow("ears")} emissiveIntensity={0.16} />
          </mesh>
          <mesh position={[side * 0.4, 2.27, 1.15]} rotation={[0, Math.PI / 4, -side * 0.2]}>
            <coneGeometry args={[0.15, 0.35, 4]} />
            <meshStandardMaterial color="#f5a9a9" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {([-1, 1] as const).map((side) => (
        <group key={`eye-${side}`} onPointerUp={(event) => select(event, "eyes")}>
          <mesh position={[side * 0.26, 1.85, 1.62]} scale={[1, 1.1, 0.6]}>
            <sphereGeometry args={[0.15, 24, 18]} />
            <meshStandardMaterial color="#9be37a" roughness={0.65} emissive={selectedGlow("eyes")} emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[side * 0.26, 1.85, 1.7]} scale={[0.6, 1.3, 0.5]}>
            <sphereGeometry args={[0.07, 20, 16]} />
            <meshStandardMaterial color="#111111" roughness={0.5} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 1.7, 1.74]} scale={[1, 0.7, 0.7]}>
        <sphereGeometry args={[0.09, 18, 14]} />
        <meshStandardMaterial color="#f08a9a" roughness={0.8} />
      </mesh>
      {([-1, 1] as const).flatMap((side) =>
        [-0.12, 0, 0.12].map((offset, index) => (
          <mesh
            key={`whisker-${side}-${index}`}
            position={[side * 0.55, 1.66 + offset, 1.6]}
            rotation={[0, 0, Math.PI / 2 + side * offset * 1.5]}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.9, 6]} />
            <meshStandardMaterial color="#ffffff" roughness={0.85} />
          </mesh>
        )),
      )}

      {([[-1, 0.7], [1, 0.7], [-1, -0.7], [1, -0.7]] as const).map(([side, z], index) => (
        <group
          key={`leg-${index}`}
          ref={(node) => { if (node) legs.current[index] = node; }}
          position={[side * 0.42, 0.85, z]}
          onPointerUp={(event) => select(event, "legs")}
        >
          <mesh position={[0, -0.4, 0]}>
            <cylinderGeometry args={[0.15, 0.13, 0.85, 12]} />
            <meshStandardMaterial color={FUR} roughness={0.85} emissive={selectedGlow("legs")} emissiveIntensity={0.12} />
          </mesh>
          <mesh position={[0, -0.82, 0.05]} scale={[1, 0.7, 1.3]}>
            <sphereGeometry args={[0.19, 24, 18]} />
            <meshStandardMaterial color={LIGHT} roughness={0.85} />
          </mesh>
        </group>
      ))}

      <group ref={tail} position={[0, 1.1, -1.2]} onPointerUp={(event) => select(event, "tail")}>
        <mesh>
          <tubeGeometry args={[tailCurve, 20, 0.13, 10, false]} />
          <meshStandardMaterial color={FUR} roughness={0.85} emissive={selectedGlow("tail")} emissiveIntensity={0.12} />
        </mesh>
        <mesh position={[0, 1.8, -0.4]}>
          <sphereGeometry args={[0.14, 20, 16]} />
          <meshStandardMaterial color="#8a5a2b" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}
