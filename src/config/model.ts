export const modelConfig = {
  url: `${import.meta.env.BASE_URL}models/bicolor-cat.glb`,
  // The imported cat already faces +Z, with +Y pointing up.
  rotation: [0, 0, 0] as [number, number, number],
  scale: 1,
  displaySize: 3,
  groundY: 0.008,
};
