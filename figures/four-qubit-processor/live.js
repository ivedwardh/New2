// Live behaviour for the 4-qubit processor figure. `CFG`, `PARTS` and the kit
// functions (iso, slabOf, solidSvg, lineOnTop, segment) are defined before this.
{
  const { P, QX, GEN_FACE, GEN_TOP, SCREEN, KNOBS, WIRES, RO_TOP, BAR_H, BAR_Y, BAR_X } = CFG;
  const RABI_MAX = 25; // MHz at 100 % amplitude: a 20 ns pulse at full amplitude is a half turn
  const FQ = [5.0, 5.08, 4.94, 5.04]; // GHz, resonance of each qubit
  const T_PULSE = 0.8, T_GATE = 0.3, T_READ = 0.6, T_REST = 0.7;

  const stage = document.querySelector(".iso-stage");
  const svg = stage.querySelector("svg");
  const live = (name) => svg.querySelector('[data-live="' + name + '"]');
  const out = (name) => document.querySelector('[data-out="' + name + '"]');
  const input = (name) => document.querySelector('[data-in="' + name + '"]');
  const readoutCorner = document.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const bitsOf = (index) => index.toString(2).padStart(4, "0");
  const percent = (value) => (value * 100 < 9.95 && value > 0 ? (value * 100).toFixed(1) : String(Math.round(value * 100))) + "%";

  // ---- the model ------------------------------------------------------------
  const state = {
    selected: 0,
    pulses: [0, 1, 2, 3].map((index) => ({ amp: index === 0 ? 0.5 : 0, det: 0, len: 20 })),
    couplers: [false, false, false],
    counts: new Array(16).fill(0),
    shots: 0,
    last: null,
    auto: true,
  };

  // one pulse in the rotating frame: U = cos(W't/2) I - i sin(W't/2) (W X + D Z) / W'
  function pulseOf({ amp, det, len }) {
    const rabi = 2 * Math.PI * amp * RABI_MAX * 1e6;
    const detune = 2 * Math.PI * det * 1e6;
    const time = len * 1e-9;
    const rate = Math.hypot(rabi, detune);
    if (rate === 0 || time === 0) return { u: [[1, 0], [0, 0], [0, 0], [1, 0]], angle: 0, p1: 0 };
    const c = Math.cos((rate * time) / 2), s = Math.sin((rate * time) / 2), nx = rabi / rate, nz = detune / rate;
    return { u: [[c, -s * nz], [0, -s * nx], [0, -s * nx], [c, s * nz]], angle: (rate * time * 180) / Math.PI, p1: nx * nx * s * s };
  }
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

  function simulate() {
    let psi = Array.from({ length: 16 }, (_, index) => (index === 0 ? [1, 0] : [0, 0]));
    state.pulses.forEach((pulse, qubit) => {
      const { u } = pulseOf(pulse);
      const mask = 8 >> qubit; // qubit 0 is the left bit
      const next = psi.map((value) => value.slice());
      for (let index = 0; index < 16; index++) {
        if (index & mask) continue;
        const zero = psi[index], one = psi[index | mask];
        next[index] = add(mul(u[0], zero), mul(u[1], one));
        next[index | mask] = add(mul(u[2], zero), mul(u[3], one));
      }
      psi = next;
    });
    state.couplers.forEach((on, index) => {
      if (!on) return;
      const control = 8 >> index, target = 8 >> (index + 1);
      for (let basis = 0; basis < 16; basis++) {
        if (basis & control && !(basis & target)) { const hold = psi[basis]; psi[basis] = psi[basis | target]; psi[basis | target] = hold; }
      }
    });
    const probs = psi.map(([re, im]) => re * re + im * im);
    const ones = [0, 1, 2, 3].map((qubit) => probs.reduce((sum, value, index) => sum + (index & (8 >> qubit) ? value : 0), 0));
    // a qubit is entangled with the rest when its own state is mixed
    const entangled = [0, 1, 2, 3].map((qubit) => {
      const mask = 8 >> qubit;
      let a = 0, d = 0, re = 0, im = 0;
      for (let index = 0; index < 16; index++) {
        if (index & mask) continue;
        const zero = psi[index], one = psi[index | mask];
        a += zero[0] * zero[0] + zero[1] * zero[1];
        d += one[0] * one[0] + one[1] * one[1];
        re += zero[0] * one[0] + zero[1] * one[1];
        im += zero[1] * one[0] - zero[0] * one[1];
      }
      return a * a + d * d + 2 * (re * re + im * im) < 0.995;
    });
    return { probs, ones, entangled };
  }
  let model = simulate();

  function sample() {
    let roll = Math.random();
    for (let index = 0; index < 16; index++) { roll -= model.probs[index]; if (roll < 0) return index; }
    return 15;
  }

  // ---- drawn things -----------------------------------------------------------
  const routeOf = (points) => {
    const screen = points.map((point) => iso([point[0], point[1], 0], P));
    const lengths = [0];
    for (let index = 1; index < points.length; index++) lengths.push(lengths[index - 1] + Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]));
    return { screen, lengths, total: lengths[lengths.length - 1] };
  };
  const along = (route, share) => {
    const want = Math.min(1, Math.max(0, share)) * route.total;
    let index = 1;
    while (index < route.lengths.length - 1 && route.lengths[index] < want) index++;
    const span = route.lengths[index] - route.lengths[index - 1] || 1, t = (want - route.lengths[index - 1]) / span;
    const a = route.screen[index - 1], b = route.screen[index];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const driveRoutes = WIRES.drive.map(routeOf), readRoute = routeOf(WIRES.readout);
  const driveDots = [0, 1, 2, 3].map((index) => svg.querySelector('[data-dot="d' + index + '"]'));
  const readDot = svg.querySelector('[data-dot="r0"]');
  const el = {
    trace: live("trace"), bars: live("bars"), feed: live("feed"),
    knobs: [0, 1, 2].map((index) => live("knob" + index)),
    channels: [0, 1, 2, 3].map((index) => live("ch" + index)),
    qubits: [0, 1, 2, 3].map((index) => live("qubit" + index)),
    rings: [0, 1, 2, 3].map((index) => live("ring" + index)),
    lines: [0, 1, 2, 3].map((index) => live("line" + index)),
    resonators: [0, 1, 2, 3].map((index) => live("res" + index)),
    bits: [0, 1, 2, 3].map((index) => live("bit" + index)),
    couplers: [0, 1, 2].map((index) => live("coupler" + index)),
    frames: BAR_X.map((_, index) => live("frame" + index)),
  };
  const setOpacity = (node, value) => { const text = Math.max(0, Math.min(1, value)).toFixed(2); if (node.getAttribute("opacity") !== text) node.setAttribute("opacity", text); };
  const pathOfPoints = (points, shut) => "M" + points.map(([x, y]) => x.toFixed(1) + " " + y.toFixed(1)).join("L") + (shut ? "Z" : "");

  function drawTrace() {
    const { amp, det, len } = state.pulses[state.selected];
    const { y0, y1, z0, z1 } = SCREEN, mid = (z0 + z1) / 2, points = [];
    const cyclesPerNs = (6 + det * 0.1) / 20; // slowed down so the cycles show
    for (let step = 0; step <= 140; step++) {
      const share = step / 140, time = share * 50, from = 25 - len / 2;
      const inside = len > 0 && time >= from && time <= from + len;
      const envelope = inside ? Math.sin((Math.PI * (time - from)) / len) ** 2 : 0;
      points.push(iso([GEN_FACE, y0 + (y1 - y0) * share, mid + 11 * amp * envelope * Math.cos(2 * Math.PI * cyclesPerNs * (time - 25))], P));
    }
    el.trace.setAttribute("d", pathOfPoints(points, false));
  }

  function drawKnobs() {
    const { amp, det, len } = state.pulses[state.selected];
    [amp, (det + 30) / 60, len / 40].forEach((share, index) => {
      const angle = ((-135 + 270 * share) * Math.PI) / 180, [x, y] = KNOBS[index];
      el.knobs[index].setAttribute("d", lineOnTop([x, y], [x + Math.sin(angle) * 4.5, y - Math.cos(angle) * 4.5], GEN_TOP + 5.5, P));
    });
    el.channels.forEach((node, index) => setOpacity(node, index === state.selected ? 1 : 0));
  }

  function drawFrames() {
    const y = BAR_Y + 1.7;
    el.frames.forEach((node, index) => {
      const share = model.probs[index];
      if (share < 0.004) { node.setAttribute("d", ""); return; }
      const x = BAR_X[index], top = RO_TOP + share * BAR_H;
      node.setAttribute("d", pathOfPoints([[x - 3.2, y, RO_TOP], [x + 3.2, y, RO_TOP], [x + 3.2, y, top], [x - 3.2, y, top]].map((point) => iso(point, P)), true));
    });
  }

  const shown = new Array(16).fill(0);
  let barsKey = "";
  function drawBars() {
    const key = shown.map((value) => Math.round(value * 400)).join(",");
    if (key === barsKey) return;
    barsKey = key;
    el.bars.innerHTML = shown.map((share, index) => (share * BAR_H < 0.25 ? "" : solidSvg(slabOf({ x: BAR_X[index] - 2.3, y: BAR_Y, w: 4.6, d: 1.6, r: 0.2 }, RO_TOP, share * BAR_H, P, 1), { tone: "hi", lit: true }))).join("");
  }

  // ---- text -------------------------------------------------------------------
  function drawText() {
    const pulse = state.pulses[state.selected], gate = pulseOf(pulse), tuned = FQ[state.selected];
    out("tuned").textContent = "resonance " + tuned.toFixed(3) + " GHz";
    out("amp").textContent = Math.round(pulse.amp * 100) + "% · Rabi rate " + (pulse.amp * RABI_MAX).toFixed(1) + " MHz";
    out("det").textContent = (tuned + pulse.det / 1000).toFixed(3) + " GHz · " + (pulse.det === 0 ? "on resonance" : (pulse.det > 0 ? "+" : "−") + Math.abs(pulse.det) + " MHz off");
    out("len").textContent = pulse.len + " ns";
    const top = model.probs.map((value, index) => [value, index]).filter(([value]) => value > 0.005).sort((a, b) => b[0] - a[0]);
    const tied = model.entangled.map((yes, index) => (yes ? "Q" + index : "")).filter(Boolean);
    out("state").textContent =
      "Q" + state.selected + " pulse: turn " + Math.round(gate.angle) + "° · P(1) after the pulse " + percent(gate.p1) + "\n" +
      "Predicted results: " + top.slice(0, 4).map(([value, index]) => bitsOf(index) + " " + percent(value)).join(" · ") + (top.length > 4 ? " · and " + (top.length - 4) + " more" : "") + "\n" +
      "Entangled qubits: " + (tied.length ? tied.join(", ") : "none");
    const corner = "shots " + state.shots + (state.last === null ? "" : " · last " + bitsOf(state.last));
    if (readoutCorner.textContent !== corner) readoutCorner.textContent = corner;
  }

  function syncControls() {
    const pulse = state.pulses[state.selected];
    input("amp").value = Math.round(pulse.amp * 100);
    input("det").value = pulse.det;
    input("len").value = pulse.len;
    document.querySelectorAll("[data-select]").forEach((button) => button.setAttribute("aria-checked", String(Number(button.dataset.select) === state.selected)));
    document.querySelectorAll("[data-coupler]").forEach((button) => button.setAttribute("aria-pressed", String(state.couplers[Number(button.dataset.coupler)])));
    document.querySelector('[data-run="auto"]').setAttribute("aria-pressed", String(state.auto));
  }

  function changed(clear = true) {
    model = simulate();
    if (clear) { state.counts.fill(0); state.shots = 0; state.last = null; }
    syncControls(); drawTrace(); drawKnobs(); drawFrames(); drawText(); kick();
  }

  // ---- shots --------------------------------------------------------------------
  const flash = { lines: [0, 0, 0, 0], couplers: [0, 0, 0], resonators: 0, rings: [0, 0, 0, 0], bits: [0, 0, 0, 0] };
  let shot = null, rest = 0.4, queued = 0;

  function record(result) {
    state.counts[result]++; state.shots++; state.last = result;
    for (let qubit = 0; qubit < 4; qubit++) { const bit = result & (8 >> qubit) ? 1 : 0; flash.bits[qubit] = bit; flash.rings[qubit] = bit; }
    drawText();
  }

  function step(dt) {
    const calm = still.matches;
    if (!shot && (queued > 0 || (state.auto && !calm))) {
      rest -= dt;
      if (rest <= 0 || queued > 0) {
        if (queued > 0) queued--;
        if (calm) record(sample());
        else shot = { t: 0, fired: [false, false, false], pulsed: false, probed: false };
        rest = T_REST;
      }
    }
    if (shot) {
      shot.t += dt;
      const t = shot.t;
      driveDots.forEach((dot, index) => {
        const { amp, len } = state.pulses[index], share = t / T_PULSE;
        if (share >= 1 || amp === 0 || len === 0) { setOpacity(dot, 0); return; }
        const [x, y] = along(driveRoutes[index], share);
        dot.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")");
        setOpacity(dot, 0.3 + 0.7 * amp);
      });
      if (t >= T_PULSE && !shot.pulsed) { shot.pulsed = true; state.pulses.forEach(({ amp, len }, index) => { if (amp > 0 && len > 0) flash.lines[index] = 1; }); }
      state.couplers.forEach((on, index) => {
        if (on && !shot.fired[index] && t >= T_PULSE + (T_GATE * index) / 3) { shot.fired[index] = true; flash.couplers[index] = 1; }
      });
      const readFrom = T_PULSE + T_GATE;
      if (t >= readFrom && !shot.probed) { shot.probed = true; flash.resonators = 1; }
      if (t >= readFrom && t < readFrom + T_READ) {
        const [x, y] = along(readRoute, (t - readFrom) / T_READ);
        readDot.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")");
        setOpacity(readDot, 1);
      } else setOpacity(readDot, 0);
      if (t >= readFrom + T_READ) { record(sample()); shot = null; }
    }
    // envelopes: every flash decays, nothing switches off at once
    const fade = Math.exp(-dt / 0.3), slow = Math.exp(-dt / 0.9);
    flash.lines = flash.lines.map((value) => value * fade);
    flash.couplers = flash.couplers.map((value) => value * fade);
    flash.resonators *= fade;
    flash.rings = flash.rings.map((value) => value * slow);
    el.lines.forEach((node, index) => setOpacity(node, flash.lines[index]));
    el.couplers.forEach((node, index) => setOpacity(node, state.couplers[index] ? 0.3 + 0.7 * flash.couplers[index] : 0));
    el.resonators.forEach((node) => setOpacity(node, flash.resonators));
    setOpacity(el.feed, flash.resonators);
    el.rings.forEach((node, index) => setOpacity(node, flash.rings[index]));
    el.bits.forEach((node, index) => setOpacity(node, flash.bits[index] * 0.9));
    el.qubits.forEach((node, index) => setOpacity(node, model.ones[index] * 0.85));
    const ease = calm ? 1 : 1 - Math.exp(-dt / 0.25);
    for (let index = 0; index < 16; index++) shown[index] += ((state.shots ? state.counts[index] / state.shots : 0) - shown[index]) * ease;
    drawBars();
  }

  let frame = 0, last = 0, visible = false;
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    step(dt);
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  function kick() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; kick(); }, { rootMargin: "200px 0px" }).observe(stage);

  // ---- controls -------------------------------------------------------------------
  input("amp").addEventListener("input", (event) => { state.pulses[state.selected].amp = Number(event.target.value) / 100; changed(); });
  input("det").addEventListener("input", (event) => { state.pulses[state.selected].det = Number(event.target.value); changed(); });
  input("len").addEventListener("input", (event) => { state.pulses[state.selected].len = Number(event.target.value); changed(); });
  document.querySelectorAll("[data-select]").forEach((button) => button.addEventListener("click", () => { state.selected = Number(button.dataset.select); changed(false); }));
  document.querySelectorAll("[data-coupler]").forEach((button) => button.addEventListener("click", () => { const index = Number(button.dataset.coupler); state.couplers[index] = !state.couplers[index]; changed(); }));
  const PRESETS = {
    zero: { amps: [0, 0, 0, 0], couplers: [false, false, false] },
    flip: { amps: [1, 0, 0, 0], couplers: [false, false, false] },
    super: { amps: [0.5, 0.5, 0.5, 0.5], couplers: [false, false, false] },
    bell: { amps: [0.5, 0, 0, 0], couplers: [true, false, false] },
    ghz: { amps: [0.5, 0, 0, 0], couplers: [true, true, true] },
    detuned: { amps: [1, 0, 0, 0], couplers: [false, false, false], det: 25 },
  };
  document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => {
    const preset = PRESETS[button.dataset.preset];
    state.pulses = preset.amps.map((amp, index) => ({ amp, det: index === 0 ? preset.det || 0 : 0, len: 20 }));
    state.couplers = preset.couplers.slice();
    state.selected = 0;
    changed();
  }));
  document.querySelectorAll("[data-run]").forEach((button) => button.addEventListener("click", () => {
    const what = button.dataset.run;
    if (what === "auto") { state.auto = !state.auto; syncControls(); }
    else if (what === "clear") changed();
    else if (what === "1") queued++;
    else { for (let count = 0; count < 100; count++) record(sample()); }
    kick();
  }));

  // ---- component explanations -------------------------------------------------------
  const texts = Object.fromEntries(PARTS.map(([id, name, body]) => [id, { name, body }]));
  let pinned = "qubits";
  function show(id) {
    out("part-name").textContent = texts[id].name;
    out("part-text").textContent = texts[id].body;
    svg.querySelectorAll("[data-part]").forEach((node) => { if (node.dataset.part === id) node.setAttribute("data-on", ""); else node.removeAttribute("data-on"); });
    document.querySelectorAll("[data-show]").forEach((button) => { if (button.dataset.show === id) button.setAttribute("data-on", ""); else button.removeAttribute("data-on"); });
  }
  const partAt = (event) => { const node = event.target.closest && event.target.closest("[data-part]"); return node ? node.dataset.part : null; };
  svg.addEventListener("pointerover", (event) => { const id = partAt(event); if (id) show(id); });
  svg.addEventListener("pointerleave", () => show(pinned));
  svg.addEventListener("click", (event) => { const id = partAt(event); if (id) { pinned = id; show(id); } });
  document.querySelectorAll("[data-show]").forEach((button) => button.addEventListener("click", () => { pinned = button.dataset.show; show(pinned); }));

  still.addEventListener("change", kick);
  show(pinned);
  changed();
}
