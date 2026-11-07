import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { InfoLayer, RUBAN } from '../concepts/matiere';
import type { CreativeSettings, EventContent } from '../data/types';
import { download, slug, toSvgDocument } from '../lib/exporter';
import { Q_POINTS } from '../lib/generators';
import { ringLayout } from '../graphics/ringLogo';

/**
 * Real-time 3D poster with live controls. The "?" is a tube in space that
 * turns and whose surface breaks into shards then melts back; a ring of the
 * brand name orbits around it with true occlusion; Ruban's typography sits on
 * top. Every parameter is editable on the fly and the result records to video.
 */

const OUT_W = 1080;
const OUT_H = 1620;

export type Matter = 'argile' | 'chrome' | 'satin' | 'neon' | 'verre' | 'velours' | 'irise' | 'liquide';
export type Motion = 'balancier' | 'tour' | 'fixe';
/** the shape the "?" is built with */
export type QShape = 'tube' | 'gonfle' | 'fil' | 'perles' | 'facettes' | 'ruban';
/** orbit = a band of the name turning around the "?"; halo = the real circular logo, flat, turning behind it (without its "?") */
export type RingMode = 'orbite' | 'halo';

export interface LiveParams {
  bg: string;
  glow: string;
  body: string;
  dot: string;
  ring: string;
  text: string;
  matter: Matter;
  roughness: number;
  metalness: number;
  shards: number;
  spike: number;
  motion: Motion;
  speed: number;
  swing: number;
  size: number;
  ringOn: boolean;
  ringSize: number;
  ringTilt: number;
  ringSpeed: number;
  textOn: boolean;
  loop: number;
  shape?: QShape;
  ringMode?: RingMode;
  /** halo: line thickness (px on a 2048 texture), filled letters, the logo's dot */
  haloWeight?: number;
  haloFill?: boolean;
  haloDot?: boolean;
  /** halo: soft light around the letters, 0–1 */
  haloGlow?: number;
  /** vertical position of the "?" */
  qY?: number;
  /** smooth liquid undulation of the surface, 0–1 */
  wave?: number;
}

const DEF = { shape: 'tube' as QShape, ringMode: 'orbite' as RingMode, haloWeight: 14, haloFill: false, haloDot: true, haloGlow: 0.6, qY: 0, wave: 0 };
const full = (p: LiveParams) => ({ ...DEF, ...p }) as Required<LiveParams>;

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

function questionCurve() {
  const hook = Q_POINTS.filter(([, y]) => y < 90).filter((_, i) => i % 3 === 0);
  const n = hook.length;
  const pts = hook.map(([x, y], i) => {
    const t = i / (n - 1);
    return new THREE.Vector3(((x - 28) / 100) * 4.2, (-(y - 50) / 100) * 4.2, Math.sin(t * Math.PI * 1.3) * 1.35 - 0.45);
  });
  return { curve: new THREE.CatmullRomCurve3(pts), dot: new THREE.Vector3(0, (-(97 - 50) / 100) * 4.2, 0), start: pts[0], end: pts[n - 1] };
}

function paintBackground(c: HTMLCanvasElement, base: string, glow: string) {
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, c.width, c.height);
  const r = g.createRadialGradient(c.width * 0.12, c.height * 0.92, 0, c.width * 0.12, c.height * 0.92, c.height * 0.75);
  r.addColorStop(0, glow);
  r.addColorStop(0.55, glow + '40');
  r.addColorStop(1, glow + '00');
  g.fillStyle = r;
  g.fillRect(0, 0, c.width, c.height);
  const v = g.createLinearGradient(0, 0, 0, c.height * 0.6);
  v.addColorStop(0, 'rgba(0,0,0,0.45)');
  v.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = v;
  g.fillRect(0, 0, c.width, c.height);
}

function paintRing(c: HTMLCanvasElement, brand: string, color: string) {
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  g.font = "700 150px 'Fredoka', 'General Sans', sans-serif";
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.strokeStyle = color;
  g.lineWidth = 9;
  const unit = `${brand.toUpperCase()}   ·   `;
  const n = Math.max(1, Math.round(c.width / g.measureText(unit).width));
  for (let i = 0; i < n; i++) g.strokeText(unit, (i * c.width) / n, c.height / 2);
}

