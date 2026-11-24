"use client";

// 입자 스캔 선수 — 포즈 엔진의 관절 점에서 몸 표면 점 약 7천 개를 매 프레임 계산해 빛나는 입자로 그린다
// Design Ref: immersive-design 설계 2번 (입자 선수·분해 효과·각도 HUD), "기억에 남을 한 가지"
// 스크롤 막에 따라: 1막 입자 몸 → 2막 입자가 흩어지고 뼈대·관절 표식 등장 → 3막 각도 호·숫자 라벨 → 4막 흐려짐

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SPORTS, getSteps } from "@/lib/data/sports";
import { clonePoints, KEYPOINT_IDS, lerpPointsInPlace, solvePose, type KeypointId, type PosePoints } from "@/lib/pose/skeleton";
import { computeAngles, jointKeypoints } from "@/lib/pose/angles";
import type { JointAngleId } from "@/lib/pose/types";
import { experience, hud, toScreen } from "@/lib/experience/store";
import { seededRandom } from "@/lib/experience/random";
import { scanHeight } from "./LabEnvironment";

// ── 보여 줄 자세 (여러 종목의 대표 동작을 번갈아) ──
const SHOWCASE = [
  "soccer-quad:left",
  "basketball-sidebend:left",
  "running-hipflexor:left",
  "tennis-triceps:left",
  "soccer-hamstring:left",
  "basketball-squat",
];
const POSES = SPORTS.flatMap((s) => getSteps(s))
  .filter((st) => SHOWCASE.includes(st.key))
  .sort((a, b) => SHOWCASE.indexOf(a.key) - SHOWCASE.indexOf(b.key))
  .map((step) => ({ step, points: solvePose(step.pose) }));
/** 한 자세를 보여 주는 시간(초) */
const HOLD_S = 4.2;

// ── 몸을 이루는 마디: 팔다리·어깨선·골반선·목은 원기둥, 몸통은 타원기둥, 머리는 구 ──
type Extra = "hipMid" | "shoulderMid" | "neckTop" | "head";
type Anchor = KeypointId | Extra;
type Seg = { a: Anchor; b: Anchor; r0: number; r1: number; kind: "tube" | "torso" | "head" };
const SEGS: Seg[] = [
  { a: "shoulderL", b: "elbowL", r0: 0.055, r1: 0.045, kind: "tube" },
  { a: "elbowL", b: "wristL", r0: 0.045, r1: 0.034, kind: "tube" },
  { a: "wristL", b: "indexL", r0: 0.034, r1: 0.024, kind: "tube" },
  { a: "shoulderR", b: "elbowR", r0: 0.055, r1: 0.045, kind: "tube" },
  { a: "elbowR", b: "wristR", r0: 0.045, r1: 0.034, kind: "tube" },
  { a: "wristR", b: "indexR", r0: 0.034, r1: 0.024, kind: "tube" },
  { a: "hipL", b: "kneeL", r0: 0.085, r1: 0.06, kind: "tube" },
  { a: "kneeL", b: "ankleL", r0: 0.06, r1: 0.042, kind: "tube" },
  { a: "ankleL", b: "toeL", r0: 0.045, r1: 0.032, kind: "tube" },
  { a: "hipR", b: "kneeR", r0: 0.085, r1: 0.06, kind: "tube" },
  { a: "kneeR", b: "ankleR", r0: 0.06, r1: 0.042, kind: "tube" },
  { a: "ankleR", b: "toeR", r0: 0.045, r1: 0.032, kind: "tube" },
  { a: "shoulderL", b: "shoulderR", r0: 0.055, r1: 0.055, kind: "tube" },
  { a: "hipL", b: "hipR", r0: 0.075, r1: 0.075, kind: "tube" },
  { a: "shoulderMid", b: "neckTop", r0: 0.045, r1: 0.04, kind: "tube" },
  { a: "hipMid", b: "shoulderMid", r0: 0.15, r1: 0.17, kind: "torso" },
  { a: "neckTop", b: "head", r0: 0.105, r1: 0.105, kind: "head" },
];
const PARTICLES = 7000;

