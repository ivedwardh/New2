// Fig 2. A 4-qubit superconducting processor on a bench, with live controls.
// Build: node figures/four-qubit-processor/build.mjs [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 780;
const HEIGHT = 420;

// ---- world layout ----------------------------------------------------------
const PLATE = { x: -218, y: -160, w: 378, d: 264, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const QX = [-66, -22, 22, 66]; // qubit positions along the chip
const QY = 6;
const ARM = 11; // half length of a qubit cross
const PKG = { x: -108, y: -54, w: 216, d: 108, r: 5 };
const PKG_TOP = 14;
const CHIP = { x: -94, y: -40, w: 188, d: 80, r: 1 };
const CT = PKG_TOP + 1.6; // chip top
const FEED_Y = -32;

const GEN = { x: -206, y: -70, w: 54, d: 118, r: 4 };
const GEN_TOP = 46;
const GEN_FACE = GEN.x + GEN.w; // x of the +x face
const SCREEN = { y0: -18, y1: -64, z0: 15, z1: 40 }; // on the +x face; time runs from y0 to y1
const CH_Y = [-2, 10, 22, 34]; // channel sockets
const TURN_X = [-119, -126, -133, -140];
const LANE_Y = [63, 69, 75, 81];
const KNOBS = [[-180, 36], [-180, 18], [-180, 0]]; // amplitude, frequency, length

const RO = { x: 6, y: -150, w: 138, d: 40, r: 4 };
const RO_TOP = 18;
const PANEL = { x: 13, y: -144, w: 124, d: 2.4, r: 0.5 };
const BAR_H = 46;
const BAR_Y = PANEL.y + PANEL.d; // bars stand against the panel
const BAR_X = Array.from({ length: 16 }, (_, index) => PANEL.x + 5.75 + index * 7.5);
const LAMPS = [0, 1, 2, 3].map((index) => [57 + index * 12, -120]);

const WIRES = {
  drive: QX.map((x, index) => [[GEN_FACE, CH_Y[index]], [TURN_X[index], CH_Y[index]], [TURN_X[index], LANE_Y[index]], [x, LANE_Y[index]], [x, PKG.y + PKG.d + 4]]),
  readout: [[PKG.x + PKG.w + 4, FEED_Y], [128, FEED_Y], [128, RO.y + RO.d]],
};

const P = k.fitProjection([...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [PANEL.x, PANEL.y, RO_TOP + BAR_H + 8], [GEN.x, GEN.y, GEN_TOP + 6]], WIDTH, HEIGHT, { pad: 26, azimuth: 45 });

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const keyOf = (x, y) => k.depthOf([x, y, 0], P);
const byDepth = (points) => [...points].sort((a, b) => keyOf(a[0], a[1]) - keyOf(b[0], b[1]));
const part = (name, svg, lines = false) => `<g class="qc-part${lines ? " qc-lines" : ""}" data-part="${name}">${svg}</g>`;
const closed = (points) => `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
const text = (matrix, value, size, tone = "mid", anchor = "middle") => k.faceTextSvg(matrix, value, { size, tone, anchor });

// ---- bench -----------------------------------------------------------------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  out.push(D(k.dotGrid(-200, -145, 15, 10, 25, 0, P), { size: 0.5, tone: "lo" }));
  const screws = k.corners(PLATE, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
  const strip = { x: -150, y: PLATE.y + PLATE.d - 15, w: 280, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  const label = { x: -204, y: 68, w: 44, d: 20, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.8), 0.8, P, 3), { tone: "faint" }));
  out.push(L([[30, 5], [22, 9.5], [26, 14]].map(([length, dy]) => k.lineOnTop([label.x + 6, label.y + dy], [label.x + 6 + length, label.y + dy], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([label.x + 3, label.y + 10, 0.8]), at([label.x + label.w - 3, label.y + 10, 0.8])], { size: 0.45 }));
  return out.join("");
}

// cables lie on the plate; pulse and signal dots travel along them
function cables() {
  const wire = (points) => k.wireSvg(at([...points[0], 0]), at([...points[points.length - 1], 0]), { via: points.slice(1, -1).map((point) => at([...point, 0])), tone: "mid", size: 1.1 });
  const dots = (name, count) => Array.from({ length: count }, (_, index) => `<g class="qc-pulse" data-dot="${name}${index}" opacity="0"><circle r="4.2" opacity=".2"/><circle r="1.9"/></g>`).join("");
  return part("drive", WIRES.drive.map(wire).join("") + dots("d", 4), true) + part("readout", wire(WIRES.readout) + dots("r", 1), true);
}

// ---- pulse generator -------------------------------------------------------
function generator() {
  const out = [];
  const base = k.insetPlan(GEN, -2);
  out.push(S(k.slabOf(base, 0, 3, P, 4, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf(GEN, 3, GEN_TOP - 3, P, 6, 1), { tone: "mid", inner: L(k.sideSeam(GEN, 8, P, 6) + k.sideSeam(GEN, 42, P, 6), { tone: "faint" }) }));
  // screen on the +x face
  const corner = (y, z) => at([GEN_FACE, y, z]);
  const { y0, y1, z0, z1 } = SCREEN;
  out.push(`<path class="qc-screen" d="${closed([corner(y0 + 2, z0 - 2), corner(y1 - 2, z0 - 2), corner(y1 - 2, z1 + 2), corner(y0 + 2, z1 + 2)])}"/>`);
  out.push(L(closed([corner(y0 + 2, z0 - 2), corner(y1 - 2, z0 - 2), corner(y1 - 2, z1 + 2), corner(y0 + 2, z1 + 2)]), { tone: "mid" }));
  out.push(L(closed([corner(y0, z0), corner(y1, z0), corner(y1, z1), corner(y0, z1)]), { tone: "lo" }));
  const mid = (z0 + z1) / 2;
  out.push(L(k.segment([GEN_FACE, y0, mid], [GEN_FACE, y1, mid], P), { tone: "faint" }));
  out.push(L([0.25, 0.5, 0.75].map((share) => k.segment([GEN_FACE, y0 + (y1 - y0) * share, z0], [GEN_FACE, y0 + (y1 - y0) * share, z1], P)).join(""), { tone: "faint" }));
  out.push(`<path data-live="trace" class="iso-line qc-trace" data-tone="lit" d=""/>`);
  // four channel sockets with select lamps
  CH_Y.forEach((y, index) => {
    out.push(L(k.sideRing([GEN_FACE, y, 10], 3, "x", P, 20), { tone: "lo" }));
    out.push(D([at([GEN_FACE, y, 10])], { size: 0.7, tone: "hi" }));
    out.push(L(k.sideRing([GEN_FACE, y, 20], 1.5, "x", P, 14), { tone: "lo" }));
    const [cx, cy] = at([GEN_FACE, y, 20]);
    out.push(`<circle class="qc-lamp" data-live="ch${index}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.4" opacity="0"/>`);
    out.push(text(k.sideMatrix([GEN_FACE, y + 2.2], 30, P, "right"), String(index), 5.5, "mid", "middle"));
  });
  // top: three knurled knobs, vents, screws
  const top = GEN_TOP;
  out.push(L(k.planOutline(k.insetPlan(GEN, 3), top, P, 5), { tone: "faint" }));
  out.push(L([-62, -55, -48, -41, -34].map((y) => k.planOutline({ x: GEN.x + 12, y, w: 30, d: 2.6, r: 1.3 }, top, P, 3)).join(""), { tone: "lo" }));
  out.push(D(k.corners(GEN, 5.5).map(([x, y]) => at([x, y, top])), { size: 0.5 }));
  for (const [index, [x, y]] of KNOBS.entries()) {
    out.push(S(k.cylinder(x, y, 7.4, top, 1.2, P, 32), { tone: "mid" }));
    out.push(L(k.radialTicks(x, y, 7.2, 12, 3, top + 1.2, [0.9, 1.6], P).major, { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 5, top + 1.2, 4.2, P, 32, 0.4), { tone: "hi", crease: "lo" }));
    out.push(L(k.knurl(x, y, 5, top + 1.2, top + 5.4, 28, P, 0.3), { tone: "lo" }));
    out.push(`<path data-live="knob${index}" class="iso-line" data-tone="lit" data-free="start" d="" style="stroke-width:1.2"/>`);
  }
  out.push(L([[12, 38], [9, 20], [11, 2]].map(([length, y]) => k.lineOnTop([GEN.x + 5, y], [GEN.x + 5 + length, y], top, P)).join(""), { tone: "lo", free: true }));
  return part("generator", out.join(""));
}

// ---- chip package ----------------------------------------------------------
const cross = (x, y, arm = ARM, half = 2.2) => [
  [x - half, y - arm], [x + half, y - arm], [x + half, y - half], [x + arm, y - half], [x + arm, y + half], [x + half, y + half],
  [x + half, y + arm], [x - half, y + arm], [x - half, y + half], [x - arm, y + half], [x - arm, y - half], [x - half, y - half],
];
const onChip = (points, isClosed = true) => k.onTop(points, CT, P, isClosed);

function processor() {
  const out = [];
  out.push(S(k.slabOf(k.insetPlan(PKG, -4), 0, 3, P, 6, 0.5), { tone: "mid" }));
  out.push(D(k.corners(k.insetPlan(PKG, -4), 3).map(([x, y]) => at([x, y, 3])), { size: 0.5 }));
  out.push(S(k.slabOf(PKG, 3, PKG_TOP - 3, P, 6, 1), { tone: "mid", inner: L(k.sideSeam(PKG, 9, P, 6), { tone: "faint" }) }));
  // drive sockets on the +y face and the readout socket on the +x face
  for (const x of QX) {
    out.push(L(k.sideRing([x, PKG.y + PKG.d, 8.5], 3, "y", P, 20), { tone: "lo" }));
    out.push(D([at([x, PKG.y + PKG.d, 8.5])], { size: 0.7, tone: "hi" }));
  }
  out.push(L(k.sideRing([PKG.x + PKG.w, FEED_Y, 8.5], 3, "x", P, 20), { tone: "lo" }));
  out.push(D([at([PKG.x + PKG.w, FEED_Y, 8.5])], { size: 0.7, tone: "hi" }));
  // lid frame, screws
  out.push(L(k.planOutline(k.insetPlan(PKG, 3), PKG_TOP, P, 5), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(CHIP, -3), PKG_TOP, P, 3), { tone: "lo" }));
  const screws = k.corners(PKG, 7);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, PKG_TOP, P, 14)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, PKG_TOP])), { size: 0.5 }));
  // the chip
  out.push(S(k.slabOf(CHIP, PKG_TOP, 1.6, P, 2, 0.4), { tone: "hi", crease: "lo" }));
  const bonds = [];
  for (let x = CHIP.x + 6; x <= CHIP.x + CHIP.w - 6; x += 8) bonds.push(at([x, CHIP.y + 1.6, CT]), at([x, CHIP.y + CHIP.d - 1.6, CT]));
  out.push(D(bonds, { size: 0.4, tone: "lo" }));

  // readout: feedline edge to edge and one meander resonator for each qubit
  const readout = [L(onChip([[CHIP.x, FEED_Y], [CHIP.x + CHIP.w, FEED_Y]], false), { tone: "mid" })];
  QX.forEach((x, index) => {
    const y = QY - ARM;
    const meander = [[x, y], [x, y - 3.5], [x + 9, y - 3.5], [x + 9, y - 8], [x - 9, y - 8], [x - 9, y - 12.5], [x + 9, y - 12.5], [x + 9, y - 17], [x - 9, y - 17], [x - 9, y - 21.5], [x, y - 21.5], [x, FEED_Y]];
    readout.push(L(onChip(meander, false), { tone: "mid" }));
    readout.push(`<path data-live="res${index}" class="iso-line qc-flash" data-tone="lit" opacity="0" d="${onChip(meander, false)}"/>`);
  });
  readout.push(`<path data-live="feed" class="iso-line qc-flash" data-tone="lit" opacity="0" d="${onChip([[CHIP.x, FEED_Y], [CHIP.x + CHIP.w, FEED_Y]], false)}"/>`);
  out.push(part("resonators", readout.join(""), true));

  // drive lines from the near chip edge to each qubit
  const drive = QX.map((x, index) => L(onChip([[x, CHIP.y + CHIP.d], [x, QY + ARM]], false), { tone: "mid" }) + `<path data-live="line${index}" class="iso-line qc-flash" data-tone="lit" opacity="0" d="${onChip([[x, CHIP.y + CHIP.d], [x, QY + ARM]], false)}"/>`);
  out.push(part("drive", drive.join(""), true));

  // couplers between neighbours
  const couplers = [0, 1, 2].map((index) => {
    const cx = (QX[index] + QX[index + 1]) / 2;
    const box = [[cx - 6, QY - 4], [cx + 6, QY - 4], [cx + 6, QY + 4], [cx - 6, QY + 4]];
    return (
      `<path class="qc-glow" data-live="coupler${index}" opacity="0" d="${onChip(box)}"/>` +
      L(onChip(box), { tone: "mid" }) +
      L(onChip([[QX[index] + ARM, QY], [cx - 6, QY]], false) + onChip([[cx + 6, QY], [QX[index + 1] - ARM, QY]], false), { tone: "mid" })
    );
  });
  out.push(part("couplers", couplers.join(""), true));

  // the qubits: cross-shaped transmon pads; the fill shows P(1)
  const qubits = QX.map((x, index) => {
    const pad = onChip(cross(x, QY));
    return `<path class="qc-pad" d="${pad}"/><path class="qc-glow" data-live="qubit${index}" opacity="0" d="${pad}"/>` + L(pad, { tone: "hi" }) + `<path data-live="ring${index}" class="iso-line" data-tone="lit" opacity="0" style="stroke-width:1.4" d="${k.ring(x, QY, ARM + 3, CT, P, 32)}"/>` + text(k.topMatrix([x - 14, QY + 24], CT, P, "x"), String(index), 8, "hi");
  });
  out.push(part("qubits", qubits.join(""), true));
  return part("package", out.join(""));
}

// ---- readout unit with the 16-column histogram -----------------------------
function readoutUnit() {
  const out = [];
  out.push(S(k.slabOf(k.insetPlan(RO, -2), 0, 3, P, 4, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf(RO, 3, RO_TOP - 3, P, 6, 0.9), { tone: "mid", inner: L(k.sideSeam(RO, 8, P, 6) + k.sideSeam(RO, 14, P, 6), { tone: "faint" }) }));
  out.push(L(k.sideRing([128, RO.y + RO.d, 9], 3, "y", P, 20), { tone: "lo" }));
  out.push(D([at([128, RO.y + RO.d, 9])], { size: 0.7, tone: "hi" }));
  out.push(L([30, 38, 46].map((x) => k.sideRing([x, RO.y + RO.d, 9], 1.6, "y", P, 12)).join(""), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(RO, 3), RO_TOP, P, 5), { tone: "faint" }));
  out.push(D(k.corners(RO, 5.5).map(([x, y]) => at([x, y, RO_TOP])), { size: 0.5 }));
  // back panel
  out.push(S(k.slabOf(PANEL, RO_TOP, BAR_H + 4, P, 2, 0.3), { tone: "mid" }));
  const face = BAR_Y;
  // half and full lines across the panel, edge to edge
  out.push(L([0.5, 1].map((share) => k.segment([PANEL.x, face, RO_TOP + BAR_H * share], [PANEL.x + PANEL.w, face, RO_TOP + BAR_H * share], P)).join(""), { tone: "faint" }));
  // corner spine: the scale lines end on it
  out.push(L(k.segment([PANEL.x + PANEL.w, face, RO_TOP], [PANEL.x + PANEL.w, face, RO_TOP + BAR_H + 4], P), { tone: "lo" }));
  out.push(`<g data-live="bars"></g>`);
  out.push(BAR_X.map((_, index) => `<path data-live="frame${index}" class="iso-line" data-tone="hi" d=""/>`).join(""));
  // index rail in front of the panel: a dot under each column, a ring every fourth
  out.push(S(k.slabOf({ x: PANEL.x, y: face + 3.4, w: PANEL.w, d: 4, r: 0.8 }, RO_TOP, 0.6, P, 2), { tone: "lo", crease: "none" }));
  out.push(D(BAR_X.map((x) => at([x, face + 5.4, RO_TOP + 0.6])), { size: 0.4, tone: "mid" }));
  out.push(text(k.topMatrix([PANEL.x + 9, face + 15], RO_TOP, P, "x"), "0000", 4.6, "mid"));
  out.push(text(k.topMatrix([PANEL.x + PANEL.w - 9, face + 15], RO_TOP, P, "x"), "1111", 4.6, "mid"));
  // four lamps: the bits of the last shot
  LAMPS.forEach(([x, y], index) => {
    out.push(S(k.cylinder(x, y, 4.2, RO_TOP, 1.2, P, 24), { tone: "mid" }));
    const cap = k.cylinder(x, y, 3, RO_TOP + 1.2, 2.2, P, 24, 0.4);
    out.push(S(cap, { tone: "hi", crease: "lo" }));
    out.push(`<path class="qc-glow" data-live="bit${index}" opacity="0" d="${cap.fill}"/>`);
  });
  return part("histogram", out.join(""));
}

const items = [
  { key: keyOf(GEN.x + GEN.w / 2, GEN.y + GEN.d / 2), svg: generator() },
  { key: keyOf(RO.x + RO.w / 2, RO.y + RO.d / 2), svg: readoutUnit() },
  { key: keyOf(0, 0), svg: processor() },
].sort((a, b) => a.key - b.key);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A 4-qubit superconducting processor on a bench. A pulse generator with a screen and three knobs sends microwave pulses along four cables to a chip package. The chip has four cross-shaped qubits in a row, three couplers between them, a drive line and a meander readout resonator for each qubit, and a shared feedline. A cable carries the readout signal to a unit with 16 columns, one for each 4-bit result.",
  body: [plate(), cables(), ...items.map((item) => item.svg)],
});

// ---- page ------------------------------------------------------------------
const config = { P, QX, QY, CT, GEN_FACE, GEN_TOP, SCREEN, KNOBS, WIRES, RO_TOP, BAR_H, BAR_Y, BAR_X };

const PARTS = [
  ["generator", "Pulse generator", "It makes the short microwave pulses that are the gates. Each qubit has one channel. For each pulse you set three things: amplitude, frequency, and length. The screen shows the pulse for the selected qubit, with the wave slowed down so that you can see the cycles. The three knobs follow the three sliders."],
  ["drive", "Drive lines", "Four cables carry the pulses from the generator to the chip package. On the chip, each line ends next to one qubit. In a real machine these lines also have attenuators and filters to keep heat and noise out."],
  ["package", "Chip package", "A metal box that holds the chip and connects it to the cables. A real package sits at the bottom of a dilution refrigerator at approximately 0.015 kelvin. At that temperature the circuit is superconducting and heat does not flip the qubits."],
  ["qubits", "Qubits (transmons)", "Each cross is a superconducting circuit that behaves as an artificial atom with two usable levels, 0 and 1. Each qubit has its own resonance frequency near 5 GHz. A pulse at that frequency turns the state between 0 and 1. The fill of each cross shows the probability that the qubit reads 1."],
  ["couplers", "Couplers", "A coupler connects two adjacent qubits so that the state of one can control the other. In this figure an active coupler does a CNOT gate: it flips the right qubit only if the left qubit is 1. This is the step that makes entanglement. Without it, four qubits are only four separate qubits."],
  ["resonators", "Readout resonators and feedline", "Each qubit touches a meander-shaped resonator. The resonator frequency moves by a small amount that depends on whether the qubit is 0 or 1. A probe tone on the shared feedline measures that shift. The measurement gives one bit for each qubit and destroys the superposition."],
  ["readout", "Readout cable", "It carries the weak readout signal from the chip to the readout unit. In a real machine the signal goes through several amplifiers on the way."],
  ["histogram", "Readout unit", "It converts each shot into four bits and counts the results. There are 16 columns, one for each result from 0000 to 1111, with qubit 0 as the left bit. The outline on each column is the predicted probability. The filled column is the measured share of the shots. The four lamps show the bits of the last shot."],
];

const controls = `
<section class="qc-panel" aria-label="Controls">
  <div class="qc-row">
    <span class="qc-label">Qubit</span>
    <div class="qc-seg" role="radiogroup" aria-label="Selected qubit">${[0, 1, 2, 3].map((index) => `<button type="button" role="radio" data-select="${index}" aria-checked="${index === 0}">Q${index}</button>`).join("")}</div>
    <span class="qc-note" data-out="tuned"></span>
  </div>
  <label class="qc-row"><span class="qc-label">Amplitude</span><input type="range" data-in="amp" min="0" max="100" step="1" value="50"><output data-out="amp"></output></label>
  <label class="qc-row"><span class="qc-label">Frequency</span><input type="range" data-in="det" min="-30" max="30" step="1" value="0"><output data-out="det"></output></label>
  <label class="qc-row"><span class="qc-label">Pulse length</span><input type="range" data-in="len" min="0" max="40" step="1" value="20"><output data-out="len"></output></label>
  <div class="qc-row">
    <span class="qc-label">Couplers</span>
    <div class="qc-seg">${[0, 1, 2].map((index) => `<button type="button" data-coupler="${index}" aria-pressed="false">Q${index}–Q${index + 1}</button>`).join("")}</div>
  </div>
  <div class="qc-row">
    <span class="qc-label">Presets</span>
    <div class="qc-seg"><button type="button" data-preset="zero">All 0</button><button type="button" data-preset="flip">Flip Q0</button><button type="button" data-preset="super">Superposition</button><button type="button" data-preset="bell">Bell pair</button><button type="button" data-preset="ghz">GHZ</button><button type="button" data-preset="detuned">Off resonance</button></div>
  </div>
  <div class="qc-row">
    <span class="qc-label">Shots</span>
    <div class="qc-seg"><button type="button" data-run="1">Run 1</button><button type="button" data-run="100">Run 100</button><button type="button" data-run="auto" aria-pressed="true">Auto</button><button type="button" data-run="clear">Clear</button></div>
  </div>
  <p class="qc-state" data-out="state" aria-live="polite"></p>
</section>
<section class="qc-panel" aria-label="Components">
  <div class="qc-parts">${PARTS.map(([id, name], index) => `<button type="button" data-show="${id}"><span>${String(index + 1).padStart(2, "0")}</span>${name}</button>`).join("")}</div>
  <div class="qc-explain" aria-live="polite"><h3 data-out="part-name"></h3><p data-out="part-text"></p></div>
</section>`;

const css = `<style>
.qc-pulse circle,.qc-glow,.qc-lamp{fill:var(--anatomy-lit);stroke:none}
.qc-pad{fill:var(--anatomy-paper);stroke:none}
.qc-screen{fill:var(--anatomy-shade-0);stroke:none}
.qc-trace{stroke-width:1.1}
.qc-flash{stroke-width:1.3}
.iso-face-text{font-family:Helvetica,Arial,sans-serif;font-weight:600}
.qc-part{cursor:pointer}
.qc-part[data-on]>.iso-solid>.iso-edge{stroke:var(--anatomy-lit)}
.qc-lines[data-on] .iso-line:not(.qc-flash):not([data-tone="lit"]){stroke:var(--anatomy-lit)}
.qc-lines[data-on] .iso-wire-end{stroke:var(--anatomy-lit)}
.qc-panel{margin:14px 0 0;padding:16px 18px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-faint);font:13px/1.5 var(--anatomy-mono);color:var(--anatomy-text)}
.qc-row{display:flex;align-items:center;gap:12px;min-height:34px;flex-wrap:wrap}
.qc-label{flex:0 0 104px;color:var(--anatomy-muted);text-transform:uppercase;letter-spacing:.06em;font-size:11px}
.qc-row input[type=range]{flex:1 1 180px;min-width:120px;accent-color:var(--anatomy-strong)}
.qc-row output{flex:0 0 250px;color:var(--anatomy-strong)}
.qc-note{color:var(--anatomy-muted)}
.qc-seg{display:flex;flex-wrap:wrap;gap:6px}
.qc-panel button{font:inherit;color:var(--anatomy-text);background:transparent;border:1px solid var(--anatomy-lo);padding:4px 10px;cursor:pointer;border-radius:2px}
.qc-panel button:hover{border-color:var(--anatomy-mid);color:var(--anatomy-strong)}
.qc-panel button[aria-checked=true],.qc-panel button[aria-pressed=true],.qc-panel button[data-on]{background:var(--anatomy-strong);border-color:var(--anatomy-strong);color:var(--anatomy-card)}
.qc-state{margin:10px 0 0;padding-top:10px;border-top:1px solid var(--anatomy-faint);color:var(--anatomy-strong);white-space:pre-wrap}
.qc-parts{display:flex;flex-wrap:wrap;gap:6px}
.qc-parts button span{color:var(--anatomy-muted);margin-right:7px}
.qc-parts button[data-on] span{color:inherit}
.qc-explain{margin-top:14px;font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;min-height:118px}
.qc-explain h3{margin:0 0 4px;font-size:14px;color:var(--anatomy-strong)}
.qc-explain p{margin:0}
@media (max-width:560px){.qc-label{flex-basis:100%}.qc-row output{flex-basis:100%}}
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 2",
    title: "A 4-qubit processor",
    hint: "Point at a part to read about it",
    readout: "shots 0",
    keys: [
      { mark: "lit", label: "Pulses, qubit fill (probability of 1), couplers in use, measured columns" },
      { mark: "edge", label: "Outline on each column: predicted probability" },
    ],
    caption:
      "The model: each qubit starts in 0. A pulse turns it by an angle set by amplitude and length, and less completely when the frequency is off resonance: P(1) = (Ω²/Ω′²)·sin²(Ω′t/2), with Ω′² = Ω² + Δ². Active couplers then run CNOT gates from left to right. Each shot measures all four qubits and gives one of 16 results.",
    body: `<div class="iso-stage" role="img" aria-label="Interactive drawing of a 4-qubit processor. Use the controls below the drawing.">${svg}</div>`,
  }) +
  controls;

const live = `const CFG = ${JSON.stringify(config)};\nconst PARTS = ${JSON.stringify(PARTS)};\n` + readFileSync(join(HERE, "live.js"), "utf8");
const name = theme === "light" ? "four-qubit-processor-light.html" : "four-qubit-processor.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "A 4-qubit processor", theme, body, script: kitScript() + live, width: 840 }));
console.log("wrote", name);
