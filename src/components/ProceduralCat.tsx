import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { PartId } from "../data/questions";
import { createCoatTextures, createIrisTexture, type CoatKind } from "../utils/catCoat";
import { createBodyGeometry, createHeadGeometry } from "../utils/catSculpt";
import {
  createCurveGeometry, createEarGeometry, createEyeGeometry, createFurGeometry,
  createInnerEarGeometry, createNoseGeometry, createTailGeometry, type VectorTuple,
} from "../utils/catGeometry";

const INTRO_SECONDS = 4.2;
const INTRO_START_Z = -45;
const SIDES = [-1, 1] as const;
const ignoreRaycast = () => {};

type Props = {
  selectedPart: PartId | null;
  onPartSelect: (part: PartId) => void;
  onOverallSelect: () => void;
  onReady: () => void;
  pointerDown: React.RefObject<{ x: number; y: number } | null>;
};

function createCatAssets() {
  const textures: THREE.Texture[] = [];
  const coat = (kind: CoatKind) => {
    const maps = createCoatTextures(kind);
    textures.push(maps.map, maps.bumpMap);
    return new THREE.MeshPhysicalMaterial({
      ...maps, bumpScale: kind === "cream" ? 0.012 : 0.018,
      roughness: 0.93, metalness: 0, sheen: 0.55,
      sheenColor: new THREE.Color("#f5d9aa"), sheenRoughness: 0.9,
    });
  };
  const iris = createIrisTexture();
  textures.push(iris);
  const cream = coat("cream");
  const materials = {
    body: coat("body"), head: coat("head"), leg: coat("leg"),
    tail: coat("tail"), cream, paw: cream.clone(),
    ear: new THREE.MeshPhysicalMaterial({ color: "#c38b50", roughness: 0.92, sheen: 0.5, sheenColor: new THREE.Color("#f4c68b") }),
    innerEar: new THREE.MeshStandardMaterial({ color: "#cf9382", roughness: 0.9, side: THREE.DoubleSide }),
    eye: new THREE.MeshPhysicalMaterial({ map: iris, roughness: 0.19, clearcoat: 1, clearcoatRoughness: 0.06, metalness: 0 }),
    eyeRim: new THREE.MeshStandardMaterial({ color: "#543d28", roughness: 0.78 }),
    eyeLid: new THREE.MeshPhysicalMaterial({ color: "#c38b50", roughness: 0.9, sheen: 0.4 }),
    nose: new THREE.MeshPhysicalMaterial({ color: "#c67870", roughness: 0.57, clearcoat: 0.12 }),
    mouth: new THREE.MeshStandardMaterial({ color: "#614537", roughness: 0.85 }),
    whisker: new THREE.MeshStandardMaterial({ color: "#fff7e5", roughness: 0.6 }),
    pad: new THREE.MeshStandardMaterial({ color: "#bf8a83", roughness: 0.84 }),
    fur: new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.46, depthWrite: false }),
  };
  const tailCurve = new THREE.CatmullRomCurve3([
    [0, 0, 0], [0.03, 0.3, -0.29], [0.07, 0.77, -0.44],
    [0.02, 1.14, -0.36], [-0.15, 1.37, -0.16], [-0.31, 1.26, 0.04],
  ].map((point) => new THREE.Vector3(...point)));
  const eyeOutline: VectorTuple[] = Array.from({ length: 33 }, (_, index) => {
    const angle = index / 32 * Math.PI * 2;
    const x = Math.cos(angle) * 0.18;
    const y = Math.sin(angle) * (0.72 + 0.28 * Math.abs(Math.sin(angle))) * 0.108;
    return [x, y, -(x * x + y * y) / 0.84 + 0.002];
  });
  const geometries = {
    sphere: new THREE.SphereGeometry(1, 32, 20),
    detailSphere: new THREE.SphereGeometry(1, 12, 8),
    body: createBodyGeometry(), head: createHeadGeometry(),
    ear: createEarGeometry(), innerEar: createInnerEarGeometry(),
    eye: createEyeGeometry(), nose: createNoseGeometry(), tail: createTailGeometry(tailCurve),
    eyeRim: createCurveGeometry(eyeOutline, 0.006, 64),
    eyeLid: createCurveGeometry(eyeOutline.map(([x, y, z]) => [x, y, z - 0.009]), 0.017, 64),
    philtrum: createCurveGeometry([[0, 1.742, 1.664], [0, 1.693, 1.663], [0, 1.665, 1.645]], 0.006),
    bodyFur: createFurGeometry([
      { center: [0, 1.2, -0.12], scale: [0.56, 0.59, 1.08], count: 1900 },
      { center: [0, 1.43, 0.57], scale: [0.43, 0.51, 0.46], count: 500 },
      { center: [0, 1.6, 0.84], scale: [0.35, 0.44, 0.36], count: 400 },
    ], 743),
    headFur: createFurGeometry([
      { center: [0, 1.91, 1.025], scale: [0.505, 0.455, 0.495], count: 1300 },
      ...SIDES.map((side) => ({ center: [side * 0.32, 1.76, 1.2] as VectorTuple, scale: [0.195, 0.22, 0.235] as VectorTuple, count: 160 })),
      ...SIDES.map((side) => ({ center: [side * 0.14, 1.737, 1.475] as VectorTuple, scale: [0.19, 0.135, 0.165] as VectorTuple, count: 220, cream: true })),
    ], 924),
    chestFur: createFurGeometry([{ center: [0, 1.35, 0.835], scale: [0.285, 0.41, 0.185], count: 500, cream: true }], 124),
    frontLegFur: createFurGeometry([{ center: [0, -0.65, 0.025], scale: [0.105, 0.35, 0.12], count: 230 }], 612),
    backLegFur: createFurGeometry([{ center: [0, -0.65, -0.11], scale: [0.11, 0.31, 0.13], count: 230 }], 622),
  };
  const whiskers = SIDES.flatMap((side) => Array.from({ length: 6 }, (_, index) =>
    createCurveGeometry([
      [side * 0.17, 1.74 + (index - 2.5) * 0.0095, 1.625],
      [side * 0.42, 1.75 + (index - 2.5) * 0.038, 1.65],
      [side * 0.71, 1.76 + (index - 2.5) * 0.0646, 1.61],
      [side * (0.9 + index % 2 * 0.07), 1.75 + (index - 2.5) * 0.0874, 1.48],
    ], 0.0028, 24),
  ));
  const eyebrowWhiskers = SIDES.flatMap((side) => Array.from({ length: 3 }, (_, index) =>
    createCurveGeometry([
      [side * (0.24 + index * 0.035), 2.115, 1.405],
      [side * (0.28 + index * 0.06), 2.26, 1.44],
      [side * (0.38 + index * 0.085), 2.37, 1.40],
    ], 0.002, 18),
  ));
  const mouth = SIDES.map((side) => createCurveGeometry([
    [0, 1.665, 1.645], [side * 0.055, 1.642, 1.624], [side * 0.12, 1.655, 1.59],
  ], 0.005, 20));
  const earTufts = createFurGeometry([{ center: [0, 0.10, 0.093], scale: [0.135, 0.072, 0.03], count: 95, cream: true }], 324);
  return { materials, geometries, whiskers, eyebrowWhiskers, mouth, earTufts, tailCurve, textures };
}

