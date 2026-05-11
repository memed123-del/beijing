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
  lifetime: number;
}

const ARENA_SIZE = 30;
const PLAYER_SPEED = 8;
const BULLET_SPEED = 28;
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
    const radius = 18 + Math.random() * 6;
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
  const waveRef = useRef(1);

  const enemiesRef = useRef<Enemy[]>(spawnEnemiesForWave(1));
  const bulletsRef = useRef<Bullet[]>([]);

  const [renderTick, setRenderTick] = useState(0);
  const forceRender = useCallback(() => setRenderTick((t) => t + 1), []);

  const { camera, gl } = useThree();
  const [, getKeys] = useKeyboardControls();

  const shoot = useCallback((angleRad: number) => {
    if (shootTimer.current > 0) return;
    shootTimer.current = SHOOT_COOLDOWN;
    const dir = new THREE.Vector3(Math.sin(angleRad), 0, Math.cos(angleRad));
    const id = ++bulletIdCounter;
    const pos = playerPos.current.clone().add(dir.clone().multiplyScalar(1.3));
    pos.y = 0.7;
    bulletsRef.current.push({
      id,
      position: pos,
      direction: dir,
      speed: BULLET_SPEED,
      lifetime: BULLET_LIFETIME,
    });
  }, []);

  useEffect(() => {
    const handleClick = () => {
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock();
        return;
      }
      shoot(playerAngle.current);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === gl.domElement) {
        // FIX: positive movementX = mouse moves right = player rotates right
        playerAngle.current += e.movementX * 0.003;
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

    if (keys.forward)
      moveDir.add(new THREE.Vector3(Math.sin(playerAngle.current), 0, Math.cos(playerAngle.current)));
    if (keys.back)
      moveDir.add(new THREE.Vector3(-Math.sin(playerAngle.current), 0, -Math.cos(playerAngle.current)));
    if (keys.left)
      moveDir.add(new THREE.Vector3(-Math.cos(playerAngle.current), 0, Math.sin(playerAngle.current)));
    if (keys.right)
      moveDir.add(new THREE.Vector3(Math.cos(playerAngle.current), 0, -Math.sin(playerAngle.current)));

    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(PLAYER_SPEED * delta);
      const next = playerPos.current.clone().add(moveDir);
      const half = ARENA_SIZE / 2 - 1;
      next.x = Math.max(-half, Math.min(half, next.x));
      next.z = Math.max(-half, Math.min(half, next.z));
      playerPos.current.copy(next);
    }

    shootTimer.current = Math.max(0, shootTimer.current - delta);

    const camX = playerPos.current.x - Math.sin(playerAngle.current) * 12;
    const camZ = playerPos.current.z - Math.cos(playerAngle.current) * 12;
    camera.position.set(camX, 10, camZ);
    camera.lookAt(playerPos.current);

    // --- Bullet updates ---
    const hitEnemyIds = new Set<number>();
    const hitBulletIds = new Set<number>();

    // Move bullets and check lifetime/bounds
    for (const b of bulletsRef.current) {
      b.position.addScaledVector(b.direction, b.speed * delta);
      b.lifetime -= delta;
      if (
        b.lifetime <= 0 ||
        Math.abs(b.position.x) > ARENA_SIZE / 2 ||
        Math.abs(b.position.z) > ARENA_SIZE / 2
      ) {
        hitBulletIds.add(b.id);
      }
    }

    // Check bullet-enemy collisions
    for (const b of bulletsRef.current) {
      if (hitBulletIds.has(b.id)) continue;
      for (const e of enemiesRef.current) {
        const dist = b.position.distanceTo(e.position);
        if (dist < e.size + 0.35) {
          hitEnemyIds.add(e.id);
          hitBulletIds.add(b.id);
          break;
        }
      }
    }

    // Remove hit bullets
    if (hitBulletIds.size > 0) {
      bulletsRef.current = bulletsRef.current.filter((b) => !hitBulletIds.has(b.id));
    }

    // --- Enemy updates ---
    let kills = 0;
    const towardPlayer = new THREE.Vector3();
    const now = performance.now();

    const survivingEnemies: Enemy[] = [];
    for (const e of enemiesRef.current) {
      // Damage from bullet
      if (hitEnemyIds.has(e.id)) {
        e.health -= 1;
        if (e.health <= 0) {
          kills++;
          continue; // enemy is dead
        }
      }

      // Move toward player
      towardPlayer.subVectors(playerPos.current, e.position).setY(0).normalize();
      e.position.addScaledVector(towardPlayer, e.speed * delta);

      // Damage player on contact
      const distToPlayer = e.position.distanceTo(playerPos.current);
      if (distToPlayer < e.size + 0.7) {
        const lastDmg = damageTimer.current[e.id] ?? 0;
        if (now - lastDmg > 800) {
          onHealth(-ENEMY_DAMAGE);
          damageTimer.current[e.id] = now;
        }
      }

      survivingEnemies.push(e);
    }
    enemiesRef.current = survivingEnemies;

    if (kills > 0) onScore(kills * 10);

    // Wave management
    if (enemiesRef.current.length === 0 && !wavePending.current) {
      wavePending.current = true;
      waveTimer.current = WAVE_CLEAR_DELAY;
    }
    if (wavePending.current) {
      waveTimer.current -= delta;
      if (waveTimer.current <= 0) {
        wavePending.current = false;
        const nextWave = waveRef.current + 1;
        waveRef.current = nextWave;
        onWave(nextWave);
        enemiesRef.current = spawnEnemiesForWave(nextWave);
      }
    }

    forceRender();
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <pointLight position={[0, 5, 0]} intensity={0.6} color="#ffffff" />

      <Arena size={ARENA_SIZE} />

      <PlayerMesh position={playerPos.current} angle={playerAngle} />

      {enemiesRef.current.map((e) => (
        <EnemyMesh key={e.id} enemy={e} />
      ))}

      {bulletsRef.current.map((b) => (
        <BulletMesh key={b.id} bullet={b} />
      ))}
    </>
  );
}
