export const modelConfig = {
  url: `${import.meta.env.BASE_URL}models/bicolor-cat.glb`,
  // The imported cat already faces +Z, with +Y pointing up.
  rotation: [0, 0, 0] as [number, number, number],
  scale: 1,
  displaySize: 3,
  groundY: 0.008,
  attribution: {
    title: "Bicolor Cat",
    author: "kenchoo",
    originalAuthor: "guillaume bolis",
    source: "https://sketchfab.com/3d-models/bicolor-cat-e623a618ca344a8393d7ba4d63ec23cf",
    originalSource: "https://skfb.ly/6TKqH",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
};
