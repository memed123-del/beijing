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

// Camera is fixed top-down, never rotates — only follows player position
const CAM_HEIGHT = 18;
const CAM_OFFSET_Z = -6; // slightly behind center

let eid = 0;
let bid = 0;

function makeWave(wave: number): EnemyData[] {
  const count = 3 + wave * 2;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const r = 14 + Math.random() * 4;
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

// ─── Sub-components (static — never re-render) ───────────────────────────────

function PlayerMesh({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 1.0, 0.8]} />
        <meshStandardMaterial color="#27ae60" />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial color="#f39c12" />
      </mesh>
      {/* Gun */}
      <mesh castShadow position={[0.35, 0.55, -0.65]}>
        <boxGeometry args={[0.15, 0.15, 0.7]} />
        <meshStandardMaterial color="#7f8c8d" metalness={0.8} />
      </mesh>
      {/* Shadow circle */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 16]} />
        <meshStandardMaterial color="#000" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

function EnemyPool({
  meshRefs,
  matRefs,
}: {
  meshRefs: React.MutableRefObject<(THREE.Group | null)[]>;
  matRefs: React.MutableRefObject<(THREE.MeshStandardMaterial | null)[]>;
}) {
  return (
    <>
      {Array.from({ length: ENEMY_POOL }, (_, i) => (
        <group
          key={i}
          ref={(el: THREE.Group | null) => { meshRefs.current[i] = el; }}
          visible={false}
        >
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshStandardMaterial
              ref={(el: THREE.MeshStandardMaterial | null) => { matRefs.current[i] = el; }}
              color="#e74c3c"
              emissiveIntensity={0.3}
            />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.7, 12]} />
            <meshStandardMaterial color="#000" transparent opacity={0.2} />
          </mesh>
          <pointLight intensity={0.3} distance={3} />
        </group>
      ))}
    </>
  );
}

function BulletPool({ meshRefs }: { meshRefs: React.MutableRefObject<(THREE.Mesh | null)[]> }) {
  return (
    <>
      {Array.from({ length: BULLET_POOL }, (_, i) => (
        <mesh
          key={i}
          ref={(el: THREE.Mesh | null) => { meshRefs.current[i] = el; }}
          visible={false}
        >
          <sphereGeometry args={[0.18, 6, 6]} />
          <meshStandardMaterial color="#ffe000" emissive="#ffe000" emissiveIntensity={2} />
        </mesh>
      ))}
    </>
  );
}

// ─── Crosshair overlay ───────────────────────────────────────────────────────
// (rendered in DOM, not Three.js — positioned via mouse coords)

// ─── Main Scene ───────────────────────────────────────────────────────────────

