import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

// =====================================================================
//  Theme configuration
// =====================================================================
export interface VisualizerThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  particleSpeed: number;
  pulseIntensity: number;
  glowColor: string;
  style: 'bouncy' | 'smooth' | 'aggressive' | 'glitchy' | 'floating';
  scene: {
    skyColor: number;
    fogColor: number;
    fogNear: number;
    fogFar: number;
    ambientIntensity: number;
    directionalColor: number;
    directionalIntensity: number;
  };
}

export const THEME_MAP: Record<string, VisualizerThemeConfig> = {
  Happy: {
    primaryColor: '#facc15',
    secondaryColor: '#f97316',
    particleSpeed: 2.5,
    pulseIntensity: 1.4,
    glowColor: 'rgba(250, 204, 21, 0.18)',
    style: 'bouncy',
    scene: { skyColor: 0x87ceeb, fogColor: 0xc8e6ff, fogNear: 10, fogFar: 80, ambientIntensity: 0.8, directionalColor: 0xfff4d6, directionalIntensity: 1.2 },
  },
  Sad: {
    primaryColor: '#60a5fa',
    secondaryColor: '#94a3b8',
    particleSpeed: 0.6,
    pulseIntensity: 0.6,
    glowColor: 'rgba(96, 165, 250, 0.12)',
    style: 'smooth',
    scene: { skyColor: 0x1a1a2e, fogColor: 0x1a1a2e, fogNear: 5, fogFar: 50, ambientIntensity: 0.3, directionalColor: 0x6080b0, directionalIntensity: 0.4 },
  },
  Jazz: {
    primaryColor: '#c9a961',
    secondaryColor: '#a855f7',
    particleSpeed: 1.2,
    pulseIntensity: 0.9,
    glowColor: 'rgba(201, 169, 97, 0.14)',
    style: 'floating',
    scene: { skyColor: 0x120a20, fogColor: 0x120a20, fogNear: 8, fogFar: 60, ambientIntensity: 0.4, directionalColor: 0xd4a854, directionalIntensity: 0.7 },
  },
  Dark: {
    primaryColor: '#ef4444',
    secondaryColor: '#1c1917',
    particleSpeed: 2.0,
    pulseIntensity: 1.8,
    glowColor: 'rgba(239, 68, 68, 0.15)',
    style: 'aggressive',
    scene: { skyColor: 0x0a0000, fogColor: 0x0a0000, fogNear: 3, fogFar: 40, ambientIntensity: 0.15, directionalColor: 0xff2020, directionalIntensity: 0.5 },
  },
  Cyberpunk: {
    primaryColor: '#ec4899',
    secondaryColor: '#06b6d4',
    particleSpeed: 2.2,
    pulseIntensity: 1.5,
    glowColor: 'rgba(236, 72, 153, 0.14)',
    style: 'glitchy',
    scene: { skyColor: 0x05000a, fogColor: 0x05000a, fogNear: 5, fogFar: 55, ambientIntensity: 0.2, directionalColor: 0xff40a0, directionalIntensity: 0.6 },
  },
};

export const THEME_NAMES = Object.keys(THEME_MAP);

// =====================================================================
//  Helpers
// =====================================================================
function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

// =====================================================================
//  3D scene builders
// =====================================================================
function buildHappyScene(scene: THREE.Scene) {
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
  sun.position.set(15, 18, -30);
  scene.add(sun);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(4, 32, 32), new THREE.MeshBasicMaterial({ color: 0xfff5cc, transparent: true, opacity: 0.25 }));
  glow.position.copy(sun.position);
  scene.add(glow);

  const groundGeo = new THREE.PlaneGeometry(200, 200, 60, 60);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 0.08) * 2.5 + Math.cos(y * 0.06) * 1.8 + Math.sin(x * 0.02 + y * 0.03) * 3);
  }
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ color: 0x5a9e4b }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -5;
  scene.add(ground);

  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 2, 8);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8b6f47 });
  const foliageGeo = new THREE.SphereGeometry(1.2, 8, 8);
  const foliageMat = new THREE.MeshLambertMaterial({ color: 0x3d8b37 });
  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * 80, z = -10 - Math.random() * 50, s = 0.6 + Math.random() * 1.2;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, -4 + s, z); trunk.scale.setScalar(s); scene.add(trunk);
    const fol = new THREE.Mesh(foliageGeo, foliageMat);
    fol.position.set(x, -3 + s * 2.2, z); fol.scale.setScalar(s); scene.add(fol);
  }
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
  for (let i = 0; i < 12; i++) {
    const group = new THREE.Group();
    for (let j = 0; j < 5; j++) {
      const r = 0.8 + Math.random() * 1.5;
      const sp = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), cloudMat);
      sp.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 2);
      group.add(sp);
    }
    group.position.set((Math.random() - 0.5) * 80, 10 + Math.random() * 10, -20 - Math.random() * 40);
    group.userData = { speed: 0.02 + Math.random() * 0.03 };
    scene.add(group);
  }
}

