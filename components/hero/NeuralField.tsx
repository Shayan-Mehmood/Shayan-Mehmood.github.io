"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

const COLS = 128;
const ROWS = 64;
const COUNT = COLS * ROWS;
const WIDTH = 30;
const HEIGHT = 15;

const REPULSE_RADIUS = 2.4;
const REPULSE_FORCE = 38;
const SPRING = 9;
const DAMPING = 4.2;

const pointVertex = /* glsl */ `
  attribute float aEnergy;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  varying float vEnergy;
  varying float vDepth;
  varying float vSeed;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.7 + 0.3 * sin(uTime * 1.7 + aSeed * 43.0);
    gl_PointSize = uSize * uPixelRatio * (1.0 + aEnergy * 2.4) * twinkle * (10.0 / -mv.z);
    vEnergy = aEnergy;
    vDepth = -mv.z;
    vSeed = aSeed;
  }
`;

const pointFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorHot;
  varying float vEnergy;
  varying float vDepth;
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = pow(smoothstep(0.5, 0.0, d), 1.7);
    vec3 base = mix(uColorA, uColorB, smoothstep(0.2, 0.95, vSeed));
    float e = clamp(vEnergy, 0.0, 1.0);
    vec3 col = mix(base, uColorHot, e) * (0.55 + e * 3.2);
    float fade = smoothstep(26.0, 5.0, vDepth);
    gl_FragColor = vec4(col, core * fade * (0.5 + e * 0.8));
  }
`;

const lineVertex = /* glsl */ `
  attribute float aEnergy;
  varying float vEnergy;
  varying float vDepth;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vEnergy = aEnergy;
    vDepth = -mv.z;
  }
`;

const lineFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColorHot;
  varying float vEnergy;
  varying float vDepth;
  void main() {
    float e = clamp(vEnergy, 0.0, 1.0);
    float fade = smoothstep(24.0, 6.0, vDepth);
    vec3 col = mix(uColor, uColorHot, e) * (0.6 + e * 2.6);
    gl_FragColor = vec4(col, (0.07 + e * 0.55) * fade);
  }
`;

interface PointerState {
  ndc: THREE.Vector2;
  active: boolean;
  shock: { x: number; y: number; t: number } | null;
}

function buildField() {
  const rest = new Float32Array(COUNT * 2);
  const seeds = new Float32Array(COUNT);
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const k = j * COLS + i;
      const jx = (Math.random() - 0.5) * 0.14;
      const jy = (Math.random() - 0.5) * 0.14;
      rest[k * 2] = (i / (COLS - 1) - 0.5) * WIDTH + jx;
      rest[k * 2 + 1] = (j / (ROWS - 1) - 0.5) * HEIGHT + jy;
      seeds[k] = Math.random();
    }
  }

  // Sparse synapse topology: right, down and occasional diagonal neighbours.
  const links: number[] = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const k = j * COLS + i;
      if (i < COLS - 1 && Math.random() < 0.42) links.push(k, k + 1);
      if (j < ROWS - 1 && Math.random() < 0.32) links.push(k, k + COLS);
      if (i < COLS - 1 && j < ROWS - 1 && Math.random() < 0.08) links.push(k, k + COLS + 1);
    }
  }
  return { rest, seeds, links: new Uint32Array(links) };
}