export default function Scene({ onScore, onHealth, onWave, currentWave }: SceneProps) {
  const { camera, gl } = useThree();
  const [, getKeys] = useKeyboardControls();

  // Game state — refs only, ZERO setState in game loop
  const playerPos = useRef(new THREE.Vector3(0, 0.5, 0));
  const playerFacing = useRef(0); // angle around Y axis player visually faces
  const shootCD = useRef(0);
  const shootQueued = useRef(false);
  const lastDmg = useRef<Record<number, number>>({});

  const waveNum = useRef(currentWave);
  const waveWaiting = useRef(false);
  const waveTimer = useRef(0);

  const enemies = useRef<EnemyData[]>(makeWave(currentWave));
  const bullets = useRef<BulletData[]>([]);

  // Mouse world position (where the mouse points on the ground plane)
  const mouseWorld = useRef(new THREE.Vector3(0, 0, 5));
  const mousePx = useRef({ x: 0, y: 0 });
  const raycaster = useRef(new THREE.Raycaster());
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  // Mesh refs for imperative updates
  const playerGroup = useRef<THREE.Group>(null);
  const enemyMeshRefs = useRef<(THREE.Group | null)[]>([]);
  const enemyMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const bulletMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Setup: fixed top-down camera, mouse tracking, click to shoot
  useEffect(() => {
    // Fixed camera — no pointer lock needed
    camera.position.set(0, CAM_HEIGHT, CAM_OFFSET_Z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    const canvas = gl.domElement;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePx.current = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    const onClick = () => {
      shootQueued.current = true;
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
    };
  }, [camera, gl]);

  useFrame((_, dt) => {
    // ── Update mouse world pos ────────────────────────────────────────────────
    raycaster.current.setFromCamera(
      new THREE.Vector2(mousePx.current.x, mousePx.current.y),
      camera
    );
    const hit = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(groundPlane.current, hit);
    if (hit.lengthSq() > 0) mouseWorld.current.copy(hit);

    // Player faces mouse
    const dx = mouseWorld.current.x - playerPos.current.x;
    const dz = mouseWorld.current.z - playerPos.current.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.01) {
      playerFacing.current = Math.atan2(dx, dz);
    }

    // ── Player movement — always world-space (WASD = absolute directions) ───
    const keys = getKeys();
    const mv = new THREE.Vector3();
    if (keys.forward) mv.z -= 1;
    if (keys.back)    mv.z += 1;
    if (keys.left)    mv.x -= 1;
    if (keys.right)   mv.x += 1;

    if (mv.lengthSq() > 0) {
      mv.normalize().multiplyScalar(PLAYER_SPEED * dt);
      playerPos.current.x = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, playerPos.current.x + mv.x));
      playerPos.current.z = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, playerPos.current.z + mv.z));
    }

    // Update player mesh
    if (playerGroup.current) {
      playerGroup.current.position.copy(playerPos.current);
      playerGroup.current.rotation.y = playerFacing.current + Math.PI;
    }

    // ── Camera follows player (no rotation) ──────────────────────────────────
    camera.position.x = playerPos.current.x;
    camera.position.z = playerPos.current.z + CAM_OFFSET_Z;
    camera.lookAt(playerPos.current.x, 0, playerPos.current.z);

    // ── Shoot toward mouse ────────────────────────────────────────────────────
    shootCD.current = Math.max(0, shootCD.current - dt);
    if (shootQueued.current) {
      shootQueued.current = false;
      if (shootCD.current === 0) {
        shootCD.current = SHOOT_CD;
        const dir = new THREE.Vector3(dx, 0, dz).normalize();
        if (dir.lengthSq() > 0 && bullets.current.length < BULLET_POOL) {
          const pos = playerPos.current.clone().addScaledVector(dir, 1.2);
          pos.y = 0.7;
          bullets.current.push({ id: ++bid, pos, dir: dir.clone(), life: BULLET_LIFE });
        }
      }
    }

    // ── Move bullets ──────────────────────────────────────────────────────────
    const deadBullets = new Set<number>();
    for (const b of bullets.current) {
      b.pos.addScaledVector(b.dir, BULLET_SPEED * dt);
      b.life -= dt;
      if (b.life <= 0 || Math.abs(b.pos.x) > ARENA_HALF + 2 || Math.abs(b.pos.z) > ARENA_HALF + 2) {
        deadBullets.add(b.id);
      }
    }

    // ── Bullet-enemy collision ─────────────────────────────────────────────────
    const now = performance.now();
    const hitEnemies = new Map<number, number>();

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

    if (deadBullets.size > 0) {
      bullets.current = bullets.current.filter(b => !deadBullets.has(b.id));
    }

    // ── Update enemies ─────────────────────────────────────────────────────────
    const toPlayer = new THREE.Vector3();
    let kills = 0;
    enemies.current = enemies.current.filter(e => {
      e.hp -= hitEnemies.get(e.id) ?? 0;
      if (e.hp <= 0) { kills++; return false; }

      toPlayer.subVectors(playerPos.current, e.pos).setY(0);
      if (toPlayer.lengthSq() > 0) {
        e.pos.addScaledVector(toPlayer.normalize(), e.speed * dt);
      }

      if (e.pos.distanceTo(playerPos.current) < e.size + 0.7) {
        const last = lastDmg.current[e.id] ?? 0;
        if (now - last > 800) { onHealth(-20); lastDmg.current[e.id] = now; }
      }
      return true;
    });

    if (kills > 0) onScore(kills * 10);

    // ── Wave management ────────────────────────────────────────────────────────
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

    // ── Update enemy meshes imperatively ──────────────────────────────────────
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
        if (mat) { mat.color.set(e.color); mat.emissive.set(e.color); }
      } else {
        mesh.visible = false;
      }
    }

    // ── Update bullet meshes imperatively ─────────────────────────────────────
    for (let i = 0; i < BULLET_POOL; i++) {
      const mesh = bulletMeshRefs.current[i];
      if (!mesh) continue;
      const b = bullets.current[i];
      if (b) { mesh.visible = true; mesh.position.copy(b.pos); }
      else    { mesh.visible = false; }
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <pointLight position={[0, 5, 0]} intensity={0.5} />

      <Arena size={ARENA_HALF * 2} />
      <PlayerMesh groupRef={playerGroup} />
      <EnemyPool meshRefs={enemyMeshRefs} matRefs={enemyMatRefs} />
      <BulletPool meshRefs={bulletMeshRefs} />
    </>
  );
}
