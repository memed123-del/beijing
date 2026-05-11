import { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import Arena from "./Arena";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnemyData {
  id: number;
  pos: THREE.Vector3;
  hp: number;
  speed: number;
  color: string;
  size: number;
}

interface BulletData {
  id: number;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  life: number;
}

interface SceneProps {
  onScore: (pts: number) => void;
  onHealth: (hp: number) => void;
  onWave: (w: number) => void;
  currentWave: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ARENA_HALF = 14;
const PLAYER_SPEED = 8;
const BULLET_SPEED = 30;
const BULLET_LIFE = 2.0;
const SHOOT_CD = 0.22;
const WAVE_DELAY = 2.5;
const ENEMY_POOL = 25;
const BULLET_POOL = 40;
const COLORS = ["#e74c3c", "#e67e22", "#9b59b6", "#1abc9c", "#e91e63", "#f1c40f"];

let eid = 0;
let bid = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWave(wave: number): EnemyData[] {
  const count = 3 + wave * 2;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const r = 15 + Math.random() * 4;
    const big = wave > 2 && Math.random() < 0.2;
    return {
      id: ++eid,
      pos: new THREE.Vector3(Math.cos(angle) * r, big ? 1.2 : 0.7, Math.sin(angle) * r),
      hp: big ? 3 : 1,
      speed: 2.5 + wave * 0.35 + Math.random() * 0.4,
      color: COLORS[i % COLORS.length],
      size: big ? 1.4 : 0.8,
    };
  });
}

// ─── Player ───────────────────────────────────────────────────────────────────

function PlayerMesh({ meshRef }: { meshRef: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={meshRef}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 1.0, 0.8]} />
        <meshStandardMaterial color="#27ae60" />
      </mesh>
      <mesh castShadow position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial color="#f39c12" />
      </mesh>
      <mesh castShadow position={[0.35, 0.6, -0.65]}>
        <boxGeometry args={[0.15, 0.15, 0.7]} />
        <meshStandardMaterial color="#7f8c8d" metalness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Enemy Pool ───────────────────────────────────────────────────────────────

function EnemyPool({ meshRefs, matRefs }: {
  meshRefs: React.MutableRefObject<(THREE.Group | null)[]>;
  matRefs: React.MutableRefObject<(THREE.MeshStandardMaterial | null)[]>;
}) {
  return (
    <>
      {Array.from({ length: ENEMY_POOL }, (_, i) => (
        <group key={i} ref={(el: THREE.Group | null) => { meshRefs.current[i] = el; }} visible={false}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshStandardMaterial
              ref={(el: THREE.MeshStandardMaterial | null) => { matRefs.current[i] = el; }}
              color="#e74c3c"
              emissiveIntensity={0.3}
            />
          </mesh>
          <pointLight intensity={0.4} distance={3} />
        </group>
      ))}
    </>
  );
}

// ─── Bullet Pool ──────────────────────────────────────────────────────────────

function BulletPool({ meshRefs }: {
  meshRefs: React.MutableRefObject<(THREE.Mesh | null)[]>;
}) {
  return (
    <>
      {Array.from({ length: BULLET_POOL }, (_, i) => (
        <mesh key={i} ref={(el: THREE.Mesh | null) => { meshRefs.current[i] = el; }} visible={false}>
          <sphereGeometry args={[0.18, 6, 6]} />
          <meshStandardMaterial color="#ffe000" emissive="#ffe000" emissiveIntensity={2} />
        </mesh>
      ))}
    </>
  );
}

// ─── Main Scene ───────────────────────────────────────────────────────────────

