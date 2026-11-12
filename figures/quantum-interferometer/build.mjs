// Fig 1. One qubit on an optical bench: a Mach-Zehnder interferometer.
// Build: node figures/quantum-interferometer/build.mjs [--light]
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 660;
const HEIGHT = 440;

// ---- the model: everything shown comes from these numbers ------------------
// |psi> = H . Phase(phi) . H |0>  ->  P(0) = cos^2(phi / 2), P(1) = sin^2(phi / 2)
const PHASE_STOPS = [0, 45, 90, 135, 180];
const WINDOW = 24; // clicks kept for the measured share

// ---- world layout ----------------------------------------------------------
const PLATE = { x: -154, y: -130, w: 308, d: 198, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;
const BZ = 26; // beam height
const ROW_A = 35; // upper arm, y
const ROW_B = -45; // lower arm, y
const COL_1 = -50; // first splitter, x
const COL_2 = 60; // second splitter, x
const CUBE = 8; // half size of a splitter cube
const SCALE_H = 40; // tally column travel
const DET_TOP = 36;
const TALLY_Z = 15; // top of the counter
const D0 = [129, ROW_B];
const D1 = [COL_2, -108];
const COUNTER = { x: -144, y: -118, w: 52, d: 32, r: 3 };
const STATIONS = { 0: [-132, -102], 1: [-106, -102] };
const PHASE = [5, ROW_B];
const COMP = [5, ROW_A];
const DIAL_TOP = 40;

const P = k.fitProjection([...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-132, -102, TALLY_Z + SCALE_H + 4], [D0[0] + 15, D0[1], DET_TOP + 6]], WIDTH, HEIGHT, { pad: 30, azimuth: 45 });

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const keyOf = (x, y) => k.depthOf([x, y, 0], P);
const byDepth = (points) => [...points].sort((a, b) => keyOf(a[0], a[1]) - keyOf(b[0], b[1]));
const ROOT2 = Math.SQRT1_2;

const items = [];
const put = (x, y, svg, bias = 0) => items.push({ key: keyOf(x, y) + bias, svg });

// ---- base ------------------------------------------------------------------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  // tapped-hole grid of an optical breadboard
  out.push(D(k.dotGrid(-137.5, -112.5, 12, 7, 25, 0, P), { size: 0.5, tone: "lo" }));
  const screws = k.corners(PLATE, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
  // ruler strip along the near edge
  const strip = { x: -132, y: PLATE.y + PLATE.d - 15, w: 264, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // label plate
  const label = { x: 94, y: 12, w: 44, d: 20, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.8), 0.8, P, 3), { tone: "faint" }));
  out.push(L([[30, 5], [22, 9.5], [26, 14]].map(([length, dy]) => k.lineOnTop([label.x + 6, label.y + dy], [label.x + 6 + length, label.y + dy], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([label.x + 3, label.y + 10, 0.8]), at([label.x + label.w - 3, label.y + 10, 0.8])], { size: 0.45 }));
  // signal cables from the detectors to the counter, lying on the plate
  out.push(k.wireSvg(at([D0[0], D0[1] + 13, 0]), at([-110, COUNTER.y + COUNTER.d, 0]), { via: [at([D0[0], -5, 0]), at([-110, -5, 0])], tone: "lo", size: 1.1 }));
  out.push(k.wireSvg(at([D1[0] - 10, D1[1] + 13, 0]), at([COUNTER.x + COUNTER.w, -90, 0]), { via: [at([D1[0] - 10, -90, 0])], tone: "lo", size: 1.1 }));
  return out.join("");
}

// ---- shared small parts ----------------------------------------------------
function pedestal(cx, cy, top, pad = 11) {
  const out = [];
  const base = { x: cx - pad, y: cy - pad, w: pad * 2, d: pad * 2, r: 3 };
  out.push(S(k.slabOf(base, 0, 3, P, 4, 0.5), { tone: "mid" }));
  out.push(D([at([cx - pad + 3.2, cy + pad - 3.2, 3]), at([cx + pad - 3.2, cy - pad + 3.2, 3])], { size: 0.5 }));
  out.push(S(k.cylinder(cx, cy, 5, 3, 3, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 3.2, 6, top - 6, P, 28), { tone: "mid", crease: "none", inner: L(k.sideArc(cx, cy, 3.2, 6 + (top - 6) / 2, P, 16), { tone: "faint" }) }));
  return out.join("");
}

