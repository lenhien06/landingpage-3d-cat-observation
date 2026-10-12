import { useEffect, useMemo } from "react";
import {
  BoxGeometry, BufferGeometry, CanvasTexture, CatmullRomCurve3, DoubleSide,
  Float32BufferAttribute, LatheGeometry, Matrix4, Quaternion, SRGBColorSpace,
  TubeGeometry, Vector2, Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useRoomTextures } from "../utils/roomTextures";

type Point = [number, number, number];
const ignoreRaycast = () => {};

function merge(parts: BufferGeometry[]) {
  const normalized = parts.map((geometry) => geometry.index ? geometry.toNonIndexed() : geometry);
  const result = mergeGeometries(normalized, false) ?? new BufferGeometry();
  new Set([...parts, ...normalized]).forEach((geometry) => geometry.dispose());
  return result;
}

function box(size: Point, position: Point, radius = 0, angle = 0) {
  const geometry = radius > 0
    ? new RoundedBoxGeometry(...size, 2, radius)
    : new BoxGeometry(...size);
  geometry.rotateZ(angle);
  geometry.translate(...position);
  return geometry;
}

function lathe(points: [number, number][]) {
  return new LatheGeometry(points.map((point) => new Vector2(...point)), 48);
}

function curve(points: Point[], width: number) {
  return new TubeGeometry(new CatmullRomCurve3(points.map((point) => new Vector3(...point))), 28, width, 5, false);
}

function bookParts(position: Point, width: number, height: number, depth: number, angle = 0, upright = true) {
  const covers = merge(upright ? [
    box([0.012, height + 0.014, depth + 0.018], [-width / 2 + 0.006, 0, 0]),
    box([0.012, height + 0.014, depth + 0.018], [width / 2 - 0.006, 0, 0]),
    box([width, height + 0.014, 0.014], [0, 0, depth / 2 + 0.002]),
  ] : [
    box([width + 0.018, 0.012, depth + 0.018], [0, height / 2 - 0.006, 0]),
    box([width + 0.018, 0.012, depth + 0.018], [0, -height / 2 + 0.006, 0]),
    box([0.014, height, depth + 0.018], [-width / 2, 0, 0]),
  ]);
  const pages = box([width - 0.014, height - 0.026, depth - 0.007], [0.004, 0, 0.008]);
  const matrix = new Matrix4().compose(
    new Vector3(...position), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), angle), new Vector3(1, 1, 1),
  );
  return { covers: covers.applyMatrix4(matrix), pages: pages.applyMatrix4(matrix) };
}

function makeBooks() {
  const covers: BufferGeometry[][] = [[], [], [], []];
  const pages: BufferGeometry[] = [];
  const bands: BufferGeometry[] = [];
  const groups = [
    { x: -1.66, y: 0.975, count: 8 },
    { x: 0.34, y: 0.975, count: 6 },
    { x: -1.66, y: 1.835, count: 6 },
    { x: 0.48, y: 2.695, count: 5 },
  ];
  groups.forEach((group, groupIndex) => {
    let x = group.x;
    for (let index = 0; index < group.count; index++) {
      const width = 0.105 + (index + groupIndex) % 3 * 0.036;
      const rawHeight = 0.46 + (index * 7 + groupIndex) % 5 * 0.048;
      const height = group.y === 2.695 ? Math.min(rawHeight, 0.6) : rawHeight;
      const depth = 0.31 + index % 3 * 0.022;
      const parts = bookParts([x + width / 2, group.y + height / 2, 0.18], width, height, depth);
      covers[(index + groupIndex) % 4]!.push(parts.covers);
      pages.push(parts.pages);
      bands.push(box([width * 0.62, 0.006, 0.005], [x + width / 2, group.y + height * 0.78, 0.194 + depth / 2]));
      x += width + 0.012;
    }
  });
  return { covers: covers.map(merge), pages: merge(pages), bands: merge(bands) };
}

