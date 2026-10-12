export const roomConfig = {
  minX: -8,
  maxX: 12,
  minZ: -7,
  maxZ: 10.4,
  floorY: 0.001,
  ceilingY: 10,
  cameraMargin: 0.6,
  entryDoor: {
    centerX: 5.5,
    width: 3.6,
    height: 7.8,
  },
  cameraObstacles: [
    { min: [-7.2, 0, -6.65], max: [-4.2, 2.65, -3.8] },
    { min: [3.55, 0, -6.75], max: [6.05, 3.35, -4.25] },
    { min: [-4.15, 0, -6.75], max: [-2.45, 1.65, -5.05] },
    { min: [-4.5, 0, 8.2], max: [-0.9, 3.74, 9.6] },
    { min: [10.65, 0, -0.6], max: [11.85, 3.61, 3.8] },
    { min: [7.73, 0, 8.82], max: [9.57, 0.4, 10.18] },
  ],
} as const;
