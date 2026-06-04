import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { motion } from 'framer-motion';
import * as THREE from 'three';

/* ================================================================
   <MedTechHero theme="..."> — bandeau hero 3D thématique
   themes :
     - 'helix'     → double hélice ADN (Marchés)
     - 'molecules' → grappes moléculaires (Formations)
     - 'network'   → nœuds connectés (Contacts)
     - 'orbits'    → anneaux orbitaux (Calendrier)
     - 'pulse'     → ondes pulsantes (Reporting)
     - 'cells'     → cellules organiques (Matwin)
================================================================ */

/* ─── HELIX (ADN) ─── */
const HELIX_COUNT = 48;
function buildHelix() {
  const a = [], b = [], r = [];
  for (let i = 0; i < HELIX_COUNT; i++) {
    const t = i / (HELIX_COUNT - 1);
    const angle = t * 2.2 * Math.PI * 2;
    const y = (t - 0.5) * 7;
    const RADIUS = 0.85;
    const ax = Math.cos(angle) * RADIUS, az = Math.sin(angle) * RADIUS;
    const bx = Math.cos(angle + Math.PI) * RADIUS, bz = Math.sin(angle + Math.PI) * RADIUS;
    a.push([ax, y, az]); b.push([bx, y, bz]);
    const from = new THREE.Vector3(ax, y, az), to = new THREE.Vector3(bx, y, bz);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dir = to.clone().sub(from);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    r.push({ pos: mid.toArray(), quat: [quat.x, quat.y, quat.z, quat.w], len });
  }
  return { a, b, r };
}
function HelixScene() {
  const groupRef = useRef();
  const data = useMemo(buildHelix, []);
  useFrame((s) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = s.clock.elapsedTime * 0.25;
      groupRef.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.2) * 0.08;
    }
  });
  return (
    <group ref={groupRef} position={[2.8, 0, 0]} rotation={[0, 0, 0.18]}>
      {data.a.map((p, i) => (
        <mesh key={'a' + i} position={p}>
          <sphereGeometry args={[0.085, 14, 14]} />
          <meshStandardMaterial color="#ea560d" emissive="#ea560d" emissiveIntensity={1.4} roughness={0.25} metalness={0.45} />
        </mesh>
      ))}
      {data.b.map((p, i) => (
        <mesh key={'b' + i} position={p}>
          <sphereGeometry args={[0.085, 14, 14]} />
          <meshStandardMaterial color="#FF6B35" emissive="#FF6B35" emissiveIntensity={1.2} roughness={0.25} metalness={0.45} />
        </mesh>
      ))}
      {data.r.map((rung, i) => (
        <mesh key={'r' + i} position={rung.pos} quaternion={rung.quat}>
          <cylinderGeometry args={[0.016, 0.016, rung.len, 6]} />
          <meshStandardMaterial color="#ffffff" emissive="#ea560d" emissiveIntensity={0.4} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── MOLECULES (grappes) ─── */
function MoleculesScene() {
  const groupRef = useRef();
  const molecules = useMemo(() => {
    const arr = [];
    for (let m = 0; m < 4; m++) {
      const center = [
        2.5 + (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 2,
      ];
      const atoms = [];
      const bonds = [];
      const atomCount = 5 + Math.floor(Math.random() * 4);
      for (let a = 0; a < atomCount; a++) {
        const r = 0.4 + Math.random() * 0.4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(1 - 2 * Math.random());
        atoms.push([
          Math.sin(phi) * Math.cos(theta) * r,
          Math.cos(phi) * r,
          Math.sin(phi) * Math.sin(theta) * r,
        ]);
      }
      for (let i = 0; i < atoms.length - 1; i++) {
        const from = new THREE.Vector3(...atoms[i]);
        const to = new THREE.Vector3(...atoms[i + 1]);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        const dir = to.clone().sub(from);
        const len = dir.length();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        bonds.push({ pos: mid.toArray(), quat: [quat.x, quat.y, quat.z, quat.w], len });
      }
      arr.push({ center, atoms, bonds, speed: 0.3 + Math.random() * 0.3 });
    }
    return arr;
  }, []);
  useFrame((s) => {
    if (groupRef.current) groupRef.current.rotation.y = s.clock.elapsedTime * 0.12;
  });
  return (
    <group ref={groupRef}>
      {molecules.map((mol, mi) => (
        <group key={mi} position={mol.center} rotation-y={mol.speed}>
          {mol.atoms.map((p, i) => (
            <mesh key={'a' + i} position={p}>
              <sphereGeometry args={[0.13, 16, 16]} />
              <meshStandardMaterial color={i % 2 ? '#ea560d' : '#FF6B35'} emissive={i % 2 ? '#ea560d' : '#FF6B35'} emissiveIntensity={1.2} roughness={0.3} metalness={0.5} />
            </mesh>
          ))}
          {mol.bonds.map((b, i) => (
            <mesh key={'b' + i} position={b.pos} quaternion={b.quat}>
              <cylinderGeometry args={[0.025, 0.025, b.len, 6]} />
              <meshStandardMaterial color="#ffffff" emissive="#ea560d" emissiveIntensity={0.3} transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ─── NETWORK (nœuds connectés) ─── */
function NetworkScene() {
  const groupRef = useRef();
  const { nodes, edges } = useMemo(() => {
    const n = [];
    const NODE_COUNT = 22;
    for (let i = 0; i < NODE_COUNT; i++) {
      n.push([
        2.5 + (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 3,
      ]);
    }
    const e = [];
    n.forEach((a, i) => {
      const va = new THREE.Vector3(...a);
      n.forEach((b, j) => {
        if (j <= i) return;
        const vb = new THREE.Vector3(...b);
        const d = va.distanceTo(vb);
        if (d < 1.8) {
          const mid = va.clone().add(vb).multiplyScalar(0.5);
          const dir = vb.clone().sub(va);
          const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
          e.push({ pos: mid.toArray(), quat: [quat.x, quat.y, quat.z, quat.w], len: d });
        }
      });
    });
    return { nodes: n, edges: e };
  }, []);
  useFrame((s) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = s.clock.elapsedTime * 0.15;
      groupRef.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.2) * 0.15;
    }
  });
  return (
    <group ref={groupRef}>
      {nodes.map((p, i) => (
        <mesh key={'n' + i} position={p}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color={i % 3 === 0 ? '#ea560d' : '#FF6B35'} emissive={i % 3 === 0 ? '#ea560d' : '#FF6B35'} emissiveIntensity={1.4} />
        </mesh>
      ))}
      {edges.map((e, i) => (
        <mesh key={'e' + i} position={e.pos} quaternion={e.quat}>
          <cylinderGeometry args={[0.008, 0.008, e.len, 4]} />
          <meshBasicMaterial color="#ea560d" transparent opacity={0.45} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── ORBITS (anneaux concentriques) ─── */
function OrbitsScene() {
  const groupRef = useRef();
  const rings = useMemo(() => [
    { radius: 1.4, dots: 8, speed: 0.6, tilt: 0.0 },
    { radius: 2.0, dots: 12, speed: -0.4, tilt: 0.3 },
    { radius: 2.7, dots: 16, speed: 0.3, tilt: -0.2 },
    { radius: 3.4, dots: 20, speed: -0.2, tilt: 0.45 },
  ], []);
  useFrame((s) => {
    if (groupRef.current) groupRef.current.rotation.y = s.clock.elapsedTime * 0.1;
  });
  return (
    <group ref={groupRef} position={[2.8, 0, 0]}>
      {rings.map((ring, ri) => (
        <group key={ri} rotation={[ring.tilt, 0, 0]}>
          {/* Cercle anneau */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[ring.radius, 0.008, 8, 64]} />
            <meshBasicMaterial color="#ea560d" transparent opacity={0.3} toneMapped={false} />
          </mesh>
          {/* Dots qui parcourent l'anneau */}
          {Array.from({ length: ring.dots }).map((_, i) => (
            <DotOnOrbit key={i} radius={ring.radius} speed={ring.speed} phase={(i / ring.dots) * Math.PI * 2} ri={ri} />
          ))}
        </group>
      ))}
    </group>
  );
}
function DotOnOrbit({ radius, speed, phase, ri }) {
  const ref = useRef();
  useFrame((s) => {
    if (!ref.current) return;
    const a = phase + s.clock.elapsedTime * speed;
    ref.current.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshStandardMaterial color={ri % 2 ? '#ea560d' : '#FF6B35'} emissive={ri % 2 ? '#ea560d' : '#FF6B35'} emissiveIntensity={1.6} />
    </mesh>
  );
}

/* ─── PULSE (ondes pulsantes) ─── */
function PulseScene() {
  const groupRef = useRef();
  const meshRefs = useRef([]);
  const data = useMemo(() => Array.from({ length: 5 }).map((_, i) => ({ delay: i * 0.4 })), []);
  useFrame((s) => {
    if (groupRef.current) groupRef.current.rotation.y = s.clock.elapsedTime * 0.08;
    data.forEach((d, i) => {
      const m = meshRefs.current[i];
      if (!m) return;
      const t = (s.clock.elapsedTime + d.delay) % 3;
      const scale = 0.5 + t * 1.2;
      m.scale.setScalar(scale);
      m.material.opacity = Math.max(0, 0.6 - t * 0.2);
    });
  });
  return (
    <group ref={groupRef} position={[2.8, 0, 0]}>
      {/* Cœur central */}
      <mesh>
        <icosahedronGeometry args={[0.45, 1]} />
        <meshStandardMaterial color="#ea560d" emissive="#ea560d" emissiveIntensity={2.2} roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Ondes en expansion */}
      {data.map((d, i) => (
        <mesh key={i} ref={(el) => (meshRefs.current[i] = el)}>
          <ringGeometry args={[1, 1.04, 64]} />
          <meshBasicMaterial color="#ea560d" transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── CELLS (cellules pulsantes) ─── */
function CellsScene() {
  const groupRef = useRef();
  const cells = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 8; i++) {
      arr.push({
        pos: [
          2.5 + (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 2.5,
        ],
        size: 0.25 + Math.random() * 0.4,
        speed: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);
  const meshRefs = useRef([]);
  useFrame((s) => {
    if (groupRef.current) groupRef.current.rotation.y = s.clock.elapsedTime * 0.1;
    cells.forEach((c, i) => {
      const m = meshRefs.current[i];
      if (!m) return;
      const pulse = 1 + Math.sin(s.clock.elapsedTime * c.speed + c.phase) * 0.1;
      m.scale.setScalar(pulse);
    });
  });
  return (
    <group ref={groupRef}>
      {cells.map((c, i) => (
        <mesh key={i} position={c.pos} ref={(el) => (meshRefs.current[i] = el)}>
          <icosahedronGeometry args={[c.size, 1]} />
          <meshStandardMaterial
            color={i % 2 ? '#ea560d' : '#FF6B35'}
            emissive={i % 2 ? '#ea560d' : '#FF6B35'}
            emissiveIntensity={0.9}
            roughness={0.4}
            metalness={0.3}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─── PARTICULES communes ─── */
function Particles({ count = 120 }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        radius: 2.2 + Math.random() * 4,
        phi: Math.acos(1 - 2 * Math.random()),
        theta: Math.random() * Math.PI * 2,
        speed: 0.04 + Math.random() * 0.1,
        scale: 0.018 + Math.random() * 0.04,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [count]);
  useFrame((s) => {
    if (!meshRef.current) return;
    const t = s.clock.elapsedTime;
    data.forEach((p, i) => {
      const angle = p.theta + t * p.speed;
      const x = Math.sin(p.phi) * Math.cos(angle) * p.radius;
      const z = Math.sin(p.phi) * Math.sin(angle) * p.radius;
      const y = Math.cos(p.phi) * p.radius + Math.sin(t + p.offset) * 0.18;
      dummy.position.set(x + 2.8, y, z);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#ea560d" toneMapped={false} />
    </instancedMesh>
  );
}

function Camera() {
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    s.camera.position.x = Math.sin(t * 0.08) * 0.4;
    s.camera.position.y = Math.sin(t * 0.12) * 0.25;
    s.camera.position.z = 5;
    s.camera.lookAt(2.8, 0, 0);
  });
  return null;
}

const SCENES = {
  helix:     HelixScene,
  molecules: MoleculesScene,
  network:   NetworkScene,
  orbits:    OrbitsScene,
  pulse:     PulseScene,
  cells:     CellsScene,
};

export default function MedTechHero({
  theme = 'helix',
  kpis = [],
  title = 'Marchés publics',
  eyebrow = 'Unicancer · Achats',
  subtitle,
  height = 520,
}) {
  const Scene = SCENES[theme] || HelixScene;

  return (
    <div
      style={{
        position: 'relative',
        height,
        marginBottom: 28,
        borderRadius: 20,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 70%)',
        boxShadow: '0 24px 60px rgba(15,23,42,.18)',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 55 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        dpr={[1, 1.5]}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <Camera />
          <fog attach="fog" args={['#0F172A', 4, 12]} />
          <ambientLight intensity={0.25} />
          <directionalLight position={[5, 5, 4]} intensity={0.8} color="#ea560d" />
          <pointLight position={[-3, 2, 2]} intensity={1.0} color="#FF6B35" distance={12} />
          <pointLight position={[2, 4, -3]} intensity={0.6} color="#ffffff" distance={10} />
          <hemisphereLight args={['#ea560d', '#0F172A', 0.3]} />

          <Scene />
          <Particles count={120} />

          <EffectComposer>
            <Bloom intensity={1.0} luminanceThreshold={0.2} luminanceSmoothing={0.85} mipmapBlur />
            <Vignette eskil={false} offset={0.25} darkness={0.65} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 70% 60% at 30% 50%, #000 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 30% 50%, #000 30%, transparent 80%)',
        pointerEvents: 'none',
      }} />

      <div
        style={{
          position: 'absolute', inset: 0,
          padding: '44px 48px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          fontFamily: "'Inter', system-ui, sans-serif",
          color: '#fff',
          pointerEvents: 'none',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{
            display: 'inline-block',
            padding: '4px 12px', borderRadius: 999,
            background: 'rgba(234,86,13,.15)',
            border: '1px solid rgba(234,86,13,.4)',
            color: '#FFB89A',
            fontSize: 10, fontWeight: 700, letterSpacing: '.2em',
            textTransform: 'uppercase',
            backdropFilter: 'blur(6px)',
            marginBottom: 16,
          }}>
            {eyebrow}
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(40px, 5vw, 64px)',
            fontWeight: 800,
            letterSpacing: '-.025em',
            lineHeight: 1,
            background: 'linear-gradient(110deg, #ffffff 0%, #FFB89A 60%, #ea560d 100%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 14,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: 15, color: 'rgba(255,255,255,.7)',
              maxWidth: 560, margin: 0, lineHeight: 1.55,
            }}>
              {subtitle}
            </p>
          )}
        </motion.div>

        {kpis.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
            }}
            style={{ display: 'flex', gap: 14, flexWrap: 'wrap', pointerEvents: 'auto' }}
          >
            {kpis.map((k, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
                }}
                style={{
                  flex: '1 1 160px', minWidth: 160, maxWidth: 240,
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: 'rgba(15,23,42,.45)',
                  backdropFilter: 'blur(18px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                  border: '1px solid rgba(255,255,255,.1)',
                  boxShadow: '0 8px 28px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.08)',
                }}
              >
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '.18em',
                  color: 'rgba(255,255,255,.55)', textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  {k.label}
                </div>
                <div style={{
                  fontSize: 30, fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  background: 'linear-gradient(180deg, #ffffff 30%, #ea560d 130%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  lineHeight: 1, marginBottom: 4,
                }}>
                  {k.value}
                </div>
                {k.sub && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{k.sub}</div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