/** 관절 점 16개 + 몸통 가운데·목·머리 */
function withExtras(p: PosePoints, out: Record<Anchor, THREE.Vector3>) {
  for (const id of KEYPOINT_IDS) out[id].copy(p[id]);
  out.hipMid.addVectors(p.hipL, p.hipR).multiplyScalar(0.5);
  out.shoulderMid.addVectors(p.shoulderL, p.shoulderR).multiplyScalar(0.5);
  const spine = tmp.a.subVectors(out.shoulderMid, out.hipMid).normalize();
  out.neckTop.copy(out.shoulderMid).addScaledVector(spine, 0.09);
  out.head.copy(out.shoulderMid).addScaledVector(spine, 0.2);
}

const tmp = {
  a: new THREE.Vector3(),
  dir: new THREE.Vector3(),
  u: new THREE.Vector3(),
  v: new THREE.Vector3(),
  left: new THREE.Vector3(),
  fwd: new THREE.Vector3(),
};
const UP = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);

/** 각도 라벨에 쓰는 짧은 영문 코드 */
function jointCode(id: JointAngleId) {
  const side = id.endsWith("L") ? "L" : id.endsWith("R") ? "R" : "";
  const name = id.replace(/[LR]$/, "").replace("shoulderAcross", "shldr-x").replace("trunk", "trunk-");
  return `${name.toUpperCase()}${side ? ` · ${side}` : ""}`;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function ParticleAthlete() {
  const gl = useThree((s) => s.gl);

  // 입자마다 고정 값: 어느 마디의 몇 % 지점, 둘레 각도, 반지름 비율, 흩어질 방향
  const data = useMemo(() => {
    const rest = solvePose(POSES[0].step.pose);
    const ext = Object.fromEntries(
      [...KEYPOINT_IDS, "hipMid", "shoulderMid", "neckTop", "head"].map((k) => [k, new THREE.Vector3()]),
    ) as Record<Anchor, THREE.Vector3>;
    withExtras(rest, ext);
    // 마디 겉넓이에 비례해 입자 수를 나눈다
    const areas = SEGS.map((s) =>
      s.kind === "head" ? 4 * Math.PI * s.r0 * s.r0 : ext[s.a].distanceTo(ext[s.b]) * Math.PI * (s.r0 + s.r1),
    );
    const total = areas.reduce((x, y) => x + y, 0);
    const rnd = seededRandom(7);
    const seg = new Uint8Array(PARTICLES);
    const t = new Float32Array(PARTICLES);
    const theta = new Float32Array(PARTICLES);
    const rj = new Float32Array(PARTICLES);
    const rand = new Float32Array(PARTICLES);
    const dir = new Float32Array(PARTICLES * 3);
    let i = 0;
    SEGS.forEach((s, si) => {
      const n = si === SEGS.length - 1 ? PARTICLES - i : Math.round((areas[si] / total) * PARTICLES);
      for (let k = 0; k < n && i < PARTICLES; k++, i++) {
        seg[i] = si;
        t[i] = s.kind === "head" ? Math.acos(2 * rnd() - 1) : rnd();
        theta[i] = rnd() * Math.PI * 2;
        rj[i] = 0.82 + rnd() * 0.22; // 표면 근처에 두께감
        rand[i] = rnd();
        const d = new THREE.Vector3(rnd() - 0.5, rnd() - 0.3, rnd() - 0.5).normalize();
        dir.set([d.x, d.y, d.z], i * 3);
      }
    });
    return { seg, t, theta, rj, rand, dir, ext };
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PARTICLES * 3), 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(data.rand, 1));
    g.setAttribute("aDir", new THREE.BufferAttribute(data.dir, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 3);
    return g;
  }, [data]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uScatter: { value: 0 },
          uScanY: { value: 1 },
          uSize: { value: 26 },
          uPixelRatio: { value: Math.min(gl.getPixelRatio(), 1.5) },
          uOpacity: { value: 1 },
        },
        vertexShader: /* glsl */ `
          attribute float aRand;
          attribute vec3 aDir;
          uniform float uTime, uScatter, uScanY, uSize, uPixelRatio;
          varying float vScan;
          varying float vH;
          varying float vRand;
          void main() {
            vec3 p = position;
            p += aDir * uScatter * (0.35 + aRand * 1.1);
            p.y += sin(uTime * 1.3 + aRand * 20.0) * 0.004;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            vScan = 1.0 - smoothstep(0.0, 0.05, abs(position.y - uScanY));
            vH = position.y;
            vRand = aRand;
            gl_PointSize = uSize * uPixelRatio * (0.55 + aRand * 0.8) * (1.0 + vScan * 1.3) / -mv.z;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime, uOpacity;
          varying float vScan;
          varying float vH;
          varying float vRand;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d);
            vec3 base = mix(vec3(0.40, 0.48, 0.60), vec3(0.86, 0.92, 0.98), clamp(vH / 1.8, 0.0, 1.0));
            vec3 col = mix(base, vec3(0.78, 1.0, 0.24), vScan * 0.85);
            float flick = 0.75 + 0.25 * sin(uTime * 3.0 + vRand * 40.0);
            gl_FragColor = vec4(col * (1.0 + vScan * 1.6), a * uOpacity * flick * (0.5 + vScan * 0.5));
          }`,
      }),
    [gl],
  );

  // 뼈대 선과 관절 표식
  const BONES: [Anchor, Anchor][] = useMemo(
    () => [
      ["shoulderL", "elbowL"], ["elbowL", "wristL"], ["shoulderR", "elbowR"], ["elbowR", "wristR"],
      ["hipL", "kneeL"], ["kneeL", "ankleL"], ["ankleL", "toeL"], ["hipR", "kneeR"], ["kneeR", "ankleR"], ["ankleR", "toeR"],
      ["shoulderL", "shoulderR"], ["hipL", "hipR"], ["hipMid", "shoulderMid"], ["shoulderMid", "head"],
    ],
    [],
  );
  const boneGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(BONES.length * 6), 3));
    return g;
  }, [BONES]);
  const boneMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#7dd3fc").multiplyScalar(1.8),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const MARKERS: Anchor[] = useMemo(
    () => [...KEYPOINT_IDS.filter((k) => !k.startsWith("index") && !k.startsWith("toe")), "head"],
    [],
  );
  const markerGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MARKERS.length * 3), 3));
    return g;
  }, [MARKERS]);
  const markerMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uOpacity: { value: 0 }, uPixelRatio: { value: Math.min(gl.getPixelRatio(), 1.5) } },
        vertexShader: /* glsl */ `uniform float uPixelRatio; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 62.0 * uPixelRatio / -mv.z; }`,
        fragmentShader: /* glsl */ `uniform float uOpacity; void main(){ float d = length(gl_PointCoord - 0.5);
          float ring = smoothstep(0.5, 0.44, d) * smoothstep(0.3, 0.36, d); float dot = smoothstep(0.12, 0.0, d);
          float a = (ring + dot) * uOpacity; if (a < 0.01) discard; gl_FragColor = vec4(vec3(0.78, 1.0, 0.24) * 1.8, a); }`,
      }),
    [gl],
  );

  // 각도 호 3개 + 라벨 3개 (지금 자세의 핵심 관절 중 3점 각도인 것)
  const ARC_SEG = 24;
  const arcs = useMemo(
    () =>
      Array.from({ length: 3 }, () => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((ARC_SEG + 1) * 3), 3));
        const m = new THREE.LineBasicMaterial({
          color: new THREE.Color("#c6ff3d").multiplyScalar(2),
          transparent: true,
          opacity: 0,
          toneMapped: false,
          depthWrite: false,
        });
        return new THREE.Line(g, m);
      }),
    [],
  );
  const screenTmp = useMemo(() => new THREE.Vector3(), []);

  // 움직이는 상태
  const live = useRef({ points: clonePoints(POSES[0].points), index: 0, timer: 0 });

  useFrame((state, delta) => {
    const reduce = experience.reducedMotion;
    const L = live.current;
    const dt = Math.min(delta, 0.1);
    const time = reduce ? 0 : state.clock.elapsedTime;

    // 자세 바꾸기 (움직임 줄이기면 첫 자세에 멈춤)
    if (!reduce) {
      L.timer += dt;
      if (L.timer > HOLD_S) {
        L.timer = 0;
        L.index = (L.index + 1) % POSES.length;
      }
    }
    const pose = POSES[L.index];
    lerpPointsInPlace(L.points, pose.points, 1 - Math.exp(-3.2 * dt));
    const ext = data.ext;
    withExtras(L.points, ext);

    // ── 막별 값 (스크롤 진행도 0~1) ──
    const p = experience.progress;
    const scan = smooth(0.14, 0.32, p) * (1 - smooth(0.42, 0.56, p)); // 2막: 흩어짐 (3막 전에 다시 모임)
    const skeleton = smooth(0.18, 0.38, p) * (1 - smooth(0.86, 1.0, p));
    const compare = smooth(0.42, 0.58, p) * (1 - smooth(0.8, 0.92, p)); // 3막: 각도
    const choose = smooth(0.72, 0.96, p); // 4막: 종목 선택

    // ── 입자 위치 계산 ──
    const pos = geometry.attributes.position.array as Float32Array;
    // 몸통 축 (몸 기준 왼쪽·앞)
    const spine = tmp.dir.subVectors(ext.shoulderMid, ext.hipMid).normalize();
    tmp.left.subVectors(ext.shoulderL, ext.shoulderR);
    tmp.left.addScaledVector(spine, -tmp.left.dot(spine)).normalize();
    tmp.fwd.crossVectors(tmp.left, spine).normalize();
    const torsoLeft = tmp.left.clone();
    const torsoFwd = tmp.fwd.clone();
    const spineDir = spine.clone();
    const segBasis = SEGS.map((s) => {
      const a = ext[s.a];
      const b = ext[s.b];
      if (s.kind === "head") return { a: b, dir: spineDir, len: 0, u: torsoLeft, v: torsoFwd };
      const d = new THREE.Vector3().subVectors(b, a);
      const len = d.length();
      d.divideScalar(len || 1);
      if (s.kind === "torso") return { a, dir: d, len, u: torsoLeft, v: torsoFwd };
      const helper = Math.abs(d.y) < 0.9 ? UP : X;
      const u = new THREE.Vector3().crossVectors(d, helper).normalize();
      const v = new THREE.Vector3().crossVectors(d, u);
      return { a, dir: d, len, u, v };
    });
    for (let i = 0; i < PARTICLES; i++) {
      const s = SEGS[data.seg[i]];
      const B = segBasis[data.seg[i]];
      const th = data.theta[i];
      let x: number, y: number, z: number;
      if (s.kind === "head") {
        const phi = data.t[i];
        const r = s.r0 * data.rj[i];
        const sx = Math.sin(phi) * Math.cos(th) * r;
        const sy = Math.cos(phi) * r * 1.12;
        const sz = Math.sin(phi) * Math.sin(th) * r;
        x = B.a.x + B.u.x * sx + B.dir.x * sy + B.v.x * sz;
        y = B.a.y + B.u.y * sx + B.dir.y * sy + B.v.y * sz;
        z = B.a.z + B.u.z * sx + B.dir.z * sy + B.v.z * sz;
      } else {
        const tt = data.t[i];
        let ru: number, rv: number;
        if (s.kind === "torso") {
          // 엉덩이 넓게 → 허리 좁게 → 가슴 넓게
          const w = 0.15 - 0.03 * Math.sin(tt * Math.PI) + 0.03 * tt * tt;
          ru = w * data.rj[i];
          rv = 0.1 * data.rj[i];
        } else {
          ru = rv = (s.r0 + (s.r1 - s.r0) * tt) * data.rj[i];
        }
        const c = Math.cos(th) * ru;
        const sn = Math.sin(th) * rv;
        const along = tt * B.len;
        x = B.a.x + B.dir.x * along + B.u.x * c + B.v.x * sn;
        y = B.a.y + B.dir.y * along + B.u.y * c + B.v.y * sn;
        z = B.a.z + B.dir.z * along + B.u.z * c + B.v.z * sn;
      }
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    geometry.attributes.position.needsUpdate = true;

    const u = material.uniforms;
    u.uTime.value = time;
    u.uScatter.value = scan * 0.26;
    u.uScanY.value = scanHeight(reduce ? 2.2 : state.clock.elapsedTime);
    u.uOpacity.value = (1 - 0.5 * scan) * (1 - 0.55 * choose);

    // ── 뼈대 선·관절 표식 ──
    const bp = boneGeo.attributes.position.array as Float32Array;
    BONES.forEach(([a, b], i) => {
      bp.set([ext[a].x, ext[a].y, ext[a].z, ext[b].x, ext[b].y, ext[b].z], i * 6);
    });
    boneGeo.attributes.position.needsUpdate = true;
    boneMat.opacity = skeleton * 0.85;
    const mp = markerGeo.attributes.position.array as Float32Array;
    MARKERS.forEach((k, i) => mp.set([ext[k].x, ext[k].y, ext[k].z], i * 3));
    markerGeo.attributes.position.needsUpdate = true;
    markerMat.uniforms.uOpacity.value = skeleton;

    // ── 각도 호·라벨: 지금 자세의 핵심 관절 (3점 각도만, 최대 3개) ──
    const joints = pose.step.keyJoints.filter((j) => !j.startsWith("trunk")).slice(0, 3);
    const angles = computeAngles(L.points);
    arcs.forEach((line, i) => {
      const mat = line.material as THREE.LineBasicMaterial;
      const box = hud.joints[i];
      const joint = joints[i];
      if (!joint) {
        mat.opacity = 0;
        if (box) box.style.opacity = "0";
        return;
      }
      const [ka, kb, kc] = jointKeypoints(joint);
      const B = L.points[kb];
      const da = tmp.u.subVectors(L.points[ka], B).normalize();
      const dc = tmp.v.subVectors(L.points[kc], B).normalize();
      const arr = line.geometry.attributes.position.array as Float32Array;
      const qa = new THREE.Quaternion().setFromUnitVectors(X, da);
      const qc = new THREE.Quaternion().setFromUnitVectors(X, dc);
      const q = new THREE.Quaternion();
      for (let k = 0; k <= ARC_SEG; k++) {
        q.slerpQuaternions(qa, qc, k / ARC_SEG);
        const d = tmp.a.copy(X).applyQuaternion(q).multiplyScalar(0.16);
        arr.set([B.x + d.x, B.y + d.y, B.z + d.z], k * 3);
      }
      line.geometry.attributes.position.needsUpdate = true;
      mat.opacity = compare;
      if (box) {
        const sp = toScreen(B, state.camera, state.size, screenTmp);
        box.style.opacity = sp ? String(compare) : "0";
        if (sp) {
          box.style.transform = `translate(${sp.x}px, ${sp.y}px)`;
          // 화면 오른쪽 끝에 가까우면 라벨을 왼쪽으로 뒤집어 잘리지 않게 한다 (좁은 화면 대응, DS-6)
          box.dataset.flip = sp.x > state.size.width - 180 ? "1" : "0";
        }
      }
      const code = hud.jointCodes[i];
      const val = hud.jointVals[i];
      if (code && code.textContent !== jointCode(joint)) code.textContent = jointCode(joint);
      if (val) val.textContent = `${String(Math.round(angles[joint])).padStart(3, "0")}°`;
    });
  });

  return (
    <group>
      <points geometry={geometry} material={material} frustumCulled={false} />
      <lineSegments geometry={boneGeo} material={boneMat} frustumCulled={false} />
      <points geometry={markerGeo} material={markerMat} frustumCulled={false} />
      {arcs.map((line, i) => (
        <primitive key={`arc-${i}`} object={line} frustumCulled={false} />
      ))}
    </group>
  );
}
