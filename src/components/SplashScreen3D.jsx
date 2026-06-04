import { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

/* ============================================================
   SPLASH 3D MEDTECH — inspiration igloo.inc
============================================================ */

/* ─── HELIX ADN — sphères animées via refs (pas de setState) ─── */
const HELIX_COUNT = 60;
const HELIX_HEIGHT = 8;
const HELIX_RADIUS = 0.85;
const HELIX_TURNS = 2.4;

function buildHelixData() {
  const a = [], b = [], r = [];
  for (let i = 0; i < HELIX_COUNT; i++) {
    const t = i / (HELIX_COUNT - 1);
    const angle = t * HELIX_TURNS * Math.PI * 2;
    const y = (t - 0.5) * HELIX_HEIGHT;
    const ax = Math.cos(angle) * HELIX_RADIUS;
    const az = Math.sin(angle) * HELIX_RADIUS;
    const bx = Math.cos(angle + Math.PI) * HELIX_RADIUS;
    const bz = Math.sin(angle + Math.PI) * HELIX_RADIUS;
    a.push([ax, y, az]);
    b.push([bx, y, bz]);
    const from = new THREE.Vector3(ax, y, az);
    const to = new THREE.Vector3(bx, y, bz);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dir = to.clone().sub(from);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    r.push({ pos: mid.toArray(), quat: [quat.x, quat.y, quat.z, quat.w], len });
  }
  return { a, b, r };
}

function DnaHelix({ startTime }) {
  const groupRef = useRef();
  const sphereARefs = useRef([]);
  const sphereBRefs = useRef([]);
  const rungRefs = useRef([]);

  const data = useMemo(() => buildHelixData(), []);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime - startTime;
    const reveal = Math.max(0, Math.min(1, elapsed * 0.6));

    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.35;
    }

    // Anime les sphères selon leur position dans la chaîne
    for (let i = 0; i < HELIX_COUNT; i++) {
      const t = i / (HELIX_COUNT - 1);
      const visible = t <= reveal ? 1 : 0;
      const target = visible;
      if (sphereARefs.current[i]) {
        const cur = sphereARefs.current[i].scale.x;
        sphereARefs.current[i].scale.setScalar(cur + (target - cur) * 0.15);
      }
      if (sphereBRefs.current[i]) {
        const cur = sphereBRefs.current[i].scale.x;
        sphereBRefs.current[i].scale.setScalar(cur + (target - cur) * 0.15);
      }
      if (rungRefs.current[i]) {
        const cur = rungRefs.current[i].scale.x;
        rungRefs.current[i].scale.setScalar(cur + (target - cur) * 0.15);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {data.a.map((p, i) => (
        <mesh key={'a' + i} position={p} ref={(el) => (sphereARefs.current[i] = el)} scale={0}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial
            color="#ea560d"
            emissive="#ea560d"
            emissiveIntensity={1.6}
            roughness={0.25}
            metalness={0.4}
          />
        </mesh>
      ))}
      {data.b.map((p, i) => (
        <mesh key={'b' + i} position={p} ref={(el) => (sphereBRefs.current[i] = el)} scale={0}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial
            color="#FF6B35"
            emissive="#FF6B35"
            emissiveIntensity={1.4}
            roughness={0.25}
            metalness={0.4}
          />
        </mesh>
      ))}
      {data.r.map((rung, i) => (
        <mesh
          key={'r' + i}
          position={rung.pos}
          quaternion={rung.quat}
          ref={(el) => (rungRefs.current[i] = el)}
          scale={0}
        >
          <cylinderGeometry args={[0.018, 0.018, rung.len, 8]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ea560d"
            emissiveIntensity={0.5}
            roughness={0.5}
            metalness={0.2}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─── PARTICULES type cellules en orbite ────────────────────── */
function Particles({ count = 220 }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const data = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        radius: 2.5 + Math.random() * 4,
        phi: Math.acos(1 - 2 * Math.random()),
        theta: Math.random() * Math.PI * 2,
        speed: 0.05 + Math.random() * 0.15,
        scale: 0.02 + Math.random() * 0.05,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    data.forEach((p, i) => {
      const angle = p.theta + t * p.speed;
      const x = Math.sin(p.phi) * Math.cos(angle) * p.radius;
      const z = Math.sin(p.phi) * Math.sin(angle) * p.radius;
      const y = Math.cos(p.phi) * p.radius + Math.sin(t + p.offset) * 0.2;
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#ea560d" toneMapped={false} />
    </instancedMesh>
  );
}

/* ─── CAMERA cinématique ───────────────────────────────────── */
function CinematicCamera() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const angle = t * 0.12;
    const radius = Math.max(3.6, 5 - t * 0.15);
    state.camera.position.x = Math.sin(angle) * radius;
    state.camera.position.z = Math.cos(angle) * radius;
    state.camera.position.y = Math.sin(t * 0.18) * 0.8;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

/* ─── SCENE 3D ─────────────────────────────────────────────── */
function Scene3D() {
  const startTimeRef = useRef(0);
  useFrame((state) => {
    if (startTimeRef.current === 0) {
      startTimeRef.current = state.clock.elapsedTime;
    }
  });

  return (
    <>
      <CinematicCamera />
      <fog attach="fog" args={['#0F172A', 6, 14]} />

      <ambientLight intensity={0.18} />
      <directionalLight position={[5, 6, 4]} intensity={0.9} color="#ea560d" />
      <pointLight position={[-4, -2, 3]} intensity={1.2} color="#FF6B35" distance={12} />
      <pointLight position={[3, 4, -3]} intensity={0.8} color="#ffffff" distance={10} />
      <hemisphereLight args={['#ea560d', '#0F172A', 0.4]} />

      <DnaHelix startTime={startTimeRef.current} />
      <Particles count={220} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.5, 0]}>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial
          color="#0F172A"
          metalness={0.85}
          roughness={0.4}
          transparent
          opacity={0.3}
        />
      </mesh>
    </>
  );
}

/* ─── COMPOSANT PRINCIPAL ───────────────────────────────────── */
export default function SplashScreen3D({ onDone }) {
  const [show, setShow] = useState(true);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setReveal(true), 2300);
    const tEnd = setTimeout(() => setShow(false), 4500);
    return () => { clearTimeout(t1); clearTimeout(tEnd); };
  }, []);

  return (
    <AnimatePresence onExitComplete={() => onDone && onDone()}>
      {show && (
        <motion.div
          key="splash3d"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setShow(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: '#0F172A',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          <Canvas
            camera={{ position: [0, 0, 5], fov: 55 }}
            gl={{
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.1,
            }}
            dpr={[1, 2]}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Suspense fallback={null}>
              <Scene3D />
              <EffectComposer>
                <Bloom
                  intensity={1.2}
                  luminanceThreshold={0.2}
                  luminanceSmoothing={0.85}
                  mipmapBlur
                />
                <ChromaticAberration offset={[0.0008, 0.0008]} />
                <Vignette eskil={false} offset={0.2} darkness={0.85} />
              </EffectComposer>
            </Suspense>
          </Canvas>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: reveal ? 1 : 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute', bottom: '14%', left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              fontFamily: "'Inter', system-ui, sans-serif",
              pointerEvents: 'none',
            }}
          >
            <img
              src="/unicancer-logo.svg"
              alt="Unicancer"
              style={{
                height: 36,
                filter: 'brightness(0) invert(1) drop-shadow(0 0 16px rgba(234,86,13,.6))',
                marginBottom: 18,
              }}
            />
            <div style={{
              fontSize: 64, fontWeight: 800, letterSpacing: '.04em',
              background: 'linear-gradient(180deg, #ffffff 30%, #ea560d 130%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1, marginBottom: 8,
            }}>
              PRISM
            </div>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '.32em',
              color: 'rgba(255,255,255,.55)', textTransform: 'uppercase',
            }}>
              Plateforme · MedTech · Recherche
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            style={{
              position: 'absolute', bottom: 24, right: 28,
              fontSize: 10, letterSpacing: '.3em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,.5)', fontFamily: "'Inter', system-ui, sans-serif",
              pointerEvents: 'none',
            }}
          >
            Cliquer pour passer
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
