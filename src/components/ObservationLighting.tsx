import { useMemo } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { Object3D } from "three";

export function ObservationLighting() {
  const sunTarget = useMemo(() => {
    const target = new Object3D();
    target.position.set(0, 1.2, 0);
    return target;
  }, []);
  return (
    <>
      <primitive object={sunTarget} />
      <ambientLight intensity={0.2} color="#fff4e5" />
      <hemisphereLight args={["#f2f2ee", "#b1997b", 0.8]} />
      {/* The lowered sun reaches the cat through the actual window opening. */}
      <directionalLight
        castShadow
        color="#fff0d8"
        position={[-6.4, 10.4, -16]}
        target={sunTarget}
        intensity={3.1}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={0.5}
        shadow-camera-far={45}
        shadow-bias={-0.00015}
        shadow-normalBias={0.015}
        shadow-radius={3}
      />
      {/* Broad warm bounce light illuminates both the furnishings and the cat. */}
      <directionalLight color="#fff3e3" position={[2.5, 4.5, 6]} intensity={1.5} />
      <directionalLight color="#f4e3ca" position={[-5, 3, 2]} intensity={0.35} />
      <Environment resolution={128} environmentIntensity={0.65}>
        <Lightformer
          form="rect"
          color="#f5f0e5"
          intensity={0.45}
          position={[2, 9.8, 1.7]}
          scale={[12, 12, 1]}
          target={[0, 0.8, 0]}
        />
        <Lightformer
          form="rect"
          color="#fff2df"
          intensity={2.8}
          position={[-3.2, 4.1, -6.8]}
          scale={[5, 4.6, 1]}
          target={[0, 1, 0]}
        />
        <Lightformer
          form="rect"
          color="#fff6e9"
          intensity={1.5}
          position={[2.5, 4.5, 6]}
          scale={[7, 5, 1]}
          target={[0, 1, 0]}
        />
        <Lightformer
          form="rect"
          color="#dfc5a3"
          intensity={0.6}
          position={[-6, 2, 1]}
          scale={[4, 3, 1]}
          target={[0, 1, 0]}
        />
      </Environment>
    </>
  );
}
