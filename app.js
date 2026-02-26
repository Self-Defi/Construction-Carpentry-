// app.js — v16

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);

function gcd(a, b){
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function roundTo(x, step){
  const s = Number(step);
  if (!isFinite(s) || s <= 0) return x;
  return Math.round(x / s) * s;
}

// Parse a fraction token like "7/8" or "1 1/2" or "-2 3/8"
function parseFractionNumber(str){
  let s = String(str).trim();
  if (!s) return null;

  // handle leading sign
  let sign = 1;
  if (s.startsWith("-")) { sign = -1; s = s.slice(1).trim(); }
  else if (s.startsWith("+")) { s = s.slice(1).trim(); }

  // mixed: "a b/c"
  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed){
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (!den) return null;
    return sign * (whole + num/den);
  }

  // simple fraction: "a/b"
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac){
    const num = Number(frac[1]);
    const den = Number(frac[2]);
    if (!den) return null;
    return sign * (num/den);
  }

  // decimal or integer
  const n = Number(s);
  if (isFinite(n)) return sign * n;

  return null;
}

/**
 * Parse tape-format measurement into TOTAL INCHES (decimal).
 * Accepts:
 *  - 7' 10 7/8"
 *  - 12' 0"
 *  - 5 1/2"
 *  - 96   (assume inches)
 *  - 1/4' (feet fraction)
 *  - 0.125" (inches decimal)
 */