function buildSadScene(scene: THREE.Scene) {
  const rainCount = 3000;
  const rainGeo = new THREE.BufferGeometry();
  const rp = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) { rp[i*3]=(Math.random()-0.5)*100; rp[i*3+1]=Math.random()*50; rp[i*3+2]=(Math.random()-0.5)*100; }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x6688aa, size: 0.08, transparent: true, opacity: 0.5 }));
  rain.userData = { type: 'rain' }; scene.add(rain);

  const waterGeo = new THREE.PlaneGeometry(200, 200, 40, 40);
  const water = new THREE.Mesh(waterGeo, new THREE.MeshPhongMaterial({ color: 0x1a2a3a, shininess: 100, specular: 0x334466, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -5; water.userData = { type: 'water' }; scene.add(water);

  for (let i = 0; i < 8; i++) {
    const h = 6 + Math.random() * 10;
    const mt = new THREE.Mesh(new THREE.ConeGeometry(5 + Math.random() * 8, h, 6), new THREE.MeshLambertMaterial({ color: 0x1a1a2e }));
    mt.position.set((Math.random()-0.5)*70, -5+h/2, -25-Math.random()*30); scene.add(mt);
  }
}

function buildJazzScene(scene: THREE.Scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: 0x0a0510 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -5; scene.add(ground);

  const bMat = new THREE.MeshLambertMaterial({ color: 0x15102a });
  const wMat = new THREE.MeshBasicMaterial({ color: 0xd4a854, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 25; i++) {
    const bw = 1.5+Math.random()*3, bh = 4+Math.random()*14, bd = 1.5+Math.random()*3;
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bMat);
    const x = (Math.random()-0.5)*60, z = -15-Math.random()*35;
    b.position.set(x, -5+bh/2, z); scene.add(b);
    for (let r = 0; r < Math.floor(bh/1.5); r++) {
      if (Math.random() > 0.5) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(bw*0.3, 0.5), wMat);
        w.position.set(x, -5+1+r*1.5, z+bd/2+0.01); scene.add(w);
      }
    }
  }
  for (let i = 0; i < 40; i++) {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.1+Math.random()*0.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xd4a854, transparent: true, opacity: 0.4+Math.random()*0.4 }));
    sp.position.set((Math.random()-0.5)*40, Math.random()*15, -5-Math.random()*30);
    sp.userData = { floatSpeed: 0.3+Math.random()*0.7, floatOffset: Math.random()*Math.PI*2 }; scene.add(sp);
  }
}

function buildDarkScene(scene: THREE.Scene) {
  const gGeo = new THREE.PlaneGeometry(200, 200, 40, 40);
  const gp = gGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setZ(i, (Math.random()-0.5)*1.5);
  gGeo.computeVertexNormals();
  const g = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({ color: 0x1a0505 }));
  g.rotation.x = -Math.PI/2; g.position.y = -5; scene.add(g);

  const lMat = new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.6 });
  for (let i = 0; i < 20; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 5+Math.random()*15), lMat);
    c.rotation.x = -Math.PI/2; c.rotation.z = Math.random()*Math.PI;
    c.position.set((Math.random()-0.5)*60, -4.95, -Math.random()*40); scene.add(c);
  }
  const eCount = 500, eGeo = new THREE.BufferGeometry(), ep = new Float32Array(eCount*3);
  for (let i = 0; i < eCount; i++) { ep[i*3]=(Math.random()-0.5)*60; ep[i*3+1]=Math.random()*25-5; ep[i*3+2]=(Math.random()-0.5)*60; }
  eGeo.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(eGeo, new THREE.PointsMaterial({ color: 0xff4400, size: 0.15, transparent: true, opacity: 0.7 }));
  embers.userData = { type: 'embers' }; scene.add(embers);

  for (let i = 0; i < 15; i++) {
    const h = 2+Math.random()*8;
    const rock = new THREE.Mesh(new THREE.ConeGeometry(0.5+Math.random()*1.5, h, 5), new THREE.MeshLambertMaterial({ color: 0x1a0a0a }));
    rock.position.set((Math.random()-0.5)*50, -5+h/2, -5-Math.random()*35);
    rock.rotation.set(Math.random()*0.2, Math.random()*Math.PI, Math.random()*0.2); scene.add(rock);
  }
}

