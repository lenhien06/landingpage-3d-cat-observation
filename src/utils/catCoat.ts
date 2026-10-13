import * as THREE from "three";

export type CoatKind = "body" | "head" | "leg" | "tail" | "cream";

type RGB = readonly [number, number, number];

const seeds: Record<CoatKind, number> = {
  body: 8713,
  head: 2471,
  leg: 9137,
  tail: 6079,
  cream: 3253,
};

function randomFrom(seed: number) {
  let value = seed;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

function canvasWithContext(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể tạo texture cho mèo.");
  return { canvas, context };
}

function coatTexture(canvas: HTMLCanvasElement, kind: CoatKind, color: boolean) {
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  // Sphere UVs meet at u=0/1; tube UVs meet around their v circumference.
  texture.wrapS = kind === "tail" ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  texture.wrapT = kind === "tail" ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** Local, deterministic short-haired tabby textures; canvas rows follow sphere v. */
export function createCoatTextures(kind: CoatKind): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const width = kind === "body" ? 768 : 512;
  const height = width / 2;
  const color = canvasWithContext(width, height);
  const relief = canvasWithContext(width, height);
  const pixels = color.context.createImageData(width, height);
  const heights = relief.context.createImageData(width, height);
  const random = randomFrom(seeds[kind]);
  const caramel: RGB = [214, 162, 99];
  const cream: RGB = [238, 221, 191];
  const stripe: RGB = [126, 87, 49];

  for (let py = 0; py < height; py += 1) {
    const v = py / (height - 1);
    const latitude = Math.PI * v;
    const y = Math.cos(latitude);
    const radius = Math.sin(latitude);
    for (let px = 0; px < width; px += 1) {
      const u = px / (width - 1);
      const longitude = u * Math.PI * 2;
      const x = -Math.cos(longitude) * radius;
      const z = Math.sin(longitude) * radius;
      const grain = (random() - 0.5) * 8;
      // Slow, continuous variation makes the coat richer without visible speckles.
      const mottle = Math.sin(longitude * 9 + y * 13) * 1.8
        + Math.cos(longitude * 17 - y * 21) * 1.2;
      let pale = smooth(0.53, 0.86, v) * 0.88;
      let marking = 0;

      if (kind === "body") {
        const ribPhase = z * 6.6 + y * 0.48 + Math.sin(y * 7 + Math.abs(x) * 3) * 0.15;
        const ribs = Math.pow(Math.max(0, Math.cos(ribPhase * Math.PI * 2)), 12);
        const flank = smooth(0.13, 0.48, Math.abs(x));
        const bellyFade = 1 - smooth(0.57, 0.8, v);
        marking = ribs * flank * bellyFade * (0.27 + 0.07 * Math.sin(z * 19 + y * 5));
        const spine = Math.exp(-Math.pow(x / 0.095, 2)) * smooth(0.22, 0.65, y);
        marking = Math.max(marking, spine * 0.22);
      } else if (kind === "leg") {
        const phase = v * 5.7 + Math.sin(longitude * 2) * 0.1;
        marking = Math.pow(Math.max(0, Math.cos(phase * Math.PI * 2)), 11)
          * (1 - smooth(0.68, 0.88, v)) * 0.28;
        pale = smooth(0.66, 0.93, v) * 0.8;
      } else if (kind === "tail") {
        const phase = u * 8.8 + Math.sin(v * Math.PI * 2) * 0.035;
        marking = Math.pow(Math.max(0, Math.cos(phase * Math.PI * 2)), 10) * 0.35;
        marking = Math.max(marking, smooth(0.9, 0.985, u) * 0.5);
        pale = 0.09 + (1 - Math.cos(v * Math.PI * 2)) * 0.035;
      } else if (kind === "head") {
        // Keep the face open; the forehead M and cheek marks are painted below.
        pale = smooth(0.57, 0.89, v) * 0.6;
        const back = smooth(0.1, 0.65, -z);
        const phase = y * 4.4 + Math.sin(longitude * 3) * 0.12;
        marking = Math.pow(Math.max(0, Math.cos(phase * Math.PI * 2)), 13)
          * back * (1 - smooth(0.59, 0.82, v)) * 0.23;
      } else {
        pale = 1;
      }

      const offset = (py * width + px) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const base = caramel[channel]! * (1 - pale) + cream[channel]! * pale;
        pixels.data[offset + channel] = base * (1 - marking) + stripe[channel]! * marking
          + grain + mottle;
        heights.data[offset + channel] = 128 + grain * 0.42 + mottle * 0.35;
      }
      pixels.data[offset + 3] = 255;
      heights.data[offset + 3] = 255;
    }
  }

  color.context.putImageData(pixels, 0, 0);
  relief.context.putImageData(heights, 0, 0);

  if (kind === "head") {
    const ctx = color.context;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(110, 76, 43, 0.35)";
    ctx.lineWidth = width * 0.007;
    ctx.shadowColor = "rgba(110, 76, 43, 0.15)";
    ctx.shadowBlur = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.178, height * 0.365);
    ctx.quadraticCurveTo(width * 0.194, height * 0.285, width * 0.204, height * 0.225);
    ctx.quadraticCurveTo(width * 0.222, height * 0.275, width * 0.25, height * 0.33);
    ctx.quadraticCurveTo(width * 0.278, height * 0.275, width * 0.296, height * 0.225);
    ctx.quadraticCurveTo(width * 0.306, height * 0.285, width * 0.322, height * 0.365);
    ctx.stroke();
    ctx.lineWidth = width * 0.005;
    ctx.strokeStyle = "rgba(114, 78, 45, 0.27)";
    for (const side of [-1, 1]) {
      for (let index = 0; index < 3; index += 1) {
        const center = 0.25;
        const outer = center + side * (0.102 + index * 0.005);
        const inner = center + side * (0.063 + index * 0.009);
        const row = 0.43 + index * 0.052;
        ctx.beginPath();
        ctx.moveTo(width * outer, height * row);
        ctx.quadraticCurveTo(width * (outer + inner) * 0.5, height * (row + 0.021),
          width * inner, height * (row + 0.036));
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
  }

  // Thin, translucent strokes give both albedo and bump the same fur direction.
  const strands = kind === "body" ? 15500 : 9000;
  color.context.lineCap = "round";
  relief.context.lineCap = "round";
  for (let index = 0; index < strands; index += 1) {
    const px = random() * width;
    const py = random() * height;
    const length = 1.3 + random() * 4.2;
    let angle = Math.PI * 0.43 + (random() - 0.5) * 0.5;
    if (kind === "tail") angle = (random() - 0.5) * 0.3;
    if (kind === "head") angle += (px / width - 0.25) * 0.9;
    if (kind === "body") angle = Math.PI * 0.29 + Math.sin(px / width * Math.PI * 2) * 0.45;
    const dx = Math.cos(angle) * length;
    const dy = Math.sin(angle) * length;
    const light = random() > 0.46;
    color.context.strokeStyle = light ? "rgba(255, 242, 211, 0.12)" : "rgba(107, 78, 48, 0.085)";
    relief.context.strokeStyle = light ? "rgba(181, 181, 181, 0.32)" : "rgba(82, 82, 82, 0.24)";
    color.context.lineWidth = 0.45 + random() * 0.35;
    relief.context.lineWidth = 0.55;
    for (const ctx of [color.context, relief.context]) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + dx, py + dy);
      ctx.stroke();
      // Carry strands over the one UV seam that wraps on each geometry.
      if (kind !== "tail" && px + dx > width) {
        ctx.beginPath();
        ctx.moveTo(px - width, py);
        ctx.lineTo(px + dx - width, py + dy);
        ctx.stroke();
      } else if (kind === "tail" && py + dy > height) {
        ctx.beginPath();
        ctx.moveTo(px, py - height);
        ctx.lineTo(px + dx, py + dy - height);
        ctx.stroke();
      }
    }
  }

  return {
    map: coatTexture(color.canvas, kind, true),
    bumpMap: coatTexture(relief.canvas, kind, false),
  };
}