/** the real ring logo (UNE AUTRE without its "?"), drawn on a square texture */
function paintHalo(c: HTMLCanvasElement, brand: string, color: string, weight: number, fill: boolean, dot: boolean, glow: number) {
  const g = c.getContext('2d')!;
  const S = c.width;
  g.clearRect(0, 0, S, S);
  const R = S * 0.39;
  const cap = R * 0.46;
  const lay = ringLayout(brand, R, cap);
  g.save();
  g.translate(S / 2, S / 2);
  g.lineJoin = 'round';
  g.textAlign = 'center';
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = weight;
  const pass = (blur: number) => {
    g.shadowColor = blur ? color : 'transparent';
    g.shadowBlur = blur;
    for (const gl of lay.glyphs) {
      if (gl.ch === '?') continue;
      g.save();
      g.translate(gl.x, gl.y);
      g.rotate((gl.rot * Math.PI) / 180);
      g.font = `700 ${gl.size}px 'Fredoka', 'General Sans', sans-serif`;
      if (fill) g.fillText(gl.ch, 0, gl.size * 0.35);
      else g.strokeText(gl.ch, 0, gl.size * 0.35);
      g.restore();
    }
    if (dot) {
      g.beginPath();
      g.arc(-R, -R * 0.2, cap * 0.16, 0, Math.PI * 2);
      if (fill) g.fill();
      else g.stroke();
    }
  };
  if (glow > 0.01) pass(60 * glow);
  pass(0);
  g.restore();
}

/** the "?" built in one of several shapes; returns the group and the beads (animated in "perles") */
function buildSign(shape: QShape, bodyMat: THREE.Material, dotMat: THREE.Material) {
  const { curve, dot, start, end } = questionCurve();
  const sign = new THREE.Group();
  const beads: THREE.Mesh[] = [];
  const caps = (r: number) => {
    for (const p of [start, end]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 40), bodyMat);
      cap.position.copy(p);
      sign.add(cap);
    }
  };
  const addDot = (geo: THREE.BufferGeometry) => {
    const m = new THREE.Mesh(geo, dotMat);
    m.position.copy(dot);
    sign.add(m);
  };
  if (shape === 'tube') {
    sign.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 520, 0.36, 56, false), bodyMat));
    caps(0.36);
    addDot(new THREE.SphereGeometry(0.45, 64, 64));
  } else if (shape === 'fil') {
    sign.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 520, 0.13, 24, false), bodyMat));
    caps(0.13);
    addDot(new THREE.SphereGeometry(0.24, 40, 40));
  } else if (shape === 'facettes') {
    sign.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 70, 0.46, 6, false), bodyMat));
    for (const p of [start, end]) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 0), bodyMat);
      c.position.copy(p);
      sign.add(c);
    }
    addDot(new THREE.IcosahedronGeometry(0.55, 0));
  } else if (shape === 'perles') {
    const n = Math.round(curve.getLength() / 0.5);
    curve.getSpacedPoints(n).forEach((p) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.27, 36, 36), bodyMat);
      b.position.copy(p);
      sign.add(b);
      beads.push(b);
    });
    addDot(new THREE.SphereGeometry(0.42, 48, 48));
  } else if (shape === 'ruban') {
    // a flat band that twists along the curve
    const M = 400;
    const frames = curve.computeFrenetFrames(M, false);
    const pos: number[] = [];
    const idx: number[] = [];
    const w = 0.52;
    for (let i = 0; i <= M; i++) {
      const t = i / M;
      const p = curve.getPointAt(t);
      const a = t * Math.PI * 3;
      const d = frames.normals[i].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a)));
      pos.push(p.x + d.x * w, p.y + d.y * w, p.z + d.z * w, p.x - d.x * w, p.y - d.y * w, p.z - d.z * w);
      if (i < M) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    sign.add(new THREE.Mesh(geo, bodyMat));
    addDot(new THREE.SphereGeometry(0.4, 48, 48));
  } else {
    // gonfle: the "?" as a puffy, bevelled extrusion (like a balloon letter)
    const pts = curve.getSpacedPoints(160).map((v) => new THREE.Vector2(v.x, v.y));
    const w = 0.4;
    const left: THREE.Vector2[] = [];
    const right: THREE.Vector2[] = [];
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const t = b.clone().sub(a).normalize();
      const nrm = new THREE.Vector2(-t.y, t.x).multiplyScalar(w);
      left.push(p.clone().add(nrm));
      right.push(p.clone().sub(nrm));
    });
    const shapeQ = new THREE.Shape();
    shapeQ.moveTo(left[0].x, left[0].y);
    left.forEach((p) => shapeQ.lineTo(p.x, p.y));
    const e = pts[pts.length - 1];
    const te = Math.atan2(left[left.length - 1].y - e.y, left[left.length - 1].x - e.x);
    shapeQ.absarc(e.x, e.y, w, te, te - Math.PI, true);
    for (let i = right.length - 1; i >= 0; i--) shapeQ.lineTo(right[i].x, right[i].y);
    const s0 = pts[0];
    const ts = Math.atan2(right[0].y - s0.y, right[0].x - s0.x);
    shapeQ.absarc(s0.x, s0.y, w, ts, ts - Math.PI, true);
    const ext = { depth: 0.35, bevelEnabled: true, bevelThickness: 0.28, bevelSize: 0.16, bevelSegments: 10, curveSegments: 32 };
    const body = new THREE.ExtrudeGeometry(shapeQ, ext);
    body.translate(0, 0, -0.18);
    sign.add(new THREE.Mesh(body, bodyMat));
    const disc = new THREE.Shape();
    disc.absarc(0, 0, 0.4, 0, Math.PI * 2, false);
    const dg = new THREE.ExtrudeGeometry(disc, ext);
    dg.translate(0, 0, -0.18);
    const m = new THREE.Mesh(dg, dotMat);
    m.position.set(dot.x, dot.y, 0);
    sign.add(m);
  }
  return { sign, beads };
}