function sprigs() {
  const stems: BufferGeometry[] = [];
  const leaves: BufferGeometry[] = [];
  for (let branch = 0; branch < 6; branch++) {
    const angle = branch * 2.399;
    const reach = 0.21 + branch % 2 * 0.07;
    const height = 0.9 + branch % 3 * 0.09;
    const x = Math.cos(angle) * reach;
    const z = Math.sin(angle) * reach;
    stems.push(curve([[0, 0.4, 0], [x * 0.4, 0.78, z * 0.4], [x, height + 0.4, z]], 0.009));
    for (let index = 0; index < 4; index++) {
      const t = 0.44 + index * 0.16;
      const center = new Vector3(x * t, 0.4 + height * t, z * t);
      const leafAngle = angle + index * 2.3;
      const end = center.clone().add(new Vector3(Math.cos(leafAngle) * 0.19, 0.075, Math.sin(leafAngle) * 0.19));
      const positions: number[] = [];
      for (let segment = 0; segment <= 8; segment++) {
        const f = segment / 8;
        const point = center.clone().lerp(end, f);
        const width = Math.sin(f * Math.PI) * 0.047;
        for (const side of [-1, 1]) positions.push(point.x - Math.sin(leafAngle) * width * side, point.y + Math.sin(f * Math.PI) * 0.018, point.z + Math.cos(leafAngle) * width * side);
      }
      const indices: number[] = [];
      for (let segment = 0; segment < 8; segment++) {
        const a = segment * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
      geometry.setAttribute("uv", new Float32BufferAttribute(new Array(positions.length / 3 * 2).fill(0), 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      leaves.push(geometry);
    }
  }
  return { stems: merge(stems), leaves: merge(leaves) };
}

function Console() {
  const { wood, fabric } = useRoomTextures();
  const frame = useMemo(() => merge([
    box([3.2, 0.11, 1], [0, 1.945, 0], 0.018),
    box([3.04, 0.095, 0.91], [0, 0.89, 0], 0.011),
    box([0.1, 0.96, 0.92], [-1.47, 1.405, 0], 0.009),
    box([0.1, 0.96, 0.92], [1.47, 1.405, 0], 0.009),
    box([2.94, 0.97, 0.055], [0, 1.405, -0.435]),
    box([2.94, 0.075, 0.87], [0, 1.405, 0], 0.008),
    box([0.055, 0.48, 0.88], [0, 1.66, 0]),
  ]), []);
  const drawers = useMemo(() => merge([-0.733, 0.733].map((x) => box([1.405, 0.435, 0.065], [x, 1.669, 0.455], 0.007))), []);
  const vase = useMemo(() => lathe([[0, 0], [0.16, 0], [0.215, 0.07], [0.235, 0.31], [0.2, 0.42], [0.095, 0.53], [0.085, 0.59], [0.062, 0.59], [0.069, 0.51], [0.176, 0.4], [0.2, 0.3], [0.18, 0.075], [0, 0.055]]), []);
  const shade = useMemo(() => lathe([[0.42, 0], [0.43, 0.025], [0.285, 0.68], [0.273, 0.695], [0.258, 0.695], [0.409, 0.02], [0.42, 0]]), []);
  const greenery = useMemo(sprigs, []);
  const book = useMemo(() => bookParts([0.01, 0.062, 0], 0.61, 0.12, 0.43, 0, false), []);
  useEffect(() => () => {
    [frame, drawers, vase, shade, greenery.stems, greenery.leaves, book.covers, book.pages].forEach((geometry) => geometry.dispose());
  }, [book, drawers, frame, greenery, shade, vase]);
  return (
    <group name="front-console" position={[-2.7, 0, 8.9]} rotation={[0, Math.PI, 0]}>
      <mesh geometry={frame} castShadow receiveShadow raycast={ignoreRaycast}>
        <meshStandardMaterial {...wood} color="#c7a679" roughness={0.65} bumpScale={0.025} />
      </mesh>
      <mesh geometry={drawers} castShadow receiveShadow raycast={ignoreRaycast}>
        <meshStandardMaterial {...wood} color="#bc9567" roughness={0.64} bumpScale={0.025} />
      </mesh>
      {[-1.34, 1.34].flatMap((x) => [-0.34, 0.34].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.43, z]} castShadow receiveShadow raycast={ignoreRaycast}>
          <cylinderGeometry args={[0.06, 0.038, 0.86, 12]} />
          <meshStandardMaterial {...wood} color="#a88253" roughness={0.64} />
        </mesh>
      )))}
      {[-0.733, 0.733].map((x) => (
        <mesh key={x} position={[x, 1.669, 0.506]} rotation={[Math.PI / 2, 0, 0]} castShadow raycast={ignoreRaycast}>
          <cylinderGeometry args={[0.034, 0.025, 0.037, 16]} />
          <meshStandardMaterial color="#887046" metalness={0.72} roughness={0.35} />
        </mesh>
      ))}
      <group position={[-0.98, 2.002, 0.02]}>
        <mesh geometry={vase} castShadow receiveShadow raycast={ignoreRaycast}>
          <meshStandardMaterial color="#d7cbbb" roughness={0.85} />
        </mesh>
        <mesh geometry={greenery.stems} castShadow raycast={ignoreRaycast}><meshStandardMaterial color="#7c8060" roughness={1} /></mesh>
        <mesh geometry={greenery.leaves} castShadow raycast={ignoreRaycast}><meshStandardMaterial color="#89927a" roughness={0.85} side={DoubleSide} /></mesh>
      </group>
      <group position={[0, 2.001, 0.03]} rotation={[0, -0.18, 0]}>
        <mesh geometry={book.covers} castShadow receiveShadow raycast={ignoreRaycast}><meshStandardMaterial color="#69756e" roughness={0.9} /></mesh>
        <mesh geometry={book.pages} castShadow receiveShadow raycast={ignoreRaycast}><meshStandardMaterial color="#e5ddc9" roughness={1} /></mesh>
      </group>
      <group position={[1, 2.002, -0.04]}>
        <mesh position={[0, 0.053, 0]} castShadow receiveShadow raycast={ignoreRaycast}>
          <cylinderGeometry args={[0.23, 0.26, 0.106, 40]} />
          <meshStandardMaterial color="#6f6755" roughness={0.56} />
        </mesh>
        <mesh position={[0, 0.525, 0]} castShadow raycast={ignoreRaycast}>
          <cylinderGeometry args={[0.027, 0.032, 0.84, 16]} />
          <meshStandardMaterial color="#887348" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 1.04, 0]} raycast={ignoreRaycast}>
          <sphereGeometry args={[0.105, 20, 12]} />
          <meshStandardMaterial color="#fff1cb" emissive="#ffd99b" emissiveIntensity={0.55} roughness={0.4} />
        </mesh>
        <mesh geometry={shade} position={[0, 0.84, 0]} castShadow receiveShadow raycast={ignoreRaycast}>
          <meshStandardMaterial {...fabric} color="#e7d5b6" side={DoubleSide} roughness={0.98} bumpScale={0.028} emissive="#b48645" emissiveIntensity={0.06} />
        </mesh>
      </group>
    </group>
  );
}