// ---- laser -----------------------------------------------------------------
function laser() {
  const out = [];
  const BODY = { x: -146, y: ROW_A - 9, w: 46, d: 18, r: 3 };
  for (const x of [-141, -113]) {
    const saddle = { x, y: ROW_A - 11, w: 8, d: 22, r: 1.2 };
    out.push(S(k.slabOf(saddle, 0, 14, P, 3, 0.4), { tone: "mid" }));
    out.push(D([at([x + 4, ROW_A + 9.4, 14])], { size: 0.45 }));
  }
  out.push(S(k.slabOf(BODY, 14, 24, P, 5, 0.9), { tone: "mid", inner: L(k.sideSeam(BODY, 20, P, 5) + k.sideSeam(BODY, 32, P, 5), { tone: "faint" }) }));
  const top = 38;
  // vent slots: closed outlines
  out.push(L([-128, -122, -116, -110].map((x) => k.planOutline({ x, y: ROW_A - 5, w: 2.4, d: 10, r: 1.2 }, top, P, 3)).join(""), { tone: "lo" }));
  out.push(D([at([-143, ROW_A - 6, top]), at([-143, ROW_A + 6, top]), at([-103, ROW_A - 6, top]), at([-103, ROW_A + 6, top])], { size: 0.45 }));
  // key switch
  out.push(S(k.cylinder(-137, ROW_A, 3.4, top, 3, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(-137, ROW_A, 3.4, top, top + 3, 20, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([-137, ROW_A], [-133.6, ROW_A], top + 3, P), { tone: "hi" }));
  // emission aperture on the +x face
  out.push(L(k.sideRing([-100, ROW_A, BZ], 4.6, "x", P, 28), { tone: "lo" }));
  out.push(L(k.sideRing([-100, ROW_A, BZ], 2.2, "x", P, 20), { tone: "mid" }));
  return out.join("");
}

// ---- counter with two tally columns: the statistics ---------------------------
const colAt = (sx, sy) => [sx + 8, sy - 1];
const flagAt = (sx, sy, share) => k.segment([sx + 1.4, sy - 8, TALLY_Z + share * SCALE_H], [sx + 1.4, sy + 6, TALLY_Z + share * SCALE_H], P);
const columnSvg = (sx, sy, share) => {
  const [x, y] = colAt(sx, sy);
  return k.solidSvg(k.cylinder(x, y, 2.8, TALLY_Z, Math.max(0.5, share * SCALE_H), P, 24), { tone: "hi", lit: true });
};

function counter() {
  const out = [];
  out.push(S(k.slabOf(COUNTER, 0, TALLY_Z, P, 5, 0.8), { tone: "mid", inner: L(k.sideSeam(COUNTER, 4, P, 5) + k.sideSeam(COUNTER, 11, P, 5), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(COUNTER, 2.4), TALLY_Z, P, 4), { tone: "faint" }));
  out.push(D(k.corners(COUNTER, 4.6).map(([x, y]) => at([x, y, TALLY_Z])), { size: 0.45 }));
  // input sockets above the two cable ends
  out.push(L(k.sideRing([-110, COUNTER.y + COUNTER.d, 8], 2.4, "y", P, 18) + k.sideRing([COUNTER.x + COUNTER.w, -90, 8], 2.4, "x", P, 18), { tone: "lo" }));
  out.push(D([at([-110, COUNTER.y + COUNTER.d, 8]), at([COUNTER.x + COUNTER.w, -90, 8])], { size: 0.6, tone: "hi" }));
  for (const id of ["0", "1"]) {
    const [sx, sy] = STATIONS[id];
    out.push(k.faceTextSvg(k.topMatrix([sx + 1.5, sy + 13.2], TALLY_Z, P, "x"), id, { size: 6, tone: "hi", anchor: "middle" }));
    const scale = { x: sx - 1, y: sy - 8, w: 2.4, d: 14, r: 0.5 };
    out.push(S(k.slabOf(scale, TALLY_Z, SCALE_H + 2, P, 2, 0.3), { tone: "mid" }));
    const minor = [];
    const major = [];
    for (let index = 1; index <= 10; index++) {
      const z = TALLY_Z + (index / 10) * SCALE_H;
      (index % 5 === 0 ? major : minor).push(k.segment([sx + 1.4, sy + 6, z], [sx + 1.4, sy + 6 - (index % 5 === 0 ? 4.6 : 2.6), z], P));
    }
    // spine of the scale: the ticks and the predicted line are rooted on it
    out.push(L(k.segment([sx + 1.4, sy + 6, TALLY_Z], [sx + 1.4, sy + 6, TALLY_Z + SCALE_H + 2], P), { tone: "lo" }));
    out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
    out.push(`<path data-flag="${id}" class="iso-line" data-tone="hi" d="${flagAt(sx, sy, 0.5)}" style="stroke-width:1"/>`);
    const [x, y] = colAt(sx, sy);
    out.push(L(k.ring(x, y, 4.2, TALLY_Z, P, 24), { tone: "lo" }));
    out.push(`<g data-col="${id}">${columnSvg(sx, sy, 0)}</g>`);
  }
  return out.join("");
}

// ---- beam splitter cube: the Hadamard gate ---------------------------------
function splitter(cx, cy) {
  const out = [pedestal(cx, cy, 16)];
  out.push(S(k.slabOf({ x: cx - 10, y: cy - 10, w: 20, d: 20, r: 2 }, 16, 2, P, 3, 0.4), { tone: "mid" }));
  const cube = { x: cx - CUBE, y: cy - CUBE, w: CUBE * 2, d: CUBE * 2, r: 0.7 };
  out.push(S(k.slabOf(cube, 18, CUBE * 2, P, 2, 0.6), { tone: "hi", crease: "lo" }));
  // the half-silvered interface, seen from above
  out.push(L(k.lineOnTop([cx - CUBE + 0.4, cy + CUBE - 0.4], [cx + CUBE - 0.4, cy - CUBE + 0.4], 18 + CUBE * 2, P), { tone: "mid" }));
  // retaining clips on two corners of the platform
  out.push(D([at([cx - 8.4, cy - 8.4, 18]), at([cx + 8.4, cy + 8.4, 18])], { size: 0.5 }));
  return out.join("");
}

// ---- mirror on a kinematic mount -------------------------------------------
// `face` is the point where the two beams meet; `toward` is +1 when the
// reflecting side looks at the viewer, -1 when we see the back of the mount.
function mirror(face, toward) {
  const n = [ROOT2 * toward, ROOT2 * toward]; // reflecting normal, floor
  const c = [face[0] - n[0] * 3.5, face[1] - n[1] * 3.5]; // plate centre
  const t = [ROOT2, -ROOT2];
  const out = [pedestal(c[0], c[1], 15, 10)];
  const ring = [
    [c[0] - t[0] * 11 - ROOT2 * 2, c[1] - t[1] * 11 - ROOT2 * 2],
    [c[0] + t[0] * 11 - ROOT2 * 2, c[1] + t[1] * 11 - ROOT2 * 2],
    [c[0] + t[0] * 11 + ROOT2 * 2, c[1] + t[1] * 11 + ROOT2 * 2],
    [c[0] - t[0] * 11 + ROOT2 * 2, c[1] - t[1] * 11 + ROOT2 * 2],
  ];
  out.push(S(k.extrude(ring, 15, 22, P, { bevel: 0.5 }), { tone: "mid" }));
  const F = G.frameAlong([c[0], c[1], BZ], [ROOT2, ROOT2, 0]); // axis toward the viewer
  if (toward > 0) {
    out.push(S(G.disc(2, 3.5, 8.4, F, P), { tone: "hi", crease: "lo" }));
    out.push(L(G.circleOf(F, 3.5, 6.8, P), { tone: "faint" }));
    out.push(D([at([c[0] + t[0] * 9 + ROOT2 * 2, c[1] + t[1] * 9 + ROOT2 * 2, BZ + 9]), at([c[0] - t[0] * 9 + ROOT2 * 2, c[1] - t[1] * 9 + ROOT2 * 2, BZ - 9])], { size: 0.5 }));
  } else {
    out.push(L(G.circleOf(F, 2, 6.2, P), { tone: "faint" }));
    out.push(D([at([c[0] + t[0] * 7.5 + ROOT2 * 2, c[1] + t[1] * 7.5 + ROOT2 * 2, BZ - 7.5])], { size: 0.6 }));
    for (const [side, dz] of [[-7.5, -7.5], [-7.5, 7.5], [7.5, 7.5]].sort((a, b) => a[1] - b[1])) {
      const K = G.frameAlong([c[0] + t[0] * side, c[1] + t[1] * side, BZ + dz], [ROOT2, ROOT2, 0]);
      out.push(S(G.disc(2, 3.2, 1.3, K, P), { tone: "mid", crease: "none" }));
      out.push(S(G.disc(3.2, 7.4, 2.7, K, P), { tone: "mid" }));
      out.push(k.fadedSvg(G.ribsOf(K, 3.2, 7.4, 2.7, 14, P, { fade: [0.1, 0.55] }), { tone: "lo" }));
    }
  }
  return out.join("");
}

// ---- compensator plate on the upper arm ------------------------------------
function compensator() {
  const [cx, cy] = COMP;
  const out = [pedestal(cx, cy, 15, 9)];
  const frame = { x: cx - 2, y: cy - 9, w: 4, d: 18, r: 0.8 };
  out.push(S(k.slabOf(frame, 15, 22, P, 2, 0.4), { tone: "mid" }));
  out.push(L(k.sideRing([cx + 2, cy, BZ], 6.6, "x", P, 32), { tone: "lo" }));
  out.push(L(k.sideRing([cx + 2, cy, BZ], 5.2, "x", P, 28), { tone: "faint" }));
  out.push(D([at([cx, cy - 7, 37]), at([cx, cy + 7, 37])], { size: 0.45 }));
  return out.join("");
}

// ---- phase shifter with its dial: the phase gate ---------------------------
const pointerAt = (deg) => {
  const angle = (deg * Math.PI) / 180;
  const [x, y] = PHASE;
  return k.lineOnTop([x - Math.sin(angle) * 1.8, y + Math.cos(angle) * 1.8], [x + Math.sin(angle) * 6.3, y - Math.cos(angle) * 6.3], DIAL_TOP + 0.2, P);
};

function phaseShifter() {
  const [cx, cy] = PHASE;
  const out = [pedestal(cx, cy, 14, 10)];
  const body = { x: cx - 8, y: cy - 9, w: 16, d: 18, r: 2 };
  out.push(S(k.slabOf(body, 14, 22, P, 4, 0.6), { tone: "hi", crease: "lo", inner: L(k.sideSeam(body, 31, P, 4), { tone: "faint" }) }));
  out.push(L(k.sideRing([cx + 8, cy, BZ], 5.6, "x", P, 30), { tone: "lo" }));
  out.push(L(k.sideRing([cx + 8, cy, BZ], 4.2, "x", P, 24), { tone: "faint" }));
  out.push(S(k.cylinder(cx, cy, 8.6, 36, 4, P, 48, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(cx, cy, 8.6, 36, DIAL_TOP, 44, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(cx, cy, 7.4, DIAL_TOP, P, 48), { tone: "lo" }));
  const ticks = k.radialTicks(cx, cy, 7.4, 24, 6, DIAL_TOP, [1, 2.2], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "hi" }));
  out.push(L(k.ring(cx, cy, 1.5, DIAL_TOP, P, 14), { tone: "mid" }));
  out.push(`<path data-part="pointer" class="iso-line" data-tone="lit" data-free="start" d="${pointerAt(90)}" style="stroke-width:1.2"/>`);
  return out.join("");
}

// ---- detector with a click lamp: the measurement -----------------------------
function detector([cx, cy], id, entry) {
  const out = [];
  const base = { x: cx - 15, y: cy - 13, w: 30, d: 26, r: 3 };
  const H = { x: cx - 13, y: cy - 11, w: 26, d: 22, r: 2.5 };
  out.push(S(k.slabOf(base, 0, 3, P, 4, 0.5), { tone: "mid" }));
  out.push(D([at([cx - 12.4, cy + 10.4, 3]), at([cx + 12.4, cy + 10.4, 3]), at([cx + 12.4, cy - 10.4, 3])], { size: 0.45 }));
  out.push(S(k.slabOf(H, 3, DET_TOP - 3, P, 5, 0.8), { tone: "mid", inner: L(k.sideSeam(H, 9, P, 5) + k.sideSeam(H, 31, P, 5), { tone: "faint" }) }));
  if (entry === "y") {
    out.push(L(k.sideRing([cx, cy + 11, BZ], 5.4, "y", P, 30), { tone: "lo" }));
    out.push(L(k.sideRing([cx, cy + 11, BZ], 3, "y", P, 22), { tone: "mid" }));
  } else {
    // signal socket on the +y face, above the cable
    out.push(L(k.sideRing([cx, cy + 11, 15], 2.8, "y", P, 18), { tone: "lo" }));
    out.push(D([at([cx, cy + 11, 15])], { size: 0.6, tone: "hi" }));
  }
  // cooling ports on the +x face: closed outlines
  out.push(L([-5, 0, 5].map((dy) => k.sideRing([cx + 13, cy + dy, 20], 1.5, "x", P, 12)).join(""), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(H, 2.4), DET_TOP, P, 4), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([cx + 6.5, cy + 7.6], DET_TOP, P, "x"), id, { size: 6, tone: "hi", anchor: "middle" }));
  // click lamp
  const lamp = [cx - 3.5, cy - 2];
  out.push(S(k.cylinder(lamp[0], lamp[1], 5.4, DET_TOP, 1.6, P, 28), { tone: "mid" }));
  const cap = k.cylinder(lamp[0], lamp[1], 4, DET_TOP + 1.6, 3, P, 28, 0.5);
  out.push(S(cap, { tone: "hi", crease: "lo" }));
  out.push(`<path class="qc-glow" data-lamp="${id}" d="${cap.fill}" opacity="0"/>`);
  return out.join("");
}

// ---- beams and photon slots -------------------------------------------------
// `d0` is the distance from the laser aperture along the route; both arms are 190 long.
const SEGMENTS = [
  { id: "src", a: [-100, ROW_A], b: [COL_1 - CUBE, ROW_A], d0: 0, weight: "one", spots: "a" },
  { id: "a1", a: [COL_1 + CUBE, ROW_A], b: [COMP[0] - 2, ROW_A], d0: 58, weight: "half", spots: "a" },
  { id: "a2", a: [COMP[0] + 2, ROW_A], b: [COL_2, ROW_A], d0: 107, weight: "half", spots: "a" },
  { id: "a3", a: [COL_2, ROW_A], b: [COL_2, ROW_B + CUBE], d0: 160, weight: "half", spots: "b" },
  { id: "b1", a: [COL_1, ROW_A - CUBE], b: [COL_1, ROW_B], d0: 58, weight: "half", spots: "b" },
  { id: "b2", a: [COL_1, ROW_B], b: [PHASE[0] - 8, ROW_B], d0: 130, weight: "half", spots: "" },
  { id: "b3", a: [PHASE[0] + 8, ROW_B], b: [COL_2 - CUBE, ROW_B], d0: 193, weight: "half", spots: "a" },
  { id: "o0", a: [COL_2 + CUBE, ROW_B], b: [D0[0] - 13, ROW_B], d0: 248, weight: "p0", spots: "a" },
  { id: "o1", a: [COL_2, ROW_B - CUBE], b: [COL_2, D1[1] + 11], d0: 248, weight: "p1", spots: "b" },
];
const ARRIVE = 294;
const POOL = 6;

function beam(segment) {
  const a = at([...segment.a, BZ]);
  const b = at([...segment.b, BZ]);
  const length = Math.hypot(segment.b[0] - segment.a[0], segment.b[1] - segment.a[1]);
  Object.assign(segment, { sa: a, sb: b, length });
  const spots = [...segment.spots].map((end) => (end === "a" ? a : b));
  const dots = spots.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.25"/>`).join("");
  const photons = Array.from({ length: POOL }, () => `<g class="qc-photon" opacity="0"><circle r="3.8" opacity=".2"/><circle r="1.7"/></g>`).join("");
  return `<g class="qc-beam" data-beam="${segment.id}" data-weight="${segment.weight}"><path class="iso-line" data-tone="lit" data-free="" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}"/>${dots}</g><g data-photons="${segment.id}">${photons}</g>`;
}

// ---- assemble in depth order -------------------------------------------------
put(-123, ROW_A, laser());
put(-118, -102, counter());
put(COL_1, ROW_A, splitter(COL_1, ROW_A));
put(COL_2, ROW_B, splitter(COL_2, ROW_B));
put(COL_2 + 2.5, ROW_A + 2.5, mirror([COL_2, ROW_A], -1));
put(COL_1 - 2.5, ROW_B - 2.5, mirror([COL_1, ROW_B], 1));
put(COMP[0], COMP[1], compensator());
put(PHASE[0], PHASE[1], phaseShifter());
put(D0[0], D0[1], detector(D0, "0", "x"));
put(D1[0], D1[1], detector(D1, "1", "y"));
for (const segment of SEGMENTS) put((segment.a[0] + segment.b[0]) / 2, (segment.a[1] + segment.b[1]) / 2, beam(segment));
items.sort((a, b) => a.key - b.key);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A Mach-Zehnder interferometer on an optical breadboard. A laser sends single photons into a beam-splitter cube, which puts each photon on two paths at once. Two mirrors bring the paths together at a second cube. A phase dial on the lower path sets how the two paths interfere, and two detectors, 0 and 1, each click for a share of the photons equal to cos squared and sin squared of half the phase. Cables carry the clicks to a counter with two tally columns.",
  body: [plate(), ...items.map((item) => item.svg)],
});