interface Rig {
  setParams: (p: LiveParams) => void;
  record: (onProgress: (k: number) => void, onDone: () => void, onError: () => void) => void;
}

/** Builds the 3D scene once; `apply` updates every parameter live, `frame` poses it at a given time. */
function createStage(renderer: THREE.WebGLRenderer, brand: string, initial: LiveParams) {
  let P = initial;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 540;
  bgCanvas.height = 810;
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = bgTex;

  const camera = new THREE.PerspectiveCamera(30, OUT_W / OUT_H, 0.1, 100);
  camera.position.set(0, 0, 14.5);
  const hemi = new THREE.HemisphereLight('#8fa6ff', '#050a2e', 0.9);
  const key = new THREE.DirectionalLight('#6f8dff', 3.2);
  key.position.set(-5, -4, 4);
  const top = new THREE.DirectionalLight('#ffffff', 1.8);
  top.position.set(4, 6, 6);
  scene.add(hemi, key, top);

  const uniforms = { uTime: { value: 0 }, uAmp: { value: 0 }, uSpike: { value: 0.34 }, uWave: { value: 0 } };
  const inject = (m: THREE.MeshPhysicalMaterial) => {
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader =
        'uniform float uTime;\nuniform float uAmp;\nuniform float uSpike;\nuniform float uWave;\n' +
        NOISE +
        '\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float body = snoise(position * 1.6 + vec3(0.0, uTime * 0.22, 0.0)) * 0.5 + 0.5;
          float spike = max(0.0, snoise(position * 5.5 + vec3(uTime * 0.12)));
          float d = body * 0.16 + pow(spike, 1.2) * uSpike;
          d = floor(d * 9.0) / 9.0;
          transformed += normal * d * uAmp;
          float wv = sin(position.y * 2.6 + uTime * 2.2) * 0.6 + snoise(position * 1.1 + vec3(uTime * 0.35)) * 0.8;
          transformed += normal * wv * 0.11 * uWave;`,
        );
    };
  };
  const bodyMat = new THREE.MeshPhysicalMaterial({ flatShading: true, side: THREE.DoubleSide });
  const dotMat = new THREE.MeshPhysicalMaterial({ flatShading: true });
  inject(bodyMat);
  inject(dotMat);

  const holder = new THREE.Group();
  holder.position.set(-0.05, 0.4, 0);
  scene.add(holder);
  let built: { sign: THREE.Group; beads: THREE.Mesh[] } | null = null;
  let builtShape: QShape | null = null;
  const rebuild = (shape: QShape) => {
    if (built) {
      holder.remove(built.sign);
      built.sign.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    }
    built = buildSign(shape, bodyMat, dotMat);
    builtShape = shape;
    holder.add(built.sign);
  };

  // halo: the circular logo, flat, behind the "?"
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = 2048;
  haloCanvas.height = 2048;
  const haloTex = new THREE.CanvasTexture(haloCanvas);
  haloTex.colorSpace = THREE.SRGBColorSpace;
  haloTex.anisotropy = 8;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 6.8), new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, toneMapped: false }));
  halo.renderOrder = 0;
  const haloHolder = new THREE.Group();
  haloHolder.position.set(0, 0.4, -1.6);
  haloHolder.add(halo);
  scene.add(haloHolder);

  const ringCanvas = document.createElement('canvas');
  ringCanvas.width = 4096;
  ringCanvas.height = 256;
  const ringTex = new THREE.CanvasTexture(ringCanvas);
  ringTex.colorSpace = THREE.SRGBColorSpace;
  ringTex.wrapS = THREE.RepeatWrapping;
  ringTex.anisotropy = 8;
  const band = new THREE.CylinderGeometry(2.35, 2.35, 0.36, 160, 1, true);
  const front = new THREE.Mesh(band, new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.FrontSide, depthWrite: false, toneMapped: false }));
  const back = new THREE.Mesh(band, new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.BackSide, depthWrite: false, opacity: 0.35, toneMapped: false }));
  front.renderOrder = 2;
  back.renderOrder = 1;
  const ring = new THREE.Group();
  ring.add(back, front);
  ring.position.set(0, 1.0, 0);
  scene.add(ring);

  const apply = (p0: LiveParams, first = false) => {
    const prev = full(P);
    const p = full(p0);
    P = p;
    if (first || builtShape !== p.shape) rebuild(p.shape);
    if (first || prev.ring !== p.ring || prev.haloWeight !== p.haloWeight || prev.haloFill !== p.haloFill || prev.haloDot !== p.haloDot || prev.haloGlow !== p.haloGlow) {
      paintHalo(haloCanvas, brand, p.ring, p.haloWeight, p.haloFill, p.haloDot, p.haloGlow);
      haloTex.needsUpdate = true;
    }
    if (first || prev.bg !== p.bg || prev.glow !== p.glow) {
      paintBackground(bgCanvas, p.bg, p.glow);
      bgTex.needsUpdate = true;
    }
    if (first || prev.ring !== p.ring) {
      paintRing(ringCanvas, brand, p.ring);
      ringTex.needsUpdate = true;
    }
    const neon = p.matter === 'neon';
    for (const [m, c] of [
      [bodyMat, p.body],
      [dotMat, p.dot],
    ] as const) {
      m.color.set(neon ? '#000000' : c);
      m.roughness = p.roughness;
      m.metalness = p.metalness;
      m.emissive.set(neon ? c : '#000000');
      m.emissiveIntensity = neon ? 1.15 : 0;
      const flat = p.shards >= 0.5 || p.shape === 'facettes';
      if (m.toneMapped === neon || m.flatShading !== flat) {
        m.toneMapped = !neon;
        m.flatShading = flat;
        m.needsUpdate = true;
      }
      m.envMapIntensity = p.matter === 'chrome' || p.matter === 'liquide' ? 1.4 : p.matter === 'irise' ? 1.2 : p.matter === 'verre' ? 1 : p.matter === 'satin' ? 0.8 : 0.35;
      // glass, velvet, iridescent
      m.transmission = p.matter === 'verre' ? 1 : 0;
      m.thickness = p.matter === 'verre' ? 1.4 : 0;
      m.ior = 1.5;
      m.attenuationColor.set(c);
      m.attenuationDistance = p.matter === 'verre' ? 2.5 : Infinity;
      m.sheen = p.matter === 'velours' ? 1 : 0;
      m.sheenColor.set(c).lerp(new THREE.Color('#ffffff'), 0.4);
      m.sheenRoughness = 0.45;
      m.iridescence = p.matter === 'irise' ? 1 : 0;
      m.iridescenceIOR = 1.8;
      m.clearcoat = p.matter === 'verre' || p.matter === 'liquide' ? 1 : 0;
      if (p.matter === 'verre') m.color.set(c).lerp(new THREE.Color('#ffffff'), 0.6);
    }
    uniforms.uWave.value = p.wave;
    key.color.set(p.glow).lerp(new THREE.Color('#ffffff'), 0.35);
    hemi.color.set(p.glow).lerp(new THREE.Color('#ffffff'), 0.5);
    hemi.groundColor.set(p.bg);
    uniforms.uSpike.value = p.spike;
    holder.scale.setScalar(p.size);
    holder.position.y = 0.4 + p.qY;
    ring.visible = p.ringOn && p.ringMode === 'orbite';
    haloHolder.visible = p.ringOn && p.ringMode === 'halo';
    haloHolder.scale.setScalar(p.ringSize);
    haloHolder.rotation.x = p.ringMode === 'halo' ? p.ringTilt * 0.6 : 0;
    ring.scale.set(p.ringSize, 1, p.ringSize);
    ring.rotation.x = p.ringTilt;
    ring.rotation.z = -p.ringTilt * 0.5;
  };
  apply(P, true);

  const frame = (sec: number) => {
    const ph = ((sec % P.loop) / P.loop) * Math.PI * 2;
    // halo turns continuously; beads breathe one after the other
    halo.rotation.z = -(sec / P.loop) * Math.PI * 2 * 0.5 * P.ringSpeed;
    built?.beads.forEach((b, i) => b.scale.setScalar(1 + 0.18 * Math.sin(sec * 3 - i * 0.45)));
    uniforms.uTime.value = sec;
    uniforms.uAmp.value = Math.pow(Math.max(0, Math.sin(ph * 2 - 0.6)), 4) * P.shards;
    const yaw = P.motion === 'tour' ? ph : P.motion === 'balancier' ? Math.sin(ph) * P.swing + Math.sin(ph * 3) * 0.12 * P.swing : 0;
    holder.rotation.set(P.motion === 'fixe' ? 0 : Math.sin(ph) * 0.14, yaw, P.motion === 'fixe' ? 0 : Math.sin(ph * 2) * 0.07);
    ringTex.offset.x = -((sec * P.ringSpeed) / P.loop);
    ring.rotation.y = ph * 0.5 * P.ringSpeed;
    renderer.render(scene, camera);
  };
  const dispose = () => {
    env.dispose();
    pmrem.dispose();
    bgTex.dispose();
    ringTex.dispose();
    haloTex.dispose();
    scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  };
  return { apply: (p: LiveParams) => apply(p), frame, dispose, params: () => P };
}

const setupRenderer = (r: THREE.WebGLRenderer, w: number, h: number) => {
  r.setPixelRatio(1);
  r.setSize(w, h, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
};

function useRig(host: React.RefObject<HTMLDivElement>, content: EventContent, settings: CreativeSettings, initial: LiveParams, onFail: (m: string) => void) {
  const rig = useRef<Rig | null>(null);
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch {
      onFail('WebGL n’est pas disponible dans ce navigateur.');
      return;
    }
    setupRenderer(renderer, OUT_W, OUT_H);
    renderer.domElement.className = 'live-canvas';
    el.prepend(renderer.domElement);
    const stage = createStage(renderer, content.brand, initial);

    // overlay for recordings (on screen the live SVG is used)
    let overlay: HTMLImageElement | null = null;
    const buildOverlay = (p: LiveParams) => {
      overlay = null;
      if (!p.textOn) return;
      const markup = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1500" width={OUT_W} height={OUT_H}>
          <InfoLayer st={RUBAN.st} content={content} settings={settings} fg={p.text} accent={p.dot} shadow="#000000" sq={false} on={false} seal={p.ringMode === 'halo' ? undefined : p.ring} />
        </svg>
      );
      toSvgDocument(markup).then((doc) => {
        const img = new Image();
        img.onload = () => (overlay = img);
        img.src = URL.createObjectURL(new Blob([doc], { type: 'image/svg+xml' }));
      });
    };
    buildOverlay(initial);

    const out = document.createElement('canvas');
    out.width = OUT_W;
    out.height = OUT_H;
    const octx = out.getContext('2d')!;
    let recording: { rec: MediaRecorder; until: number; t0: number; onProgress: (k: number) => void } | null = null;

    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      stage.frame(((now - t0) / 1000) * stage.params().speed);
      if (recording) {
        octx.drawImage(renderer.domElement, 0, 0, OUT_W, OUT_H);
        if (overlay) octx.drawImage(overlay, 0, 0, OUT_W, OUT_H);
        recording.onProgress(Math.min(1, (now - recording.t0) / (recording.until - recording.t0)));
        if (now >= recording.until) {
          recording.rec.stop();
          recording = null;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    rig.current = {
      setParams: (p) => {
        const prev = stage.params();
        stage.apply(p);
        if (prev.text !== p.text || prev.dot !== p.dot || prev.ring !== p.ring || prev.textOn !== p.textOn || prev.ringMode !== p.ringMode) buildOverlay(p);
      },
      record: (onProgress, onDone, onError) => {
        const types = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
        const type = types.find((x) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(x));
        if (!type) return onError();
        const rec = new MediaRecorder(out.captureStream(30), { mimeType: type, videoBitsPerSecond: 12_000_000 });
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.onstop = () => {
          download(new Blob(chunks, { type }), `${slug(content.brand)}_affiche-3d.${type.includes('mp4') ? 'mp4' : 'webm'}`);
          onDone();
        };
        rec.start();
        const now = performance.now();
        const P = stage.params();
        recording = { rec, t0: now, until: now + (P.loop / P.speed) * 1000, onProgress };
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      recording?.rec.stop();
      stage.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      rig.current = null;
    };
    // the scene is rebuilt only when the event content changes; params are applied live
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);
  return rig;
}

/* ---------- stills (table covers, exports) ---------- */

const stills = new Map<string, string>();
let stillRenderer: THREE.WebGLRenderer | null = null;
let queue: Promise<unknown> = Promise.resolve();
const stillKey = (brand: string, p: LiveParams) => brand + '|' + JSON.stringify(p);

/** Front view of a preset, rendered once per parameter set (shared offscreen renderer). */
export function renderStill(brand: string, p: LiveParams): Promise<string | null> {
  const k = stillKey(brand, p);
  const hit = stills.get(k);
  if (hit) return Promise.resolve(hit);
  const job = queue.then(async () => {
    if (stills.has(k)) return stills.get(k)!;
    try {
      await document.fonts?.ready;
      if (!stillRenderer) {
        stillRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        setupRenderer(stillRenderer, 720, 1080);
      }
      const stage = createStage(stillRenderer, brand, p);
      stage.frame(0);
      const url = stillRenderer.domElement.toDataURL('image/jpeg', 0.9);
      stage.dispose();
      stills.set(k, url);
      return url;
    } catch {
      return null;
    }
  });
  queue = job;
  return job;
}

export const cachedStill = (brand: string, p: LiveParams) => stills.get(stillKey(brand, p)) ?? null;

/* ---------- controls ---------- */

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="lc-row">
      <span>{label}</span>
      {children}
    </label>
  );
}

const Color = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <Row label={label}>
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    <code>{value.toUpperCase()}</code>
  </Row>
);

const Range = ({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string }) => (
  <Row label={label}>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    <code>{fmt ? fmt(value) : value.toFixed(2)}</code>
  </Row>
);

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="lc-row">
      <span>{label}</span>
      <div className="lc-choice">
        {options.map(([v, l]) => (
          <button key={v} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <Row label={label}>
    <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    <code>{value ? 'oui' : 'non'}</code>
  </Row>
);

const MATTER_PRESET: Record<Matter, Partial<LiveParams>> = {
  argile: { roughness: 0.6, metalness: 0.1 },
  chrome: { roughness: 0.12, metalness: 1 },
  satin: { roughness: 0.35, metalness: 0.4 },
  neon: { roughness: 0.4, metalness: 0 },
  verre: { roughness: 0.04, metalness: 0, shards: 0.2 },
  velours: { roughness: 0.9, metalness: 0 },
  irise: { roughness: 0.15, metalness: 0.9 },
  liquide: { roughness: 0.03, metalness: 1, shards: 0, wave: 0.8 },
};

const storeKey = (id: string) => `une-autre:live3d:${id}`;
export function loadParams(id: string, preset: LiveParams): LiveParams {
  try {
    const raw = localStorage.getItem(storeKey(id));
    const p = raw ? { ...preset, ...JSON.parse(raw) } : preset;
    // check hook: #...&qs=gonfle&qm=verre forces a shape / material
    const qs = /[?&]qs=(\w+)/.exec(location.hash)?.[1] as QShape | undefined;
    const qm = /[?&]qm=(\w+)/.exec(location.hash)?.[1] as Matter | undefined;
    return { ...p, ...(qs ? { shape: qs } : {}), ...(qm ? { matter: qm, ...MATTER_PRESET[qm] } : {}) };
  } catch {
    return preset;
  }
}

export function Live3D({ id, content, settings, preset }: { id: string; content: EventContent; settings: CreativeSettings; preset: LiveParams }) {
  const host = useRef<HTMLDivElement>(null);
  const [fail, setFail] = useState<string | null>(null);
  const [p, setP] = useState<LiveParams>(() => loadParams(id, preset));
  const initial = useMemo(() => p, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rig = useRig(host, content, settings, initial, setFail);
  const [rec, setRec] = useState<number | null>(null);
  const [recErr, setRecErr] = useState(false);

  useEffect(() => {
    rig.current?.setParams(p);
    try {
      localStorage.setItem(storeKey(id), JSON.stringify(p));
    } catch {
      /* private mode: settings simply aren't remembered */
    }
  }, [p, id, rig]);

  const set = <K extends keyof LiveParams>(k: K) => (v: LiveParams[K]) => setP((cur) => ({ ...cur, [k]: v }));

  return (
    <>
      <div className="live3d">
        <div className="live-stage" ref={host}>
          {fail ? (
            <p className="live-fail">{fail}</p>
          ) : (
            p.textOn && (
              <svg className="live-overlay" viewBox="0 0 1000 1500" aria-hidden>
                <InfoLayer st={RUBAN.st} content={content} settings={settings} fg={p.text} accent={p.dot} shadow="#000000" sq={false} on seal={p.ringMode === 'halo' ? undefined : p.ring} />
              </svg>
            )
          )}
        </div>
        <div className="live-actions">
          <button
            className="tbtn solid"
            disabled={rec !== null || !!fail}
            onClick={() => {
              setRecErr(false);
              setRec(0);
              rig.current?.record(
                (k) => setRec(k),
                () => setRec(null),
                () => {
                  setRec(null);
                  setRecErr(true);
                },
              );
            }}
          >
            {rec !== null ? `Enregistrement… ${Math.round(rec * 100)} %` : `Enregistrer la vidéo (${Math.round(p.loop / p.speed)} s, 1080 × 1620)`}
          </button>
          {recErr && <small>Ce navigateur ne sait pas enregistrer de vidéo — essayez Chrome ou Safari récent.</small>}
        </div>
      </div>
      <aside className="live-controls">
        <div className="lc-head">
          <p className="sheet-label">Réglages de l’animation</p>
          <button className="tbtn" onClick={() => setP(preset)}>
            Réinitialiser
          </button>
        </div>
        <section>
          <h4>Couleurs</h4>
          <Color label="Fond" value={p.bg} onChange={set('bg')} />
          <Color label="Lumière" value={p.glow} onChange={set('glow')} />
          <Color label="Corps du « ? »" value={p.body} onChange={set('body')} />
          <Color label="Point du « ? »" value={p.dot} onChange={set('dot')} />
          <Color label="Anneau" value={p.ring} onChange={set('ring')} />
          <Color label="Texte" value={p.text} onChange={set('text')} />
        </section>
        <section>
          <h4>Matière</h4>
          <Choice<QShape>
            label="Format du « ? »"
            value={p.shape ?? 'tube'}
            options={[
              ['tube', 'Tube'],
              ['gonfle', 'Gonflé'],
              ['fil', 'Fil fin'],
              ['perles', 'Perles'],
              ['facettes', 'Facettes'],
              ['ruban', 'Ruban plat'],
            ]}
            onChange={set('shape')}
          />
          <Choice<Matter>
            label="Type"
            value={p.matter}
            options={[
              ['argile', 'Argile'],
              ['chrome', 'Chrome'],
              ['satin', 'Satin'],
              ['neon', 'Néon'],
              ['verre', 'Verre'],
              ['velours', 'Velours'],
              ['irise', 'Irisé'],
              ['liquide', 'Liquide'],
            ]}
            onChange={(m) => setP((cur) => ({ ...cur, matter: m, ...MATTER_PRESET[m] }))}
          />
          <Range label="Rugosité" value={p.roughness} min={0} max={1} step={0.01} onChange={set('roughness')} />
          <Range label="Métal" value={p.metalness} min={0} max={1} step={0.01} onChange={set('metalness')} />
          <Range label="Éclats" value={p.shards} min={0} max={1.6} step={0.01} onChange={set('shards')} />
          <Range label="Taille des pointes" value={p.spike} min={0.05} max={0.9} step={0.01} onChange={set('spike')} />
          <Range label="Ondulation liquide" value={p.wave ?? 0} min={0} max={1.5} step={0.01} onChange={set('wave')} />
        </section>
        <section>
          <h4>Mouvement</h4>
          <Choice<Motion>
            label="Rotation"
            value={p.motion}
            options={[
              ['balancier', 'Balancier'],
              ['tour', 'Tour complet'],
              ['fixe', 'Fixe'],
            ]}
            onChange={set('motion')}
          />
          <Range label="Vitesse" value={p.speed} min={0.3} max={2.5} step={0.05} onChange={set('speed')} fmt={(v) => `× ${v.toFixed(2)}`} />
          <Range label="Amplitude" value={p.swing} min={0.1} max={1.6} step={0.01} onChange={set('swing')} />
          <Range label="Durée de boucle" value={p.loop} min={6} max={24} step={1} onChange={set('loop')} fmt={(v) => `${v} s`} />
        </section>
        <section>
          <h4>Tailles</h4>
          <Range label="Taille du « ? »" value={p.size} min={0.3} max={1.6} step={0.01} onChange={set('size')} />
          <Range label="Hauteur du « ? »" value={p.qY ?? 0} min={-2} max={2} step={0.01} onChange={set('qY')} />
          <Toggle label="Anneau UNE AUTRE" value={p.ringOn} onChange={set('ringOn')} />
          <Choice<RingMode>
            label="Type d’anneau"
            value={p.ringMode ?? 'orbite'}
            options={[
              ['halo', 'Logo en cercle'],
              ['orbite', 'Orbite 3D'],
            ]}
            onChange={set('ringMode')}
          />
          {(p.ringMode ?? 'orbite') === 'halo' && (
            <>
              <Range label="Épaisseur du trait" value={p.haloWeight ?? 14} min={4} max={40} step={1} onChange={set('haloWeight')} fmt={(v) => `${v}`} />
              <Toggle label="Lettres pleines" value={p.haloFill ?? false} onChange={set('haloFill')} />
              <Toggle label="Point du logo" value={p.haloDot ?? true} onChange={set('haloDot')} />
              <Range label="Lueur de l’anneau" value={p.haloGlow ?? 0.6} min={0} max={1.5} step={0.01} onChange={set('haloGlow')} />
            </>
          )}
          <Range label="Taille de l’anneau" value={p.ringSize} min={0.4} max={1.6} step={0.01} onChange={set('ringSize')} />
          <Range label="Inclinaison" value={p.ringTilt} min={-0.8} max={0.8} step={0.01} onChange={set('ringTilt')} />
          <Range label="Vitesse de l’anneau" value={p.ringSpeed} min={-3} max={3} step={0.05} onChange={set('ringSpeed')} />
          <Toggle label="Texte de l’affiche" value={p.textOn} onChange={set('textOn')} />
        </section>
      </aside>
    </>
  );
}
