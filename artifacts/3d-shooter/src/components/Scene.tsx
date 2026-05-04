import { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import Arena from "./Arena";
import PlayerMesh from "./PlayerMesh";
import EnemyMesh from "./EnemyMesh";
import BulletMesh from "./BulletMesh";

interface SceneProps {
  onScore: (pts: number) => void;
  onHealth: (hp: number) => void;
  onWave: (w: number) => void;
  currentWave: number;
}

export interface Enemy {
  id: number;
  position: THREE.Vector3;
  health: number;
  speed: number;
  color: string;
  size: number;
}

export interface Bullet {
  id: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
}

const ARENA_SIZE = 30;
const PLAYER_SPEED = 8;
const BULLET_SPEED = 25;
const BULLET_LIFETIME = 2.5;
const SHOOT_COOLDOWN = 0.22;
const ENEMY_DAMAGE = 20;
const WAVE_CLEAR_DELAY = 3;

let enemyIdCounter = 0;
let bulletIdCounter = 0;

function spawnEnemiesForWave(wave: number): Enemy[] {
  const count = 3 + wave * 2;
  const enemies: Enemy[] = [];
  const colors = ["#e74c3c", "#e67e22", "#9b59b6", "#1abc9c", "#e91e63"];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 18 + Math.random() * 8;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const isBig = wave > 2 && Math.random() < 0.2;
    enemies.push({
      id: ++enemyIdCounter,
      position: new THREE.Vector3(x, isBig ? 1.2 : 0.7, z),
      health: isBig ? 3 : 1,
      speed: 2.5 + wave * 0.3 + Math.random() * 0.5,
      color: colors[i % colors.length],
      size: isBig ? 1.4 : 0.8,
    });
  }
  return enemies;
}

