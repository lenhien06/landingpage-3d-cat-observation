import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import {
  BufferGeometry, CatmullRomCurve3, DoubleSide, Float32BufferAttribute,
  IcosahedronGeometry, LatheGeometry, SphereGeometry, TorusGeometry,
  TubeGeometry, Vector2, Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useRoomTextures } from "../utils/roomTextures";

const noRaycast = () => null;
type Point = [number, number, number];

function join(parts: BufferGeometry[]): BufferGeometry {
  if (!parts.length) return new BufferGeometry();
  const geometry = mergeGeometries(parts, false) ?? new BufferGeometry();
  parts.forEach((part) => part.dispose());
  return geometry;
}

function tube(points: Point[], radius: number, segments = 32): TubeGeometry {
  return new TubeGeometry(new CatmullRomCurve3(points.map((point) => new Vector3(...point))), segments, radius, 5, false);
}

function vessel(points: [number, number][]): LatheGeometry {
  return new LatheGeometry(points.map((point) => new Vector2(...point)), 56);
}

// Each leaf has a shallow cupped surface, a raised central vein and a soft drooping tip.
function leaf(start: Vector3, end: Vector3, width: number): BufferGeometry {
  const direction = end.clone().sub(start);
  const across = new Vector3(-direction.z, 0, direction.x).normalize();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const rows = 14;
  const columns = 8;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const center = start.clone().lerp(end, t);
    center.y += Math.sin(t * Math.PI) * 0.11 - t * t * 0.09;
    const halfWidth = Math.pow(Math.sin(t * Math.PI), 0.8) * width;
    for (let column = 0; column <= columns; column++) {
      const lateral = column / columns * 2 - 1;
      const point = center.clone().addScaledVector(across, halfWidth * lateral);
      point.y -= lateral * lateral * Math.sin(t * Math.PI) * 0.048;
      positions.push(point.x, point.y, point.z);
      uvs.push(column / columns, t);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column;
        indices.push(a, a + columns + 1, a + 1, a + 1, a + columns + 1, a + columns + 2);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createPlant() {
  const stems: BufferGeometry[] = [];
  const veins: BufferGeometry[] = [];
  const foliage: BufferGeometry[][] = [[], [], []];
  for (let branch = 0; branch < 5; branch++) {
    const angle = branch * 2.399;
    const height = 2.55 + Math.sin(branch * 1.7) * 0.45;
    const leanX = Math.cos(angle) * 0.32;
    const leanZ = Math.sin(angle) * 0.32;
    stems.push(tube([[leanX * 0.1, 0.68, leanZ * 0.1], [leanX * 0.45, 1.5, leanZ * 0.45], [leanX, height, leanZ]], 0.021, 24));
    for (let index = 0; index < 5; index++) {
      const t = 0.34 + index * 0.15;
      const y = 0.68 + (height - 0.68) * t;
      const leafAngle = angle + index * 2.52;
      const root = new Vector3(leanX * t, y, leanZ * t);
      const base = root.clone().add(new Vector3(Math.cos(leafAngle) * 0.14, 0.1, Math.sin(leafAngle) * 0.14));
      const length = 0.53 + (1 - t) * 0.3;
      const tip = base.clone().add(new Vector3(Math.cos(leafAngle) * length, 0.1 + (t - 0.5) * 0.35, Math.sin(leafAngle) * length));
      stems.push(tube([root.toArray() as Point, base.toArray() as Point], 0.01, 8));
      foliage[(branch + index) % 3]!.push(leaf(base, tip, 0.17 + (1 - t) * 0.08));
      const middle = base.clone().lerp(tip, 0.52);
      middle.y += 0.085;
      const veinTip = tip.clone();
      veinTip.y -= 0.085;
      veins.push(tube([base.toArray() as Point, middle.toArray() as Point, veinTip.toArray() as Point], 0.0035, 12));
    }
  }
  return { stems: join(stems), veins: join(veins), leaves: foliage.map(join) };
}

function createBasket() {
  const horizontal: BufferGeometry[] = [];
  const vertical: BufferGeometry[] = [];
  for (let row = 0; row < 13; row++) {
    const y = 0.06 + row * 0.031;
    const radius = 0.56 + Math.sin(y / 0.47 * Math.PI / 2) * 0.18;
    const ring = new TorusGeometry(radius, 0.015, 5, 96);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, y, 0);
    horizontal.push(ring);
  }
  for (let strand = 0; strand < 64; strand++) {
    const angle = strand / 64 * Math.PI * 2;
    const points: Point[] = [];
    for (let row = 0; row <= 16; row++) {
      const y = 0.047 + row / 16 * 0.43;
      const radius = 0.56 + Math.sin(y / 0.47 * Math.PI / 2) * 0.18
        + Math.sin(row * Math.PI * 0.8 + strand * Math.PI) * 0.012;
      points.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
    }
    vertical.push(tube(points, 0.012, 24));
  }
  return { horizontal: join(horizontal), vertical: join(vertical) };
}

function createYarn() {
  const threads: BufferGeometry[] = [];
  // Slightly different great-circle windings give a convincing wound ball silhouette.
  for (let winding = 0; winding < 38; winding++) {
    const points: Point[] = [];
    const radius = 0.225 + winding % 3 * 0.002;
    for (let step = 0; step <= 80; step++) {
      const theta = step / 80 * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const y = Math.sin(theta) * radius;
      const rotation = winding * 0.37;
      const tilt = Math.sin(winding * 0.77) * 0.8;
      points.push([
        x * Math.cos(rotation) - y * Math.sin(rotation) * Math.sin(tilt),
        y * Math.cos(tilt),
        x * Math.sin(rotation) + y * Math.cos(rotation) * Math.sin(tilt),
      ]);
    }
    threads.push(tube(points, 0.0055, 80));
  }
  return join(threads);
}

function createKibble() {
  const pieces: BufferGeometry[] = [];
  for (let index = 0; index < 40; index++) {
    const angle = index * 2.399;
    const radius = Math.sqrt(index / 40) * 0.23;
    const geometry = new IcosahedronGeometry(0.027 + index % 3 * 0.003, 0);
    geometry.scale(1, 0.65, 0.85);
    geometry.rotateY(angle);
    geometry.translate(Math.cos(angle) * radius, 0.112 + Math.sin(index * 1.1) * 0.016, Math.sin(angle) * radius);
    pieces.push(geometry);
  }
  return join(pieces);
}

function Armchair() {
  const { wood, fabric } = useRoomTextures();
  const upholstery = <meshStandardMaterial {...fabric} color="#8f9a83" roughness={0.94} bumpScale={0.025} />;
  return (
    <group position={[-5.7, 0, -5.2]} rotation={[0, 0.3, 0]}>
      {[-0.68, 0.68].flatMap((x) => [-0.6, 0.59].map((z) => (
        <mesh key={`${x}-${z}`} castShadow receiveShadow position={[x, 0.34, z]} rotation={[z * 0.06, 0, -x * 0.08]} raycast={noRaycast}>
          <cylinderGeometry args={[0.078, 0.05, 0.68, 12]} />
          <meshStandardMaterial {...wood} color="#8f6840" roughness={0.65} />
        </mesh>
      )))}
      <RoundedBox args={[1.72, 0.32, 1.66]} radius={0.14} smoothness={4} position={[0, 0.8, 0]} castShadow receiveShadow raycast={noRaycast}>{upholstery}</RoundedBox>
      <RoundedBox args={[1.32, 0.3, 1.42]} radius={0.13} smoothness={4} position={[0, 1.05, 0.1]} castShadow receiveShadow raycast={noRaycast}>{upholstery}</RoundedBox>
      <RoundedBox args={[1.76, 1.48, 0.4]} radius={0.18} smoothness={4} position={[0, 1.65, -0.67]} rotation={[-0.11, 0, 0]} castShadow receiveShadow raycast={noRaycast}>{upholstery}</RoundedBox>
      {[-0.85, 0.85].map((x) => (
        <RoundedBox key={x} args={[0.34, 0.88, 1.75]} radius={0.16} smoothness={4} position={[x, 1.28, 0.02]} castShadow receiveShadow raycast={noRaycast}>{upholstery}</RoundedBox>
      ))}
      <RoundedBox args={[1.19, 0.91, 0.27]} radius={0.12} smoothness={4} position={[0.02, 1.62, -0.37]} rotation={[-0.15, 0.035, -0.025]} castShadow receiveShadow raycast={noRaycast}>{upholstery}</RoundedBox>
      <RoundedBox args={[0.67, 0.64, 0.19]} radius={0.08} smoothness={4} position={[-0.34, 1.5, -0.12]} rotation={[-0.2, 0.1, 0.13]} castShadow receiveShadow raycast={noRaycast}>
        <meshStandardMaterial {...fabric} color="#dbccaf" roughness={1} bumpScale={0.028} />
      </RoundedBox>
    </group>
  );
}

function SideTable() {
  const { wood } = useRoomTextures();
  const mug = useMemo(() => vessel([[0.105, 0], [0.117, 0.015], [0.123, 0.2], [0.12, 0.222], [0.103, 0.222], [0.104, 0.038], [0, 0.038]]), []);
  useEffect(() => () => mug.dispose(), [mug]);
  return (
    <group position={[-3.3, 0, -5.9]}>
      {[0, 1, 2].map((leg) => (
        <mesh key={leg} castShadow receiveShadow position={[Math.cos(leg * Math.PI * 2 / 3) * 0.34, 0.61, Math.sin(leg * Math.PI * 2 / 3) * 0.34]} raycast={noRaycast}>
          <cylinderGeometry args={[0.043, 0.057, 1.22, 16]} />
          <meshStandardMaterial {...wood} color="#b99162" roughness={0.56} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[0, 1.23, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.63, 0.63, 0.11, 64]} />
        <meshStandardMaterial {...wood} color="#c39b6c" roughness={0.55} />
      </mesh>
      <group position={[-0.14, 1.305, 0.12]} rotation={[0, -0.15, 0]}>
        {[-0.026, 0.026].map((y) => (
          <RoundedBox key={y} args={[0.48, 0.006, 0.35]} radius={0.002} smoothness={2} position={[0, y, 0]} castShadow receiveShadow raycast={noRaycast}>
            <meshStandardMaterial color="#8a6d52" roughness={0.8} />
          </RoundedBox>
        ))}
        <RoundedBox args={[0.015, 0.058, 0.35]} radius={0.004} smoothness={2} position={[-0.232, 0, 0]} castShadow receiveShadow raycast={noRaycast}>
          <meshStandardMaterial color="#8a6d52" roughness={0.8} />
        </RoundedBox>
        <mesh position={[0.009, 0, 0.006]} raycast={noRaycast}>
          <boxGeometry args={[0.45, 0.039, 0.326]} />
          <meshStandardMaterial color="#e5dfca" roughness={1} />
        </mesh>
        <group position={[0.018, 0.055, 0.014]} rotation={[0, 0.13, 0]}>
          {[-0.022, 0.022].map((y) => (
            <RoundedBox key={y} args={[0.425, 0.007, 0.31]} radius={0.002} smoothness={2} position={[0, y, 0]} castShadow receiveShadow raycast={noRaycast}>
              <meshStandardMaterial color="#626f70" roughness={0.82} />
            </RoundedBox>
          ))}
          <RoundedBox args={[0.014, 0.051, 0.31]} radius={0.004} smoothness={2} position={[-0.205, 0, 0]} castShadow receiveShadow raycast={noRaycast}>
            <meshStandardMaterial color="#626f70" roughness={0.82} />
          </RoundedBox>
          <mesh position={[0.005, 0, 0.006]} raycast={noRaycast}>
            <boxGeometry args={[0.404, 0.032, 0.287]} />
            <meshStandardMaterial color="#ede7d5" roughness={1} />
          </mesh>
        </group>
      </group>
      <group position={[0.27, 1.29, -0.2]}>
        <mesh geometry={mug} castShadow receiveShadow raycast={noRaycast}>
          <meshPhysicalMaterial color="#b4b49c" roughness={0.24} clearcoat={0.65} clearcoatRoughness={0.18} />
        </mesh>
        <mesh position={[0.118, 0.125, 0]} rotation={[0, Math.PI / 2, 0]} castShadow raycast={noRaycast}>
          <torusGeometry args={[0.071, 0.018, 10, 32]} />
          <meshPhysicalMaterial color="#b4b49c" roughness={0.24} clearcoat={0.65} />
        </mesh>
        <mesh position={[0, 0.179, 0]} raycast={noRaycast}>
          <cylinderGeometry args={[0.103, 0.103, 0.002, 40]} />
          <meshPhysicalMaterial color="#4b3020" roughness={0.15} clearcoat={0.5} />
        </mesh>
      </group>
    </group>
  );
}

function Plant() {
  const plant = useMemo(createPlant, []);
  const pot = useMemo(() => vessel([[0, 0], [0.32, 0], [0.355, 0.055], [0.405, 0.66], [0.435, 0.71], [0.435, 0.747], [0.402, 0.747], [0.373, 0.71], [0.325, 0.1], [0, 0.1]]), []);
  useEffect(() => () => { pot.dispose(); plant.stems.dispose(); plant.veins.dispose(); plant.leaves.forEach((geometry) => geometry.dispose()); }, [plant, pot]);
  return (
    <group position={[4.8, 0, -5.5]}>
      <mesh geometry={pot} castShadow receiveShadow raycast={noRaycast}>
        <meshStandardMaterial color="#c6b09a" roughness={0.76} />
      </mesh>
      <mesh position={[0, 0.679, 0]} receiveShadow raycast={noRaycast}>
        <cylinderGeometry args={[0.38, 0.38, 0.022, 40]} />
        <meshStandardMaterial color="#393128" roughness={1} />
      </mesh>
      <mesh geometry={plant.stems} castShadow receiveShadow raycast={noRaycast}>
        <meshStandardMaterial color="#68704a" roughness={0.83} />
      </mesh>
      {plant.leaves.map((geometry, index) => (
        <mesh key={index} geometry={geometry} castShadow receiveShadow raycast={noRaycast}>
          <meshPhysicalMaterial color={['#3e6542', '#52784c', '#68875a'][index]} side={DoubleSide} roughness={0.55} clearcoat={0.22} clearcoatRoughness={0.65} />
        </mesh>
      ))}
      <mesh geometry={plant.veins} raycast={noRaycast}>
        <meshStandardMaterial color="#8b9a67" roughness={0.85} />
      </mesh>
    </group>
  );
}

function CatBasket() {
  const { fabric } = useRoomTextures();
  const basket = useMemo(createBasket, []);
  const shell = useMemo(() => vessel([[0, 0.018], [0.54, 0.018], [0.6, 0.11], [0.7, 0.31], [0.745, 0.46], [0.72, 0.47], [0.677, 0.31], [0.57, 0.1], [0, 0.085]]), []);
  useEffect(() => () => { basket.horizontal.dispose(); basket.vertical.dispose(); shell.dispose(); }, [basket, shell]);
  return (
    <group position={[4.5, 0, -1.7]} scale={[1.13, 1, 0.87]} rotation={[0, -0.12, 0]}>
      <mesh geometry={shell} castShadow receiveShadow raycast={noRaycast}>
        <meshStandardMaterial color="#ae8757" roughness={0.9} />
      </mesh>
      <mesh geometry={basket.horizontal} castShadow receiveShadow raycast={noRaycast}>
        <meshStandardMaterial color="#c6a274" roughness={0.88} />
      </mesh>
      <mesh geometry={basket.vertical} castShadow receiveShadow raycast={noRaycast}>
        <meshStandardMaterial color="#d0b287" roughness={0.91} />
      </mesh>
      <mesh position={[0, 0.474, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow raycast={noRaycast}>
        <torusGeometry args={[0.729, 0.035, 8, 96]} />
        <meshStandardMaterial color="#b98e5d" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.17, 0]} scale={[0.635, 0.115, 0.635]} castShadow receiveShadow raycast={noRaycast}>
        <sphereGeometry args={[1, 40, 20]} />
        <meshStandardMaterial {...fabric} color="#ded2bd" roughness={1} bumpScale={0.04} />
      </mesh>
    </group>
  );
}

function PetBowls() {
  const bowl = useMemo(() => vessel([[0, 0.008], [0.29, 0.008], [0.335, 0.038], [0.35, 0.16], [0.342, 0.196], [0.318, 0.196], [0.297, 0.07], [0.27, 0.045], [0, 0.045]]), []);
  const kibble = useMemo(createKibble, []);
  useEffect(() => () => { bowl.dispose(); kibble.dispose(); }, [bowl, kibble]);
  return (
    <group position={[3.1, 0, 0]} rotation={[0, 0.16, 0]}>
      <RoundedBox args={[1.57, 0.024, 0.85]} radius={0.011} smoothness={2} position={[0, 0.013, 0]} receiveShadow raycast={noRaycast}>
        <meshStandardMaterial color="#a9a78e" roughness={1} />
      </RoundedBox>
      {[-0.39, 0.39].map((x, index) => (
        <group key={x} position={[x, 0.03, 0]}>
          <mesh geometry={bowl} castShadow receiveShadow raycast={noRaycast}>
            <meshPhysicalMaterial color={index === 0 ? '#d8d1bf' : '#92a5a1'} roughness={0.24} clearcoat={0.7} clearcoatRoughness={0.17} />
          </mesh>
          {index === 0 ? (
            <mesh geometry={kibble} castShadow receiveShadow raycast={noRaycast}>
              <meshStandardMaterial color="#735039" roughness={0.96} />
            </mesh>
          ) : (
            <mesh position={[0, 0.142, 0]} raycast={noRaycast}>
              <cylinderGeometry args={[0.311, 0.31, 0.007, 48]} />
              <meshPhysicalMaterial color="#aab9af" transparent opacity={0.73} roughness={0.08} clearcoat={1} metalness={0.05} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function Yarn() {
  const yarn = useMemo(createYarn, []);
  const string = useMemo(() => tube([[0.16, 0.18, 0.07], [0.32, 0.034, 0.18], [0.63, 0.01, 0.28], [0.91, 0.01, 0.06], [1.13, 0.01, 0.23], [1.05, 0.01, 0.47], [0.8, 0.01, 0.53], [0.73, 0.01, 0.71]], 0.007, 72), []);
  // Keep the long loose end outside the central observation area.
  const ball = useMemo(() => new SphereGeometry(0.223, 32, 24), []);
  useEffect(() => () => { yarn.dispose(); string.dispose(); ball.dispose(); }, [ball, string, yarn]);
  return (
    <group position={[-2.2, 0.008, 1.4]} rotation={[0, -2.7, 0]}>
      <group position={[0, 0.228, 0]}>
        <mesh geometry={ball} castShadow receiveShadow raycast={noRaycast}>
          <meshStandardMaterial color="#a96e54" roughness={1} />
        </mesh>
        <mesh geometry={yarn} castShadow receiveShadow raycast={noRaycast}>
          <meshStandardMaterial color="#bf8b70" roughness={1} />
        </mesh>
      </group>
      <mesh geometry={string} castShadow receiveShadow raycast={noRaycast}>
        <meshStandardMaterial color="#bf8b70" roughness={1} />
      </mesh>
    </group>
  );
}

export function RoomProps() {
  return <group><Armchair /><SideTable /><Plant /><CatBasket /><PetBowls /><Yarn /></group>;
}
