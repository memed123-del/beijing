import * as THREE from "three";

interface ArenaProps {
  size: number;
}

export default function Arena({ size }: ArenaProps) {
  const half = size / 2;
  const wallHeight = 3;
  const wallThickness = 1;

  const wallColor = "#2c3e50";
  const floorColor = "#1a1a2e";

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={floorColor} roughness={0.9} />
      </mesh>

      <gridHelper args={[size, size / 2, "#16213e", "#16213e"]} position={[0, 0.01, 0]} />

      <mesh castShadow receiveShadow position={[0, wallHeight / 2, -half]}>
        <boxGeometry args={[size + wallThickness, wallHeight, wallThickness]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, wallHeight / 2, half]}>
        <boxGeometry args={[size + wallThickness, wallHeight, wallThickness]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh castShadow receiveShadow position={[-half, wallHeight / 2, 0]}>
        <boxGeometry args={[wallThickness, wallHeight, size]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh castShadow receiveShadow position={[half, wallHeight / 2, 0]}>
        <boxGeometry args={[wallThickness, wallHeight, size]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      {[
        [-8, 0, -8], [8, 0, -8], [-8, 0, 8], [8, 0, 8],
        [0, 0, -12], [0, 0, 12], [-12, 0, 0], [12, 0, 0],
      ].map(([x, y, z], i) => (
        <mesh key={i} castShadow receiveShadow position={[x as number, (y as number) + 1, z as number]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#34495e" roughness={0.8} />
        </mesh>
      ))}

      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[size + 2, 0.2, size + 2]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}