function Bookcase() {
  const { wood } = useRoomTextures();
  const frame = useMemo(() => merge([
    box([3.84, 0.09, 0.7], [0, 0.045, 0], 0.008),
    ...[0.12, 0.93, 1.79, 2.65, 3.36].map((y) => box([4, 0.09, 0.8], [0, y, 0], 0.009)),
    ...[-1.95, 1.95].map((x) => box([0.1, 3.31, 0.8], [x, 1.745, 0], 0.009)),
    box([0.075, 3.15, 0.78], [0, 1.745, 0]),
  ]), []);
  const books = useMemo(makeBooks, []);
  const bowl = useMemo(() => lathe([[0, 0], [0.12, 0], [0.24, 0.04], [0.29, 0.15], [0.285, 0.19], [0.26, 0.185], [0.22, 0.068], [0.12, 0.025], [0, 0.025]]), []);
  const jug = useMemo(() => lathe([[0, 0], [0.14, 0], [0.19, 0.13], [0.18, 0.31], [0.11, 0.4], [0.08, 0.46], [0.081, 0.49], [0.061, 0.49], [0.06, 0.44], [0.15, 0.3], [0.16, 0.13], [0, 0.033]]), []);
  useEffect(() => () => {
    [frame, books.pages, books.bands, ...books.covers, bowl, jug].forEach((geometry) => geometry.dispose());
  }, [books, bowl, frame, jug]);
  return (
    <group name="right-bookcase" position={[11.25, 0, 1.6]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={frame} castShadow receiveShadow raycast={ignoreRaycast}>
        <meshStandardMaterial {...wood} color="#b79d78" roughness={0.71} bumpScale={0.02} />
      </mesh>
      <mesh position={[0, 1.755, -0.375]} castShadow receiveShadow raycast={ignoreRaycast}>
        <boxGeometry args={[3.86, 3.17, 0.045]} />
        <meshStandardMaterial color="#cec7b7" roughness={0.93} />
      </mesh>
      <mesh geometry={books.pages} castShadow receiveShadow raycast={ignoreRaycast}><meshStandardMaterial color="#ded8c7" roughness={1} /></mesh>
      {books.covers.map((geometry, index) => (
        <mesh key={index} geometry={geometry} castShadow receiveShadow raycast={ignoreRaycast}>
          <meshStandardMaterial color={['#697263', '#b09272', '#766a5a', '#687f83'][index]} roughness={0.89} />
        </mesh>
      ))}
      <mesh geometry={books.bands} raycast={ignoreRaycast}><meshStandardMaterial color="#d3c5a7" roughness={0.85} /></mesh>
      <mesh geometry={bowl} position={[0.91, 1.835, 0.12]} castShadow receiveShadow raycast={ignoreRaycast}>
        <meshPhysicalMaterial color="#aaaf9b" roughness={0.3} clearcoat={0.4} />
      </mesh>
      <mesh geometry={jug} position={[-1.12, 2.695, 0.05]} castShadow receiveShadow raycast={ignoreRaycast}>
        <meshStandardMaterial color="#c0aa8c" roughness={0.77} />
      </mesh>
      <mesh position={[-0.92, 3.003, 0.05]} rotation={[0, Math.PI / 2, 0]} castShadow raycast={ignoreRaycast}>
        <torusGeometry args={[0.106, 0.024, 8, 28]} />
        <meshStandardMaterial color="#c0aa8c" roughness={0.77} />
      </mesh>
      <mesh position={[0.75, 0.518, 0]} castShadow receiveShadow raycast={ignoreRaycast}>
        <boxGeometry args={[1.08, 0.7, 0.63]} />
        <meshStandardMaterial color="#afa88d" roughness={1} />
      </mesh>
      <mesh position={[0.75, 0.64, 0.327]} raycast={ignoreRaycast}>
        <boxGeometry args={[0.24, 0.055, 0.013]} />
        <meshStandardMaterial color="#736b54" roughness={0.94} />
      </mesh>
    </group>
  );
}

function artTexture(botanical: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không tạo được tranh trang trí.");
  ctx.fillStyle = "#e4dfd0";
  ctx.fillRect(0, 0, 640, 640);
  if (botanical) {
    ctx.strokeStyle = "#757e65";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(290, 560);
    ctx.bezierCurveTo(280, 430, 330, 290, 305, 95);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const y = 485 - i * 47;
      const side = i % 2 === 0 ? -1 : 1;
      const x = 297 + Math.sin(i * 0.5) * 16;
      ctx.fillStyle = i % 3 === 0 ? "#7e886b" : "#9ca38a";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + side * 60, y - 65, x + side * 135, y - 43, x + side * 137, y - 105);
      ctx.bezierCurveTo(x + side * 100, y - 20, x + side * 72, y + 9, x, y);
      ctx.fill();
      ctx.strokeStyle = "#657356";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + side * 61, y - 25, x + side * 123, y - 87);
      ctx.stroke();
    }
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, 640);
    sky.addColorStop(0, "#b2c3c7"); sky.addColorStop(0.55, "#e1dfcf"); sky.addColorStop(1, "#8b9b84");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 640, 640);
    ctx.fillStyle = "#e5d9ae";
    ctx.beginPath(); ctx.arc(449, 178, 38, 0, Math.PI * 2); ctx.fill();
    ['#9dad9d', '#7d927f', '#617b68', '#8e9c76'].forEach((color, layer) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 640);
      for (let x = 0; x <= 650; x += 10) ctx.lineTo(x, 330 + layer * 60 + Math.sin(x / (100 - layer * 14) + layer * 2) * (48 - layer * 4));
      ctx.lineTo(640, 640); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = "#c5c6a9";
    ctx.beginPath(); ctx.moveTo(372, 439); ctx.bezierCurveTo(482, 451, 284, 528, 343, 640); ctx.lineTo(416, 640); ctx.bezierCurveTo(350, 545, 528, 461, 385, 439); ctx.fill();
  }
  // A subtle paper grain keeps the art from looking like a glossy display.
  let seed = 37;
  for (let i = 0; i < 24000; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const x = seed % 640;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    ctx.fillStyle = i % 2 ? "#ffffff12" : "#544e3510";
    ctx.fillRect(x, seed % 640, 1, 1);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function Gallery() {
  const { wood } = useRoomTextures();
  const textures = useMemo(() => [artTexture(false), artTexture(true)], []);
  const frames = useMemo(() => merge([
    ...[[-0.88, 2.15, 1.55], [1.47, 1.35, 1.73]].flatMap(([x = 0, width = 1, height = 1]) => [
      box([width, 0.065, 0.08], [x, height / 2, 0], 0.008),
      box([width, 0.065, 0.08], [x, -height / 2, 0], 0.008),
      box([0.065, height, 0.08], [x - width / 2, 0, 0], 0.008),
      box([0.065, height, 0.08], [x + width / 2, 0, 0], 0.008),
    ]),
  ]), []);
  useEffect(() => () => { frames.dispose(); textures.forEach((texture) => texture.dispose()); }, [frames, textures]);
  return (
    <group name="right-gallery" position={[11.94, 5.3, 1.6]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={frames} castShadow receiveShadow raycast={ignoreRaycast}><meshStandardMaterial {...wood} color="#ac8d63" roughness={0.73} /></mesh>
      {[[-0.88, 2.08, 1.48], [1.47, 1.28, 1.66]].map(([x = 0, width = 1, height = 1], index) => (
        <group key={index} position={[x, 0, 0]}>
          <mesh position={[0, 0, 0.018]} raycast={ignoreRaycast}><planeGeometry args={[width, height]} /><meshStandardMaterial color="#e9e2d4" roughness={1} /></mesh>
          <mesh position={[0, 0, 0.021]} raycast={ignoreRaycast}><planeGeometry args={[width - 0.24, height - 0.24]} /><meshStandardMaterial map={textures[index]} color="#ffffff" roughness={1} /></mesh>
        </group>
      ))}
    </group>
  );
}

function WallClock() {
  const { wood } = useRoomTextures();
  const ticks = useMemo(() => merge(Array.from({ length: 12 }, (_, index) => {
    const angle = index / 12 * Math.PI * 2;
    return box([0.014, index % 3 === 0 ? 0.077 : 0.045, 0.008], [-Math.sin(angle) * 0.458, Math.cos(angle) * 0.458, 0.052], 0, angle);
  })), []);
  const hands = useMemo(() => merge([
    box([0.024, 0.315, 0.011], [-0.121, -0.077, 0.066], 0, -1.01),
    box([0.019, 0.435, 0.012], [0.174, 0.103, 0.08], 0, -1.03),
  ]), []);
  useEffect(() => () => { ticks.dispose(); hands.dispose(); }, [hands, ticks]);
  return (
    <group name="front-wall-clock" position={[-5.9, 5.7, 10.32]} rotation={[0, Math.PI, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow raycast={ignoreRaycast}><cylinderGeometry args={[0.55, 0.55, 0.075, 64]} /><meshStandardMaterial color="#e5dece" roughness={0.94} /></mesh>
      <mesh raycast={ignoreRaycast}><torusGeometry args={[0.556, 0.047, 10, 64]} /><meshStandardMaterial {...wood} color="#987e58" roughness={0.7} /></mesh>
      <mesh geometry={ticks} raycast={ignoreRaycast}><meshStandardMaterial color="#65624f" roughness={0.85} /></mesh>
      <mesh geometry={hands} raycast={ignoreRaycast}><meshStandardMaterial color="#545747" roughness={0.69} /></mesh>
      <mesh position={[0, 0, 0.09]} raycast={ignoreRaycast}><sphereGeometry args={[0.034, 16, 8]} /><meshStandardMaterial color="#8a7859" roughness={0.37} metalness={0.3} /></mesh>
    </group>
  );
}

function Slippers() {
  const { fabric } = useRoomTextures();
  const tray = useMemo(() => merge([
    box([1.4, 0.04, 0.9], [0, 0.025, 0], 0.014),
    ...[-0.437, 0.437].map((z) => box([1.4, 0.07, 0.025], [0, 0.067, z], 0.008)),
    ...[-0.687, 0.687].map((x) => box([0.025, 0.07, 0.85], [x, 0.067, 0], 0.008)),
  ]), []);
  const soles = useMemo(() => merge([-0.28, 0.28].map((x) => box([0.36, 0.038, 0.66], [x, 0.066, 0], 0.017))), []);
  useEffect(() => () => { tray.dispose(); soles.dispose(); }, [soles, tray]);
  return (
    <group name="entry-shoe-tray" position={[8.65, 0, 9.5]} rotation={[0, -0.035, 0]}>
      <mesh geometry={tray} castShadow receiveShadow raycast={ignoreRaycast}><meshStandardMaterial color="#969381" roughness={0.95} /></mesh>
      <mesh geometry={soles} castShadow receiveShadow raycast={ignoreRaycast}><meshStandardMaterial {...fabric} color="#c9bba0" roughness={1} bumpScale={0.035} /></mesh>
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, 0.084, -0.15]} scale={[0.183, 0.115, 0.185]} rotation={[0, x * 0.2, 0]} castShadow receiveShadow raycast={ignoreRaycast}>
          <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial {...fabric} color="#b3aa8f" roughness={1} bumpScale={0.035} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export function RoomDecor() {
  return <group name="room-decor"><Console /><Bookcase /><Gallery /><WallClock /><Slippers /></group>;
}
