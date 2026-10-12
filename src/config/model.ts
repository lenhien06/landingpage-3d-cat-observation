export const modelConfig = {
  url: `${import.meta.env.BASE_URL}models/cat.glb`,
  // Radians. Adjust after checking which side of the GLB contains the face.
  rotation: [0, 0, 0] as [number, number, number],
  scale: 1,
  displaySize: 3,
};
