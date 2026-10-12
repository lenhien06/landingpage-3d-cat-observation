import initialConfig from "../config/hotspots.json";
import { isPartId, type PartId } from "../data/questions";

export type Hotspot = {
  id: string;
  partId: PartId;
  position: [number, number, number];
  normal: [number, number, number];
};

export type HotspotConfig = { version: 1; points: Hotspot[] };

const validVec = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((n) => typeof n === "number" && Number.isFinite(n));

export function parseHotspots(value: unknown): HotspotConfig {
  if (!value || typeof value !== "object") return { version: 1, points: [] };
  const config = value as Record<string, unknown>;
  if (config.version !== 1 || !Array.isArray(config.points))
    return { version: 1, points: [] };
  return {
    version: 1,
    points: config.points.filter((point): point is Hotspot => {
      if (!point || typeof point !== "object") return false;
      const item = point as Record<string, unknown>;
      return (
        typeof item.id === "string" &&
        isPartId(item.partId) &&
        validVec(item.position) &&
        validVec(item.normal)
      );
    }),
  };
}

export const projectHotspots = parseHotspots(initialConfig);
