"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

/** Nº de toques para abrir (1–13), determinista por carta para que sea estable. */
export function requiredTaps(letterId: string): number {
  let h = 0;
  for (const c of letterId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 1 + (h % 13);
}

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function extrudeCentered(
  shape: THREE.Shape,
  depth: number,
  bevel: number,
  curveSegments = 12,
): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments,
  });
  geo.center();
  return geo;
}

function makeCardTexture(name: string, brand: string, font: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FFFDFE";
  ctx.fillRect(0, 0, 512, 288);
  ctx.strokeStyle = "#E9D9C6";
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, 484, 260);
  ctx.textAlign = "center";
  ctx.fillStyle = brand;
  ctx.font = `600 84px "${font}", cursive`;
  const short = name.length > 14 ? name.slice(0, 14) + "…" : name;
  ctx.fillText(short, 256, 168);
  ctx.font = "44px serif";
  ctx.fillText("♥", 256, 232);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Sello circular con el icono de openletter (sobre + corazón), estilo icon.svg. */
function makeSealTexture(brand: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = brand;
  ctx.fillRect(0, 0, 256, 256);
  // Sobre blanco simplificado
  ctx.fillStyle = "#ffffff";
  const x = 58, y = 96, w = 140, h = 88, r = 14;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  // Solapa del sobre
  ctx.strokeStyle = brand;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 16);
  ctx.lineTo(128, y + 58);
  ctx.lineTo(x + w - 12, y + 16);
  ctx.stroke();
  // Corazón central
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(128, 196);
  ctx.bezierCurveTo(128, 188, 106, 176, 106, 162);
  ctx.bezierCurveTo(106, 152, 114, 146, 121, 146);
  ctx.bezierCurveTo(124, 146, 127, 148, 128, 151);
  ctx.bezierCurveTo(129, 148, 132, 146, 135, 146);
  ctx.bezierCurveTo(142, 146, 150, 152, 150, 162);
  ctx.bezierCurveTo(150, 176, 128, 188, 128, 196);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  // Degradado muy difuso: núcleo tenue que se disipa por completo en el borde.
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
  g.addColorStop(0, "rgba(90,40,60,0.30)");
  g.addColorStop(0.45, "rgba(90,40,60,0.14)");
  g.addColorStop(0.75, "rgba(90,40,60,0.04)");
  g.addColorStop(1, "rgba(90,40,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Sobre de papel crema con cinta y sello openletter (mobile-first, centrado):
 * cada tap/clic abre un poco más la solapa; el sello se rompe al inicio,
 * la carta pasa al frente y el sobre se desvanece.
 */
export function SealedEnvelope({
  letterId,
  recipientName,
  invite,
  tapLabel,
  brand,
  brandSoft,
  paper,
  scriptFont,
  onDone,
}: {
  letterId: string;
  recipientName: string;
  invite: string;
  tapLabel: (taps: number, needed: number) => string;
  brand: string;
  brandSoft: string;
  paper: string;
  scriptFont: string;
  onDone: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [taps, setTaps] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const needed = requiredTaps(letterId);
  const tapsRef = useRef(0);
  const onDoneRef = useRef(onDone);
  const anim = useRef({ target: 0, shown: 0, done: false, finished: false, pulse: 0 });

  const tap = useCallback(() => {
    const st = anim.current;
    if (st.done) return;
    tapsRef.current += 1;
    setTaps(tapsRef.current);
    st.pulse = 1;
    st.target = Math.min(1, tapsRef.current / needed);
    if (tapsRef.current >= needed) st.done = true;
  }, [needed]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    // onDone se lee vía ref para no reiniciar la escena si el padre re-renderiza.
    onDoneRef.current = onDone;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

    // Iluminación: hemisferio suave + clave cálida + relleno rosa + contraluz
    scene.add(new THREE.HemisphereLight(0xfff5f8, 0xe6cfd9, 0.95));
    const key = new THREE.DirectionalLight(0xfff2e8, 1.7);
    key.position.set(4, 6, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffd9e6, 0.65);
    fill.position.set(-5, 1, 4);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.8);
    rim.position.set(-2, 3, -5);
    scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);
    // `env` contiene el sobre; se recentra por bounding-box para que el
    // centro geométrico quede en el origen (centrado vertical y horizontal).
    const env = new THREE.Group();
    group.add(env);

    const paperMat = (color: string, extra?: Partial<THREE.MeshPhysicalMaterialParameters>) =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.75,
        metalness: 0,
        clearcoat: 0.18,
        clearcoatRoughness: 0.6,
        ...extra,
      });

    // Cuerpo de papel crema con bordes redondeados y relieve (bisel)
    const body = new THREE.Mesh(extrudeCentered(roundedRect(3.2, 2.15, 0.14), 0.1, 0.03), paperMat(paper));
    env.add(body);

    // Solapas laterales (triángulos clásicos del sobre)
    const sideMat = paperMat(brandSoft, { side: THREE.DoubleSide });
    const leftShape = new THREE.Shape();
    leftShape.moveTo(-1.6, -1.075);
    leftShape.lineTo(-1.6, 0.42);
    leftShape.lineTo(0, -0.32);
    leftShape.closePath();
    const leftFlap = new THREE.Mesh(new THREE.ShapeGeometry(leftShape), sideMat);
    leftFlap.position.z = 0.082;
    const rightFlap = leftFlap.clone();
    rightFlap.scale.x = -1;
    env.add(leftFlap, rightFlap);

    // Bolsillo inferior frontal
    const pocket = new THREE.Mesh(extrudeCentered(roundedRect(3.2, 1.28, 0.1), 0.05, 0.02), paperMat(paper));
    pocket.position.set(0, -0.44, 0.06);
    env.add(pocket);

    // Cinta fina vertical sobre el bolsillo
    const ribbonMat = paperMat(brand, { roughness: 0.55 });
    const ribbonV = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.3, 0.03), ribbonMat);
    ribbonV.position.set(0, -0.44, 0.1);
    env.add(ribbonV);

    // Solapa superior con bisagra en el borde de arriba
    const flapGeo = extrudeCentered(roundedRect(3.2, 1.32, 0.1), 0.04, 0.02);
    flapGeo.translate(0, -0.66, 0);
    const flap = new THREE.Mesh(
      flapGeo,
      paperMat(brandSoft, { side: THREE.DoubleSide }),
    );
    flap.position.set(0, 1.075, 0.09);
    env.add(flap);

    // Cinta fina sobre la solapa (continúa la vertical; coords locales: bisagra en 0,0)
    const ribbonFlap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.3, 0.03), ribbonMat);
    ribbonFlap.geometry.translate(0, -0.65, 0);
    ribbonFlap.position.set(0, 0, 0.03);
    flap.add(ribbonFlap);

    // Sello circular con el icono de openletter, al centro
    const sealTex = makeSealTexture(brand);
    const sealSide = new THREE.MeshPhysicalMaterial({
      color: brand,
      roughness: 0.35,
      clearcoat: 0.8,
      clearcoatRoughness: 0.4,
    });
    const sealTop = new THREE.MeshPhysicalMaterial({
      map: sealTex,
      roughness: 0.35,
      clearcoat: 0.8,
      clearcoatRoughness: 0.4,
    });
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.09, 48), [
      sealSide,
      sealTop,
      sealSide,
    ]);
    seal.rotation.x = Math.PI / 2; // cara con icono hacia la cámara
    seal.position.set(0, -0.14, 0.18);
    env.add(seal);

    // Carta interior: base con relieve + cara con el nombre
    const cardTex = makeCardTexture(recipientName, brand, scriptFont);
    const cardGroup = new THREE.Group();
    const cardBase = new THREE.Mesh(extrudeCentered(roundedRect(2.6, 1.5, 0.09), 0.03, 0.015), paperMat("#FFFDFE"));
    const cardFace = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 1.41),
      new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.9 }),
    );
    cardFace.position.z = 0.032;
    cardGroup.add(cardBase, cardFace);
    cardGroup.position.set(0, -0.1, 0.0);
    env.add(cardGroup);

    // Sombra de contacto suave bajo el sobre
    const shadowTex = makeShadowTexture();
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 1.6),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
    );
    shadow.position.set(0, -1.7, -0.4);
    scene.add(shadow);

    // Centrado real: el centro del bounding-box (solapa cerrada) va al origen.
    // `group` conserva la flotación/rotación alrededor de ese centro.
    const bbox = new THREE.Box3().setFromObject(env);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    env.position.sub(center);

    // Encuadre con aire: el sobre ocupa ~62% del ancho y ~55% del alto.
    // En móvil/retrato manda el ancho; en escritorio, el alto.
    const frame = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      // updateStyle=true: el canvas mide exactamente lo que el contenedor.
      // Con `false` el canvas se mostraba al tamaño del backing store
      // (×pixelRatio) y desbordaba, rompiendo el encuadre y generando
      // un bucle con el ResizeObserver vía las scrollbars.
      renderer.setSize(w, h);
      const aspect = w / h;
      camera.aspect = aspect;
      const vFov = THREE.MathUtils.degToRad(camera.fov / 2);
      const distH = size.y / 0.55 / (2 * Math.tan(vFov));
      const distW = size.x / 0.62 / (2 * Math.tan(vFov) * aspect);
      camera.position.set(0, 0, Math.max(distH, distW));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };
    frame();
    const ro = new ResizeObserver(frame);
    ro.observe(mount);

    let raf = 0;
    const t0 = performance.now();
    const finish = () => {
      const st = anim.current;
      if (st.finished) return;
      st.finished = true;
      setLeaving(true);
      setTimeout(() => onDoneRef.current(), 650);
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const st = anim.current;
      const t = (performance.now() - t0) / 1000;
      st.shown += (st.target - st.shown) * 0.12;
      if (Math.abs(st.target - st.shown) < 0.001) st.shown = st.target;

      flap.rotation.x = -st.shown * 2.2;
      // El lacre se quiebra al principio (primeros toques)
      const sealScale = Math.max(0, 1 - st.shown * 4.5);
      seal.scale.setScalar(Math.max(sealScale, 0.0001));
      seal.visible = sealScale > 0.01;
      // Final: la carta pasa al frente y al centro del escenario mientras el
      // sobre se hace pequeño debajo. Nada se solapa a medias: la carta queda
      // legible y el sobre acompaña abajo hasta el fundido.
      const cardT = THREE.MathUtils.smoothstep(st.shown, 0.7, 1);
      cardGroup.position.y = -0.1 + cardT * 0.65;
      cardGroup.position.z = cardT * 1.2;
      cardGroup.scale.setScalar(1 + cardT * 0.25);
      env.scale.setScalar(1 - cardT * 0.18);
      env.position.y = -center.y - cardT * 0.55;
      // Flotación suave + pulso al tocar
      st.pulse *= 0.92;
      group.scale.setScalar(1 + st.pulse * 0.06);
      group.rotation.y = Math.sin(t * 0.55) * 0.07;
      group.position.y = Math.sin(t * 0.85) * 0.05;

      renderer.render(scene, camera);
      if (st.done && st.shown >= 0.999) finish();
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => disposeMat(x));
        else if (m) disposeMat(m);
      });
      cardTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientName, brand, brandSoft, paper, scriptFont]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6" style={{ background: `linear-gradient(180deg, var(--bg0, #F4F4F6) 0%, var(--bg1, #EDEDF1) 100%)` }}>
      <div
        ref={mountRef}
        role="button"
        tabIndex={0}
        aria-label={`Sobre para ${recipientName}. ${invite}.`}
        onPointerDown={tap}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            tap();
          }
        }}
        className="mx-auto h-[50dvh] w-full max-w-[400px] cursor-pointer touch-manipulation overflow-hidden outline-none transition-opacity duration-500 focus-visible:ring-4 focus-visible:ring-[#E0698F]/40"
        style={{ opacity: leaving ? 0 : 1, pointerEvents: leaving ? "none" : "auto" }}
      />
      <p
        className="mt-2 text-center text-sm font-semibold text-[#6B6B76] transition-opacity duration-500"
        style={{ opacity: leaving ? 0 : 1 }}
      >
        {taps === 0 ? invite : tapLabel(taps, needed)}
      </p>
      <div
        className="mt-3 flex gap-1.5 transition-opacity duration-500"
        aria-hidden
        style={{ opacity: leaving ? 0 : 1 }}
      >
        {Array.from({ length: needed }).map((_, i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full transition-colors"
            style={{ background: i < taps ? brand : "#E0E0E8" }}
          />
        ))}
      </div>
    </div>
  );
}

function disposeMat(m: THREE.Material) {
  const withMap = m as THREE.Material & { map?: THREE.Texture | null };
  withMap.map?.dispose();
  m.dispose();
}