function parseMeasurementToInches(input){
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  // normalize: remove commas, collapse spaces
  let s = raw.replace(/,/g, "").replace(/\s+/g, " ").trim();

  // If it has a trailing quote mark, treat as inches expression
  // If it has trailing apostrophe, treat as feet expression
  // Otherwise we parse as combined or plain number (inches)
  let feet = 0;
  let inches = 0;

  // Match feet part like: "7'" or "7 '"
  const feetMatch = s.match(/(-?\d+(?:\.\d+)?)\s*'\s*/);
  if (feetMatch){
    feet = Number(feetMatch[1]);
    if (!isFinite(feet)) return null;
    // remove that feet segment
    s = s.replace(feetMatch[0], "").trim();
  } else {
    // also allow fractional feet like "1/4'"
    const feetFracMatch = s.match(/([+-]?\d+\s+\d+\s*\/\s*\d+|[+-]?\d+\s*\/\s*\d+|[+-]?\d+(?:\.\d+)?)\s*'\s*/);
    if (feetFracMatch){
      const ft = parseFractionNumber(feetFracMatch[1]);
      if (ft == null) return null;
      feet = ft;
      s = s.replace(feetFracMatch[0], "").trim();
    }
  }

  // Remove inch quote if present at end or after
  s = s.replace(/"/g, "").trim();

  if (s){
    // remaining is inches expression (could be "10 7/8" or "5 1/2" or "3/8" or "10.25")
    const inchVal = parseFractionNumber(s);
    if (inchVal == null) {
      // if raw was plain number with no feet and no inches tokens, treat as inches
      const maybe = Number(s);
      if (!isFinite(maybe)) return null;
      inches = maybe;
    } else {
      inches = inchVal;
    }
  }

  // If original had no explicit feet AND had trailing apostrophe only: already handled.
  // If original is plain number with no quotes/apostrophe, treat as inches:
  if (!feetMatch && raw.indexOf("'") === -1 && raw.indexOf('"') === -1){
    const n = parseFractionNumber(raw);
    if (n == null) return null;
    return n; // inches
  }

  return feet * 12 + inches;
}

function toMixedFractionString(valueInInches, denom=16){
  const sign = valueInInches < 0 ? "-" : "";
  const v = Math.abs(valueInInches);

  const whole = Math.floor(v);
  const frac = v - whole;

  let num = Math.round(frac * denom);
  let den = denom;

  // carry
  let w = whole;
  if (num === den){ w += 1; num = 0; }

  if (num === 0) return `${sign}${w}`;

  const g = gcd(num, den);
  num /= g; den /= g;

  if (w === 0) return `${sign}${num}/${den}`;
  return `${sign}${w} ${num}/${den}`;
}

function inchesToTape(inchesTotal){
  // round to nearest 1/16"
  const rounded = Math.round(inchesTotal * 16) / 16;

  const sign = rounded < 0 ? "-" : "";
  let v = Math.abs(rounded);

  const feet = Math.floor(v / 12);
  v = v - feet * 12;

  const wholeIn = Math.floor(v);
  const frac = v - wholeIn;

  let num = Math.round(frac * 16);
  let den = 16;

  let inch = wholeIn;
  if (num === den){ inch += 1; num = 0; }
  let ft = feet;
  if (inch >= 12){ ft += 1; inch -= 12; }

  let fracStr = "";
  if (num !== 0){
    const g = gcd(num, den);
    num /= g; den /= g;
    fracStr = ` ${num}/${den}`;
  }

  return `${sign}${ft}' ${inch}${fracStr}"`;
}

function formatDecimal(n, step){
  const s = Number(step);
  const r = roundTo(n, s);
  // keep reasonable digits based on step
  let digits = 3;
  if (s >= 1) digits = 0;
  else if (s >= 0.1) digits = 1;
  else if (s >= 0.01) digits = 2;
  else digits = 3;
  return r.toFixed(digits);
}

// ---------- Tabs ----------
function setActiveTab(tabName){
  document.querySelectorAll(".tabBtn").forEach(btn => {
    btn.classList.toggle("isActive", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tabPanel").forEach(panel => {
    panel.classList.toggle("isActive", panel.id === `tab-${tabName}`);
  });
}

document.querySelectorAll(".tabBtn").forEach(btn => {
  btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
});

// ---------- Modal (Steps) ----------
const modal = $("modal");
const modalBackdrop = $("modalBackdrop");
const modalClose = $("modalClose");
const modalTitle = $("modalTitle");
const modalBody = $("modalBody");

function openModal(title, html){
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  modal.classList.add("isOpen");
  modal.setAttribute("aria-hidden","false");
}

function closeModal(){
  modal.classList.remove("isOpen");
  modal.setAttribute("aria-hidden","true");
}

modalBackdrop.addEventListener("click", closeModal);
modalClose.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("isOpen")) closeModal();
});

const STEPS = {
  "measurements": {
    title: "Steps — Measurement Converter",
    html: `
      <strong>1)</strong> Enter any measurement style:
      <ul>
        <li><code>7' 10 7/8"</code> (feet + inches + fraction)</li>
        <li><code>5 1/2"</code> (inches mixed fraction)</li>
        <li><code>96</code> (plain number = inches)</li>
        <li><code>1/4'</code> (fractional feet)</li>
      </ul>
      <strong>2)</strong> Tap <code>Convert</code>.<br/>
      <strong>3)</strong> Outputs include:
      <ul>
        <li>Decimal inches + decimal feet</li>
        <li>Fraction inches (mixed)</li>
        <li>Tape format rounded to nearest <code>1/16"</code></li>
        <li>Millimeters</li>
      </ul>
    `
  },

  "layout-perimeter": {
    title: "Steps — Perimeter",
    html: `
      <strong>1)</strong> Enter <code>Length</code> and <code>Width</code> in tape format (feet/inches).<br/>
      <strong>2)</strong> Tap <code>Calculate</code>.<br/>
      <strong>3)</strong> Output includes:
      <ul>
        <li>Total perimeter in inches + feet (decimal)</li>
        <li>Tape format (nearest <code>1/16"</code>)</li>
      </ul>
    `
  },

  "layout-wall": {
    title: "Steps — Wall Materials",
    html: `
      <strong>Stud estimate (fast):</strong>
      <ol>
        <li>Studs along wall at <code>16" O.C.</code> (or 24") + end studs</li>
        <li>Add corners: <code>+3 studs</code> per corner (NCCER-style add-on)</li>
        <li>Add T-intersections: <code>+2 studs</code> each (backing/tee estimate)</li>
        <li>Openings:
          <ul>
            <li>&lt;= 5' wide: add <code>+2 studs</code> (trimmers/jacks)</li>
            <li>&gt; 5' wide: add <code>+4 studs</code> (heavier opening)</li>
          </ul>
        </li>
        <li>Header linear feet:
          <ul>
            <li>Per opening: add <code>+3"</code> if &lt;= 5' wide</li>
            <li>Per opening: add <code>+6"</code> if &gt; 5' wide</li>
            <li>Multiply by header plies (2-ply / 3-ply)</li>
          </ul>
        </li>
        <li>Apply waste %.</li>
      </ol>
      <div class="muted">Note: This is a field estimator—verify requirements for load-bearing walls and engineered headers.</div>
    `
  }
};

document.querySelectorAll("[data-steps]").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-steps");
    const step = STEPS[key];
    if (!step) return;
    openModal(step.title, step.html);
  });
});

