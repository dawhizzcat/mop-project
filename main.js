// your code goes here
/* ============================================================
   MOPP — main.js
   1) Waterline hero: algae specks aggregate, water clears
   2) Results charts driven by editable data arrays
   ============================================================ */

/* ---- EDIT YOUR REAL DATA HERE ---------------------------------------
   Replace these example arrays with your measurements.
   coverage: percent of surface covered by algae over time
   larvae:   larvae counts, treated vs control                        */
const DATA = {
  coverage: [82, 78, 60, 41, 27, 15, 9],           // % over 7 checkpoints
  coverageLabels: ["0h", "6h", "12h", "24h", "36h", "48h", "72h"],
  larvae: { treated: [120, 74, 31, 8], control: [118, 121, 115, 119] },
  larvaeLabels: ["Day 0", "Day 2", "Day 4", "Day 6"]
};
/* --------------------------------------------------------------------- */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const AQUA = "#16b9ac";
const ALGAE = "#a6c13a";

document.getElementById("year").textContent = new Date().getFullYear();

/* ============================================================
   1) WATERLINE HERO
   ============================================================ */
(function waterline() {
  const canvas = document.getElementById("waterline");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, dpr, specks, clumps;

  function makeClumps() {
    // A few aggregation centers the specks migrate toward.
    return [
      { x: 0.14, y: 0.22 }, { x: 0.86, y: 0.30 },
      { x: 0.22, y: 0.80 }, { x: 0.78, y: 0.72 },
      { x: 0.5, y: 0.12 }
    ].map(c => ({ x: c.x * W, y: c.y * H }));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clumps = makeClumps();
    seed();
  }

  function seed() {
    const n = Math.round(Math.min(160, (W * H) / 5200));
    specks = [];
    for (let i = 0; i < n; i++) {
      const target = clumps[(Math.random() * clumps.length) | 0];
      specks.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1.4 + Math.random() * 3.2,
        tx: target.x + (Math.random() - 0.5) * 90,
        ty: target.y + (Math.random() - 0.5) * 70,
        phase: Math.random() * Math.PI * 2,
        speed: 0.006 + Math.random() * 0.01
      });
    }
  }

  function background() {
    // Cleared water gradient — the "after" state the specks reveal.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#e9f3f1");
    g.addColorStop(0.55, "#d5ebe7");
    g.addColorStop(1, "#c3e2dd");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Faint clear channels sweeping across.
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) {
      const y = H * (0.3 + i * 0.24) + Math.sin(t * 0.4 + i) * 12;
      const grad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.55)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, y - 40, W, 80);
    }
    ctx.globalAlpha = 1;
  }

  let t = 0;
  function frame() {
    t += 0.016;
    background();

    for (const s of specks) {
      // Aggregation pulse: pull strength eases in and out over time,
      // so the surface repeatedly gathers and loosens without dispersing.
      const pull = 0.02 + 0.03 * (0.5 + 0.5 * Math.sin(t * 0.25));
      s.x += (s.tx - s.x) * pull + Math.cos(s.phase + t) * 0.3;
      s.y += (s.ty - s.y) * pull + Math.sin(s.phase + t) * 0.3;
      s.phase += s.speed;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = ALGAE;
      ctx.globalAlpha = 0.55;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Soft halos over dense clumps to read as aggregated mass.
    for (const c of clumps) {
      const halo = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 60);
      halo.addColorStop(0, "rgba(120,150,40,0.16)");
      halo.addColorStop(1, "rgba(120,150,40,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(c.x - 60, c.y - 60, 120, 120);
    }

    if (!REDUCED) requestAnimationFrame(frame);
  }

  function renderStatic() {
    // Reduced-motion: draw one settled, cleared frame.
    background();
    for (const s of specks) {
      s.x = s.tx; s.y = s.ty;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = ALGAE;
      ctx.globalAlpha = 0.6;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  window.addEventListener("resize", resize);
  resize();
  if (REDUCED) renderStatic(); else requestAnimationFrame(frame);
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