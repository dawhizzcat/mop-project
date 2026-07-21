/* ============================================================
   MOPP — main.js
   1) Water column backdrop: gradient + suspended algae spheres
   2) Results charts driven by editable data arrays
   ============================================================ */

/* ---- EDIT YOUR REAL DATA HERE ---------------------------------------
   Replace these example arrays with your measurements.
   coverage: percent of surface covered by algae over time
   Algae:   Algal Turbidity (Absorbance of Light), treated vs control (Voltage)                     */
const DATA = {
  coverage: [82, 78, 60, 41, 27, 15, 9],           // % over 7 checkpoints
  coverageLabels: ["0h", "6h", "12h", "24h", "36h", "48h", "72h"],
  larvae: { treated: [47.98217939, 15.12437702, 93.55588787, 73.88034057], control: [47.98217939, 47.98217939, 47.98217939, 47.98217939] },
  larvaeLabels: ["0V", "5V", "7.2V", "10V"]
};
/* --------------------------------------------------------------------- */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const AQUA = "#0e8a67";   // primary green
const ALGAE = "#47ac5f";  // algae signal

document.getElementById("year").textContent = new Date().getFullYear();

/* ============================================================
   1) WATER COLUMN BACKDROP
   Blue surface -> green ALGAL band (with aggregated clumps) ->
   navy deep. Bubble plumes rise from the sides of section 02.
   Green + algae are anchored to section 02's real position so
   they stay aligned at any page height.
   ============================================================ */
