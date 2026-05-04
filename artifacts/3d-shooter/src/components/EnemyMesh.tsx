import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Enemy } from "./Scene";

interface EnemyMeshProps {
  enemy: Enemy;
}

export default function EnemyMesh({ enemy }: EnemyMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    time.current += delta * 3;
    if (groupRef.current) {
      groupRef.current.position.copy(enemy.position);
      groupRef.current.rotation.y += delta * 2;
    }
  });

  const s = enemy.size;

  return (
    <group ref={groupRef}>
      <mesh castShadow>
        <boxGeometry args={[s, s, s]} />
        <meshStandardMaterial color={enemy.color} emissive={enemy.color} emissiveIntensity={0.3} roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, s / 2 + 0.1, 0]}>
        <boxGeometry args={[s * 0.3, s * 0.15, s * 0.3]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.8} />
      </mesh>
      <pointLight intensity={0.5} distance={3} color={enemy.color} />
    </group>
  );
}
