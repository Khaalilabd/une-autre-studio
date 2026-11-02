import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * WebGL stage: the poster as a real sheet of printed paper (slight curl,
 * coated finish), floating under a light that follows the pointer.
 * Front = poster, back = logo. Click flips it, drag turns it.
 */
interface Props {
  front: ImageBitmap | null;
  back: ImageBitmap | null;
  chapterKey: string;
  rim: string;
  flipped: boolean;
  onFlip: () => void;
}

const W = 2;
const H = 3;

function curledPlane() {
  const g = new THREE.PlaneGeometry(W, H, 36, 54);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, -0.11 * x * x + 0.035 * Math.sin(y * 1.6 + 0.4) + 0.02 * x * y);
  }
  g.computeVertexNormals();
  return g;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function toTexture(img: ImageBitmap, mirror: boolean, renderer: THREE.WebGLRenderer) {
  const t = new THREE.Texture(img);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  if (mirror) {
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = -1;
  }
  t.needsUpdate = true;
  return t;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function PosterStage({ front, back, chapterKey, rim, flipped, onFlip }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    setArt: (f: ImageBitmap | null, b: ImageBitmap | null, key: string) => void;
    setRim: (c: string) => void;
    setFlip: (v: boolean) => void;
  } | null>(null);
  const onFlipRef = useRef(onFlip);
  onFlipRef.current = onFlip;

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 0, 8.6);

    scene.add(new THREE.AmbientLight(0xffffff, 0.74));
    const key = new THREE.DirectionalLight(0xfff3e4, 0.62);
    key.position.set(-3, 4, 6);
    scene.add(key);
    const sheen = new THREE.PointLight(0xffffff, 7, 9, 1.6);
    sheen.position.set(0, 0, 3);
    scene.add(sheen);
    const rimLight = new THREE.PointLight(new THREE.Color(rim), 30, 12, 1.4);
    rimLight.position.set(1.8, 1.2, -2.4);
    scene.add(rimLight);
    const rimLight2 = new THREE.PointLight(new THREE.Color(rim), 18, 12, 1.4);
    rimLight2.position.set(-2.2, -1.6, -2);
    scene.add(rimLight2);

    const geo = curledPlane();
    const paper = { roughness: 0.58, metalness: 0, clearcoat: 0.22, clearcoatRoughness: 0.45, transparent: true };
    const frontMat = new THREE.MeshPhysicalMaterial({ ...paper, color: 0xffffff, side: THREE.FrontSide });
    const backMat = new THREE.MeshPhysicalMaterial({ ...paper, color: 0xffffff, side: THREE.BackSide });
    const sheet = new THREE.Group();
    sheet.add(new THREE.Mesh(geo, frontMat));
    sheet.add(new THREE.Mesh(geo, backMat));
    scene.add(sheet);

    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.9), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    shadow.position.set(0, -2.15, -0.3);
    shadow.rotation.x = -Math.PI / 2.6;
    scene.add(shadow);

    // --- state ---
    const s = {
      pointer: new THREE.Vector2(),
      drag: 0,
      dragVel: 0,
      dragging: false,
      downX: 0,
      lastX: 0,
      moved: 0,
      flip: 0,
      rotY: 0,
      rotX: 0,
      trans: { phase: 'idle' as 'idle' | 'out' | 'in', t0: 0 },
      pending: null as null | { f: ImageBitmap | null; b: ImageBitmap | null },
      currentKey: '',
      opacity: 0,
    };

    const apply = (f: ImageBitmap | null, b: ImageBitmap | null) => {
      frontMat.map?.dispose();
      backMat.map?.dispose();
      frontMat.map = f ? toTexture(f, false, renderer) : null;
      backMat.map = b ? toTexture(b, true, renderer) : null;
      frontMat.needsUpdate = backMat.needsUpdate = true;
    };

    api.current = {
      setArt: (f, b, k) => {
        if (k !== s.currentKey) {
          s.currentKey = k;
          s.pending = { f, b };
          s.trans = { phase: frontMat.map ? 'out' : 'in', t0: performance.now() };
          if (!frontMat.map) {
            apply(f, b);
            s.pending = null;
          }
        } else if (s.trans.phase === 'idle' || s.trans.phase === 'in') {
          apply(f, b);
        } else {
          s.pending = { f, b };
        }
      },
      setRim: (c) => {
        rimLight.color.set(c);
        rimLight2.color.set(c);
      },
      setFlip: (v) => {
        s.flip = v ? 1 : 0;
      },
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + 'px';
      renderer.domElement.style.height = h + 'px';
      camera.aspect = w / h;
      // keep the sheet a comfortable size on narrow screens
      camera.position.z = w / h < 0.8 ? 11.5 : 8.6;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      s.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      if (s.dragging) {
        const dx = e.clientX - s.lastX;
        s.lastX = e.clientX;
        s.moved += Math.abs(dx);
        s.drag += dx * 0.012;
        s.dragVel = dx * 0.012;
      }
    };
    const onDown = (e: PointerEvent) => {
      s.dragging = true;
      s.downX = s.lastX = e.clientX;
      s.moved = 0;
      el.setPointerCapture(e.pointerId);
    };
    const onUp = (e: PointerEvent) => {
      if (!s.dragging) return;
      s.dragging = false;
      el.releasePointerCapture(e.pointerId);
      if (s.moved < 6) onFlipRef.current();
      else {
        // settle to the nearest face
        const turns = Math.round(s.drag / Math.PI);
        if (turns % 2 !== 0) onFlipRef.current();
        s.drag = 0;
      }
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      // chapter transition
      let ty = 0;
      let spin = 0;
      if (s.trans.phase === 'out') {
        const k = Math.min(1, (now - s.trans.t0) / 380);
        ty = -0.7 * ease(k);
        spin = 0.5 * ease(k);
        s.opacity = 1 - k;
        if (k >= 1) {
          if (s.pending) apply(s.pending.f, s.pending.b);
          s.pending = null;
          s.trans = { phase: 'in', t0: now };
        }
      } else if (s.trans.phase === 'in') {
        const k = Math.min(1, (now - s.trans.t0) / 760);
        ty = 0.7 * (1 - ease(k));
        spin = -0.6 * (1 - ease(k));
        s.opacity = Math.min(1, k * 1.6);
        if (k >= 1) s.trans.phase = 'idle';
      } else {
        s.opacity = Math.min(1, s.opacity + 0.05);
      }
      frontMat.opacity = backMat.opacity = s.opacity;

      const float = Math.sin(t * 0.85) * 0.07;
      sheet.position.y = 0.05 + float + ty;
      const targetY = s.flip * Math.PI + s.pointer.x * 0.32 + (s.dragging ? s.drag : 0) + spin + Math.sin(t * 0.4) * 0.05;
      const targetX = -s.pointer.y * 0.14 + Math.sin(t * 0.6) * 0.035;
      s.rotY += (targetY - s.rotY) * (s.dragging ? 0.3 : 0.07);
      s.rotX += (targetX - s.rotX) * 0.07;
      sheet.rotation.set(s.rotX, s.rotY, Math.sin(t * 0.5) * 0.012);
      sheen.position.set(s.pointer.x * 3.2, s.pointer.y * 2.4 + 0.4, 3.2);
      shadow.scale.setScalar(1 - float * 1.4);
      (shadow.material as THREE.MeshBasicMaterial).opacity = 0.9 * s.opacity;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      frontMat.map?.dispose();
      backMat.map?.dispose();
      geo.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => api.current?.setArt(front, back, chapterKey), [front, back, chapterKey]);
  useEffect(() => api.current?.setRim(rim), [rim]);
  useEffect(() => api.current?.setFlip(flipped), [flipped]);

  return <div ref={host} className="xp-stage" aria-label="Affiche en 3D — cliquez pour la retourner, glissez pour la faire tourner" />;
}