function buildCyberpunkScene(scene: THREE.Scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0x05000a }));
  ground.rotation.x = -Math.PI/2; ground.position.y = -5; scene.add(ground);

  const gridMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.25 });
  for (let i = -50; i <= 50; i += 3) {
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i,-4.99,-50), new THREE.Vector3(i,-4.99,20)]), gridMat));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-50,-4.99,i), new THREE.Vector3(50,-4.99,i)]), gridMat));
  }
  const nC = [0xec4899, 0x06b6d4, 0xa855f7, 0x22d3ee];
  for (let i = 0; i < 30; i++) {
    const bw=1+Math.random()*2.5, bh=5+Math.random()*18, bd=1+Math.random()*2.5;
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), new THREE.MeshLambertMaterial({ color: 0x0a0015 }));
    const x=(Math.random()-0.5)*60, z=-12-Math.random()*35;
    b.position.set(x,-5+bh/2,z); scene.add(b);
    const sc = nC[Math.floor(Math.random()*nC.length)];
    const sm = new THREE.MeshBasicMaterial({ color: sc, transparent: true, opacity: 0.6 });
    const st = new THREE.Mesh(new THREE.BoxGeometry(bw+0.05,0.12,bd+0.05), sm);
    st.position.set(x,-5+bh,z); scene.add(st);
    if (Math.random()>0.4) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(bw+0.05,0.08,bd+0.05), sm);
      a.position.set(x,-5+Math.random()*bh,z); scene.add(a);
    }
  }
  const hCount=200, hGeo=new THREE.BufferGeometry(), hp=new Float32Array(hCount*3);
  for (let i=0;i<hCount;i++){hp[i*3]=(Math.random()-0.5)*50;hp[i*3+1]=Math.random()*20-3;hp[i*3+2]=-Math.random()*40;}
  hGeo.setAttribute('position', new THREE.BufferAttribute(hp,3));
  const holos = new THREE.Points(hGeo, new THREE.PointsMaterial({ color: 0xec4899, size: 0.12, transparent: true, opacity: 0.5 }));
  holos.userData = { type: 'holos' }; scene.add(holos);
}

// =====================================================================
//  Animate 3D scene elements
// =====================================================================
function animateScene(scene: THREE.Scene, time: number, bassLevel: number) {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Group && obj.userData.speed) {
      obj.position.x += obj.userData.speed;
      if (obj.position.x > 50) obj.position.x = -50;
    }
    if (obj instanceof THREE.Points && obj.userData.type === 'rain') {
      const p = obj.geometry.attributes.position as THREE.BufferAttribute;
      for (let i=0;i<p.count;i++){let y=p.getY(i);y-=0.3+bassLevel*0.3;if(y<-5)y=50;p.setY(i,y);}
      p.needsUpdate = true;
    }
    if (obj instanceof THREE.Points && obj.userData.type === 'embers') {
      const p = obj.geometry.attributes.position as THREE.BufferAttribute;
      for (let i=0;i<p.count;i++){let y=p.getY(i);y+=0.03+bassLevel*0.08;const x=p.getX(i)+(Math.random()-0.5)*0.05;if(y>25)y=-5;p.setX(i,x);p.setY(i,y);}
      p.needsUpdate = true;
    }
    if (obj instanceof THREE.Points && obj.userData.type === 'holos') {
      const p = obj.geometry.attributes.position as THREE.BufferAttribute;
      for (let i=0;i<p.count;i++){let y=p.getY(i);y+=Math.sin(time*2+i)*0.01+bassLevel*0.02;if(y>20)y=-3;p.setY(i,y);}
      p.needsUpdate = true;
    }
    if (obj instanceof THREE.Mesh && obj.userData.floatSpeed) {
      obj.position.y += Math.sin(time * obj.userData.floatSpeed + obj.userData.floatOffset) * 0.01;
    }
    if (obj instanceof THREE.Mesh && obj.userData.type === 'water') {
      const p = obj.geometry.attributes.position as THREE.BufferAttribute;
      for (let i=0;i<p.count;i++){
        const x=p.getX(i), y=p.getY(i);
        p.setZ(i, Math.sin(x*0.3+time*0.8)*0.15+Math.cos(y*0.2+time*0.6)*0.1+bassLevel*0.3*Math.sin(x*0.5+time*2));
      }
      p.needsUpdate=true; obj.geometry.computeVertexNormals();
    }
  });
}