/** Hazel-green iris with an amber pupil surround and restrained corneal glints. */
export function createIrisTexture(): THREE.CanvasTexture {
  const size = 512;
  const { canvas, context } = canvasWithContext(size, size);
  const pixels = context.createImageData(size, size);
  const random = randomFrom(41729);
  const green: RGB = [99, 122, 65];
  const amber: RGB = [158, 115, 52];
  const rim: RGB = [45, 48, 28];
  for (let py = 0; py < size; py += 1) {
    const y = (py / (size - 1) - 0.5) * 2;
    for (let px = 0; px < size; px += 1) {
      const x = (px / (size - 1) - 0.5) * 2;
      const radius = Math.hypot(x, y);
      const angle = Math.atan2(y, x);
      const inner = (1 - smooth(0.21, 0.56, radius)) * 0.82;
      const edge = smooth(0.81, 0.98, radius);
      const fibers = Math.sin(angle * 177 + Math.sin(angle * 23) * 2.8 + radius * 18) * 8
        + Math.sin(angle * 313 - radius * 29) * 4
        + (random() - 0.5) * 6;
      const ring = Math.sin(radius * 82 + Math.sin(angle * 11) * 1.4) * 1.6;
      const pupilWidth = 0.028 + 0.054 * Math.sqrt(Math.max(0, 1 - Math.pow(y / 0.67, 2)));
      const pupil = (1 - smooth(pupilWidth - 0.008, pupilWidth + 0.009, Math.abs(x)))
        * (1 - smooth(0.62, 0.69, Math.abs(y)));
      const glint = Math.exp(-((x + 0.28) ** 2 + (y + 0.3) ** 2) / 0.0018) * 0.5;
      const offset = (py * size + px) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const base = green[channel]! * (1 - inner) + amber[channel]! * inner + fibers + ring;
        const outlined = base * (1 - edge) + rim[channel]! * edge;
        const withPupil = outlined * (1 - pupil) + (channel === 2 ? 8 : 10) * pupil;
        pixels.data[offset + channel] = withPupil * (1 - glint) + 241 * glint;
      }
      pixels.data[offset + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
