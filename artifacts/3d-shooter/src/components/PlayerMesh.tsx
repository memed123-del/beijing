import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface PlayerMeshProps {
  position: THREE.Vector3;
  angle: React.MutableRefObject<number>;
}

export default function PlayerMesh({ position, angle }: PlayerMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const gunRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.rotation.y = angle.current + Math.PI;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 1.0, 0.8]} />
        <meshStandardMaterial color="#27ae60" />
      </mesh>
      <mesh castShadow position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial color="#f39c12" />
      </mesh>
      <mesh ref={gunRef} castShadow position={[0.35, 0.6, -0.6]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.15, 0.15, 0.8]} />
        <meshStandardMaterial color="#7f8c8d" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[-0.55, 0.4, 0]}>
        <boxGeometry args={[0.2, 0.7, 0.2]} />
        <meshStandardMaterial color="#27ae60" />
      </mesh>
      <mesh castShadow position={[0.55, 0.4, 0]}>
        <boxGeometry args={[0.2, 0.7, 0.2]} />
        <meshStandardMaterial color="#27ae60" />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <circleGeometry args={[1.2, 16]} />
        <meshStandardMaterial color="#2ecc71" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}
