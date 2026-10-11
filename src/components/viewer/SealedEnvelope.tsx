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

/** Corazón clásico (curvas de la doc de three.js), centrado en el origen. */
function heartShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(5, 5);
  s.bezierCurveTo(5, 5, 4, 0, 0, 0);
  s.bezierCurveTo(-6, 0, -6, 7, -6, 7);
  s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
  s.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
  s.bezierCurveTo(16, 7, 16, 0, 10, 0);
  s.bezierCurveTo(7, 0, 5, 5, 5, 5);
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

function makeCardTexture(name: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FFF9FB";
  ctx.fillRect(0, 0, 512, 288);
  ctx.strokeStyle = "#F3C6D6";
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, 484, 260);
  ctx.textAlign = "center";
  ctx.fillStyle = "#8a8a95";
  ctx.font = "600 26px Inter, sans-serif";
  ctx.fillText("P A R A", 256, 84);
  ctx.fillStyle = "#D6457F";
  ctx.font = "700 72px Caveat, cursive";
  const short = name.length > 14 ? name.slice(0, 14) + "…" : name;
  ctx.fillText(short, 256, 172);
  ctx.font = "48px serif";
  ctx.fillText("♥", 256, 236);
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
 * Sobre sellado 3D (mobile-first, centrado): cada tap/clic abre un poco más
 * la solapa hasta completar los toques requeridos; el lacre de cera en forma
 * de corazón se rompe al inicio y la carta sale al final.
 */
export function SealedEnvelope({
  letterId,
  recipientName,
  onDone,
}: {
  letterId: string;
  recipientName: string;
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

    const paper = (color: string, extra?: Partial<THREE.MeshPhysicalMaterialParameters>) =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.75,
        metalness: 0,
        clearcoat: 0.18,
        clearcoatRoughness: 0.6,
        ...extra,
      });

    // Cuerpo con bordes redondeados y relieve (bisel)
    const body = new THREE.Mesh(extrudeCentered(roundedRect(3.2, 2.15, 0.14), 0.1, 0.03), paper("#ffffff"));
    env.add(body);

    // Solapas laterales (triángulos clásicos del sobre)
    const sideMat = paper("#F6D3E0", { side: THREE.DoubleSide });
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
    const pocket = new THREE.Mesh(extrudeCentered(roundedRect(3.2, 1.28, 0.1), 0.05, 0.02), paper("#FBE4EC"));
    pocket.position.set(0, -0.44, 0.06);
    env.add(pocket);

    // Solapa superior con bisagra en el borde de arriba
    const flapGeo = extrudeCentered(roundedRect(3.2, 1.32, 0.1), 0.04, 0.02);
    flapGeo.translate(0, -0.66, 0);
    const flap = new THREE.Mesh(
      flapGeo,
      paper("#F3C9D8", { side: THREE.DoubleSide }),
    );
    flap.position.set(0, 1.075, 0.09);
    env.add(flap);

    // Lacre de cera en forma de corazón con relieve, al centro
    const heartGeo = new THREE.ExtrudeGeometry(heartShape(), {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 3,
      curveSegments: 24,
    });
    heartGeo.center();
    const wax = new THREE.Mesh(
      heartGeo,
      new THREE.MeshPhysicalMaterial({
        color: "#C2244F",
        roughness: 0.32,
        metalness: 0,
        clearcoat: 0.9,
        clearcoatRoughness: 0.35,
      }),
    );
    wax.scale.setScalar(0.024);
    const seal = new THREE.Group();
    seal.add(wax);
    seal.position.set(0, -0.14, 0.17);
    seal.rotation.z = Math.PI; // punta del corazón hacia abajo
    env.add(seal);

    // Carta interior: base con relieve + cara con el nombre
    const cardTex = makeCardTexture(recipientName);
    const cardGroup = new THREE.Group();
    const cardBase = new THREE.Mesh(extrudeCentered(roundedRect(2.6, 1.5, 0.09), 0.03, 0.015), paper("#FFFDFE"));
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
  }, [recipientName]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-[#F4F4F6] to-[#EDEDF1] px-6">
      <div
        ref={mountRef}
        role="button"
        tabIndex={0}
        aria-label={`Sobre sellado para ${recipientName}. Tócalo ${needed} ${needed === 1 ? "vez" : "veces"} para abrirlo.`}
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
        {taps === 0 ? <>Toca el sobre para abrirlo</> : <>{taps} / {needed}</>}
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
            style={{ background: i < taps ? "#D6457F" : "#E0E0E8" }}
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
