// app.js

/* =========================
   Build / PWA SW register (safe)
========================= */
const BUILD_VERSION = "v6";

function updateBuildLine() {
  const el = document.getElementById("buildLine");
  if (!el) return;

  // If there's a controlling SW, you're very likely in cached mode
  const cached = !!navigator.serviceWorker?.controller;
  el.textContent = `Build: ${BUILD_VERSION} • ${cached ? "Cached" : "Live"}`;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
    updateBuildLine();

    // If SW takes control after load, update label
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      updateBuildLine();
    });
  });
} else {
  updateBuildLine();
}

/* =========================
   Tabs (top nav)
========================= */
const tabs = {
  home: document.getElementById("tab-home"),
  layout: document.getElementById("tab-layout"),
  roofing: document.getElementById("tab-roofing"),
  ref: document.getElementById("tab-ref"),
};

function setActiveTab(key) {
  Object.values(tabs).forEach(t => t && t.classList.remove("isActive"));
  (tabs[key] || tabs.home)?.classList.add("isActive");

  document.querySelectorAll(".navBtn").forEach(b => b.classList.remove("isActive"));
  document.querySelector(`.navBtn[data-tab="${key}"]`)?.classList.add("isActive");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".navBtn").forEach(btn => {
  btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
});

// Force clean initial state
setActiveTab("home");

/* =========================
   Steps modal
========================= */
const stepsModal = document.getElementById("stepsModal");
const stepsTitle = document.getElementById("stepsTitle");
const stepsBody = document.getElementById("stepsBody");
document.getElementById("stepsClose").addEventListener("click", closeSteps);

function openSteps(title, body) {
  stepsTitle.textContent = title;
  stepsBody.textContent = body || "—";
  stepsModal.classList.add("isOpen");
  stepsModal.setAttribute("aria-hidden", "false");
}
function closeSteps() {
  stepsModal.classList.remove("isOpen");
  stepsModal.setAttribute("aria-hidden", "true");
}
stepsModal.addEventListener("click", (e) => {
  if (e.target === stepsModal) closeSteps();
});
document.querySelectorAll("[data-steps-open]").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-steps-open");
    openSteps(STEPS[key]?.title || "Steps", STEPS[key]?.body || "—");
  });
});

/* =========================
   Math helpers
========================= */
function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function roundToDenom(value, denom) { return Math.round(value * denom) / denom; }

function toFractionString(inches, denom = 16) {
  const sign = inches < 0 ? "-" : "";
  inches = Math.abs(inches);
  const whole = Math.floor(inches);
  const frac = inches - whole;
  const num = Math.round(frac * denom);

  if (num === 0) return sign + `${whole}"`;
  if (num === denom) return sign + `${whole + 1}"`;

  const g = gcd(num, denom);
  const rn = num / g, rd = denom / g;

  if (whole === 0) return sign + `${rn}/${rd}"`;
  return sign + `${whole} ${rn}/${rd}"`;
}

function toFeetInString(totalInches, denom = 16) {
  const sign = totalInches < 0 ? "-" : "";
  totalInches = Math.abs(totalInches);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches - feet * 12;
  const rounded = roundToDenom(inches, denom);

  if (rounded >= 12) return `${sign}${feet + 1}' 0"`;

  const wholeIn = Math.floor(rounded);
  const frac = rounded - wholeIn;
  const num = Math.round(frac * denom);

  let inchStr = "";
  if (num === 0) {
    inchStr = `${wholeIn}"`;
  } else {
    const g = gcd(num, denom);
    const rn = num / g, rd = denom / g;
    inchStr = wholeIn === 0 ? `${rn}/${rd}"` : `${wholeIn} ${rn}/${rd}"`;
  }
  return `${sign}${feet}' ${inchStr}`;
}

function normalizeQuotes(s) {
  // Critical iOS fix: normalize smart apostrophes ’ ‘ plus prime ′ into ASCII '
  // and smart inch quotes “ ” plus double-prime ″ into ASCII "
  return String(s || "")
    .replace(/″|“|”/g, '"')
    .replace(/′|’|‘/g, "'")
    .trim();
}

function parseMixedFraction(str) {
  if (!str) return NaN;
  const s = normalizeQuotes(str);

  const parts = s.split(/\s+/);

  if (parts.length === 2 && parts[1].includes("/")) {
    const whole = parseFloat(parts[0]);
    const [n, d] = parts[1].split("/").map(Number);
    if (!isFinite(whole) || !isFinite(n) || !isFinite(d) || d === 0) return NaN;
    return whole + n / d;
  }

  if (parts.length === 1 && parts[0].includes("/")) {
    const [n, d] = parts[0].split("/").map(Number);
    if (!isFinite(n) || !isFinite(d) || d === 0) return NaN;
    return n / d;
  }

  const n = parseFloat(s);
  return isFinite(n) ? n : NaN;
}