const live = `
const P = ${JSON.stringify(P)};
const SEGMENTS = ${JSON.stringify(SEGMENTS.map(({ id, sa, sb, d0, length, weight }) => ({ id, sa, sb, d0, length, weight })))};
const PHASE = ${JSON.stringify(PHASE)}, DIAL_TOP = ${DIAL_TOP}, TALLY_Z = ${TALLY_Z}, SCALE_H = ${SCALE_H};
const STATIONS = ${JSON.stringify(STATIONS)};
const STOPS = ${JSON.stringify(PHASE_STOPS)}, WINDOW = ${WINDOW}, ARRIVE = ${ARRIVE}, POOL = ${POOL};
const SPEED = 120, EVERY = 0.42, HOLD = 7;
const pointerAt = ${pointerAt.toString().replace("k.lineOnTop", "lineOnTop")};
const colAt = ${colAt.toString()};
const flagAt = ${flagAt.toString().replace("k.segment", "segment")};
const columnSvg = ${columnSvg.toString().replace("k.solidSvg", "solidSvg").replace("k.cylinder", "cylinder")};

// the model
const probabilityOfZero = (deg) => Math.cos((deg * Math.PI) / 360) ** 2;

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const pointer = svg.querySelector('[data-part="pointer"]');
const beams = SEGMENTS.map((segment) => svg.querySelector('[data-beam="' + segment.id + '"]'));
const slots = SEGMENTS.map((segment) => [...svg.querySelector('[data-photons="' + segment.id + '"]').children]);
const lamps = { "0": svg.querySelector('[data-lamp="0"]'), "1": svg.querySelector('[data-lamp="1"]') };
const flags = { "0": svg.querySelector('[data-flag="0"]'), "1": svg.querySelector('[data-flag="1"]') };
const columns = { "0": svg.querySelector('[data-col="0"]'), "1": svg.querySelector('[data-col="1"]') };
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

let phase = 90, target = 90;
let photons = Array.from({ length: POOL }, () => ({ d: -1 }));
let sinceEmit = EVERY, clicks = [], glow = { "0": 0, "1": 0 }, shown = { "0": 0, "1": 0 }, drawn = { "0": -1, "1": -1 };
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0, lastFlag = -1;

function weightOf(name, p0) { return name === "one" ? 1 : name === "half" ? 0.5 : name === "p0" ? p0 : 1 - p0; }

function draw() {
  const p0 = probabilityOfZero(phase);
  pointer.setAttribute("d", pointerAt(phase));
  SEGMENTS.forEach((segment, index) => {
    const weight = weightOf(segment.weight, p0);
    beams[index].setAttribute("opacity", (0.72 * weight).toFixed(3));
    slots[index].forEach((dot, slot) => {
      const along = (photons[slot].d - segment.d0) / segment.length;
      if (photons[slot].d < 0 || along < 0 || along > 1 || weight < 0.004) { if (dot.getAttribute("opacity") !== "0") dot.setAttribute("opacity", "0"); return; }
      const x = segment.sa[0] + (segment.sb[0] - segment.sa[0]) * along, y = segment.sa[1] + (segment.sb[1] - segment.sa[1]) * along;
      dot.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")");
      dot.setAttribute("opacity", (0.25 + 0.75 * weight).toFixed(2));
    });
  });
  const zero = clicks.filter((bit) => bit === 0).length, one = clicks.length - zero;
  const calm = still.matches;
  for (const id of ["0", "1"]) {
    const predicted = id === "0" ? p0 : 1 - p0;
    const [cx, cy] = STATIONS[id];
    if (Math.round(predicted * 500) !== lastFlag || id === "1") flags[id].setAttribute("d", flagAt(cx, cy, predicted));
    const height = Math.round(shown[id] * 200) / 200;
    if (height !== drawn[id]) { columns[id].innerHTML = columnSvg(cx, cy, height); drawn[id] = height; }
    lamps[id].setAttribute("opacity", glow[id].toFixed(2));
  }
  lastFlag = Math.round(p0 * 500);
  const percent = Math.round(p0 * 100);
  const tally = calm ? "" : " · clicks " + zero + " : " + one;
  const text = "phase " + Math.round(phase) + "° · P(0) " + percent + "%" + tally;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(phase)));
  stage.setAttribute("aria-valuetext", text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; const lap = [0, 1, 2, 3, 4, 3, 2, 1]; target = STOPS[lap[Math.floor(clock / HOLD + 2) % lap.length]]; }
  phase = calm ? target : phase + (target - phase) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(target - phase) < 0.05) phase = target;
  const p0 = probabilityOfZero(phase);
  if (calm) {
    photons.forEach((photon) => { photon.d = -1; });
    glow["0"] = glow["1"] = 0; shown["0"] = p0; shown["1"] = 1 - p0;
  } else {
    sinceEmit += dt;
    const free = photons.find((photon) => photon.d < 0);
    if (sinceEmit >= EVERY && free) { free.d = 0; sinceEmit = 0; }
    for (const photon of photons) {
      if (photon.d < 0) continue;
      photon.d += SPEED * dt;
      if (photon.d >= ARRIVE) {
        // measurement: one click, at one detector, with the model's probability
        const bit = Math.random() < p0 ? 0 : 1;
        clicks.push(bit); if (clicks.length > WINDOW) clicks.shift();
        glow[String(bit)] = 1; photon.d = -1;
      }
    }
    const zero = clicks.filter((bit) => bit === 0).length;
    const share = clicks.length ? zero / clicks.length : 0;
    const ease = 1 - Math.exp(-dt / 0.3);
    shown["0"] += (share - shown["0"]) * ease;
    shown["1"] += ((clicks.length ? 1 - share : 0) - shown["1"]) * ease;
    glow["0"] *= Math.exp(-dt / 0.28); glow["1"] *= Math.exp(-dt / 0.28);
  }
  draw();
  const settled = calm && phase === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false; target = clamp(next, 0, 180);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 9000);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(clamp(((event.clientX - box.left) / box.width - 0.2) / 0.6, 0, 1) * 180);
});
stage.addEventListener("keydown", (event) => {
  let to = null;
  const step = Math.round(target / 15) * 15;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = step + 15;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = step - 15;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = 180;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
still.addEventListener("change", () => { touring = !still.matches; run(); });
draw();
`;