export function ProceduralCat({ selectedPart, onPartSelect, onOverallSelect, onReady, pointerDown }: Props) {
  const cat = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const legs = useRef<THREE.Group[]>([]);
  const eyes = useRef<THREE.Group[]>([]);
  const elapsed = useRef(0);
  const ready = useRef(false);
  const reducedMotion = useRef(false);
  const assets = useMemo(createCatAssets, []);
  const { materials, geometries } = assets;

  useEffect(() => () => {
    Object.values(assets.materials).forEach((material) => material.dispose());
    Object.values(assets.geometries).forEach((geometry) => geometry.dispose());
    assets.whiskers.forEach((geometry) => geometry.dispose());
    assets.eyebrowWhiskers.forEach((geometry) => geometry.dispose());
    assets.mouth.forEach((geometry) => geometry.dispose());
    assets.earTufts.dispose();
    assets.textures.forEach((texture) => texture.dispose());
  }, [assets]);

  useEffect(() => {
    const highlights: [THREE.MeshStandardMaterial, PartId][] = [
      [materials.ear, "ears"], [materials.innerEar, "ears"],
      [materials.eye, "eyes"], [materials.leg, "legs"],
      [materials.paw, "legs"], [materials.tail, "tail"],
    ];
    highlights.forEach(([material, part]) => {
      material.emissive.set(selectedPart === part ? "#8f5e23" : "#000000");
      material.emissiveIntensity = selectedPart === part ? 0.17 : 0;
    });
  }, [materials, selectedPart]);

  useLayoutEffect(() => {
    reducedMotion.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reducedMotion.current) {
      ready.current = true;
      onReady();
    } else if (cat.current && !ready.current) {
      cat.current.position.z = INTRO_START_Z;
    }
  }, [onReady]);

  useFrame((_, delta) => {
    if (!cat.current || reducedMotion.current) return;
    elapsed.current += Math.min(delta, 0.05);
    const time = elapsed.current;
    if (!ready.current) {
      const progress = Math.min(time / INTRO_SECONDS, 1);
      const ease = 1 - Math.pow(1 - progress, 2.2);
      const speed = (1 - progress) * 0.8 + 0.2;
      const swing = Math.sin(time * 14) * 0.58 * speed;
      cat.current.position.set(0, Math.abs(Math.sin(time * 14)) * 0.085 * speed, INTRO_START_Z * (1 - ease));
      legs.current.forEach((leg, index) => { leg.rotation.x = index === 0 || index === 3 ? swing : -swing; });
      if (tail.current) tail.current.rotation.z = Math.sin(time * 7) * 0.1;
      if (progress >= 1) {
        ready.current = true;
        cat.current.position.set(0, 0, 0);
        legs.current.forEach((leg) => { leg.rotation.x = 0; });
        onReady();
      }
    } else {
      if (torso.current) torso.current.scale.y = 1 + Math.sin(time * 1.9) * 0.006;
      if (tail.current) {
        tail.current.rotation.z = Math.sin(time * 1.45) * 0.09;
        tail.current.rotation.y = Math.sin(time * 0.9) * 0.065;
      }
      if (head.current) head.current.rotation.y = Math.sin(time * 0.65) * 0.018;
      const blinkPhase = (time - INTRO_SECONDS + 2.2) % 5.7;
      const openness = blinkPhase < 0.18 ? Math.max(0.055, 1 - Math.sin(blinkPhase / 0.18 * Math.PI)) : 1;
      eyes.current.forEach((eye) => { eye.scale.y = openness; });
    }
  });

  const isClick = (event: ThreeEvent<PointerEvent>) => {
    const start = pointerDown.current;
    return !!start && Math.hypot(event.nativeEvent.clientX - start.x, event.nativeEvent.clientY - start.y) < 7;
  };
  const select = (event: ThreeEvent<PointerEvent>, part: PartId) => {
    event.stopPropagation();
    if (ready.current && isClick(event)) onPartSelect(part);
  };
  const selectOverall = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (ready.current && isClick(event)) onOverallSelect();
  };

  return (
    <group ref={cat} onPointerUp={selectOverall} dispose={null}>
      <group ref={torso}>
        <mesh geometry={geometries.body} material={materials.body} castShadow receiveShadow />
        <mesh geometry={geometries.sphere} material={materials.cream} position={[0, 1.35, 0.835]} scale={[0.285, 0.41, 0.185]} castShadow receiveShadow />
        <mesh geometry={geometries.sphere} material={materials.cream} position={[0, 0.83, -0.05]} scale={[0.38, 0.24, 0.78]} receiveShadow />
        <lineSegments geometry={geometries.bodyFur} material={materials.fur} raycast={ignoreRaycast} />
        <lineSegments geometry={geometries.chestFur} material={materials.fur} raycast={ignoreRaycast} />
      </group>

      <group ref={head}>
        <mesh geometry={geometries.head} material={materials.head} castShadow receiveShadow />
        <lineSegments geometry={geometries.headFur} material={materials.fur} raycast={ignoreRaycast} />

        {SIDES.map((side, index) => (
          <group key={`eye-${side}`} position={[side * 0.255, 1.975, 1.452]} rotation={[-0.16, side * 0.55, side * 0.14]} onPointerUp={(event) => select(event, "eyes")}>
            <group ref={(node) => { if (node) eyes.current[index] = node; }}>
              <mesh geometry={geometries.eyeLid} material={materials.eyeLid} />
              <mesh geometry={geometries.eye} material={materials.eye} />
              <mesh geometry={geometries.eyeRim} material={materials.eyeRim} />
            </group>
          </group>
        ))}

        {SIDES.map((side) => (
          <group key={`ear-${side}`} position={[side * 0.34, 2.14, 1.01]} rotation={[-0.10, side * 0.12, -side * 0.24]} onPointerUp={(event) => select(event, "ears")}>
            <mesh geometry={geometries.ear} material={materials.ear} castShadow receiveShadow />
            <mesh geometry={geometries.innerEar} material={materials.innerEar} receiveShadow />
            <mesh geometry={geometries.sphere} material={materials.cream} position={[0, 0.09, 0.1]} scale={[0.12, 0.055, 0.032]} />
            <lineSegments geometry={assets.earTufts} material={materials.fur} raycast={ignoreRaycast} />
          </group>
        ))}

        <mesh geometry={geometries.sphere} material={materials.cream} position={[0, 1.615, 1.455]} scale={[0.20, 0.085, 0.142]} castShadow receiveShadow />
        <mesh geometry={geometries.sphere} material={materials.cream} position={[0, 1.73, 1.49]} scale={[0.12, 0.12, 0.16]} castShadow receiveShadow />
        {SIDES.map((side) => (
          <group key={`muzzle-${side}`}>
            <mesh geometry={geometries.sphere} material={materials.cream} position={[side * 0.14, 1.737, 1.475]} scale={[0.19, 0.135, 0.165]} castShadow receiveShadow />
            {Array.from({ length: 7 }, (_, index) => (
              <mesh key={index} geometry={geometries.detailSphere} material={materials.mouth} position={[side * (0.095 + index % 3 * 0.047), 1.713 + Math.floor(index / 3) * 0.031, 1.635 - index % 3 * 0.008]} scale={[0.004, 0.004, 0.003]} />
            ))}
          </group>
        ))}
        <mesh geometry={geometries.nose} material={materials.nose} position={[0, 1.793, 1.63]} castShadow />
        {SIDES.map((side) => <mesh key={`nostril-${side}`} geometry={geometries.detailSphere} material={materials.mouth} position={[side * 0.057, 1.798, 1.659]} scale={[0.012, 0.006, 0.004]} />)}
        <mesh geometry={geometries.philtrum} material={materials.mouth} />
        {assets.mouth.map((geometry, index) => <mesh key={`mouth-${index}`} geometry={geometry} material={materials.mouth} />)}
        {assets.whiskers.map((geometry, index) => <mesh key={`whisker-${index}`} geometry={geometry} material={materials.whisker} raycast={ignoreRaycast} />)}
        {assets.eyebrowWhiskers.map((geometry, index) => <mesh key={`eyebrow-${index}`} geometry={geometry} material={materials.whisker} raycast={ignoreRaycast} />)}
      </group>

      {([[-1, 0.68], [1, 0.68], [-1, -0.73], [1, -0.73]] as const).map(([side, z], index) => {
        const front = index < 2;
        const pawZ = front ? 0.11 : -0.015;
        return (
          <group key={`leg-${index}`} ref={(node) => { if (node) legs.current[index] = node; }} position={[side * 0.36, 1.12, z]} onPointerUp={(event) => select(event, "legs")}>
            <mesh geometry={geometries.sphere} material={materials.leg} position={[0, -0.19, -0.04]} rotation={[front ? 0.06 : 0.33, 0, 0]} scale={front ? [0.155, 0.415, 0.17] : [0.235, 0.42, 0.285]} castShadow receiveShadow />
            <mesh geometry={geometries.sphere} material={materials.leg} position={[0, -0.65, front ? 0.025 : -0.11]} rotation={[front ? -0.035 : -0.24, 0, 0]} scale={front ? [0.105, 0.35, 0.12] : [0.11, 0.31, 0.13]} castShadow receiveShadow />
            <lineSegments geometry={front ? geometries.frontLegFur : geometries.backLegFur} material={materials.fur} raycast={ignoreRaycast} />
            <group position={[0, -1.005, pawZ]}>
              <mesh geometry={geometries.sphere} material={materials.paw} scale={[0.165, 0.105, 0.205]} castShadow receiveShadow />
              {[-1, 0, 1].map((toe) => <mesh key={toe} geometry={geometries.sphere} material={materials.paw} position={[toe * 0.095, -0.027, 0.145 - Math.abs(toe) * 0.013]} scale={[0.062, 0.07, 0.088]} castShadow receiveShadow />)}
              <mesh geometry={geometries.detailSphere} material={materials.pad} position={[0, -0.092, -0.015]} scale={[0.094, 0.013, 0.096]} />
              {[-1, 0, 1].map((toe) => <mesh key={`pad-${toe}`} geometry={geometries.detailSphere} material={materials.pad} position={[toe * 0.095, -0.093, 0.135]} scale={[0.036, 0.009, 0.047]} />)}
            </group>
          </group>
        );
      })}

      <group ref={tail} position={[0, 1.23, -1.08]} onPointerUp={(event) => select(event, "tail")}>
        <mesh geometry={geometries.tail} material={materials.tail} castShadow receiveShadow />
        <mesh geometry={geometries.sphere} material={materials.tail} position={assets.tailCurve.getPoint(1)} scale={[0.018, 0.018, 0.018]} castShadow />
      </group>
    </group>
  );
}
