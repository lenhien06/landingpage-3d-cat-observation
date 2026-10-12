import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export function SceneFirstFrame({ enabled, onReady }: { enabled: boolean; onReady: () => void }) {
  const invalidate = useThree((state) => state.invalidate);
  const mounted = useRef(false);
  const notified = useRef(false);
  const nextFrame = useRef<number | null>(null);

  useEffect(() => {
    mounted.current = true;
    if (enabled) invalidate();
    return () => {
      mounted.current = false;
      if (nextFrame.current !== null) cancelAnimationFrame(nextFrame.current);
      nextFrame.current = null;
    };
  }, [enabled, invalidate]);

  useFrame(() => {
    if (!enabled || !mounted.current || notified.current || nextFrame.current !== null) return;
    // R3F renders after its frame callbacks. Reveal on the next browser frame,
    // once the prepared camera, textures and shadows have actually been drawn.
    nextFrame.current = requestAnimationFrame(() => {
      nextFrame.current = null;
      if (!mounted.current) return;
      notified.current = true;
      onReady();
    });
  });

  return null;
}