const css = `<style>
.qc-beam circle,.qc-photon circle,.qc-glow{fill:var(--anatomy-lit);stroke:none}
.qc-beam .iso-line{stroke-width:.9}
.iso-face-text{font-family:Helvetica,Arial,sans-serif;font-weight:600}
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 1",
    title: "One qubit on an optical bench",
    hint: "Hover to turn the phase dial",
    readout: "phase 90° · P(0) 50%",
    keys: [
      { mark: "lit", label: "Photons, beams, click lamps and tally columns: what the phase controls" },
      { mark: "raised", label: "Beam-splitter cubes (Hadamard gates) and the phase shifter (phase gate)" },
      { mark: "edge", label: "Line on each scale: the predicted probability" },
    ],
    caption:
      "A Mach-Zehnder interferometer is a one-qubit quantum computer. The first cube puts each photon on both paths (superposition). The dial shifts the phase of the lower path. At the second cube the two paths interfere, so P(0) = cos²(φ/2) and P(1) = sin²(φ/2). Each photon makes one click at one detector (measurement). The counter columns show the share of the last 24 clicks at each detector and approach the predicted lines.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Interferometer: arrow keys turn the phase dial in steps of 15 degrees" aria-valuemin="0" aria-valuemax="180" aria-valuenow="90">${svg}</div>`,
  });

const name = theme === "light" ? "quantum-interferometer-light.html" : "quantum-interferometer.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "One qubit on an optical bench", theme, body, script: kitScript() + live, width: 720 }));
console.log("wrote", name, "items", items.length);