(function column() {
  const canvas = document.getElementById("waterline");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W, H, dpr, total;
  let algalBottom, heroBottom, algaeTop;     // document-space anchors (px)
  let STOPS = [];
  let clumps, bubbles;

  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

  /* --- gradient: green only across the algal band, navy below --- */
  function buildStops() {
    const aB = clamp(algalBottom / total, 0.22, 0.66);   // end of algal band
    const hB = clamp(heroBottom / total, 0.06, aB - 0.04); // through the hero
    STOPS = [
      [0.00, [196, 230, 238]],                 // surface blue
      [0.04, [180, 224, 212]],                 // blue -> green
      [Math.max(0.07, hB * 0.55), [126, 205, 160]], // entering green
      [hB, [104, 197, 150]],                   // green (hero / algae)
      [(hB + aB) / 2, [96, 190, 146]],         // green mid algal band
      [aB, [82, 166, 150]],                    // algal band ends
      [Math.min(aB + 0.13, 0.94), [38, 102, 120]], // OUT of green -> blue-teal
      [0.88, [19, 58, 90]],                    // dark blue
      [1.00, [8, 26, 51]]                      // deep navy
    ];
    // keep depths strictly increasing
    for (let i = 1; i < STOPS.length; i++) {
      if (STOPS[i][0] <= STOPS[i - 1][0]) STOPS[i][0] = STOPS[i - 1][0] + 0.001;
    }
  }

  function colorAt(d) {
    d = clamp(d, 0, 1);
    for (let i = 0; i < STOPS.length - 1; i++) {
      const [d0, c0] = STOPS[i], [d1, c1] = STOPS[i + 1];
      if (d <= d1) {
        const t = (d - d0) / (d1 - d0 || 1);
        return `rgb(${Math.round(c0[0] + (c1[0] - c0[0]) * t)},${Math.round(c0[1] + (c1[1] - c0[1]) * t)},${Math.round(c0[2] + (c1[2] - c0[2]) * t)})`;
      }
    }
    return "rgb(8,26,51)";
  }

  function measure() {
    total = document.documentElement.scrollHeight;
    const how = document.getElementById("how");
    const hero = document.querySelector(".hero");
    algalBottom = how ? how.offsetTop + how.offsetHeight : total * 0.42;
    heroBottom = hero ? hero.offsetTop + hero.offsetHeight : total * 0.12;
    buildStops();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    measure();
    if (!clumps) {
      seed();
    } else {
      // keep existing positions (no teleport on mobile URL-bar resize)
      for (const c of clumps) {
        c.x = clamp(c.x, c.cr, Math.max(c.cr, W - c.cr));
        c.y = clamp(c.y, c.cr, Math.max(c.cr, H - c.cr));
      }
    }
  }

  function seed() {
    measure();

    // --- Algae clumps: aggregated groups through the algal band, ---
    // --- biased toward the hero so they gather near the top.      ---
    algaeTop = total * 0.015;
    const clumpCount = clamp(Math.round(total / 900), 6, 11);
    clumps = [];
    for (let i = 0; i < clumpCount; i++) {
      const cr = 34 + Math.random() * 34;         // clump radius
      const specks = [];
      const m = 12 + (Math.random() * 9 | 0);
      for (let s = 0; s < m; s++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.pow(Math.random(), 0.7) * cr;
        specks.push({
          ox: Math.cos(ang) * dist,
          oy: Math.sin(ang) * dist * 0.7,
          r: 1.6 + Math.random() * 3.0,
          a: 0.62 + Math.random() * 0.33,
          phase: Math.random() * Math.PI * 2,
          sway: 2 + Math.random() * 4
        });
      }
      clumps.push({
        x: cr + Math.random() * Math.max(1, W - 2 * cr),   // screen-space position
        y: cr + Math.random() * Math.max(1, H - 2 * cr),
        vx: (Math.random() - 0.5) * 0.7,                   // gentle drift
        vy: (Math.random() - 0.5) * 0.6,
        cr, specks
      });
    }

    // --- Bubble plumes: two columns rising from the bottom of ---
    // --- section 02, from behind the sides, spreading inward.  ---
    const srcY = algalBottom;
    const topLimit = total * 0.0;
    bubbles = [];
    const per = clamp(Math.round(H / 13), 32, 66);
    for (let side = 0; side < 2; side++) {
      for (let k = 0; k < per; k++) {
        bubbles.push({
          side,                                   // 0 = left, 1 = right
          srcY, topLimit,
          docY: srcY - Math.random() * (srcY - topLimit), // pre-populate
          r: 1 + Math.random() * 2.4,
          speed: 0.5 + Math.random() * 1.0,
          spread: 0.16 + Math.random() * 0.26,    // how far it fans inward
          wob: Math.random() * Math.PI * 2,
          wamp: 5 + Math.random() * 9
        });
      }
    }
  }

  let t = 0;
  function frame() {
    t += 0.016;
    const sc = window.scrollY || window.pageYOffset || 0;

    // --- water column slice for the current viewport ---
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    for (let s = 0; s <= 5; s++) {
      const yy = s / 5;
      grad.addColorStop(yy, colorAt((sc + yy * H) / total));
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // --- bubble plumes (behind the algae) ---
    for (const b of bubbles) {
      b.docY -= b.speed;
      if (b.docY < b.topLimit) b.docY = b.srcY;      // recycle at the source
      const y = b.docY - sc;
      if (y < -12 || y > H + 12) continue;
      const prog = (b.srcY - b.docY) / (b.srcY - b.topLimit); // 0 src -> 1 top
      const edgeX = b.side === 0 ? 0 : W;
      const dir = b.side === 0 ? 1 : -1;             // inward
      const x = edgeX + dir * prog * b.spread * W + Math.sin(t * 0.8 + b.wob) * b.wamp;
      const a = 0.34 * (1 - prog * 0.85);            // fade as it rises/spreads
      if (a <= 0.02) continue;
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(233,246,241,${a})`;
      ctx.fill();
      ctx.beginPath();                               // tiny highlight = bubble
      ctx.arc(x - b.r * 0.3, y - b.r * 0.3, b.r * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a * 0.8})`;
      ctx.fill();
    }

    // --- algae clumps: float in SCREEN space so scrolling never makes ---
    // --- them lag/jitter; fade in only while the algal band is on view. ---
    const fadeRange = H * 0.6;
    const vis = Math.max(0, Math.min(
      clamp((sc + H - algaeTop) / fadeRange, 0, 1),   // band has entered from below
      clamp((algalBottom - sc) / fadeRange, 0, 1)     // band hasn't scrolled past above
    ));
    for (const c of clumps) {
      c.x += c.vx;
      c.y += c.vy;
      if (c.x < c.cr) { c.x = c.cr; c.vx = Math.abs(c.vx); }
      else if (c.x > W - c.cr) { c.x = W - c.cr; c.vx = -Math.abs(c.vx); }
      if (c.y < c.cr) { c.y = c.cr; c.vy = Math.abs(c.vy); }
      else if (c.y > H - c.cr) { c.y = H - c.cr; c.vy = -Math.abs(c.vy); }
      if (vis <= 0.01) continue;
      const cx = c.x, cy = c.y;
      // darker aura underneath lifts the whole clump off the light water
      const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, c.cr * 1.4);
      aura.addColorStop(0, `rgba(58,84,22,${0.26 * vis})`);
      aura.addColorStop(0.7, `rgba(58,84,22,${0.10 * vis})`);
      aura.addColorStop(1, "rgba(58,84,22,0)");
      ctx.fillStyle = aura;
      ctx.fillRect(cx - c.cr * 1.5, cy - c.cr * 1.5, c.cr * 3, c.cr * 3);
      // green core mass gives the sphere a solid body
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, c.cr);
      core.addColorStop(0, `rgba(122,154,44,${0.44 * vis})`);
      core.addColorStop(1, "rgba(122,154,44,0)");
      ctx.fillStyle = core;
      ctx.fillRect(cx - c.cr, cy - c.cr, c.cr * 2, c.cr * 2);
      // the individual algae specks
      for (const s of c.specks) {
        const x = cx + s.ox + Math.sin(t * 0.6 + s.phase) * s.sway;
        const y = cy + s.oy + Math.cos(t * 0.5 + s.phase) * s.sway * 0.6;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(134,166,42,${s.a * vis})`;          // deeper body = crisper edge
        ctx.fill();
        ctx.beginPath();                                          // highlight -> reads as a sphere
        ctx.arc(x - s.r * 0.3, y - s.r * 0.3, s.r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(208,230,120,${Math.min(1, s.a + 0.15) * vis})`;
        ctx.fill();
      }
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("load", resize);
  setInterval(measure, 800);   // re-measure if layout shifts (fonts, wraps)

  resize();
  if (REDUCED) {
    canvas.style.display = "none";   // static CSS body gradient carries it
  } else {
    requestAnimationFrame(frame);
  }
})();

/* ============================================================
   2) CHARTS (lightweight, dependency-free SVG)
   ============================================================ */
function svgEl(name, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function lineChart(id, values, labels) {
  const svg = document.getElementById(id);
  if (!svg) return;
  const W = 320, H = 180, pad = 28;
  const max = Math.max(...values);
  const x = i => pad + (i / (values.length - 1)) * (W - pad * 2);
  const y = v => H - pad - (v / max) * (H - pad * 2);

  // Baseline
  svg.appendChild(svgEl("line", { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: "#cddad6" }));

  // Area under the curve
  let d = `M ${x(0)} ${y(values[0])}`;
  values.forEach((v, i) => { d += ` L ${x(i)} ${y(v)}`; });
  const area = d + ` L ${x(values.length - 1)} ${H - pad} L ${x(0)} ${H - pad} Z`;
  svg.appendChild(svgEl("path", { d: area, fill: AQUA, "fill-opacity": "0.12" }));
  svg.appendChild(svgEl("path", { d, fill: "none", stroke: AQUA, "stroke-width": "2.5", "stroke-linejoin": "round" }));

  values.forEach((v, i) => {
    svg.appendChild(svgEl("circle", { cx: x(i), cy: y(v), r: "3", fill: AQUA }));
    const lab = svgEl("text", { x: x(i), y: H - pad + 14, "text-anchor": "middle", "font-size": "8", fill: "#5b7472", "font-family": "IBM Plex Mono, monospace" });
    lab.textContent = labels[i];
    svg.appendChild(lab);
  });
}

function barChart(id, series, labels) {
  const svg = document.getElementById(id);
  if (!svg) return;
  const W = 320, H = 180, pad = 28;
  const groups = labels.length;
  const all = [...series.treated, ...series.control];
  const max = Math.max(...all);
  const groupW = (W - pad * 2) / groups;
  const barW = groupW * 0.3;
  const y = v => H - pad - (v / max) * (H - pad * 2);

  svg.appendChild(svgEl("line", { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: "#cddad6" }));

  labels.forEach((lab, i) => {
    const gx = pad + i * groupW + groupW / 2;
    const tv = series.treated[i], cv = series.control[i];
    // control (algae signal) then treated (aqua)
    svg.appendChild(svgEl("rect", { x: gx - barW - 2, y: y(cv), width: barW, height: (H - pad) - y(cv), fill: ALGAE, rx: 2 }));
    svg.appendChild(svgEl("rect", { x: gx + 2, y: y(tv), width: barW, height: (H - pad) - y(tv), fill: AQUA, rx: 2 }));
    const t = svgEl("text", { x: gx, y: H - pad + 14, "text-anchor": "middle", "font-size": "8", fill: "#5b7472", "font-family": "IBM Plex Mono, monospace" });
    t.textContent = lab;
    svg.appendChild(t);
  });

  // Legend
  const legend = [["Treated", AQUA, pad], ["Control", ALGAE, pad + 70]];
  legend.forEach(([txt, color, lx]) => {
    svg.appendChild(svgEl("rect", { x: lx, y: 6, width: 8, height: 8, fill: color, rx: 2 }));
    const t = svgEl("text", { x: lx + 12, y: 13, "font-size": "8", fill: "#5b7472", "font-family": "IBM Plex Mono, monospace" });
    t.textContent = txt;
    svg.appendChild(t);
  });
}

lineChart("chart-coverage", DATA.coverage, DATA.coverageLabels);
barChart("chart-larvae", DATA.larvae, DATA.larvaeLabels);