// ---------- Measurements Converter ----------
function runMeasConvert(){
  const input = $("measIn").value;
  const step = $("measRound").value;

  const inches = parseMeasurementToInches(input);
  if (inches == null || !isFinite(inches)){
    $("measOut").textContent = "Enter a valid measurement.\nExamples: 7' 10 7/8\"  |  5 1/2\"  |  96  |  1/4'";
    return;
  }

  const decIn = formatDecimal(inches, step);
  const decFt = formatDecimal(inches / 12, step);
  const mm = formatDecimal(inches * 25.4, step);

  const fracIn = toMixedFractionString(Math.round(inches * 16) / 16, 16);
  const tape = inchesToTape(inches);

  $("measOut").textContent =
`INPUT
${input}

DECIMALS
Inches: ${decIn}"
Feet:   ${decFt}'

FRACTION (inches, nearest 1/16")
${fracIn}"

TAPE (nearest 1/16")
${tape}

METRIC
${mm} mm`;
}

$("btnMeasConvert")?.addEventListener("click", runMeasConvert);
$("measIn")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runMeasConvert();
});
$("btnMeasClear")?.addEventListener("click", () => {
  $("measIn").value = "";
  $("measOut").textContent = "Enter a measurement to convert.";
});

// ---------- Layout: Perimeter ----------
function runPerimeter(){
  const L = parseMeasurementToInches($("perLen").value);
  const W = parseMeasurementToInches($("perWid").value);

  if (L == null || W == null || !isFinite(L) || !isFinite(W)){
    $("perimOut").textContent = "Enter valid length and width (tape format). Example: 24' 0\" and 12' 0\".";
    return;
  }

  const perIn = 2 * (L + W);
  const perFt = perIn / 12;

  $("perimOut").textContent =
`PERIMETER
Tape:   ${inchesToTape(perIn)}
Inches: ${perIn.toFixed(3)}"
Feet:   ${perFt.toFixed(3)}'`;
}

$("btnCalcPerim")?.addEventListener("click", runPerimeter);
$("btnClearPerim")?.addEventListener("click", () => {
  $("perLen").value = "";
  $("perWid").value = "";
  $("perimOut").textContent = "Enter length and width to calculate total perimeter.";
});

// ---------- Wall Materials Estimator (existing + openings + headers) ----------
function parseOpenings(text){
  const lines = String(text || "")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const openings = [];
  for (const line of lines){
    // allow: "D 3' 0" or "W 2' 6" or just "3' 0" (assume opening)
    const m = line.match(/^([DW])\s+(.+)$/i);
    let kind = "O";
    let widthStr = line;
    if (m){
      kind = m[1].toUpperCase();
      widthStr = m[2].trim();
    }
    const wIn = parseMeasurementToInches(widthStr);
    if (wIn == null || !isFinite(wIn)) continue;
    openings.push({ kind, widthIn: wIn });
  }
  return openings;
}

