/* =========================
   NAV
========================= */
const views = Array.from(document.querySelectorAll(".view"));
const navBtns = Array.from(document.querySelectorAll(".navBtn"));

function showView(id) {
  views.forEach(v => v.classList.toggle("isActive", v.id === id));
  navBtns.forEach(b => b.classList.toggle("isActive", b.dataset.target === id));
  // keep scroll sane on mobile
  window.scrollTo({ top: 0, behavior: "instant" });
}

navBtns.forEach(btn => {
  btn.addEventListener("click", () => showView(btn.dataset.target));
});

// Steps toggles (all buttons with data-steps)
document.querySelectorAll("[data-steps]").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-steps");
    const panel = document.getElementById(id);
    if (panel) panel.hidden = !panel.hidden;
  });
});

/* =========================
   MATH HELPERS
========================= */
function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

function parseFractionToRational(raw) {
  // Supports: "7/16", "1 3/8", "2", "  1/2  "
  const s = (raw || "").trim().replace(/"/g, "");
  if (!s) throw new Error("empty");

  const parts = s.split(/\s+/);
  if (parts.length === 1) {
    if (parts[0].includes("/")) {
      const [n, d] = parts[0].split("/");
      const nn = parseInt(n, 10), dd = parseInt(d, 10);
      if (!dd) throw new Error("bad denom");
      return { n: nn, d: dd };
    }
    const v = Number(parts[0]);
    if (!Number.isFinite(v)) throw new Error("bad number");
    return { n: Math.trunc(v), d: 1 };
  }

  // mixed number: whole + frac
  const whole = parseInt(parts[0], 10);
  const frac = parts[1];
  if (!frac.includes("/")) throw new Error("bad mixed");
  const [n, d] = frac.split("/");
  const nn = parseInt(n, 10), dd = parseInt(d, 10);
  if (!dd) throw new Error("bad denom");
  const sign = whole < 0 ? -1 : 1;
  const absWhole = Math.abs(whole);
  return { n: sign * (absWhole * dd + nn), d: dd };
}

function simplify({ n, d }) {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

function rationalToDecimal({ n, d }) {
  return n / d;
}

function rationalOp(a, b, op) {
  // a,b are rationals
  let n, d;
  if (op === "add") {
    const L = lcm(a.d, b.d);
    n = a.n * (L / a.d) + b.n * (L / b.d);
    d = L;
  } else if (op === "sub") {
    const L = lcm(a.d, b.d);
    n = a.n * (L / a.d) - b.n * (L / b.d);
    d = L;
  } else if (op === "mul") {
    n = a.n * b.n;
    d = a.d * b.d;
  } else if (op === "div") {
    if (b.n === 0) throw new Error("divide by zero");
    n = a.n * b.d;
    d = a.d * b.n;
  } else {
    throw new Error("bad op");
  }
  return simplify({ n, d });
}

function toNearestSixteenthInches(decimalInches) {
  // returns inches as rational with denom 16
  const rounded = Math.round(decimalInches * 16) / 16;
  const n = Math.round(rounded * 16);
  return { n, d: 16 }; // inches
}

function formatTapeFromInches(decimalInches) {
  // decimal inches -> whole + x/16
  const r = toNearestSixteenthInches(decimalInches);
  let total16 = r.n; // in 16ths
  const sign = total16 < 0 ? -1 : 1;
  total16 = Math.abs(total16);

  const whole = Math.floor(total16 / 16);
  const frac = total16 % 16;

  if (frac === 0) return `${sign < 0 ? "-" : ""}${whole}"`;

  // reduce fraction out of 16 for display (still nearest 1/16)
  const g = gcd(frac, 16);
  const nn = frac / g;
  const dd = 16 / g;

  return `${sign < 0 ? "-" : ""}${whole} ${nn}/${dd}"`;
}

function parseFeetInchesToInches(raw) {
  // Supports: 12' 0, 5' 3 7/16, 3', 6 1/2 (assumes inches if no ')
  const s = (raw || "").trim().replace(/”|“/g, '"');
  if (!s) throw new Error("empty");

  if (s.includes("'")) {
    const [ftPart, restPart] = s.split("'");
    const ft = Number(ftPart.trim() || "0");
    if (!Number.isFinite(ft)) throw new Error("bad ft");
    const rest = (restPart || "").trim();
    if (!rest) return ft * 12;

    // rest may be: 3 7/16, 3, 0, 3/8
    const inchesRat = simplify(parseFractionToRational(rest));
    return ft * 12 + rationalToDecimal(inchesRat);
  }

  // no feet symbol => inches fraction/mixed/decimal
  if (s.includes("/") || s.includes(" ")) {
    return rationalToDecimal(simplify(parseFractionToRational(s)));
  }

  const v = Number(s.replace(/"/g, ""));
  if (!Number.isFinite(v)) throw new Error("bad inches");
  return v;
}

function formatFtInFromInches(decimalInches) {
  const rounded = Math.round(decimalInches * 16) / 16; // nearest 1/16
  const sign = rounded < 0 ? "-" : "";
  let x = Math.abs(rounded);

  const ft = Math.floor(x / 12);
  x = x - ft * 12;

  const inchesText = formatTapeFromInches(x);
  // inchesText returns like `3 7/16"` or `0"` etc
  return `${sign}${ft}' ${inchesText}`;
}

/* =========================
   HOME: Tape / Fraction Converter
========================= */
const inpFracToDec = document.getElementById("inpFracToDec");
const outFracToDec = document.getElementById("outFracToDec");
const outStepsTape = document.getElementById("outStepsTape");

document.getElementById("btnFracToDec").addEventListener("click", () => {
  try {
    const rat = simplify(parseFractionToRational(inpFracToDec.value));
    const dec = rationalToDecimal(rat);
    const tape = formatTapeFromInches(dec);

    outFracToDec.textContent =
      `${inpFracToDec.value.trim()} in = ${dec.toFixed(6)} in\n≈ ${tape} (nearest 1/16)`;

    outStepsTape.textContent =
`Given: ${inpFracToDec.value.trim()}
Convert to rational: ${rat.n}/${rat.d}
Decimal inches = n ÷ d = ${dec.toFixed(6)}
Nearest 1/16 = round(decimal × 16) ÷ 16 = ${tape}`;
  } catch (e) {
    outFracToDec.textContent = "—";
    outStepsTape.textContent = "Enter a valid fraction or mixed number (e.g., 1 3/8, 7/16).";
  }
});

document.getElementById("btnTapeClear1").addEventListener("click", () => {
  inpFracToDec.value = "";
  outFracToDec.textContent = "—";
});

const inpDecToTape = document.getElementById("inpDecToTape");
const outDecToTape = document.getElementById("outDecToTape");

document.getElementById("btnDecToTape").addEventListener("click", () => {
  try {
    const dec = Number(inpDecToTape.value);
    if (!Number.isFinite(dec)) throw new Error("bad");
    const tape = formatTapeFromInches(dec);
    outDecToTape.textContent =
      `${dec} in ≈ ${tape} (nearest 1/16)`;
    outStepsTape.textContent =
`Given: ${dec} inches
Multiply by 16 = ${(dec * 16).toFixed(4)}
Round to nearest whole = ${Math.round(dec * 16)}
Divide by 16 = ${tape}`;
  } catch {
    outDecToTape.textContent = "—";
    outStepsTape.textContent = "Enter a valid decimal inches value (e.g., 0.1875).";
  }
});

document.getElementById("btnTapeClear2").addEventListener("click", () => {
  inpDecToTape.value = "";
  outDecToTape.textContent = "—";
});

/* =========================
   HOME: Fraction Ops
========================= */
const inpA = document.getElementById("inpA");
const inpB = document.getElementById("inpB");
const outFracOps = document.getElementById("outFracOps");
const outStepsFracOps = document.getElementById("outStepsFracOps");

function runFracOp(op) {
  try {
    const A = simplify(parseFractionToRational(inpA.value));
    const B = simplify(parseFractionToRational(inpB.value));
    const R = rationalOp(A, B, op);
    const dec = rationalToDecimal(R);
    const tape = formatTapeFromInches(dec);

    const opLabel = op === "add" ? "+" : op === "sub" ? "−" : op === "mul" ? "×" : "÷";

    outFracOps.textContent =
      `Result: ${R.n}/${R.d} in\n` +
      `Decimal: ${dec.toFixed(6)} in\n` +
      `≈ ${tape} (nearest 1/16)`;

    outStepsFracOps.textContent =
`A = ${A.n}/${A.d}
B = ${B.n}/${B.d}
Operation: A ${opLabel} B
Result (simplified) = ${R.n}/${R.d}
Decimal = ${dec.toFixed(6)}
Nearest 1/16 = ${tape}`;
  } catch (e) {
    outFracOps.textContent = "—";
    outStepsFracOps.textContent = "Enter valid fractions/mixed numbers in A and B.";
  }
}

document.getElementById("btnAdd").addEventListener("click", () => runFracOp("add"));
document.getElementById("btnSub").addEventListener("click", () => runFracOp("sub"));
document.getElementById("btnMul").addEventListener("click", () => runFracOp("mul"));
document.getElementById("btnDiv").addEventListener("click", () => runFracOp("div"));

document.getElementById("btnFracOpsClear").addEventListener("click", () => {
  inpA.value = "";
  inpB.value = "";
  outFracOps.textContent = "—";
});

/* =========================
   HOME: Inches ↔ Decimal Feet
========================= */
const inpFtIn = document.getElementById("inpFtIn");
const inpDecFt = document.getElementById("inpDecFt");
const outToDecFt = document.getElementById("outToDecFt");
const outToFtIn = document.getElementById("outToFtIn");
const outStepsFeet = document.getElementById("outStepsFeet");

document.getElementById("btnToDecFt").addEventListener("click", () => {
  try {
    const inches = parseFeetInchesToInches(inpFtIn.value);
    const decFt = inches / 12;

    outToDecFt.textContent =
      `${formatFtInFromInches(inches)} = ${decFt.toFixed(6)} ft`;

    outStepsFeet.textContent =
`Parse input into inches = ${inches.toFixed(6)}"
Decimal feet = inches ÷ 12
= ${decFt.toFixed(6)} ft`;
  } catch {
    outToDecFt.textContent = "—";
    outStepsFeet.textContent = "Enter a valid feet/inches value (e.g., 5' 3 7/16).";
  }
});

document.getElementById("btnToFtIn").addEventListener("click", () => {
  try {
    const decFt = Number(inpDecFt.value);
    if (!Number.isFinite(decFt)) throw new Error("bad");
    const inches = decFt * 12;

    outToFtIn.textContent =
      `${decFt} ft = ${formatFtInFromInches(inches)} (nearest 1/16)`;

    outStepsFeet.textContent =
`Feet to inches = ${decFt} × 12 = ${inches.toFixed(6)}"
Round to nearest 1/16 and format as ft + in`;
  } catch {
    outToFtIn.textContent = "—";
    outStepsFeet.textContent = "Enter a valid decimal feet value.";
  }
});

document.getElementById("btnFeetClear1").addEventListener("click", () => {
  inpFtIn.value = "";
  outToDecFt.textContent = "—";
});
document.getElementById("btnFeetClear2").addEventListener("click", () => {
  inpDecFt.value = "";
  outToFtIn.textContent = "—";
});

/* =========================
   LAYOUT: Materials Auditor (localStorage)
========================= */
const LS_KEY = "ccarpentry_materials_v1";
let materials = [];

const audItem = document.getElementById("audItem");
const audQty  = document.getElementById("audQty");
const audUnit = document.getElementById("audUnit");
const audCost = document.getElementById("audCost");
const audNotes= document.getElementById("audNotes");

const audBody = document.getElementById("audBody");
const audSummary = document.getElementById("audSummary");

function saveMaterials() {
  localStorage.setItem(LS_KEY, JSON.stringify(materials));
}

function loadMaterials() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    materials = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(materials)) materials = [];
  } catch {
    materials = [];
  }
}

function money(x) {
  return (Math.round(x * 100) / 100).toFixed(2);
}

function renderMaterials() {
  audBody.innerHTML = "";
  let totalCost = 0;

  materials.forEach((m, idx) => {
    const qty = Number(m.qty) || 0;
    const cost = Number(m.cost) || 0;
    const line = qty * cost;
    totalCost += line;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(m.item || "")}</td>
      <td class="num">${qty}</td>
      <td>${escapeHtml(m.unit || "")}</td>
      <td class="num">${m.cost ? money(cost) : ""}</td>
      <td>${escapeHtml(m.notes || "")}</td>
      <td class="num">${m.cost ? money(line) : ""}</td>
      <td class="num"><button class="btnX" data-del="${idx}">✕</button></td>
    `;
    audBody.appendChild(tr);
  });

  const count = materials.length;
  audSummary.textContent =
    `Lines: ${count}  •  Total $: ${count ? money(totalCost) : "0.00"}  •  Saved locally`;

  audBody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-del"));
      materials.splice(i, 1);
      saveMaterials();
      renderMaterials();
    });
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

document.getElementById("audAdd").addEventListener("click", () => {
  const item = (audItem.value || "").trim();
  const qty = Number(audQty.value);
  const unit = (audUnit.value || "").trim();
  const cost = audCost.value ? Number(audCost.value) : 0;
  const notes = (audNotes.value || "").trim();

  if (!item || !Number.isFinite(qty)) return;

  materials.unshift({
    item,
    qty,
    unit,
    cost: Number.isFinite(cost) ? cost : 0,
    notes,
    ts: Date.now()
  });

  saveMaterials();
  renderMaterials();

  audItem.value = "";
  audQty.value = "";
  audUnit.value = "";
  audCost.value = "";
  audNotes.value = "";
});

document.getElementById("audClearInputs").addEventListener("click", () => {
  audItem.value = "";
  audQty.value = "";
  audUnit.value = "";
  audCost.value = "";
  audNotes.value = "";
});

document.getElementById("audWipe").addEventListener("click", () => {
  materials = [];
  saveMaterials();
  renderMaterials();
});

document.getElementById("audExport").addEventListener("click", async () => {
  const text = JSON.stringify(materials, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    audSummary.textContent = "Exported to clipboard (JSON). Paste into Notes as backup.";
  } catch {
    // fallback prompt
    prompt("Copy this JSON:", text);
  }
});

document.getElementById("audImport").addEventListener("click", () => {
  const raw = prompt("Paste Materials JSON:");
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("not array");
    materials = parsed;
    saveMaterials();
    renderMaterials();
  } catch {
    audSummary.textContent = "Import failed. JSON format not valid.";
  }
});

/* =========================
   ROOFING
========================= */
const outStepsPitch = document.getElementById("outStepsPitch");
const outStepsRafter = document.getElementById("outStepsRafter");
const outStepsSquare = document.getElementById("outStepsSquare");

document.getElementById("btnPitchCalc").addEventListener("click", () => {
  try {
    const rise = Number(document.getElementById("inpPitchRise").value);
    const run = Number(document.getElementById("inpPitchRun").value || 12);
    if (!Number.isFinite(rise) || !Number.isFinite(run) || run === 0) throw new Error("bad");

    const ratio = rise / run;
    const angle = Math.atan(ratio) * 180 / Math.PI;
    const percent = ratio * 100;

    document.getElementById("outPitch").textContent =
      `Pitch: ${rise}/${run}\nAngle: ${angle.toFixed(1)}°\nSlope: ${percent.toFixed(1)}%`;

    outStepsPitch.textContent =
`Given rise = ${rise}, run = ${run}
Ratio = rise/run = ${ratio.toFixed(4)}
Angle = atan(ratio) × 180/π = ${angle.toFixed(1)}°
Slope % = ratio × 100 = ${percent.toFixed(1)}%`;
  } catch {
    document.getElementById("outPitch").textContent = "—";
    outStepsPitch.textContent = "Enter valid rise/run numbers.";
  }
});

document.getElementById("btnPitchClear").addEventListener("click", () => {
  document.getElementById("inpPitchRise").value = "";
  document.getElementById("inpPitchRun").value = "";
  document.getElementById("outPitch").textContent = "—";
});

document.getElementById("btnRafterCalc").addEventListener("click", () => {
  try {
    const runIn = parseFeetInchesToInches(document.getElementById("inpRun").value);
    const pitchRise = Number(document.getElementById("inpPitch").value);
    if (!Number.isFinite(runIn) || !Number.isFinite(pitchRise)) throw new Error("bad");

    const riseIn = runIn * (pitchRise / 12);
    const diagIn = Math.sqrt(runIn ** 2 + riseIn ** 2);
    const angle = Math.atan(riseIn / runIn) * 180 / Math.PI;

    document.getElementById("outRafter").textContent =
      `Run: ${formatFtInFromInches(runIn)}\n` +
      `Rise: ${formatFtInFromInches(riseIn)}\n` +
      `Rafter: ${formatFtInFromInches(diagIn)}\n` +
      `Angle: ${angle.toFixed(1)}°`;

    outStepsRafter.textContent =
`Run (in) = ${runIn.toFixed(6)}
Rise = run × (pitchRise/12)
= ${runIn.toFixed(6)} × (${pitchRise}/12)
= ${riseIn.toFixed(6)}
Rafter = √(run² + rise²)
= ${diagIn.toFixed(6)}
Angle = atan(rise/run) = ${angle.toFixed(1)}°`;
  } catch {
    document.getElementById("outRafter").textContent = "—";
    outStepsRafter.textContent = "Enter valid run and pitch.";
  }
});

document.getElementById("btnRafterClear").addEventListener("click", () => {
  document.getElementById("inpRun").value = "";
  document.getElementById("inpPitch").value = "";
  document.getElementById("outRafter").textContent = "—";
});

document.getElementById("btnSquareCalc").addEventListener("click", () => {
  try {
    const a = parseFeetInchesToInches(document.getElementById("inpSideA").value);
    const b = parseFeetInchesToInches(document.getElementById("inpSideB").value);
    if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error("bad");

    const d = Math.sqrt(a ** 2 + b ** 2);

    document.getElementById("outSquare").textContent =
      `Diagonal: ${formatFtInFromInches(d)} (nearest 1/16)`;

    outStepsSquare.textContent =
`A = ${a.toFixed(6)} in
B = ${b.toFixed(6)} in
Diagonal = √(A² + B²)
= ${d.toFixed(6)} in`;
  } catch {
    document.getElementById("outSquare").textContent = "—";
    outStepsSquare.textContent = "Enter valid lengths for A and B.";
  }
});

document.getElementById("btnSquareClear").addEventListener("click", () => {
  document.getElementById("inpSideA").value = "";
  document.getElementById("inpSideB").value = "";
  document.getElementById("outSquare").textContent = "—";
});

/* boot */
loadMaterials();
renderMaterials();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}
