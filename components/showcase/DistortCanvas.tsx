"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gsap } from "@/lib/gsap";
import type { Project } from "@/content/data";
import { createCoverTexture, COVER_ASPECT } from "./coverTexture";

const vertex = /* glsl */ `
  uniform float uHover;
  uniform float uVelocity;
  uniform vec2 uMouse;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    // Physical bulge toward the camera under the cursor + a scroll-velocity bend.
    float d = distance(uv, uMouse);
    p.z += smoothstep(0.5, 0.0, d) * 0.18 * uHover;
    p.z += sin(uv.x * 3.14159) * uVelocity * 0.25;
    p.y += sin(uv.x * 3.14159) * uVelocity * 0.06;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTexA;
  uniform sampler2D uTexB;
  uniform float uMix;
  uniform float uHover;
  uniform float uTime;
  uniform float uVelocity;
  uniform vec2 uMouse;
  uniform float uPlaneAspect;
  uniform float uImageAspect;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  // object-fit: cover
  vec2 coverUv(vec2 uv) {
    vec2 s = uPlaneAspect > uImageAspect ? vec2(1.0, uImageAspect / uPlaneAspect) : vec2(uPlaneAspect / uImageAspect, 1.0);
    return (uv - 0.5) * s + 0.5;
  }

  vec3 chroma(sampler2D t, vec2 uv, vec2 dir) {
    return vec3(texture2D(t, uv + dir).r, texture2D(t, uv).g, texture2D(t, uv - dir).b);
  }

  // Luminance-gated smear: pulls the brightest texel within a vertical window — a real-time pixel-sort look.
  vec3 pixelSort(sampler2D t, vec2 uv, float amount) {
    vec3 best = texture2D(t, uv).rgb;
    float bestL = luma(best);
    for (int i = 1; i <= 10; i++) {
      vec2 o = uv + vec2(0.0, float(i) * amount / 10.0);
      vec3 c = texture2D(t, o).rgb;
      float l = luma(c);
      if (l > bestL && l > 0.35) { best = c; bestL = l; }
    }
    return best;
  }

  void main() {
    vec2 uv = vUv;
    vec2 d = uv - uMouse;
    d.x *= uPlaneAspect;
    float dist = length(d);

    // Liquid ripple radiating from the cursor.
    float ripple = sin(dist * 42.0 - uTime * 5.5) * exp(-dist * 6.0) * uHover;
    uv += (d / max(dist, 1e-4)) * ripple * 0.011 / vec2(uPlaneAspect, 1.0);

    // Scroll-velocity shear.
    uv.x += sin(uv.y * 9.0 + uTime * 1.5) * uVelocity * 0.018;

    // Transition: noise-driven directional wipe between covers.
    float n = noise(vUv * vec2(6.0, 4.0) + uTime * 0.1);
    float wipe = smoothstep(0.0, 1.0, (uMix * 2.0) - (vUv.x * 0.45 + n * 0.35) + 0.05);
    wipe = clamp(wipe, 0.0, 1.0);
    vec2 uvA = coverUv(uv + vec2(wipe * 0.18 * n, 0.0));
    vec2 uvB = coverUv(uv - vec2((1.0 - wipe) * 0.18 * n, 0.0));

    // Pixel-sort streaks in a column band around the cursor, per-column randomized.
    float col = floor(vUv.x * 180.0);
    float band = smoothstep(0.28, 0.0, abs(vUv.x - uMouse.x) * uPlaneAspect);
    float streak = band * uHover * hash(vec2(col, floor(uTime * 3.0))) * 0.22;

    vec2 split = (d / max(dist, 1e-4)) * (0.0025 * uHover + min(abs(uVelocity), 1.0) * 0.004);
    vec3 a = streak > 0.01 ? pixelSort(uTexA, uvA, streak) : chroma(uTexA, uvA, split);
    vec3 b = streak > 0.01 ? pixelSort(uTexB, uvB, streak) : chroma(uTexB, uvB, split);
    vec3 color = mix(a, b, wipe);

    // Glowing seam on the transition front.
    float seam = (1.0 - abs(wipe - 0.5) * 2.0) * step(0.001, uMix) * step(uMix, 0.999);
    color += vec3(0.0, 0.9, 1.0) * pow(seam, 6.0) * 0.8;

    // Scanlines + vignette keep it filmic.
    color *= 0.94 + 0.06 * sin(vUv.y * 900.0);
    float vig = smoothstep(1.1, 0.35, length(vUv - 0.5));
    color *= mix(0.55, 1.0, vig);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface DistortInput {
  velocity: number;
}

function Plane({ projects, active, input }: { projects: Project[]; active: number; input: React.RefObject<DistortInput> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const { viewport, size, gl } = useThree();
  const shown = useRef(active);

  const textures = useMemo(() => projects.map(createCoverTexture), [projects]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uTexA: { value: textures[active] },
          uTexB: { value: textures[active] },
          uMix: { value: 0 },
          uHover: { value: 0 },
          uTime: { value: 0 },
          uVelocity: { value: 0 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uPlaneAspect: { value: 1 },
          uImageAspect: { value: COVER_ASPECT },
        },
      }),
    [textures],
  );

  useEffect(() => {
    // Fonts may resolve after first paint; redraw covers once they are ready so the canvas text is correct.
    document.fonts?.ready.then(() => {
      projects.forEach((p, i) => {
        const fresh = createCoverTexture(p);
        textures[i].image = fresh.image;
        textures[i].needsUpdate = true;
        fresh.dispose();
      });
    });
    return () => {
      textures.forEach((t) => t.dispose());
      material.dispose();
    };
  }, [projects, textures, material]);

  // Cross-fade to the newly active cover with the noise wipe.
  useEffect(() => {
    if (shown.current === active) return;
    const u = material.uniforms;
    gsap.killTweensOf(u.uMix);
    u.uTexA.value = textures[shown.current];
    u.uTexB.value = textures[active];
    u.uMix.value = 0;
    shown.current = active;
    gsap.to(u.uMix, {
      value: 1,
      duration: 1.3,
      ease: "power3.inOut",
      onComplete: () => {
        u.uTexA.value = textures[active];
        u.uMix.value = 0;
      },
    });
  }, [active, material, textures]);

  // Pointer → uv + hover intensity.
  useEffect(() => {
    const el = gl.domElement.parentElement!;
    const u = material.uniforms;
    const target = new THREE.Vector2(0.5, 0.5);
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
      gsap.to(u.uMouse.value, { x: target.x, y: target.y, duration: 0.6, ease: "power3.out", overwrite: true });
    };
    const onEnter = () => gsap.to(u.uHover, { value: 1, duration: 0.9, ease: "power3.out", overwrite: true });
    const onLeave = () => gsap.to(u.uHover, { value: 0, duration: 1.1, ease: "power3.out", overwrite: true });
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [gl, material]);

  useFrame((state, dt) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    const target = THREE.MathUtils.clamp(input.current.velocity / 4000, -0.6, 0.6);
    u.uVelocity.value = THREE.MathUtils.damp(u.uVelocity.value, target, 6, dt);
    u.uPlaneAspect.value = size.width / size.height;
  });

  return (
    <mesh ref={mesh} material={material} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, 48, 32]} />
    </mesh>
  );
}

export default function DistortCanvas({
  projects,
  active,
  input,
  running,
}: {
  projects: Project[];
  active: number;
  input: React.RefObject<DistortInput>;
  running: boolean;
}) {
  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 2], fov: 50 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor("#010103")}
    >
      <Plane projects={projects} active={active} input={input} />
    </Canvas>
  );
}