function Field({ pointer }: { pointer: React.RefObject<PointerState> }) {
  const group = useRef<THREE.Group>(null);
  const { camera, gl, clock } = useThree();

  const field = useMemo(buildField, []);
  const sim = useMemo(
    () => ({
      offset: new Float32Array(COUNT * 3),
      velocity: new Float32Array(COUNT * 3),
      energy: new Float32Array(COUNT),
    }),
    [],
  );

  const pointsGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aEnergy", new THREE.BufferAttribute(new Float32Array(COUNT), 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSeed", new THREE.BufferAttribute(field.seeds, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
    return g;
  }, [field]);

  const linesGeo = useMemo(() => {
    const n = field.links.length;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aEnergy", new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
    return g;
  }, [field]);

  const pointsMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: pointVertex,
        fragmentShader: pointFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
          uSize: { value: 4.2 },
          uColorA: { value: new THREE.Color("#00b8ff") },
          uColorB: { value: new THREE.Color("#7c3aed") },
          uColorHot: { value: new THREE.Color("#ff4dff") },
        },
      }),
    [gl],
  );

  const linesMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: lineVertex,
        fragmentShader: lineFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color("#1d6fff") },
          uColorHot: { value: new THREE.Color("#00f0ff") },
        },
      }),
    [],
  );

  useEffect(
    () => () => {
      pointsGeo.dispose();
      linesGeo.dispose();
      pointsMat.dispose();
      linesMat.dispose();
    },
    [pointsGeo, linesGeo, pointsMat, linesMat],
  );

  const tmp = useMemo(
    () => ({
      raycaster: new THREE.Raycaster(),
      plane: new THREE.Plane(),
      normal: new THREE.Vector3(),
      hit: new THREE.Vector3(),
      local: new THREE.Vector3(),
      mouse: new THREE.Vector2(9999, 9999),
      smoothPointer: new THREE.Vector2(),
    }),
    [],
  );

  useFrame((state, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(rawDelta, 1 / 30);
    const t = state.clock.elapsedTime;
    const p = pointer.current;

    // ── Cinematic camera: slow orbit + pointer parallax + scroll dolly ──
    const scroll = Math.min(window.scrollY / window.innerHeight, 1.2);
    tmp.smoothPointer.lerp(p.ndc, 1 - Math.pow(0.001, dt));
    camera.position.x = Math.sin(t * 0.07) * 0.8 + tmp.smoothPointer.x * 0.9;
    camera.position.y = Math.cos(t * 0.05) * 0.4 + tmp.smoothPointer.y * 0.5 - scroll * 1.6;
    camera.position.z = 10 - scroll * 4.5;
    camera.lookAt(0, -scroll * 0.8, 0);
    g.rotation.x = -0.52 + scroll * 0.25;
    g.rotation.z = Math.sin(t * 0.04) * 0.04;

    // ── Raycast pointer onto the (tilted) field plane, then into field-local space ──
    let mx = 9999;
    let my = 9999;
    if (p.active) {
      g.updateMatrixWorld();
      tmp.normal.set(0, 0, 1).applyQuaternion(g.quaternion);
      tmp.plane.setFromNormalAndCoplanarPoint(tmp.normal, g.position);
      tmp.raycaster.setFromCamera(p.ndc, camera);
      if (tmp.raycaster.ray.intersectPlane(tmp.plane, tmp.hit)) {
        tmp.local.copy(tmp.hit);
        g.worldToLocal(tmp.local);
        mx = tmp.local.x;
        my = tmp.local.y;
      }
    }
    tmp.mouse.set(mx, my);

    // Click shockwave: an expanding ring that kicks particles outward as it passes.
    let shockR = -1;
    let sx = 0;
    let sy = 0;
    if (p.shock) {
      const age = t - p.shock.t;
      if (age < 1.6) {
        shockR = age * 11;
        sx = p.shock.x;
        sy = p.shock.y;
      } else p.shock = null;
    }

    // ── Physics integration (semi-implicit Euler, per-particle spring back to the flowing rest pose) ──
    const pos = pointsGeo.attributes.position.array as Float32Array;
    const energyAttr = pointsGeo.attributes.aEnergy.array as Float32Array;
    const { rest } = field;
    const { offset, velocity, energy } = sim;
    const R2 = REPULSE_RADIUS * REPULSE_RADIUS;

    for (let k = 0; k < COUNT; k++) {
      const rx = rest[k * 2];
      const ry = rest[k * 2 + 1];
      const rz =
        Math.sin(rx * 0.32 + t * 0.55) * 0.55 +
        Math.cos(ry * 0.48 + t * 0.38) * 0.45 +
        Math.sin((rx + ry) * 0.18 - t * 0.3) * 0.5;

      const o = k * 3;
      const px = rx + offset[o];
      const py = ry + offset[o + 1];

      let fx = -offset[o] * SPRING - velocity[o] * DAMPING;
      let fy = -offset[o + 1] * SPRING - velocity[o + 1] * DAMPING;
      let fz = -offset[o + 2] * SPRING - velocity[o + 2] * DAMPING;

      const dx = px - mx;
      const dy = py - my;
      const d2 = dx * dx + dy * dy;
      if (d2 < R2) {
        const d = Math.sqrt(d2) + 1e-4;
        const falloff = 1 - d / REPULSE_RADIUS;
        const f = falloff * falloff * REPULSE_FORCE;
        fx += (dx / d) * f;
        fy += (dy / d) * f;
        fz += f * 0.55;
      }

      if (shockR > 0) {
        const sdx = px - sx;
        const sdy = py - sy;
        const sd = Math.sqrt(sdx * sdx + sdy * sdy) + 1e-4;
        const band = 1 - Math.min(Math.abs(sd - shockR) / 0.9, 1);
        if (band > 0) {
          const f = band * 60 * (1 - shockR / 18);
          fx += (sdx / sd) * f;
          fy += (sdy / sd) * f;
          fz += f * 0.4;
        }
      }

      velocity[o] += fx * dt;
      velocity[o + 1] += fy * dt;
      velocity[o + 2] += fz * dt;
      offset[o] += velocity[o] * dt;
      offset[o + 1] += velocity[o + 1] * dt;
      offset[o + 2] += velocity[o + 2] * dt;

      pos[o] = rx + offset[o];
      pos[o + 1] = ry + offset[o + 1];
      pos[o + 2] = rz + offset[o + 2];

      const disp = Math.sqrt(offset[o] * offset[o] + offset[o + 1] * offset[o + 1] + offset[o + 2] * offset[o + 2]);
      const crest = Math.max(0, rz - 0.9) * 0.35;
      energy[k] = Math.min(disp * 0.9 + crest, 1.2);
      energyAttr[k] = energy[k];
    }
    pointsGeo.attributes.position.needsUpdate = true;
    pointsGeo.attributes.aEnergy.needsUpdate = true;

    const lpos = linesGeo.attributes.position.array as Float32Array;
    const lEnergy = linesGeo.attributes.aEnergy.array as Float32Array;
    const links = field.links;
    for (let n = 0; n < links.length; n++) {
      const k = links[n];
      lpos[n * 3] = pos[k * 3];
      lpos[n * 3 + 1] = pos[k * 3 + 1];
      lpos[n * 3 + 2] = pos[k * 3 + 2];
      lEnergy[n] = energy[k];
    }
    linesGeo.attributes.position.needsUpdate = true;
    linesGeo.attributes.aEnergy.needsUpdate = true;

    pointsMat.uniforms.uTime.value = t;
  });

  // Convert window clicks into field-local shockwave origins.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const g = group.current;
      if (!g || window.scrollY > window.innerHeight) return;
      const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion);
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, g.position);
      const rc = new THREE.Raycaster();
      rc.setFromCamera(ndc, camera);
      const hit = new THREE.Vector3();
      if (rc.ray.intersectPlane(plane, hit)) {
        g.worldToLocal(hit);
        pointer.current.shock = { x: hit.x, y: hit.y, t: clock.elapsedTime };
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [camera, clock, pointer]);

  return (
    <group ref={group}>
      <lineSegments geometry={linesGeo} material={linesMat} frustumCulled={false} />
      <points geometry={pointsGeo} material={pointsMat} frustumCulled={false} />
    </group>
  );
}

export default function NeuralField({ active }: { active: boolean }) {
  const pointer = useRef<PointerState>({ ndc: new THREE.Vector2(), active: false, shock: null });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      pointer.current.active = true;
    };
    const onLeave = () => (pointer.current.active = false);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 10], fov: 45, near: 0.1, far: 80 }}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => gl.setClearColor("#010103")}
    >
      <fog attach="fog" args={["#010103", 8, 26]} />
      <Field pointer={pointer} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.35} luminanceThreshold={0.18} luminanceSmoothing={0.3} radius={0.72} />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0009, 0.0006)}
          radialModulation
          modulationOffset={0.35}
        />
        <Vignette eskil={false} offset={0.22} darkness={0.92} />
      </EffectComposer>
    </Canvas>
  );
}