// =====================================================================
//  2D overlay particle
// =====================================================================
interface Particle2D {
  angle: number; radius: number; baseRadius: number; speed: number;
  size: number; opacity: number; hueShift: number;
}

// =====================================================================
//  Component
// =====================================================================
interface NCSVisualizerProps {
  songTitle: string;
  theme: string;
  analyserNode?: AnalyserNode | null;
  width?: number;
  height?: number;
  className?: string;
}

const NCSVisualizer = React.forwardRef<HTMLCanvasElement, NCSVisualizerProps>(
  ({ songTitle, theme, analyserNode, width = 1280, height = 720, className }, ref) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalCanvasRef;

    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const particlesRef = useRef<Particle2D[]>([]);
    const frameRef = useRef(0);
    const timeRef = useRef(0);
    const prevThemeRef = useRef('');

    // Smoothed audio levels for more pleasing visuals
    const smoothBassRef = useRef(0);
    const smoothMidRef = useRef(0);
    const smoothHighRef = useRef(0);
    const smoothAvgRef = useRef(0);

    const themeConfig = THEME_MAP[theme] || THEME_MAP.Happy;

    const initParticles = useCallback((count: number) => {
      const ps: Particle2D[] = [];
      for (let i = 0; i < count; i++) {
        ps.push({
          angle: (Math.PI * 2 * i) / count, radius: 0,
          baseRadius: 80 + Math.random() * 40, speed: 0.2 + Math.random() * 0.8,
          size: 1.5 + Math.random() * 2.5, opacity: 0.4 + Math.random() * 0.6,
          hueShift: Math.random(),
        });
      }
      particlesRef.current = ps;
    }, []);

    useEffect(() => { initParticles(120); }, [initParticles]);

    const buildScene = useCallback((themeName: string) => {
      const cfg = THEME_MAP[themeName] || THEME_MAP.Happy;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(cfg.scene.skyColor);
      scene.fog = new THREE.Fog(cfg.scene.fogColor, cfg.scene.fogNear, cfg.scene.fogFar);
      scene.add(new THREE.AmbientLight(0xffffff, cfg.scene.ambientIntensity));
      const dir = new THREE.DirectionalLight(cfg.scene.directionalColor, cfg.scene.directionalIntensity);
      dir.position.set(10, 20, -10); scene.add(dir);
      switch (themeName) {
        case 'Happy': buildHappyScene(scene); break;
        case 'Sad': buildSadScene(scene); break;
        case 'Jazz': buildJazzScene(scene); break;
        case 'Dark': buildDarkScene(scene); break;
        case 'Cyberpunk': buildCyberpunkScene(scene); break;
        default: buildHappyScene(scene);
      }
      return scene;
    }, []);

    // Main animation loop — depends on analyserNode prop directly
    useEffect(() => {
      const outputCanvas = canvasRef.current;
      if (!outputCanvas) return;
      const ctx = outputCanvas.getContext('2d');
      if (!ctx) return;

      // Three.js renderer
      let renderer = rendererRef.current;
      if (!renderer) {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(1);
        rendererRef.current = renderer;
      }
      renderer.setSize(width, height);

      let camera = cameraRef.current;
      if (!camera) {
        camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
        camera.position.set(0, 2, 12);
        camera.lookAt(0, 0, -10);
        cameraRef.current = camera;
      } else {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      if (prevThemeRef.current !== theme) {
        sceneRef.current = buildScene(theme);
        prevThemeRef.current = theme;
      }
      const scene = sceneRef.current!;

      // Prepare audio data buffers — re-created when analyserNode changes
      const frequencyData = analyserNode ? new Uint8Array(analyserNode.frequencyBinCount) : null;
      const waveformData = analyserNode ? new Uint8Array(analyserNode.fftSize) : null;

      let running = true;
      const SMOOTH = 0.15; // smoothing factor for audio reactivity

      const draw = () => {
        if (!running) return;
        timeRef.current += 0.016;
        const t = timeRef.current;

        // ---- Audio analysis ----
        let rawBass = 0, rawMid = 0, rawHigh = 0, rawAvg = 0;

        if (analyserNode && frequencyData) {
          analyserNode.getByteFrequencyData(frequencyData);
          if (waveformData) analyserNode.getByteTimeDomainData(waveformData);

          const len = frequencyData.length;
          const bassEnd = Math.floor(len * 0.12);
          const midEnd = Math.floor(len * 0.45);
          let bassSum = 0, midSum = 0, highSum = 0, total = 0;
          for (let i = 0; i < len; i++) {
            const v = frequencyData[i] / 255;
            total += v;
            if (i < bassEnd) bassSum += v;
            else if (i < midEnd) midSum += v;
            else highSum += v;
          }
          rawAvg = total / len;
          rawBass = bassEnd > 0 ? bassSum / bassEnd : 0;
          rawMid = (midEnd - bassEnd) > 0 ? midSum / (midEnd - bassEnd) : 0;
          rawHigh = (len - midEnd) > 0 ? highSum / (len - midEnd) : 0;
        } else {
          // Demo mode
          rawAvg = Math.sin(t * 2) * 0.3 + 0.3;
          rawBass = Math.sin(t * 1.5) * 0.4 + 0.4;
          rawMid = Math.sin(t * 2.5) * 0.3 + 0.3;
          rawHigh = Math.sin(t * 3.5) * 0.2 + 0.2;
        }

        // Smooth the values for pleasing visual transitions
        smoothBassRef.current += (rawBass - smoothBassRef.current) * SMOOTH;
        smoothMidRef.current += (rawMid - smoothMidRef.current) * SMOOTH;
        smoothHighRef.current += (rawHigh - smoothHighRef.current) * SMOOTH;
        smoothAvgRef.current += (rawAvg - smoothAvgRef.current) * SMOOTH;

        const bassLevel = smoothBassRef.current;
        const midLevel = smoothMidRef.current;
        const highLevel = smoothHighRef.current;
        const avgFreq = smoothAvgRef.current;

        // ---- 3D scene ----
        animateScene(scene, t, bassLevel);
        camera!.position.x = Math.sin(t * 0.15) * 1.5;
        camera!.position.y = 2 + Math.sin(t * 0.2) * 0.5 + bassLevel * 1.5;
        camera!.lookAt(0, 0, -10);
        renderer!.render(scene, camera!);

        // ---- Composite to output canvas ----
        ctx.drawImage(renderer!.domElement, 0, 0, width, height);

        // Darken overlay for readability
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, 0, width, height);

        // ---- 2D overlay ----
        const { primaryColor, secondaryColor, pulseIntensity, particleSpeed, glowColor, style } = themeConfig;
        const primRgb = hexToRgb(primaryColor);
        const secRgb = hexToRgb(secondaryColor);
        const W = width, H = height, cx = W / 2, cy = H / 2;

        // Glow
        const glowR = 100 + bassLevel * 100 * pulseIntensity;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR * 1.6);
        grad.addColorStop(0, glowColor);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Frequency-reactive ring
        const baseRingRadius = Math.min(W, H) * 0.18;
        const ringPulse = baseRingRadius + bassLevel * 35 * pulseIntensity;
        const segments = 128;

        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
          const angle = (Math.PI * 2 * i) / segments;
          const freqIndex = frequencyData ? Math.floor((i / segments) * frequencyData.length) : 0;
          const freqVal = frequencyData ? frequencyData[freqIndex] / 255 : (Math.sin(angle * 4 + t * 3) * 0.3 + 0.5);
          let spike = freqVal * 40 * pulseIntensity;
          if (style === 'aggressive') spike += (Math.random() - 0.5) * bassLevel * 25;
          else if (style === 'glitchy' && Math.random() < 0.05 * bassLevel) spike += 35;
          const r = ringPulse + spike;
          const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 20 + bassLevel * 30;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner ring
        ctx.beginPath();
        ctx.arc(cx, cy, ringPulse * 0.55, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${primRgb[0]},${primRgb[1]},${primRgb[2]},0.25)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Frequency bars inside ring (like an equalizer)
        if (frequencyData) {
          const barCount = 48;
          const innerR = ringPulse * 0.3;
          const maxBarH = ringPulse * 0.35;
          for (let i = 0; i < barCount; i++) {
            const angle = (Math.PI * 2 * i) / barCount - Math.PI / 2;
            const fi = Math.floor((i / barCount) * frequencyData.length * 0.7);
            const val = frequencyData[fi] / 255;
            const barH = val * maxBarH;
            const x1 = cx + Math.cos(angle) * innerR;
            const y1 = cy + Math.sin(angle) * innerR;
            const x2 = cx + Math.cos(angle) * (innerR + barH);
            const y2 = cy + Math.sin(angle) * (innerR + barH);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = lerpColor(primRgb, secRgb, val);
            ctx.globalAlpha = 0.4 + val * 0.6;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

        // Orbiting particles
        for (const p of particlesRef.current) {
          p.angle += p.speed * particleSpeed * 0.005;
          let targetR = p.baseRadius + midLevel * 70 * pulseIntensity;
          if (style === 'bouncy') targetR += Math.abs(Math.sin(t * 4 + p.angle * 3)) * 25 * bassLevel;
          else if (style === 'floating') targetR += Math.sin(t * 0.8 + p.angle * 2) * 30;
          else if (style === 'aggressive') targetR += (Math.random() - 0.5) * 35 * bassLevel;
          else if (style === 'glitchy' && Math.random() < 0.02) targetR += (Math.random() - 0.5) * 70;
          p.radius += (targetR - p.radius) * 0.08;
          const px = cx + Math.cos(p.angle) * p.radius;
          const py = cy + Math.sin(p.angle) * p.radius;
          ctx.beginPath();
          ctx.arc(px, py, p.size * (0.8 + highLevel * 0.6), 0, Math.PI * 2);
          ctx.fillStyle = lerpColor(primRgb, secRgb, p.hueShift);
          ctx.globalAlpha = p.opacity * (0.5 + avgFreq * 0.5);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Waveform ring
        if (waveformData) {
          ctx.beginPath();
          const wr = ringPulse * 0.85;
          for (let i = 0; i < waveformData.length; i++) {
            const angle = (Math.PI * 2 * i) / waveformData.length;
            const wv = (waveformData[i] - 128) / 128;
            const r = wr + wv * 18 * pulseIntensity;
            const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(${secRgb[0]},${secRgb[1]},${secRgb[2]},0.35)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Glitch scanlines (Cyberpunk)
        if (style === 'glitchy' && bassLevel > 0.4) {
          ctx.fillStyle = `rgba(${primRgb[0]},${primRgb[1]},${primRgb[2]},0.03)`;
          for (let y = 0; y < H; y += 3) { if (Math.random() < 0.3) ctx.fillRect(0, y, W, 1); }
          if (Math.random() < 0.12 * bassLevel) {
            try {
              const sy = Math.random() * H, sh = 5 + Math.random() * 15;
              const imgD = ctx.getImageData(0, sy, W, sh);
              ctx.putImageData(imgD, (Math.random() - 0.5) * 25, sy);
            } catch (_) { /* ignore */ }
          }
        }

        // Song title
        if (songTitle) {
          const fontSize = Math.max(22, Math.min(40, W * 0.035));
          ctx.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = 12 + bassLevel * 18;
          ctx.fillStyle = `rgba(255,255,255,${0.88 + bassLevel * 0.12})`;
          const textY = cy + ringPulse + 50 + bassLevel * 6;
          ctx.fillText(songTitle, cx, textY);
          ctx.shadowBlur = 0;
          ctx.font = `400 ${fontSize * 0.4}px system-ui, -apple-system, "Segoe UI", sans-serif`;
          ctx.fillStyle = `rgba(${primRgb[0]},${primRgb[1]},${primRgb[2]},0.55)`;
          ctx.fillText('Made with Sinatra', cx, textY + fontSize * 0.8);
        }

        frameRef.current = requestAnimationFrame(draw);
      };

      draw();

      return () => {
        running = false;
        cancelAnimationFrame(frameRef.current);
      };
    }, [canvasRef, analyserNode, themeConfig, songTitle, theme, width, height, buildScene]);

    useEffect(() => {
      return () => {
        if (rendererRef.current) { rendererRef.current.dispose(); rendererRef.current = null; }
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={className}
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }
);

NCSVisualizer.displayName = 'NCSVisualizer';
export default NCSVisualizer;
