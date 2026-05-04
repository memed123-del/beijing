import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Bullet } from "./Scene";

interface BulletMeshProps {
  bullet: Bullet;
}

export default function BulletMesh({ bullet }: BulletMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(bullet.position);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.18, 8, 8]} />
      <meshStandardMaterial
        color="#ffe000"
        emissive="#ffe000"
        emissiveIntensity={2}
        metalness={0.8}
        roughness={0.1}
      />
      <pointLight intensity={1.5} distance={4} color="#ffe000" />
    </mesh>
  );
}
