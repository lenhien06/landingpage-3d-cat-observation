import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { modelConfig } from "../config/model";
import type { PartId } from "../data/questions";
import { projectHotspots } from "../utils/hotspots";
import { bindCatHotspots, findCatPart, getCatFocus, prepareCatModel, resolveCatHotspots, type FocusTarget, type ModelBounds } from "../utils/catModel";

export type { FocusTarget, ModelBounds } from "../utils/catModel";

type Props = {
  selectedPart: PartId | null;
  onPartSelect: (part: PartId) => void;
  onOverallSelect: () => void;
  onReady: () => void;
  onFocus: (focus: FocusTarget | null) => void;
  onBounds: (bounds: ModelBounds) => void;
  pointerDown: React.RefObject<{ x: number; y: number } | null>;
};

export function ModelLoader({ selectedPart, onPartSelect, onOverallSelect, onReady, onFocus, onBounds, pointerDown }: Props) {
  const { scene, animations } = useGLTF(modelConfig.url);
  const { gl, invalidate } = useThree();
  const prepared = useMemo(() => prepareCatModel(scene, modelConfig), [scene]);
  const bindings = useMemo(() => bindCatHotspots(prepared.content, projectHotspots.points), [prepared]);
  const mixer = useMemo(() => new THREE.AnimationMixer(prepared.imported), [prepared]);
  const reducedMotion = useRef(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      reducedMotion.current = preference.matches;
      invalidate();
    };
    updatePreference();
    preference.addEventListener("change", updatePreference);
    const clip = animations[0];
    if (clip) mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
    invalidate();
    return () => {
      preference.removeEventListener("change", updatePreference);
      mixer.stopAllAction();
      mixer.uncacheRoot(prepared.imported);
    };
  }, [animations, invalidate, mixer, prepared]);

  useFrame((_, delta) => {
    if (!animations.length || reducedMotion.current || selectedPart) return;
    mixer.update(Math.min(delta, 0.05));
    // Render only while the imported idle animation is running. Pause the pose
    // during detail views so the camera and selected anatomy remain steady.
    gl.shadowMap.needsUpdate = true;
    invalidate();
  });

  useEffect(() => {
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    prepared.imported.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          if (material.map) material.map.anisotropy = anisotropy;
          if (material.normalMap) material.normalMap.anisotropy = anisotropy;
        }
      });
    });
    onBounds(prepared.bounds);
    onReady();
    invalidate();
  }, [gl, invalidate, onBounds, onReady, prepared]);

  useEffect(() => {
    const hotspots = resolveCatHotspots(prepared.content, bindings);
    onFocus(selectedPart ? getCatFocus(prepared.content, hotspots, selectedPart) : null);
    invalidate();
  }, [bindings, invalidate, onFocus, prepared, selectedPart]);

  useEffect(() => () => {
    prepared.ownedMaterials.forEach((material) => material.dispose());
    prepared.ownedSkeletons.forEach((skeleton) => skeleton.dispose());
    // Geometry and textures belong to the useGLTF cache and remain reusable.
  }, [prepared]);

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const start = pointerDown.current;
    if (!start || Math.hypot(event.nativeEvent.clientX - start.x, event.nativeEvent.clientY - start.y) >= 7) return;
    const point = prepared.content.worldToLocal(event.point.clone());
    const part = findCatPart(point, resolveCatHotspots(prepared.content, bindings));
    if (part) onPartSelect(part);
    else onOverallSelect();
  };

  return <primitive object={prepared.root} dispose={null} onPointerUp={handlePointerUp} />;
}