function parseFeetInches(str) {
  if (!str) return NaN;

  // Normalize smart quotes FIRST (this fixes 24’ 0” parsing as 2' instead of 24')
  let s = normalizeQuotes(str);

  // Optional hardening: support "ft/in" words
  s = s
    .replace(/\b(feet|foot|ft)\b/gi, "'")
    .replace(/\b(inches|inch|in)\b/gi, '"');

  if (!s.includes("'") && !s.includes('"') && !s.includes("/")) {
    const n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  let feet = 0;
  let inchesPart = "";

  if (s.includes("'")) {
    const [f, rest] = s.split("'");
    feet = parseFloat(f.trim());
    inchesPart = (rest || "").replace(/"/g, "").trim();
  } else {
    inchesPart = s.replace(/"/g, "").trim();
  }

  let inches = 0;
  if (inchesPart.length > 0) {
    inches = parseMixedFraction(inchesPart);
    if (!isFinite(inches)) return NaN;
  }

  if (!isFinite(feet)) return NaN;
  return feet * 12 + inches;
}

function fmt(n, digits = 6) {
  if (!isFinite(n)) return "—";
  return Number(n).toFixed(digits).replace(/\.?0+$/, "");
}

/* =========================
   HOME: Tape/Fraction
========================= */
const tapeFrac = document.getElementById("tape_frac");
const tapeDec = document.getElementById("tape_dec");
const outFracToDec = document.getElementById("out_frac_to_dec");
const outDecTo16 = document.getElementById("out_dec_to_16");

document.getElementById("btn_frac_to_dec").addEventListener("click", () => {
  const v = parseMixedFraction(tapeFrac.value);
  if (!isFinite(v)) { outFracToDec.textContent = "Enter a valid fraction/mixed number."; return; }
  outFracToDec.textContent = `${tapeFrac.value.trim()} in = ${fmt(v, 6)} in`;
  STEPS["steps-tape"].body =
`Tape / Fraction Converter Steps

Given fraction/mixed: ${tapeFrac.value.trim()}
1) Parse whole + numerator/denominator (if present)
2) Convert to decimal inches:
   decimal = whole + (num/denom)
Result: ${fmt(v, 6)} inches`;
});

document.getElementById("btn_dec_to_16").addEventListener("click", () => {
  const n = parseFloat(String(tapeDec.value).trim());
  if (!isFinite(n)) { outDecTo16.textContent = "Enter a valid decimal inches value."; return; }
  const r = roundToDenom(n, 16);
  outDecTo16.textContent = `${fmt(n, 6)} in ≈ ${toFractionString(r, 16)} (nearest 1/16)`;
  STEPS["steps-tape"].body =
`Tape / Fraction Converter Steps

Given decimal inches: ${fmt(n, 6)}
1) Round to nearest 1/16:
   rounded = round(decimal * 16) / 16
2) Convert to fraction display
Result: ${toFractionString(r, 16)}`;
});

document.getElementById("btn_frac_clear").addEventListener("click", () => {
  tapeFrac.value = "";
  outFracToDec.textContent = "—";
});
document.getElementById("btn_dec_clear").addEventListener("click", () => {
  tapeDec.value = "";
  outDecTo16.textContent = "—";
});

/* =========================
   HOME: Fraction Ops
========================= */
const opsA = document.getElementById("ops_a");
const opsB = document.getElementById("ops_b");
const outOps = document.getElementById("out_ops");

function fracOps(op) {
  const a = parseMixedFraction(opsA.value);
  const b = parseMixedFraction(opsB.value);
  if (!isFinite(a) || !isFinite(b)) { outOps.textContent = "Enter valid A and B fractions/mixed numbers."; return; }

  let res = NaN;
  let sym = "?";
  if (op === "add") { res = a + b; sym = "+"; }
  if (op === "sub") { res = a - b; sym = "−"; }
  if (op === "mul") { res = a * b; sym = "×"; }
  if (op === "div") { res = b === 0 ? NaN : a / b; sym = "÷"; }

  if (!isFinite(res)) { outOps.textContent = "Result undefined (division by zero?)"; return; }

  const rounded = roundToDenom(res, 16);
  outOps.textContent = `${opsA.value.trim()} ${sym} ${opsB.value.trim()} = ${fmt(res, 6)} in ≈ ${toFractionString(rounded, 16)} (nearest 1/16)`;

  STEPS["steps-fracops"].body =
`Fraction Ops Steps

A = ${opsA.value.trim()}  -> ${fmt(a, 6)} in
B = ${opsB.value.trim()}  -> ${fmt(b, 6)} in

1) Compute: A ${sym} B = ${fmt(res, 6)} in
2) Round to nearest 1/16:
   rounded = round(result * 16) / 16
3) Convert to tape fraction:
   ${toFractionString(rounded, 16)}

Tape-ready result: ${toFractionString(rounded, 16)}`;
}

document.querySelectorAll("[data-op]").forEach(btn => {
  btn.addEventListener("click", () => fracOps(btn.dataset.op));
});
document.getElementById("btn_ops_clear").addEventListener("click", () => {
  opsA.value = "";
  opsB.value = "";
  outOps.textContent = "—";
});

/* =========================
   HOME: Inches <-> Decimal Feet
========================= */
const fiIn = document.getElementById("fi_in");
const dfIn = document.getElementById("df_in");
const outFiToDf = document.getElementById("out_fi_to_df");
const outDfToFi = document.getElementById("out_df_to_fi");

document.getElementById("btn_fi_to_df").addEventListener("click", () => {
  const inches = parseFeetInches(fiIn.value);
  if (!isFinite(inches)) { outFiToDf.textContent = "Enter a valid feet & inches value."; return; }
  const decFeet = inches / 12;
  outFiToDf.textContent = `${fiIn.value.trim()} = ${fmt(decFeet, 6)} ft`;
  STEPS["steps-feetdec"].body =
`Inches ↔ Decimal Feet Steps

Given: ${fiIn.value.trim()}
1) Convert to total inches
2) Decimal feet = totalInches / 12

Total inches: ${fmt(inches, 6)}
Decimal feet: ${fmt(decFeet, 6)} ft`;
});

document.getElementById("btn_df_to_fi").addEventListener("click", () => {
  const decFeet = parseFloat(String(dfIn.value).trim());
  if (!isFinite(decFeet)) { outDfToFi.textContent = "Enter a valid decimal feet value."; return; }
  const totalIn = decFeet * 12;
  const out = toFeetInString(totalIn, 16);
  outDfToFi.textContent = `${fmt(decFeet, 6)} ft = ${out} (nearest 1/16")`;
  STEPS["steps-feetdec"].body =
`Inches ↔ Decimal Feet Steps

Given decimal feet: ${fmt(decFeet, 6)} ft
1) total inches = feet * 12 = ${fmt(totalIn, 6)}
2) Convert to ft + in with rounding to nearest 1/16"
Result: ${out}`;
});

document.getElementById("btn_fi_clear").addEventListener("click", () => {
  fiIn.value = "";
  outFiToDf.textContent = "—";
});
document.getElementById("btn_df_clear").addEventListener("click", () => {
  dfIn.value = "";
  outDfToFi.textContent = "—";
});

/* =========================
   LAYOUT: Wall estimator
========================= */
const wallLen = document.getElementById("wall_len");
const wallH = document.getElementById("wall_h");
const studOc = document.getElementById("stud_oc");
const sheetSize = document.getElementById("sheet_size");
const hangDir = document.getElementById("hang_dir");
const wastePct = document.getElementById("waste_pct");
const dwEdge = document.getElementById("dw_edge");
const dwField = document.getElementById("dw_field");
const ancSpace = document.getElementById("anc_space");
const ancEnd = document.getElementById("anc_end");
const outWall = document.getElementById("out_wall");

let lastWallResult = null;

function calcWallEstimator() {
  const L = parseFeetInches(wallLen.value);
  const H = parseFeetInches(wallH.value);
  if (!isFinite(L) || !isFinite(H) || L <= 0 || H <= 0) {
    outWall.textContent = "Enter valid wall length and height.";
    return;
  }

  const oc = parseFloat(studOc.value);
  const waste = clamp(parseFloat(wastePct.value || "0"), 0, 30) / 100;

  const [sw, sh] = (sheetSize.value === "4x12") ? [48, 144] : [48, 96];

  let sheetsBase = 0;
  let rows = 0;

  if (hangDir.value === "vertical") {
    rows = Math.ceil(H / sh);
    const perRow = Math.ceil(L / sw);
    sheetsBase = rows * perRow;
  } else {
    rows = Math.ceil(H / sw);
    const perRow = Math.ceil(L / sh);
    sheetsBase = rows * perRow;
  }

  const sheetsWithWaste = Math.ceil(sheetsBase * (1 + waste));

  const interior = Math.floor(L / oc);
  const studs = interior + 2;

  const edge = clamp(parseFloat(dwEdge.value || "8"), 4, 16);
  const field = clamp(parseFloat(dwField.value || "12"), 6, 24);

  const studLinesPerSheet = Math.floor(sw / oc) + 1;
  const sheetVertical = (hangDir.value === "vertical") ? Math.min(sh, H) : sw;

  const screwsPerStudLine = Math.ceil(sheetVertical / field) + 1;
  const edgeLines = 2;
  const fieldLines = Math.max(0, studLinesPerSheet - edgeLines);
  const screwsEdgeLine = Math.ceil(sheetVertical / edge) + 1;
  const screwsPerSheet = (edgeLines * screwsEdgeLine) + (fieldLines * screwsPerStudLine);
  const totalScrews = Math.ceil(screwsPerSheet * sheetsWithWaste);

  const space = clamp(parseFloat(ancSpace.value || "72"), 12, 120);
  const end = clamp(parseFloat(ancEnd.value || "12"), 4, 24);
  const usable = Math.max(0, L - 2 * end);
  const anchors = (usable <= 0) ? 2 : (2 + Math.floor(usable / space) + (usable % space === 0 ? 0 : 1));

  const areaSqFt = (L * H) / 144;

  outWall.textContent =
`Wall: ${toFeetInString(L, 16)} long × ${toFeetInString(H, 16)} high
Area: ${fmt(areaSqFt, 2)} sq ft

Sheet goods:
- Sheet: ${sheetSize.value} (${sw}"×${sh}")
- Hang: ${hangDir.value}
- Base sheets: ${sheetsBase}
- Waste: ${Math.round(waste * 100)}%
- Total sheets (waste included): ${sheetsWithWaste}

Framing estimate:
- Stud spacing: ${oc}" OC
- Stud count (includes both ends): ${studs}

Fastener estimates (editable):
- Drywall screws (edges ${edge}" / field ${field}"): ~${totalScrews} screws
- Bottom plate anchors (end ${end}" / spacing ${space}"): ~${anchors} anchors

Note: Fastener counts are estimates. Adjust spacing to match your course/jobsite spec.`;

  STEPS["steps-wall"].body =
`Wall Materials Estimator Steps

Inputs
- Wall length: ${wallLen.value.trim()} -> ${fmt(L, 3)} in
- Wall height: ${wallH.value.trim()} -> ${fmt(H, 3)} in
- Stud OC: ${oc}"  | Sheet: ${sheetSize.value}  | Hang: ${hangDir.value}
- Waste: ${Math.round(waste * 100)}%

1) Sheet count
Vertical:
  rows = ceil(H / sheetHeight)
  perRow = ceil(L / sheetWidth)
Horizontal:
  rows = ceil(H / 48")
  perRow = ceil(L / sheetLength)

Base sheets = rows * perRow
Waste sheets = ceil(base * (1 + waste))

2) Stud estimate
studs = floor(L / OC) + 2 (includes both ends)

3) Screw estimate
- studs crossing 4' sheet ≈ floor(48/OC)+1
- screws/line ≈ ceil(sheetVertical/spacing)+1
- total = screwsPerSheet * totalSheets

4) Anchor estimate
- end anchors at "end distance"
- then add every "spacing" between ends`;

  lastWallResult = { L, H, oc, sheetsWithWaste, studs, totalScrews, anchors, sheetSize: sheetSize.value };
}

document.getElementById("btn_wall_calc").addEventListener("click", calcWallEstimator);
document.getElementById("btn_wall_clear").addEventListener("click", () => {
  outWall.textContent = "—";
  lastWallResult = null;
});

/* =========================
   LAYOUT: Materials Auditor (localStorage)
========================= */
const AUD_KEY = "ccarpentry_auditor_v1";
let aud = loadAuditor();

const audItem = document.getElementById("aud_item");
const audQty = document.getElementById("aud_qty");
const audUnit = document.getElementById("aud_unit");
const audCost = document.getElementById("aud_cost");
const audNotes = document.getElementById("aud_notes");
const audRows = document.getElementById("aud_rows");
const audMeta = document.getElementById("aud_meta");

function loadAuditor() {
  try {
    const raw = localStorage.getItem(AUD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveAuditor() { localStorage.setItem(AUD_KEY, JSON.stringify(aud)); }

function auditorAddLine(line) {
  aud.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    item: line.item ?? audItem.value.trim(),
    qty: Number(line.qty ?? audQty.value) || 0,
    unit: line.unit ?? (audUnit.value.trim() || ""),
    cost: (line.cost ?? audCost.value) === "" ? "" : Number(line.cost ?? audCost.value),
    notes: line.notes ?? (audNotes.value.trim() || ""),
  });
  saveAuditor();
}

document.getElementById("aud_add").addEventListener("click", () => {
  if (!audItem.value.trim()) { audMeta.textContent = "Enter an item name before adding."; return; }
  auditorAddLine({});
  renderAuditor();
});

document.getElementById("aud_clear_inputs").addEventListener("click", () => {
  audItem.value = "";
  audQty.value = 1;
  audUnit.value = "";
  audCost.value = "";
  audNotes.value = "";
});

document.getElementById("aud_wipe").addEventListener("click", () => {
  if (!confirm("Wipe the entire materials list?")) return;
  aud = [];
  saveAuditor();
  renderAuditor();
});

document.getElementById("aud_export").addEventListener("click", async () => {
  const blob = new Blob([JSON.stringify(aud, null, 2)], { type: "application/json" });
  const text = await blob.text();
  try {
    await navigator.clipboard.writeText(text);
    audMeta.textContent = `Export copied to clipboard (${aud.length} lines).`;
  } catch {
    prompt("Copy JSON:", text);
  }
});

document.getElementById("aud_import").addEventListener("click", () => {
  const raw = prompt("Paste exported JSON here:");
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Not an array");
    aud = parsed.map(x => ({
      id: x.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
      item: String(x.item || ""),
      qty: Number(x.qty) || 0,
      unit: String(x.unit || ""),
      cost: x.cost === "" || x.cost == null ? "" : Number(x.cost),
      notes: String(x.notes || ""),
    }));
    saveAuditor();
    renderAuditor();
  } catch {
    audMeta.textContent = "Import failed. JSON must be an array of line items.";
  }
});

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderAuditor() {
  audRows.innerHTML = "";
  let total = 0;

  aud.forEach(line => {
    const lineTotal = (line.cost === "" ? 0 : (Number(line.cost) || 0)) * (Number(line.qty) || 0);
    total += lineTotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(line.item)}</td>
      <td class="num">${escapeHtml(String(line.qty))}</td>
      <td>${escapeHtml(line.unit || "")}</td>
      <td class="num">${line.cost === "" ? "" : escapeHtml(fmt(Number(line.cost), 2))}</td>
      <td>${escapeHtml(line.notes || "")}</td>
      <td class="num">${line.cost === "" ? "" : escapeHtml(fmt(lineTotal, 2))}</td>
      <td class="num"><button class="iconBtn" type="button" data-del="${line.id}">Del</button></td>
    `;
    audRows.appendChild(tr);
  });

  audRows.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      aud = aud.filter(x => x.id !== id);
      saveAuditor();
      renderAuditor();
    });
  });

  audMeta.textContent = `Lines: ${aud.length} • Total $: ${fmt(total, 2)} • Saved locally`;
}

renderAuditor();

document.getElementById("btn_wall_to_auditor").addEventListener("click", () => {
  if (!lastWallResult) { outWall.textContent = "Calculate first, then add to Auditor."; return; }
  auditorAddLine({ item: `Drywall ${lastWallResult.sheetSize}`, qty: lastWallResult.sheetsWithWaste, unit: "sheets", cost: "", notes: "from estimator" });
  auditorAddLine({ item: `Studs (est)`, qty: lastWallResult.studs, unit: "pcs", cost: "", notes: `${lastWallResult.oc}" OC` });
  auditorAddLine({ item: `Drywall screws (est)`, qty: lastWallResult.totalScrews, unit: "pcs", cost: "", notes: "spacing editable" });
  auditorAddLine({ item: `Anchors (est)`, qty: lastWallResult.anchors, unit: "pcs", cost: "", notes: "bottom plate" });
  renderAuditor();
});

/* =========================
   ROOFING
========================= */
const outPitch = document.getElementById("out_pitch");
const outRaf = document.getElementById("out_raf");
const outDiag = document.getElementById("out_diag");

document.getElementById("btn_pitch_calc").addEventListener("click", () => {
  const rise = parseFloat(document.getElementById("pitch_rise").value);
  const run = parseFloat(document.getElementById("pitch_run").value);
  if (!isFinite(rise) || !isFinite(run) || run <= 0) { outPitch.textContent = "Enter valid rise and run."; return; }
  const ratio = rise / run;
  const angle = Math.atan(ratio) * (180 / Math.PI);
  const pct = ratio * 100;
  outPitch.textContent = `Pitch: ${rise}/${run}\nAngle: ${fmt(angle, 1)}°\nSlope: ${fmt(pct, 1)}%`;
  STEPS["steps-pitch"].body =
`Pitch ↔ Angle Steps

Given rise=${rise}, run=${run}
1) ratio = rise/run = ${fmt(ratio, 6)}
2) angle = atan(ratio) × 180/π = ${fmt(angle, 3)}°
3) slope% = ratio × 100 = ${fmt(pct, 3)}%`;
});
document.getElementById("btn_pitch_clear").addEventListener("click", () => outPitch.textContent = "—");

document.getElementById("btn_raf_calc").addEventListener("click", () => {
  const runIn = parseFeetInches(document.getElementById("raf_run").value);
  const pitch = parseFloat(document.getElementById("raf_pitch").value);
  if (!isFinite(runIn) || !isFinite(pitch) || runIn <= 0) { outRaf.textContent = "Enter valid run and pitch."; return; }

  const riseIn = runIn * (pitch / 12);
  const diag = Math.sqrt(runIn * runIn + riseIn * riseIn);
  const angle = Math.atan(riseIn / runIn) * (180 / Math.PI);

  outRaf.textContent =
`Run: ${toFeetInString(runIn, 16)}
Rise: ${toFeetInString(riseIn, 16)}
Rafter (diagonal): ${toFeetInString(diag, 16)}
Angle: ${fmt(angle, 1)}°`;

  STEPS["steps-rafter"].body =
`Rafter Length Steps

Given run=${fmt(runIn, 3)} in, pitch=${pitch}/12
1) rise = run × (pitch/12) = ${fmt(riseIn, 3)} in
2) diagonal = √(run² + rise²) = ${fmt(diag, 3)} in
3) angle = atan(rise/run) × 180/π = ${fmt(angle, 3)}°`;
});
document.getElementById("btn_raf_clear").addEventListener("click", () => outRaf.textContent = "—");

document.getElementById("btn_diag_calc").addEventListener("click", () => {
  const a = parseFeetInches(document.getElementById("diag_a").value);
  const b = parseFeetInches(document.getElementById("diag_b").value);
  if (!isFinite(a) || !isFinite(b) || a <= 0 || b <= 0) { outDiag.textContent = "Enter valid A and B."; return; }
  const d = Math.sqrt(a * a + b * b);
  outDiag.textContent = `Diagonal: ${toFeetInString(d, 16)}\n(√(A² + B²))`;
  STEPS["steps-diag"].body =
`Diagonal Steps

A=${fmt(a, 3)} in
B=${fmt(b, 3)} in
1) A² + B² = ${fmt(a*a + b*b, 3)}
2) √(sum) = ${fmt(d, 3)} in
Result: ${toFeetInString(d, 16)}`;
});
document.getElementById("btn_diag_clear").addEventListener("click", () => outDiag.textContent = "—");

/* =========================
   Steps content registry
========================= */
const STEPS = {
  "steps-tape": { title: "Steps — Tape / Fraction Converter", body: "Use Convert to see the breakdown." },
  "steps-fracops": { title: "Steps — Fraction Operations", body: "Run an operation to populate steps." },
  "steps-feetdec": { title: "Steps — Inches ↔ Decimal Feet", body: "Run a conversion to populate steps." },
  "steps-wall": { title: "Steps — Wall Materials Estimator", body: "Tap Calculate to see the breakdown." },
  "steps-auditor": {
    title: "Steps — Materials Auditor",
    body:
`Materials Auditor Steps

- Add Line: stores an item (qty, unit, cost, notes)
- Saved locally (offline) in your browser
- Export JSON: copy your list as JSON
- Import JSON: paste JSON back in
- Wipe List: clears all saved lines`
  },
  "steps-pitch": { title: "Steps — Pitch ↔ Angle", body: "Tap Calculate to see the breakdown." },
  "steps-rafter": { title: "Steps — Rafter Length", body: "Tap Calculate to see the breakdown." },
  "steps-diag": { title: "Steps — Diagonal", body: "Tap Calculate to see the breakdown." },
};