export default function Scene({ onScore, onHealth, onWave, currentWave }: SceneProps) {
  const { camera, gl } = useThree();
  const [, getKeys] = useKeyboardControls();

  // Game state — all in refs, NO setState in game loop
  const playerPos = useRef(new THREE.Vector3(0, 0.5, 0));
  const playerAngle = useRef(0);
  const shootCD = useRef(0);
  const shootQueued = useRef(false);
  const lastDmg = useRef<Record<number, number>>({});

  const waveNum = useRef(currentWave);
  const waveWaiting = useRef(false);
  const waveTimer = useRef(0);

  const enemies = useRef<EnemyData[]>(makeWave(currentWave));
  const bullets = useRef<BulletData[]>([]);

  // Mesh refs for imperative updates
  const playerMesh = useRef<THREE.Group>(null);
  const enemyMeshRefs = useRef<(THREE.Group | null)[]>([]);
  const enemyMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const bulletMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Input
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement === gl.domElement)
        playerAngle.current += e.movementX * 0.003;
    };
    const onClick = () => {
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock();
      } else {
        shootQueued.current = true;
      }
    };
    document.addEventListener("mousemove", onMove);
    gl.domElement.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("mousemove", onMove);
      gl.domElement.removeEventListener("click", onClick);
    };
  }, [gl]);

  // ── Game loop — purely imperative, zero setState ──────────────────────────
  useFrame((_, dt) => {
    const sin = Math.sin(playerAngle.current);
    const cos = Math.cos(playerAngle.current);

    // Player movement
    const keys = getKeys();
    const mv = new THREE.Vector3();
    if (keys.forward)  mv.add(new THREE.Vector3( sin, 0,  cos));
    if (keys.back)     mv.add(new THREE.Vector3(-sin, 0, -cos));
    if (keys.left)     mv.add(new THREE.Vector3(-cos, 0,  sin));
    if (keys.right)    mv.add(new THREE.Vector3( cos, 0, -sin));
    if (mv.lengthSq() > 0) {
      mv.normalize().multiplyScalar(PLAYER_SPEED * dt);
      playerPos.current.x = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, playerPos.current.x.valueOf() + mv.x));
      playerPos.current.z = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, playerPos.current.z.valueOf() + mv.z));
    }

    // Update player mesh
    if (playerMesh.current) {
      playerMesh.current.position.copy(playerPos.current);
      playerMesh.current.rotation.y = playerAngle.current + Math.PI;
    }

    // Camera
    camera.position.set(playerPos.current.x - sin * 12, 10, playerPos.current.z - cos * 12);
    camera.lookAt(playerPos.current);

    // Shoot
    shootCD.current = Math.max(0, shootCD.current - dt);
    if (shootQueued.current && shootCD.current === 0) {
      shootQueued.current = false;
      shootCD.current = SHOOT_CD;
      const dir = new THREE.Vector3(sin, 0, cos).normalize();
      const pos = playerPos.current.clone().addScaledVector(dir, 1.4);
      pos.y = 0.7;
      if (bullets.current.length < BULLET_POOL) {
        bullets.current.push({ id: ++bid, pos, dir, life: BULLET_LIFE });
      }
    }
    shootQueued.current = false;

    // Move bullets
    const deadBullets = new Set<number>();
    for (const b of bullets.current) {
      b.pos.addScaledVector(b.dir, BULLET_SPEED * dt);
      b.life -= dt;
      if (b.life <= 0 || Math.abs(b.pos.x) > ARENA_HALF + 2 || Math.abs(b.pos.z) > ARENA_HALF + 2) {
        deadBullets.add(b.id);
      }
    }

    // Bullet-enemy collision
    const now = performance.now();
    const hitEnemies = new Map<number, number>(); // enemy id → hits

    for (const b of bullets.current) {
      if (deadBullets.has(b.id)) continue;
      for (const e of enemies.current) {
        if (b.pos.distanceTo(e.pos) < e.size + 0.4) {
          deadBullets.add(b.id);
          hitEnemies.set(e.id, (hitEnemies.get(e.id) ?? 0) + 1);
          break;
        }
      }
    }

    // Remove dead bullets
    if (deadBullets.size > 0) {
      bullets.current = bullets.current.filter(b => !deadBullets.has(b.id));
    }

    // Update enemies
    let kills = 0;
    const toPlayer = new THREE.Vector3();
    enemies.current = enemies.current.filter(e => {
      const dmg = hitEnemies.get(e.id) ?? 0;
      e.hp -= dmg;
      if (e.hp <= 0) { kills++; return false; }

      toPlayer.subVectors(playerPos.current, e.pos).setY(0);
      if (toPlayer.lengthSq() > 0) {
        toPlayer.normalize().multiplyScalar(e.speed * dt);
        e.pos.add(toPlayer);
      }

      if (e.pos.distanceTo(playerPos.current) < e.size + 0.7) {
        const last = lastDmg.current[e.id] ?? 0;
        if (now - last > 800) {
          onHealth(-20);
          lastDmg.current[e.id] = now;
        }
      }
      return true;
    });

    if (kills > 0) onScore(kills * 10);

    // Wave management
    if (enemies.current.length === 0 && !waveWaiting.current) {
      waveWaiting.current = true;
      waveTimer.current = WAVE_DELAY;
    }
    if (waveWaiting.current) {
      waveTimer.current -= dt;
      if (waveTimer.current <= 0) {
        waveWaiting.current = false;
        waveNum.current += 1;
        onWave(waveNum.current);
        enemies.current = makeWave(waveNum.current);
      }
    }

    // ── Update enemy meshes imperatively ────────────────────────────────────
    for (let i = 0; i < ENEMY_POOL; i++) {
      const mesh = enemyMeshRefs.current[i];
      if (!mesh) continue;
      const e = enemies.current[i];
      if (e) {
        mesh.visible = true;
        mesh.position.copy(e.pos);
        mesh.rotation.y += dt * 2;
        mesh.scale.setScalar(e.size);
        const mat = enemyMatRefs.current[i];
        if (mat) {
          mat.color.set(e.color);
          mat.emissive.set(e.color);
        }
      } else {
        mesh.visible = false;
      }
    }

    // ── Update bullet meshes imperatively ───────────────────────────────────
    for (let i = 0; i < BULLET_POOL; i++) {
      const mesh = bulletMeshRefs.current[i];
      if (!mesh) continue;
      const b = bullets.current[i];
      if (b) {
        mesh.visible = true;
        mesh.position.copy(b.pos);
      } else {
        mesh.visible = false;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <pointLight position={[0, 5, 0]} intensity={0.5} />

      <Arena size={ARENA_HALF * 2} />

      <PlayerMesh meshRef={playerMesh} />

      <EnemyPool meshRefs={enemyMeshRefs} matRefs={enemyMatRefs} />
      <BulletPool meshRefs={bulletMeshRefs} />
    </>
  );
}
