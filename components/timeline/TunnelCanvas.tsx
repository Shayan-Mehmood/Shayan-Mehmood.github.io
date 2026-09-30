"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface TunnelInput {
  progress: number;
  accent: string;
}

const RINGS = 70;
const RING_GAP = 2.2;
const RADIUS = 5.5;
const SEGMENTS = 72;
const RIBS = 18;
const LENGTH = RINGS * RING_GAP;
const TRAVEL = 70;
const STREAKS = 700;
const WHITE = new THREE.Color("#ffffff");

const tunnelVertex = /* glsl */ `
  varying float vDepth;
  varying vec3 vPos;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    vPos = position;
    gl_Position = projectionMatrix * mv;
  }
`;

const tunnelFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying float vDepth;
  varying vec3 vPos;
  void main() {
    float fade = smoothstep(60.0, 4.0, vDepth) * smoothstep(0.0, 3.0, vDepth);
    float pulse = 0.55 + 0.45 * sin(vPos.z * 0.35 + uTime * 2.2);
    gl_FragColor = vec4(uColor * (0.5 + pulse * 0.9), fade * (0.18 + pulse * 0.32));
  }
`;

function buildTunnel() {
  const verts: number[] = [];
  for (let r = 0; r < RINGS; r++) {
    const z = -r * RING_GAP;
    for (let s = 0; s < SEGMENTS; s++) {
      const a0 = (s / SEGMENTS) * Math.PI * 2;
      const a1 = ((s + 1) / SEGMENTS) * Math.PI * 2;
      verts.push(Math.cos(a0) * RADIUS, Math.sin(a0) * RADIUS, z, Math.cos(a1) * RADIUS, Math.sin(a1) * RADIUS, z);
    }
  }
  for (let k = 0; k < RIBS; k++) {
    const a = (k / RIBS) * Math.PI * 2;
    const x = Math.cos(a) * RADIUS;
    const y = Math.sin(a) * RADIUS;
    verts.push(x, y, 0, x, y, -LENGTH);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  return g;
}

function buildStreaks() {
  const pos = new Float32Array(STREAKS * 6);
  const speed = new Float32Array(STREAKS);
  for (let i = 0; i < STREAKS; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = RADIUS * (0.35 + Math.random() * 0.6);
    const z = -Math.random() * LENGTH;
    const len = 0.4 + Math.random() * 1.6;
    pos.set([Math.cos(a) * r, Math.sin(a) * r, z, Math.cos(a) * r, Math.sin(a) * r, z - len], i * 6);
    speed[i] = 0.5 + Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  return { geometry: g, speed };
}

function Tunnel({ input }: { input: React.RefObject<TunnelInput> }) {
  const group = useRef<THREE.Group>(null);
  const tunnelGeo = useMemo(buildTunnel, []);
  const streaks = useMemo(buildStreaks, []);
  const color = useMemo(() => new THREE.Color("#00e5ff"), []);
  const target = useMemo(() => new THREE.Color(), []);
  const lastProgress = useRef(0);

  const tunnelMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: tunnelVertex,
        fragmentShader: tunnelFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: color }, uTime: { value: 0 } },
      }),
    [color],
  );
  const streakMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );

  useEffect(
    () => () => {
      tunnelGeo.dispose();
      streaks.geometry.dispose();
      tunnelMat.dispose();
      streakMat.dispose();
    },
    [tunnelGeo, streaks, tunnelMat, streakMat],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const { progress, accent } = input.current;
    const t = state.clock.elapsedTime;
    const cam = state.camera;

    // Fly forward: camera z follows scroll progress, with a banking roll proportional to speed.
    const speed = (progress - lastProgress.current) / Math.max(dt, 1e-3);
    lastProgress.current = progress;
    cam.position.z = THREE.MathUtils.damp(cam.position.z, 4 - progress * TRAVEL, 8, dt);
    cam.position.x = Math.sin(t * 0.3) * 0.35;
    cam.position.y = Math.cos(t * 0.23) * 0.25;
    cam.rotation.z = THREE.MathUtils.damp(cam.rotation.z, THREE.MathUtils.clamp(speed * 0.6, -0.35, 0.35), 4, dt);

    if (group.current) group.current.rotation.z += dt * 0.03;

    target.set(accent);
    color.lerp(target, 1 - Math.exp(-dt * 3));
    tunnelMat.uniforms.uTime.value = t;
    streakMat.color.copy(color).lerp(WHITE, 0.6);

    // Streaks rush past faster when the user scrolls faster; wrap relative to the camera.
    const pos = streaks.geometry.attributes.position.array as Float32Array;
    const rush = 6 + Math.abs(speed) * 90;
    const camZ = cam.position.z;
    for (let i = 0; i < STREAKS; i++) {
      const o = i * 6;
      const dz = streaks.speed[i] * rush * dt;
      pos[o + 2] += dz;
      pos[o + 5] += dz;
      const stretch = Math.min(Math.abs(speed) * 6, 5);
      pos[o + 5] = pos[o + 2] - (0.4 + streaks.speed[i] + stretch);
      if (pos[o + 2] > camZ + 1) {
        const back = camZ - 40 - Math.random() * 20;
        pos[o + 2] = back;
        pos[o + 5] = back - 1;
      }
    }
    streaks.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <lineSegments geometry={tunnelGeo} material={tunnelMat} frustumCulled={false} />
      <lineSegments geometry={streaks.geometry} material={streakMat} frustumCulled={false} />
    </group>
  );
}

export default function TunnelCanvas({ input, running }: { input: React.RefObject<TunnelInput>; running: boolean }) {
  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4], fov: 70, near: 0.1, far: 120 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor("#010103")}
    >
      <fog attach="fog" args={["#010103", 10, 60]} />
      <Tunnel input={input} />
    </Canvas>
  );
}
