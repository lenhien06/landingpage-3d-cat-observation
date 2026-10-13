import { RoundedBox } from "@react-three/drei";
import { roomConfig } from "../config/room";
import { useRoomTextures } from "../utils/roomTextures";

const ignoreRaycast = () => {};

export function RoomDoor() {
  const { wood, fabric } = useRoomTextures();
  const { centerX, width, height } = roomConfig.entryDoor;
  return (
    <group name="entry-door">
      <group position={[centerX, roomConfig.floorY, roomConfig.maxZ]} rotation={[0, Math.PI, 0]}>
        {/* A closed backing keeps the narrow frame reveals inside the room. */}
        <mesh position={[0, height / 2, -0.01]} castShadow receiveShadow raycast={ignoreRaycast}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial color="#58493c" roughness={0.95} />
        </mesh>
        <RoundedBox args={[width - 0.18, height - 0.1, 0.11]} radius={0.018} smoothness={2} position={[0, height / 2 + 0.01, 0.065]} castShadow receiveShadow raycast={ignoreRaycast}>
          <meshStandardMaterial {...wood} color="#bd9570" roughness={0.62} bumpScale={0.008} />
        </RoundedBox>
        {[-1, 1].map((side) => (
          <RoundedBox key={side} args={[0.17, height + 0.09, 0.22]} radius={0.014} smoothness={2} position={[side * (width / 2 - 0.035), height / 2 + 0.045, 0.075]} castShadow receiveShadow raycast={ignoreRaycast}>
            <meshStandardMaterial {...wood} color="#c3a07a" roughness={0.65} bumpScale={0.008} />
          </RoundedBox>
        ))}
        <RoundedBox args={[width + 0.1, 0.18, 0.22]} radius={0.014} smoothness={2} position={[0, height + 0.01, 0.075]} castShadow receiveShadow raycast={ignoreRaycast}>
          <meshStandardMaterial {...wood} color="#c3a07a" roughness={0.65} bumpScale={0.008} />
        </RoundedBox>
        <mesh position={[0, 0.025, 0.075]} receiveShadow raycast={ignoreRaycast}>
          <boxGeometry args={[width, 0.05, 0.38]} />
          <meshStandardMaterial {...wood} color="#9e7955" roughness={0.75} />
        </mesh>
        {[{ y: 2.25, h: 2.7 }, { y: 5.85, h: 2.9 }].map(({ y, h }) => (
          <group key={y}>
            <RoundedBox args={[width - 0.85, h, 0.035]} radius={0.012} smoothness={2} position={[0, y, 0.14]} castShadow receiveShadow raycast={ignoreRaycast}>
              <meshStandardMaterial {...wood} color="#a7825e" roughness={0.7} bumpScale={0.007} />
            </RoundedBox>
            {[-1, 1].map((side) => (
              <mesh key={`v-${side}`} position={[side * (width - 0.81) / 2, y, 0.17]} receiveShadow raycast={ignoreRaycast}>
                <boxGeometry args={[0.05, h + 0.08, 0.04]} />
                <meshStandardMaterial {...wood} color="#c4a17a" roughness={0.6} />
              </mesh>
            ))}
            {[-1, 1].map((side) => (
              <mesh key={`h-${side}`} position={[0, y + side * (h + 0.03) / 2, 0.17]} receiveShadow raycast={ignoreRaycast}>
                <boxGeometry args={[width - 0.76, 0.05, 0.04]} />
                <meshStandardMaterial {...wood} color="#c4a17a" roughness={0.6} />
              </mesh>
            ))}
          </group>
        ))}
        <group position={[width / 2 - 0.25, 3.6, 0.19]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
            <cylinderGeometry args={[0.11, 0.11, 0.035, 24]} />
            <meshStandardMaterial color="#ad8f58" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.075]} rotation={[Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
            <cylinderGeometry args={[0.034, 0.034, 0.13, 16]} />
            <meshStandardMaterial color="#baa16b" metalness={0.8} roughness={0.3} />
          </mesh>
          <RoundedBox args={[0.29, 0.06, 0.065]} radius={0.025} smoothness={2} position={[-0.1, 0, 0.14]} raycast={ignoreRaycast}>
            <meshStandardMaterial color="#baa16b" metalness={0.8} roughness={0.27} />
          </RoundedBox>
          <mesh position={[0, -0.3, 0.002]} rotation={[Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
            <cylinderGeometry args={[0.065, 0.065, 0.035, 20]} />
            <meshStandardMaterial color="#ad8f58" metalness={0.8} roughness={0.32} />
          </mesh>
          <mesh position={[0, -0.3, 0.023]} raycast={ignoreRaycast}>
            <boxGeometry args={[0.012, 0.045, 0.008]} />
            <meshStandardMaterial color="#4c483f" roughness={0.8} />
          </mesh>
        </group>
        {[1.1, 3.9, 6.7].map((y) => (
          <mesh key={y} position={[-width / 2 + 0.13, y, 0.18]} raycast={ignoreRaycast}>
            <cylinderGeometry args={[0.035, 0.035, 0.22, 14]} />
            <meshStandardMaterial color="#a38b62" metalness={0.75} roughness={0.4} />
          </mesh>
        ))}
      </group>
      <RoundedBox args={[4, 0.035, 1.7]} radius={0.016} smoothness={2} position={[centerX, 0.02 + roomConfig.floorY, roomConfig.maxZ - 1.5]} receiveShadow raycast={ignoreRaycast}>
        <meshStandardMaterial {...fabric} color="#a08b6d" roughness={1} bumpScale={0.025} />
      </RoundedBox>
    </group>
  );
}
