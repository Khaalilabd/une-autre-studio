import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { toSvgDocument } from '../lib/exporter';

/**
 * Small product viewer shared by the merch pages: studio lighting, soft floor
 * shadow, drag to turn, optional auto-rotation. The caller builds its objects
 * in `setup` and gets an `update` hook to rebuild textures when inputs change.
 */

export interface Stage {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
}

/** SVG element → canvas texture (fonts embedded, same renderer as the exports). */
export async function svgTexture(node: ReactElement, w: number, h: number, renderer?: THREE.WebGLRenderer) {
  const doc = await toSvgDocument(node, { width: w, height: h });
  const url = URL.createObjectURL(new Blob([doc], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.width = w;
    img.height = h;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('svg'));
      img.src = url;
    });
    await new Promise((r) => setTimeout(r, 60));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (renderer) t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function Viewer3D({
  setup,
  deps,
  background,
  camera = [0, 2, 14],
  target = [0, 0, 0],
  autoRotate = true,
  className,
  children,
}: {
  /** builds the scene; returns a cleanup. Called again whenever `deps` change. */
  setup: (s: Stage) => (() => void) | void;
  deps: unknown[];
  background: string;
  camera?: [number, number, number];
  target?: [number, number, number];
  autoRotate?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const fail = useRef(false);

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch {
      fail.current = true;
      el.dataset.fail = '1';
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    cam.position.set(...camera);
    const controls = new OrbitControls(cam, renderer.domElement);
    controls.target.set(...target);
    controls.enableDamping = true;
    controls.autoRotateSpeed = 1.6;
    controls.minDistance = 4;
    controls.maxDistance = 40;

    const keyL = new THREE.DirectionalLight('#ffffff', 2.4);
    keyL.position.set(6, 10, 8);
    keyL.castShadow = true;
    keyL.shadow.mapSize.set(2048, 2048);
    keyL.shadow.camera.left = keyL.shadow.camera.bottom = -14;
    keyL.shadow.camera.right = keyL.shadow.camera.top = 14;
    keyL.shadow.radius = 8;
    const fill = new THREE.DirectionalLight('#c9d4ff', 0.8);
    fill.position.set(-8, 4, -6);
    scene.add(keyL, fill, new THREE.AmbientLight('#ffffff', 0.35));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.35 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    scene.add(floor);

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + 'px';
      renderer.domElement.style.height = h + 'px';
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(scene, cam);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    stage.current = { scene, renderer, camera: cam, controls };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      stage.current = null;
    };
    // the stage lives as long as the component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    s.scene.background = new THREE.Color(background);
    s.controls.autoRotate = autoRotate;
  }, [background, autoRotate]);

  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    return setup(s) ?? undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <div className={`viewer3d ${className ?? ''}`} ref={host}>
      <p className="viewer-fail">La 3D n’est pas disponible dans ce navigateur.</p>
      <p className="viewer-hint">Glissez pour tourner · molette pour zoomer</p>
      {children}
    </div>
  );
}