function runWall(){
  const lenIn = parseMeasurementToInches($("wallLen").value);
  const htIn  = parseMeasurementToInches($("wallHt").value);
  const spacing = Number($("studSpacing").value || 16);

  const corners = Math.max(0, Number($("cornerCount").value || 0));
  const tees = Math.max(0, Number($("tCount").value || 0));
  const wastePct = Math.max(0, Number($("wastePct").value || 0));

  const sheetSize = $("sheetSize").value;
  const hangDir = $("hangDir").value;
  const headerStock = $("headerStock").value;
  const headerPlies = Number($("headerPlies").value || 2);

  if (lenIn == null || htIn == null || !isFinite(lenIn) || !isFinite(htIn) || lenIn <= 0 || htIn <= 0){
    $("wallOut").textContent = "Enter valid wall length and height to estimate studs, sheets, corners, and headers.";
    return;
  }

  // base studs along length: end studs + studs at spacing
  // count spaces between studs: floor(len/spacing) + 1 for both ends, but for safety: ceil(len/spacing)+1
  const baseStuds = Math.ceil(lenIn / spacing) + 1;

  // NCCER-style add-ons (fast estimate)
  const cornerStudsAdd = corners * 3;
  const teeStudsAdd = tees * 2;

  // Openings: studs add (<=5' => +2, >5' => +4)
  const openings = parseOpenings($("openings").value);
  let openingStudsAdd = 0;

  // Header length rules:
  // <= 5' : add 3"
  // >  5' : add 6"
  // then multiply by plies
  let headerTotalInPerPly = 0;

  for (const o of openings){
    if (o.widthIn <= 60) openingStudsAdd += 2;
    else openingStudsAdd += 4;

    const addIn = (o.widthIn <= 60) ? 3 : 6;
    headerTotalInPerPly += (o.widthIn + addIn);
  }

  const studsNoWaste = baseStuds + cornerStudsAdd + teeStudsAdd + openingStudsAdd;
  const studsWaste = Math.ceil(studsNoWaste * (1 + wastePct / 100));

  // Sheets estimate: wall area / sheet area, one face only
  const wallAreaSqFt = (lenIn * htIn) / 144;
  const sheetAreaSqFt = sheetSize === "4x12" ? 48 : 32;
  const sheetsNoWaste = Math.ceil(wallAreaSqFt / sheetAreaSqFt);
  const sheetsWaste = Math.ceil(sheetsNoWaste * (1 + wastePct / 100));

  // Header LF
  const headerTotalInAllPlies = headerTotalInPerPly * headerPlies;
  const headerLF = Math.ceil(headerTotalInAllPlies / 12); // round up to whole linear foot

  $("wallOut").textContent =
`WALL INPUTS
Length: ${inchesToTape(lenIn)}
Height: ${inchesToTape(htIn)}
Stud spacing: ${spacing}" O.C.
Corners: ${corners}
T-intersections: ${tees}
Openings: ${openings.length}
Header: ${headerStock}, ${headerPlies}-ply
Waste: ${wastePct}%
Hang: ${hangDir}

STUDS (FAST ESTIMATE)
Base studs (along wall): ${baseStuds}
Corners add:            +${cornerStudsAdd}
T-intersections add:    +${teeStudsAdd}
Openings add:           +${openingStudsAdd}
Studs (no waste):        ${studsNoWaste}
Studs (with waste):      ${studsWaste}

SHEETS (ONE WALL FACE)
Wall area: ${wallAreaSqFt.toFixed(2)} sq ft
Sheet size: ${sheetSize} (${sheetAreaSqFt} sq ft)
Sheets (no waste): ${sheetsNoWaste}
Sheets (with waste): ${sheetsWaste}

HEADERS (LINEAR FEET)
Openings header inches (per ply, incl. add): ${headerTotalInPerPly.toFixed(1)}"
Total inches (all plies):                    ${headerTotalInAllPlies.toFixed(1)}"
${headerStock} linear feet (rounded up):     ${headerLF} LF`;
}

$("btnCalcWall")?.addEventListener("click", runWall);
$("btnClearWall")?.addEventListener("click", () => {
  $("wallLen").value = "";
  $("wallHt").value = "";
  $("cornerCount").value = "2";
  $("tCount").value = "0";
  $("openings").value = "";
  $("wastePct").value = "10";
  $("wallOut").textContent = "Enter wall length and height to estimate studs, sheets, corners, and headers.";
});
