import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { DoubleSide, PlaneGeometry, Shape, ShapeGeometry } from "three";
import { RoomTexturesProvider, useGardenTexture, useRoomTextures } from "../utils/roomTextures";
import { RoomProps } from "./RoomProps";
import { RoomDoor } from "./RoomDoor";
import { RoomDecor } from "./RoomDecor";
import { roomConfig } from "../config/room";

const ignoreRaycast = () => {};
const ceilingHeight = roomConfig.ceilingY;
const roomWidth = roomConfig.maxX - roomConfig.minX;
const roomDepth = roomConfig.maxZ - roomConfig.minZ;
const roomCenterX = (roomConfig.minX + roomConfig.maxX) / 2;
const roomCenterZ = (roomConfig.minZ + roomConfig.maxZ) / 2;
const doorLeft = roomConfig.entryDoor.centerX - roomConfig.entryDoor.width / 2;
const doorRight = roomConfig.entryDoor.centerX + roomConfig.entryDoor.width / 2;

function Ceiling() {
  const { plaster } = useRoomTextures();
  const geometry = useMemo(() => {
    const geometry = new PlaneGeometry(roomWidth, roomDepth);
    const points = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (points.getX(i) + roomCenterX) / 2.8, (points.getY(i) + roomCenterZ) / 2.8);
    }
    return geometry;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group name="room-ceiling">
      <mesh
        geometry={geometry}
        position={[roomCenterX, ceilingHeight, roomCenterZ]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
        raycast={ignoreRaycast}
      >
        <meshStandardMaterial {...plaster} color="#f3efe5" roughness={0.96} normalScale={[0.12, 0.12]} />
      </mesh>
      <mesh name="room-roof" position={[roomCenterX, ceilingHeight + 0.12, roomCenterZ]} castShadow receiveShadow raycast={ignoreRaycast}>
        <boxGeometry args={[roomWidth, 0.2, roomDepth]} />
        <meshStandardMaterial color="#eee8dc" roughness={0.96} />
      </mesh>
      {/* The stepped cornice closes every wall-to-ceiling seam without overlaps. */}
      {[0, 1].map((step) => {
        const thickness = step === 0 ? 0.2 : 0.13;
        const y = ceilingHeight - 0.04 - step * 0.08;
        return (
          <group key={step}>
            {[roomConfig.minZ + thickness / 2, roomConfig.maxZ - thickness / 2].map((z) => (
              <mesh key={z} position={[roomCenterX, y, z]} castShadow receiveShadow raycast={ignoreRaycast}>
                <boxGeometry args={[roomWidth, 0.08, thickness]} />
                <meshStandardMaterial color="#eee8dc" roughness={0.88} />
              </mesh>
            ))}
            {[roomConfig.minX + thickness / 2, roomConfig.maxX - thickness / 2].map((x) => (
              <mesh key={x} position={[x, y, roomCenterZ]} castShadow receiveShadow raycast={ignoreRaycast}>
                <boxGeometry args={[thickness, 0.08, roomDepth - thickness * 2]} />
                <meshStandardMaterial color="#eee8dc" roughness={0.88} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function Wall({ name, position, size, rotation = [0, 0, 0] }: {
  name?: string;
  position: [number, number, number];
  size: [number, number];
  rotation?: [number, number, number];
}) {
  const { plaster } = useRoomTextures();
  const [x, y, z] = position;
  const [width, height] = size;
  const yaw = rotation[1];
  const geometry = useMemo(() => {
    const geometry = new PlaneGeometry(width, height);
    const points = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) {
      const horizontal = Math.abs(Math.sin(yaw)) > 0.5
        ? z - points.getX(i) * Math.sin(yaw)
        : x + points.getX(i) * Math.cos(yaw);
      uv.setXY(i, horizontal / 2.8, (y + points.getY(i)) / 2.8);
    }
    return geometry;
  }, [height, width, x, y, yaw, z]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh name={name} geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow raycast={ignoreRaycast}>
      <meshStandardMaterial {...plaster} color="#e4dfd3" roughness={0.95} normalScale={[0.22, 0.22]} />
    </mesh>
  );
}

function Window() {
  const garden = useGardenTexture();
  return (
    <group position={[-3.2, 4.1, -6.94]}>
      {/* An actual opening in the wall lets the frame cast sunlight into the room. */}
      <mesh position={[0, 0, -0.35]} raycast={ignoreRaycast}>
        <planeGeometry args={[5.1, 4.6]} />
        <meshBasicMaterial map={garden} color="#f0f2df" toneMapped={false} />
      </mesh>
      {[-2.5, 2.5].map((x) => (
        <RoundedBox key={x} args={[0.17, 4.7, 0.24]} radius={0.025} smoothness={2} position={[x, 0, 0]} castShadow receiveShadow raycast={ignoreRaycast}>
          <meshStandardMaterial color="#eee9df" roughness={0.6} />
        </RoundedBox>
      ))}
      {[-2.28, 0, 2.28].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow raycast={ignoreRaycast}>
          <boxGeometry args={[5.16, y === 0 ? 0.08 : 0.16, 0.24]} />
          <meshStandardMaterial color="#eee9df" roughness={0.6} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow raycast={ignoreRaycast}>
        <boxGeometry args={[0.1, 4.5, 0.24]} />
        <meshStandardMaterial color="#eee9df" roughness={0.6} />
      </mesh>
      <RoundedBox args={[5.55, 0.15, 0.62]} radius={0.025} smoothness={2} position={[0, -2.38, 0.18]} castShadow receiveShadow raycast={ignoreRaycast}>
        <meshStandardMaterial color="#c9b79c" roughness={0.65} />
      </RoundedBox>
      {[-2.95, 2.95].map((x) => (
        <Curtain key={x} position={[x, 0.2, 0.25]} />
      ))}
      <mesh position={[0, 2.66, 0.28]} rotation={[0, 0, Math.PI / 2]} raycast={ignoreRaycast}>
        <cylinderGeometry args={[0.035, 0.035, 6.7, 12]} />
        <meshStandardMaterial color="#6e695f" roughness={0.4} metalness={0.65} />
      </mesh>
    </group>
  );
}

function Curtain({ position }: { position: [number, number, number] }) {
  const { fabric } = useRoomTextures();
  return (
    <group position={position}>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[(i - 3) * 0.13, -0.08, Math.sin(i * Math.PI / 2) * 0.1]} receiveShadow raycast={ignoreRaycast}>
          <cylinderGeometry args={[0.115, 0.135, 5.0, 10, 1, true, 0, Math.PI]} />
          <meshStandardMaterial {...fabric} color="#ede8dd" roughness={1} bumpScale={0.008} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Rug() {
  const { rug } = useRoomTextures();
  const geometry = useMemo(() => {
    const width = 6.3, height = 4.8, r = 0.19;
    const s = new Shape();
    s.moveTo(-width / 2 + r, -height / 2);
    s.lineTo(width / 2 - r, -height / 2);
    s.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + r);
    s.lineTo(width / 2, height / 2 - r);
    s.quadraticCurveTo(width / 2, height / 2, width / 2 - r, height / 2);
    s.lineTo(-width / 2 + r, height / 2);
    s.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - r);
    s.lineTo(-width / 2, -height / 2 + r);
    s.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + r, -height / 2);
    const geometry = new ShapeGeometry(s, 8);
    const uv = geometry.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + width / 2) / width, (uv.getY(i) + height / 2) / height);
    return geometry;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  // Flat rug stays below the imported cat's paws (groundY = 0.008).
  return (
    <mesh geometry={geometry} position={[0, 0.004, 0.2]} rotation={[-Math.PI / 2, 0, -0.1]} receiveShadow raycast={ignoreRaycast}>
      <meshStandardMaterial {...rug} roughness={1} bumpScale={0.025} />
    </mesh>
  );
}

function RoomContent() {
  const { floor, wood } = useRoomTextures();
  return (
    <group name="cozy-room">
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} raycast={ignoreRaycast}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial {...floor} color="#d7c5ac" roughness={0.85} normalScale={[0.38, 0.38]} envMapIntensity={0.45} />
      </mesh>
      <Rug />
      <Ceiling />
      {/* All four interior-facing walls share the same bounds as the camera. */}
      <group name="room-wall-back">
        <Wall position={[roomCenterX, 0.91, roomConfig.minZ]} size={[roomWidth, 1.82]} />
        <Wall position={[roomCenterX, 8.19, roomConfig.minZ]} size={[roomWidth, 3.62]} />
        <Wall position={[-6.85, 4.1, roomConfig.minZ]} size={[2.3, 4.56]} />
        <Wall position={[5.65, 4.1, roomConfig.minZ]} size={[12.7, 4.56]} />
      </group>
      <Wall name="room-wall-left" position={[roomConfig.minX, ceilingHeight / 2, roomCenterZ]} size={[roomDepth, ceilingHeight]} rotation={[0, Math.PI / 2, 0]} />
      <Wall name="room-wall-right" position={[roomConfig.maxX, ceilingHeight / 2, roomCenterZ]} size={[roomDepth, ceilingHeight]} rotation={[0, -Math.PI / 2, 0]} />
      <group name="room-wall-front">
        <Wall position={[(roomConfig.minX + doorLeft) / 2, ceilingHeight / 2, roomConfig.maxZ]} size={[doorLeft - roomConfig.minX, ceilingHeight]} rotation={[0, Math.PI, 0]} />
        <Wall position={[(doorRight + roomConfig.maxX) / 2, ceilingHeight / 2, roomConfig.maxZ]} size={[roomConfig.maxX - doorRight, ceilingHeight]} rotation={[0, Math.PI, 0]} />
        <Wall position={[roomConfig.entryDoor.centerX, (roomConfig.entryDoor.height + ceilingHeight) / 2, roomConfig.maxZ]} size={[roomConfig.entryDoor.width, ceilingHeight - roomConfig.entryDoor.height]} rotation={[0, Math.PI, 0]} />
      </group>
      {[
        { x: roomCenterX, z: roomConfig.minZ + 0.0275, width: roomWidth },
        { x: (roomConfig.minX + doorLeft) / 2, z: roomConfig.maxZ - 0.0275, width: doorLeft - roomConfig.minX },
        { x: (doorRight + roomConfig.maxX) / 2, z: roomConfig.maxZ - 0.0275, width: roomConfig.maxX - doorRight },
      ].map(({ x, z, width }) => (
        <mesh key={`${x}-${z}`} position={[x, 0.13 + roomConfig.floorY, z]} receiveShadow raycast={ignoreRaycast}>
          <boxGeometry args={[width, 0.26, 0.055]} />
          <meshStandardMaterial color="#ddd4c3" roughness={0.7} />
        </mesh>
      ))}
      {[roomConfig.minX + 0.0275, roomConfig.maxX - 0.0275].map((x) => (
        <mesh key={x} position={[x, 0.13 + roomConfig.floorY, roomCenterZ]} receiveShadow raycast={ignoreRaycast}>
          <boxGeometry args={[0.055, 0.26, roomDepth - 0.11]} />
          <meshStandardMaterial color="#ddd4c3" roughness={0.7} />
        </mesh>
      ))}
      <Window />
      <group position={[3.2, 3.6, -6.95]} rotation={[0, 0, -0.035]}>
        <mesh raycast={ignoreRaycast}>
          <boxGeometry args={[2.3, 2.85, 0.1]} />
          <meshStandardMaterial {...wood} color="#a08b70" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0, 0.058]} raycast={ignoreRaycast}>
          <planeGeometry args={[2.06, 2.61]} />
          <meshStandardMaterial color="#d9d1bb" roughness={1} />
        </mesh>
        <mesh position={[-0.25, -0.08, 0.065]} scale={[0.68, 0.86, 1]} raycast={ignoreRaycast}>
          <circleGeometry args={[1, 48]} />
          <meshStandardMaterial color="#7f8b71" roughness={1} />
        </mesh>
        <mesh position={[0.35, -0.43, 0.072]} scale={[0.58, 0.45, 1]} raycast={ignoreRaycast}>
          <circleGeometry args={[1, 48]} />
          <meshStandardMaterial color="#b78c63" roughness={1} />
        </mesh>
      </group>
      <RoomProps />
      <RoomDoor />
      <RoomDecor />
    </group>
  );
}

export function RoomEnvironment() {
  return <RoomTexturesProvider><RoomContent /></RoomTexturesProvider>;
}