export default function Scene({ onScore, onHealth, onWave, currentWave }: SceneProps) {
  const playerPos = useRef(new THREE.Vector3(0, 0.5, 0));
  const playerAngle = useRef(0);
  const shootTimer = useRef(0);
  const waveTimer = useRef(0);
  const wavePending = useRef(false);
  const damageTimer = useRef<Record<number, number>>({});

  const [enemies, setEnemies] = useState<Enemy[]>(() => spawnEnemiesForWave(1));
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [bulletLifetimes, setBulletLifetimes] = useState<Record<number, number>>({});
  const [wave, setWave] = useState(1);

  const { camera, gl } = useThree();
  const [, getKeys] = useKeyboardControls();

  const shoot = useCallback((angleRad: number) => {
    const dir = new THREE.Vector3(Math.sin(angleRad), 0, Math.cos(angleRad));
    const id = ++bulletIdCounter;
    const pos = playerPos.current.clone().add(dir.clone().multiplyScalar(1.2));
    pos.y = 0.7;

    setBullets((prev) => [
      ...prev,
      { id, position: pos, direction: dir, speed: BULLET_SPEED },
    ]);
    setBulletLifetimes((prev) => ({ ...prev, [id]: BULLET_LIFETIME }));
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock();
        return;
      }
      shoot(playerAngle.current);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === gl.domElement) {
        playerAngle.current -= e.movementX * 0.003;
      }
    };

    gl.domElement.addEventListener("click", handleClick);
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      gl.domElement.removeEventListener("click", handleClick);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [gl, shoot]);

  useFrame((_, delta) => {
    const keys = getKeys();
    const moveDir = new THREE.Vector3();

    if (keys.forward) moveDir.add(new THREE.Vector3(Math.sin(playerAngle.current), 0, Math.cos(playerAngle.current)));
    if (keys.back) moveDir.add(new THREE.Vector3(-Math.sin(playerAngle.current), 0, -Math.cos(playerAngle.current)));
    if (keys.left) moveDir.add(new THREE.Vector3(-Math.cos(playerAngle.current), 0, Math.sin(playerAngle.current)));
    if (keys.right) moveDir.add(new THREE.Vector3(Math.cos(playerAngle.current), 0, -Math.sin(playerAngle.current)));

    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(PLAYER_SPEED * delta);
      const next = playerPos.current.clone().add(moveDir);
      const half = ARENA_SIZE / 2 - 1;
      next.x = Math.max(-half, Math.min(half, next.x));
      next.z = Math.max(-half, Math.min(half, next.z));
      playerPos.current.copy(next);
    }

    shootTimer.current -= delta;
    if (shootTimer.current < 0) shootTimer.current = 0;

    const camX = playerPos.current.x - Math.sin(playerAngle.current) * 12;
    const camZ = playerPos.current.z - Math.cos(playerAngle.current) * 12;
    camera.position.set(camX, 10, camZ);
    camera.lookAt(playerPos.current);

    setBullets((prev) => {
      const next: Bullet[] = [];
      const toRemove = new Set<number>();

      for (const b of prev) {
        b.position.addScaledVector(b.direction, b.speed * delta);
        if (
          Math.abs(b.position.x) > ARENA_SIZE / 2 ||
          Math.abs(b.position.z) > ARENA_SIZE / 2
        ) {
          toRemove.add(b.id);
        } else {
          next.push(b);
        }
      }

      setBulletLifetimes((lifetimes) => {
        const updated = { ...lifetimes };
        for (const b of next) {
          updated[b.id] = (updated[b.id] ?? BULLET_LIFETIME) - delta;
          if (updated[b.id] <= 0) toRemove.add(b.id);
        }
        for (const id of toRemove) delete updated[id];
        return updated;
      });

      return next.filter((b) => !toRemove.has(b.id));
    });

    setEnemies((prev) => {
      if (prev.length === 0) {
        if (!wavePending.current) {
          wavePending.current = true;
          waveTimer.current = WAVE_CLEAR_DELAY;
        }
        return prev;
      }

      const hitEnemies = new Set<number>();
      let bulletKills = 0;

      setBullets((bPrev) => {
        const remainingBullets: Bullet[] = [];
        for (const b of bPrev) {
          let hit = false;
          for (const e of prev) {
            const dist = b.position.distanceTo(e.position);
            if (dist < e.size + 0.3) {
              hitEnemies.add(e.id);
              hit = true;
              break;
            }
          }
          if (!hit) remainingBullets.push(b);
        }
        return remainingBullets;
      });

      const towardPlayer = new THREE.Vector3();
      const updated = prev.map((e) => {
        towardPlayer.subVectors(playerPos.current, e.position).normalize();
        const newPos = e.position.clone().addScaledVector(towardPlayer, e.speed * delta);
        newPos.y = e.position.y;

        let newHealth = e.health;
        if (hitEnemies.has(e.id)) {
          newHealth -= 1;
          if (newHealth <= 0) bulletKills++;
        }

        const distToPlayer = newPos.distanceTo(playerPos.current);
        if (distToPlayer < e.size + 0.6) {
          const now = performance.now();
          const lastDmg = damageTimer.current[e.id] ?? 0;
          if (now - lastDmg > 800) {
            onHealth(-ENEMY_DAMAGE);
            damageTimer.current[e.id] = now;
          }
        }

        return { ...e, position: newPos, health: newHealth };
      }).filter((e) => e.health > 0);

      if (bulletKills > 0) onScore(bulletKills * 10);

      return updated;
    });

    if (wavePending.current) {
      waveTimer.current -= delta;
      if (waveTimer.current <= 0) {
        wavePending.current = false;
        const nextWave = wave + 1;
        setWave(nextWave);
        onWave(nextWave);
        setEnemies(spawnEnemiesForWave(nextWave));
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <pointLight position={[0, 5, 0]} intensity={0.6} color="#ffffff" />

      <Arena size={ARENA_SIZE} />

      <PlayerMesh position={playerPos.current} angle={playerAngle} />

      {enemies.map((e) => (
        <EnemyMesh key={e.id} enemy={e} />
      ))}

      {bullets.map((b) => (
        <BulletMesh key={b.id} bullet={b} />
      ))}
    </>
  );
}
