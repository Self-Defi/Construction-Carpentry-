/* app.js — v16
   - App-wide measurement standardization
   - Home: measurement ops + fraction calculator + decimal converter
   - Layout: corners + tees + openings + headers w/ bearing rule (<=5' +3", >5' +6")
   - Subfloor / Roofing / Stairs retained
   - Concrete + Electrical retained
*/

(function () {
  // -----------------------------
  // Service worker "Cached/Live"
  // -----------------------------
  const buildLine = document.getElementById("buildLine");

  function updateCacheStatus() {
    const cached = !!navigator.serviceWorker?.controller;
    if (buildLine) buildLine.textContent = `Build: v16 • ${cached ? "Cached" : "Live"}`;
  }

  updateCacheStatus();
  navigator.serviceWorker?.addEventListener("controllerchange", updateCacheStatus);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // -----------------------------
  // Tabs
  // -----------------------------
  const tabButtons = Array.from(document.querySelectorAll(".tabBtn"));
  const panels = {
    home: document.getElementById("tab-home"),
    layout: document.getElementById("tab-layout"),
    subfloor: document.getElementById("tab-subfloor"),
    roofing: document.getElementById("tab-roofing"),
    stairs: document.getElementById("tab-stairs"),
    concrete: document.getElementById("tab-concrete"),
    electrical: document.getElementById("tab-electrical"),
  };

  function setActiveTab(name) {
    tabButtons.forEach(btn => btn.classList.toggle("isActive", btn.dataset.tab === name));
    Object.entries(panels).forEach(([k, el]) => {
      if (!el) return;
      el.classList.toggle("isActive", k === name);
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  tabButtons.forEach(btn => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab)));

  // -----------------------------
  // Modal Steps
  // -----------------------------
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");
  const modalBackdrop = document.getElementById("modalBackdrop");

  const STEPS = {
    "home-measure": `
<strong>Measurement Operations</strong><br/>
1) Enter A and B in tape format: <code>7' 10 7/8"</code>, <code>12' 3/8"</code><br/>
2) Tap an operation.<br/>
3) Output normalizes to nearest 1/16".<br/>
<br/>
<strong>Note:</strong> A × B returns area in square-inches and square-feet.
`,
    "home-fraction-calc": `
<strong>Fraction Calculator</strong><br/>
1) Enter A and B as any of: <code>3/4</code>, <code>1 1/2</code>, <code>0.125</code>, <code>-2 3/8</code><br/>
2) Tap an operation.<br/>
3) Output shows: simplified fraction, mixed number, and decimal.
`,
    "home-decimal": `
<strong>Decimal Converter</strong><br/>
1) Enter a tape-format measurement: <code>7' 10 7/8"</code> or inches: <code>96</code> or <code>5 1/2"</code><br/>
2) Tap Convert.<br/>
3) Output shows decimal inches, decimal feet, and millimeters (mm).
`,
    "layout-wall": `
<strong>Wall Materials Estimator (v16)</strong><br/>
1) Enter wall length + height in tape format.<br/>
2) Stud spacing default is <code>16" O.C.</code>.<br/>
3) Set Corners + T-intersections if needed.<br/>
4) Add openings one per line:
<ul>
  <li><code>D 3' 0"</code> (door)</li>
  <li><code>W 4' 0"</code> (window)</li>
</ul>
5) Headers:
<ul>
  <li>Opening ≤ 5' gets +<strong>3"</strong> total bearing</li>
  <li>Opening > 5' gets +<strong>6"</strong> total bearing</li>
</ul>
6) Tap Calculate for studs + sheets + header material (linear feet).<br/>
<br/>
<strong>Important:</strong> This is a fast estimator. Always verify against plan, load path, and local code.
`,
    "subfloor": `
<strong>Subfloor Estimator</strong><br/>
1) Enter room length + width in tape format.<br/>
2) Choose sheet size and waste %.<br/>
3) Fastener spacing accepts tape format (e.g. <code>5 1/2"</code>).<br/>
4) Tap Calculate for sheets + rough fastener count + adhesive note.
`,
    "roofing": `
<strong>Roof Area + Materials (Framer-ready)</strong><br/>
1) Enter Eave Length (outside edge).<br/>
2) Enter Ridge→Eave (run) for ONE side (plan).<br/>
3) Enter Pitch as <code>6/12</code> (or a number).<br/>
4) Choose One plane vs Both planes (gable).<br/>
5) Tap Calculate for: sq ft, squares, bundles (includes waste).
`,
    "stairs": `
<strong>Stair Framing Assistant</strong><br/>
1) Enter Total Rise (finished-to-finished if possible).<br/>
2) Enter Desired Riser Height (e.g. <code>7 1/2"</code>).<br/>
3) Enter Tread Depth (run) (typical: <code>10"</code>).<br/>
4) Tap Calculate for riser count, exact riser, treads, total run, and stringer length.<br/>
<br/>
<strong>Note:</strong> Always verify local code + finish thickness before cutting.
`,
    "concrete": `
<strong>Concrete Estimator</strong><br/>
1) Pick type (Slab / Footing / Wall).<br/>
2) Enter dimensions in tape format.<br/>
3) Set waste % and rounding (ordering usually rounds up).<br/>
4) Tap Calculate for yd³ and bag estimates.
`,
    "electrical-wire": `
<strong>Wire Length Planner</strong><br/>
1) Enter runs and average run length (ft).<br/>
2) Slack per box adds extra per run (field-friendly).<br/>
3) Waste % adds safety margin.<br/>
4) Tap Calculate.
`,
    "electrical-load": `
<strong>Circuit Load Check</strong><br/>
1) Select voltage and breaker size.<br/>
2) Enter total watts.<br/>
3) Result uses 80% rule for continuous load.
`,
    "electrical-ampacity": `
<strong>Ampacity Reference</strong><br/>
Quick copper reference only. Always confirm NEC temp column, terminations, and local code.
`,
  };

  Array.from(document.querySelectorAll("[data-steps]")).forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-steps");
      if (!modal || !modalBody) return;
      modalBody.innerHTML = STEPS[key] || "No steps.";
      modal.classList.add("isOpen");
      modal.setAttribute("aria-hidden", "false");
    });
  });

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("isOpen");
    modal.setAttribute("aria-hidden", "true");
  }

  modalClose?.addEventListener("click", closeModal);
  modalBackdrop?.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("isOpen")) closeModal();
  });

  // =========================================================
  // MEASUREMENT STANDARDIZATION (APP-WIDE)
  // =========================================================
  function cleanQuotes(s) {
    return s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
  }

  function parseFractionToken(tok) {
    const t = tok.trim();
    if (!t) return null;
    if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
    const m = t.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (!m) return null;
    const num = Number(m[1]);
    const den = Number(m[2]);
    if (!den) return null;
    return num / den;
  }

  function parseInchesPart(part) {
    const p = part.trim();
    if (!p) return 0;
    const noQuote = p.replace(/"/g, "").trim();
    if (!noQuote) return 0;

    const tokens = noQuote.split(/\s+/).filter(Boolean);

    if (tokens.length === 1) {
      const v = parseFractionToken(tokens[0]);
      return v == null ? null : v;
    }
    if (tokens.length === 2) {
      const whole = parseFractionToken(tokens[0]);
      const frac = parseFractionToken(tokens[1]);
      if (whole == null || frac == null) return null;
      return whole + frac;
    }
    return null;
  }

  function parseCarpenterMeasure(input) {
    if (input == null) return null;
    let s = cleanQuotes(String(input));
    if (!s) return null;

    s = s.replace(/,/g, " ").replace(/\s+/g, " ").trim();

    let feet = 0;
    let inchesPart = "";

    if (s.includes("'")) {
      const parts = s.split("'");
      if (parts.length < 2) return null;

      const feetStr = parts[0].trim();
      if (!/^\-?\d+$/.test(feetStr)) return null;
      feet = Number(feetStr);

      inchesPart = parts.slice(1).join("'").trim();
    } else {
      inchesPart = s;
    }

    const inches = parseInchesPart(inchesPart);
    if (inches == null) return null;

    return feet * 12 + inches;
  }

  function roundToNearestFraction(value, denom) {
    const v = Math.abs(value);
    const whole = Math.floor(v);
    const frac = v - whole;
    const num = Math.round(frac * denom);
    if (num === denom) return { whole: whole + 1, num: 0, den: denom };
    return { whole, num, den: denom };
  }

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  }

  function simplifyFraction(num, den) {
    if (num === 0) return { num: 0, den: 1 };
    const g = gcd(num, den);
    return { num: num / g, den: den / g };
  }

  function formatInchesAsFeetInches(inchesFloat, fracDen = 16) {
    if (inchesFloat == null || !isFinite(inchesFloat)) return "—";
    const sign = inchesFloat < 0 ? "-" : "";
    const total = Math.abs(inchesFloat);

    let feet = Math.floor(total / 12);
    let rem = total - feet * 12;

    const r = roundToNearestFraction(rem, fracDen);
    let wholeIn = r.whole;
    let num = r.num;
    let den = r.den;

    if (wholeIn >= 12) {
      feet += 1;
      wholeIn -= 12;
    }

    let fracStr = "";
    if (num !== 0) {
      const simp = simplifyFraction(num, den);
      num = simp.num;
      den = simp.den;
      fracStr = (wholeIn === 0 ? `${num}/${den}` : `${wholeIn} ${num}/${den}`);
    }

    const inchStr = (num === 0) ? `${wholeIn}` : fracStr;
    return `${sign}${feet}' ${inchStr}"`;
  }

  window.__MEASURE__ = { parseCarpenterMeasure, formatInchesAsFeetInches };

  // =========================================================
  // HOME — Measurement Operations
  // =========================================================
  const fracA = document.getElementById("fracA");
  const fracB = document.getElementById("fracB");
  const fracOut = document.getElementById("fracOut");

  function getAB() {
    const a = parseCarpenterMeasure(fracA?.value);
    const b = parseCarpenterMeasure(fracB?.value);
    if (a == null || b == null) return null;
    return { a, b };
  }

  document.getElementById("btnAdd")?.addEventListener("click", () => {
    const ab = getAB();
    if (!ab) return (fracOut.textContent = "Enter valid A and B measurements.");
    const res = ab.a + ab.b;
    fracOut.textContent =
      `A = ${formatInchesAsFeetInches(ab.a)}  (${ab.a.toFixed(3)}")\n` +
      `B = ${formatInchesAsFeetInches(ab.b)}  (${ab.b.toFixed(3)}")\n\n` +
      `A + B = ${formatInchesAsFeetInches(res)}  (${res.toFixed(3)}")`;
  });

  document.getElementById("btnSub")?.addEventListener("click", () => {
    const ab = getAB();
    if (!ab) return (fracOut.textContent = "Enter valid A and B measurements.");
    const res = ab.a - ab.b;
    fracOut.textContent =
      `A = ${formatInchesAsFeetInches(ab.a)}  (${ab.a.toFixed(3)}")\n` +
      `B = ${formatInchesAsFeetInches(ab.b)}  (${ab.b.toFixed(3)}")\n\n` +
      `A − B = ${formatInchesAsFeetInches(res)}  (${res.toFixed(3)}")`;
  });

  document.getElementById("btnMul")?.addEventListener("click", () => {
    const ab = getAB();
    if (!ab) return (fracOut.textContent = "Enter valid A and B measurements.");
    const sqIn = ab.a * ab.b;
    const sqFt = sqIn / 144;

    fracOut.textContent =
      `A(in) = ${ab.a.toFixed(3)}"\n` +
      `B(in) = ${ab.b.toFixed(3)}"\n\n` +
      `A × B = ${sqIn.toFixed(3)} sq in\n` +
      `      = ${sqFt.toFixed(3)} sq ft\n\n` +
      `Note: Multiplying lengths yields area.`;
  });

  document.getElementById("btnDiv")?.addEventListener("click", () => {
    const ab = getAB();
    if (!ab) return (fracOut.textContent = "Enter valid A and B measurements.");
    if (ab.b === 0) return (fracOut.textContent = "B cannot be zero.");
    const res = ab.a / ab.b;
    fracOut.textContent =
      `A(in) = ${ab.a.toFixed(3)}"\n` +
      `B(in) = ${ab.b.toFixed(3)}"\n\n` +
      `A ÷ B = ${res.toFixed(4)}`;
  });

  document.getElementById("btnClearFrac")?.addEventListener("click", () => {
    if (fracA) fracA.value = "";
    if (fracB) fracB.value = "";
    if (fracOut) fracOut.textContent = "Enter valid A and B measurements.";
  });

  // =========================================================
  // HOME — Fraction Calculator (pure math)
  // =========================================================
  const mathA = document.getElementById("mathA");
  const mathB = document.getElementById("mathB");
  const fracCalcOut = document.getElementById("fracCalcOut");

  function pow10(n){ return Math.pow(10, n); }

  function parseMathNumber(input){
    if (input == null) return null;
    let s = cleanQuotes(String(input)).trim();
    if (!s) return null;
    s = s.replace(/\s+/g, " ");

    // handle leading +/-
    let sign = 1;
    if (s.startsWith("-")) { sign = -1; s = s.slice(1).trim(); }
    else if (s.startsWith("+")) { s = s.slice(1).trim(); }

    if (!s) return null;

    // mixed: "1 1/2"
    const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (mixed){
      const whole = Number(mixed[1]);
      const num = Number(mixed[2]);
      const den = Number(mixed[3]);
      if (!den) return null;
      return { n: sign * (whole * den + num), d: den };
    }

    // fraction: "3/4"
    const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (frac){
      const num = Number(frac[1]);
      const den = Number(frac[2]);
      if (!den) return null;
      return { n: sign * num, d: den };
    }

    // integer: "5"
    if (/^\d+$/.test(s)){
      return { n: sign * Number(s), d: 1 };
    }

    // decimal: "0.125"
    const dec = s.match(/^(\d+)\.(\d+)$/);
    if (dec){
      const a = dec[1];
      const b = dec[2];
      const den = pow10(b.length);
      const num = Number(a) * den + Number(b);
      return { n: sign * num, d: den };
    }

    return null;
  }

  function normFrac(fd){
    if (!fd) return null;
    let n = fd.n, d = fd.d;
    if (!isFinite(n) || !isFinite(d) || d === 0) return null;
    if (d < 0) { d = -d; n = -n; }
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }

  function fracToMixedString(n, d){
    if (d === 0) return "—";
    const sign = n < 0 ? "-" : "";
    const N = Math.abs(n);
    const whole = Math.floor(N / d);
    const rem = N % d;
    if (rem === 0) return `${sign}${whole}`;
    const simp = simplifyFraction(rem, d);
    if (whole === 0) return `${sign}${simp.num}/${simp.den}`;
    return `${sign}${whole} ${simp.num}/${simp.den}`;
  }

  function fracToFractionString(n, d){
    if (d === 0) return "—";
    const simp = simplifyFraction(n, d);
    // simplifyFraction assumes num non-negative; handle sign here:
    const sign = n < 0 ? "-" : "";
    const N = Math.abs(n);
    const s2 = simplifyFraction(N, d);
    return `${sign}${s2.num}/${s2.den}`;
  }

  function fracToDecimal(n, d){
    if (d === 0) return NaN;
    return n / d;
  }

  function operateFrac(a, b, op){
    if (!a || !b) return null;
    const A = normFrac(a);
    const B = normFrac(b);
    if (!A || !B) return null;

    let n = 0, d = 1;

    if (op === "+"){
      n = A.n * B.d + B.n * A.d;
      d = A.d * B.d;
    } else if (op === "-"){
      n = A.n * B.d - B.n * A.d;
      d = A.d * B.d;
    } else if (op === "*"){
      n = A.n * B.n;
      d = A.d * B.d;
    } else if (op === "/"){
      if (B.n === 0) return { div0:true };
      n = A.n * B.d;
      d = A.d * B.n;
    } else {
      return null;
    }

    return normFrac({ n, d });
  }

  function renderFracCalc(op){
    const A = parseMathNumber(mathA?.value);
    const B = parseMathNumber(mathB?.value);
    if (!A || !B) {
      fracCalcOut.textContent = "Enter valid fractions for A and B.";
      return;
    }

    const res = operateFrac(A, B, op);
    if (!res) {
      fracCalcOut.textContent = "Invalid operation.";
      return;
    }
    if (res.div0) {
      fracCalcOut.textContent = "B cannot be zero.";
      return;
    }

    const dec = fracToDecimal(res.n, res.d);

    fracCalcOut.textContent =
      `A = ${fracToMixedString(A.n, A.d)}   (as fraction: ${fracToFractionString(A.n, A.d)})\n` +
      `B = ${fracToMixedString(B.n, B.d)}   (as fraction: ${fracToFractionString(B.n, B.d)})\n\n` +
      `RESULT (${op})\n` +
      `- Simplified fraction: ${fracToFractionString(res.n, res.d)}\n` +
      `- Mixed number:        ${fracToMixedString(res.n, res.d)}\n` +
      `- Decimal:             ${isFinite(dec) ? dec.toFixed(6) : "—"}\n`;
  }

  document.getElementById("btnFAdd")?.addEventListener("click", () => renderFracCalc("+"));
  document.getElementById("btnFSub")?.addEventListener("click", () => renderFracCalc("-"));
  document.getElementById("btnFMul")?.addEventListener("click", () => renderFracCalc("*"));
  document.getElementById("btnFDiv")?.addEventListener("click", () => renderFracCalc("/"));

  document.getElementById("btnFClear")?.addEventListener("click", () => {
    if (mathA) mathA.value = "";
    if (mathB) mathB.value = "";
    if (fracCalcOut) fracCalcOut.textContent = "Enter valid fractions for A and B.";
  });

  // =========================================================
  // HOME — Decimal Converter
  // =========================================================
  const decIn = document.getElementById("decIn");
  const decRound = document.getElementById("decRound");
  const decOut = document.getElementById("decOut");

  function roundMaybe(x, stepStr){
    if (!isFinite(x)) return x;
    if (!stepStr || stepStr === "none") return x;
    const step = Number(stepStr);
    if (!isFinite(step) || step <= 0) return x;
    return Math.round(x / step) * step;
  }

  document.getElementById("btnDecConvert")?.addEventListener("click", () => {
    const inches = parseCarpenterMeasure(decIn?.value);
    if (inches == null || !isFinite(inches)) {
      decOut.textContent = "Enter a valid measurement.";
      return;
    }

    const r = decRound?.value || "none";
    const decInches = roundMaybe(inches, r);
    const decFeet = roundMaybe(inches / 12, r);
    const mm = roundMaybe(inches * 25.4, r);

    decOut.textContent =
      `INPUT\n` +
      `- Tape format: ${formatInchesAsFeetInches(inches)}\n` +
      `- Inches (raw): ${inches.toFixed(6)}\n\n` +
      `DECIMAL OUTPUT\n` +
      `- Decimal inches: ${decInches.toFixed(6)}\n` +
      `- Decimal feet:   ${decFeet.toFixed(6)}\n` +
      `- Millimeters:    ${mm.toFixed(3)} mm\n`;
  });

  document.getElementById("btnDecClear")?.addEventListener("click", () => {
    if (decIn) decIn.value = "";
    if (decRound) decRound.value = "none";
    if (decOut) decOut.textContent = "Enter a measurement to convert.";
  });

  // =========================================================
  // LAYOUT — Wall Materials Estimator (studs + sheets + corners + headers)
  // =========================================================
  const wallLen = document.getElementById("wallLen");
  const wallHt = document.getElementById("wallHt");
  const studSpacing = document.getElementById("studSpacing");
  const sheetSize = document.getElementById("sheetSize");
  const hangDir = document.getElementById("hangDir");
  const wastePct = document.getElementById("wastePct");
  const wallCorners = document.getElementById("wallCorners");
  const wallTees = document.getElementById("wallTees");
  const openingsList = document.getElementById("openingsList");
  const hdrStock = document.getElementById("hdrStock");
  const hdrPlies = document.getElementById("hdrPlies");
  const wallOut = document.getElementById("wallOut");

  function parseOpenings(text){
    const lines = String(text || "").split("\n").map(s => s.trim()).filter(Boolean);
    const out = [];
    for (const line of lines){
      const m = line.match(/^([DW])\s+(.+)$/i);
      if (!m) continue;
      const type = m[1].toUpperCase();
      const widthIn = parseCarpenterMeasure(m[2]);
      if (widthIn == null || widthIn <= 0) continue;
      out.push({ type, widthIn, raw: line });
    }
    return out;
  }

  function bearingAllowanceTotal(widthIn){
    // Rule requested:
    // <= 5' (60") => +3" total bearing
    // > 5'        => +6" total bearing
    return (widthIn <= 60) ? 3 : 6;
  }

  function calcWall() {
    const L_in = parseCarpenterMeasure(wallLen?.value);
    const H_in = parseCarpenterMeasure(wallHt?.value);

    if (L_in == null || H_in == null || L_in <= 0 || H_in <= 0) {
      wallOut.textContent = "Enter valid wall length and height (tape format).";
      return;
    }

    const spacing = Number(studSpacing?.value || 16);
    const waste = Math.max(0, Number(wastePct?.value || 0)) / 100;

    const corners = Math.max(0, Math.floor(Number(wallCorners?.value || 0)));
    const tees = Math.max(0, Math.floor(Number(wallTees?.value || 0)));

    const L_ft = L_in / 12;
    const H_ft = H_in / 12;
    const wallArea = L_ft * H_ft;

    // Base studs along length: ceil(length / spacing) + 1 (includes both ends)
    const baseStuds = Math.ceil(L_in / spacing) + 1;

    // Corner model (fast estimator):
    // A "3-stud corner" is common (varies by method).
    // Base studs already includes 1 stud at each end corner if your segment ends are corners.
    // Additional per corner = (cornerStuds - 1) to account for the extra studs.
    const cornerStuds = 3;
    const addPerCorner = Math.max(0, cornerStuds - 1);
    const cornerAdds = corners * addPerCorner;

    // T-intersections: add studs for backing (estimate). Use +2 per tee.
    const teeAdds = tees * 2;

    // Openings: remove some interior studs + add kings/jacks + add header + cripples (rough)
    const openings = parseOpenings(openingsList?.value);
    let removedInterior = 0;
    let kingStuds = 0;
    let jackStuds = 0;
    let headerLF = 0;      // header lineal feet (one header length per opening)
    let headerBoardLF = 0; // header stock LF multiplied by plies
    let sillCount = 0;     // windows only
    let cripplesAbove = 0;
    let cripplesBelow = 0;

    const plies = Math.max(1, Number(hdrPlies?.value || 2));

    for (const op of openings){
      const w = op.widthIn;

      // approximate number of studs that would have been inside opening span
      // studs in span ~ ceil(w/spacing) - 1
      const interior = Math.max(0, Math.ceil(w / spacing) - 1);
      removedInterior += interior;

      // king + jack each side
      kingStuds += 2;
      jackStuds += 2;

      const bearing = bearingAllowanceTotal(w); // total bearing add
      const headerLenIn = w + bearing;
      headerLF += headerLenIn / 12;
      headerBoardLF += (headerLenIn / 12) * plies;

      // cripple estimate above header: align with stud layout across opening
      // use same "interior" count as a fast stand-in
      cripplesAbove += interior;

      if (op.type === "W"){
        // window has sill + cripples below
        sillCount += 1;
        cripplesBelow += interior;
      }
    }

    // Total studs (fast):
    // base studs minus removed interior studs (due to openings) + kings/jacks + corner/tee adds
    const studsTotal = Math.max(
      0,
      baseStuds - removedInterior + kingStuds + jackStuds + cornerAdds + teeAdds
    );

    // Drywall sheets
    const [sw, sh] = (sheetSize?.value === "4x12") ? [4, 12] : [4, 8];
    const sheetArea = sw * sh;
    const sheets = Math.ceil((wallArea / sheetArea) * (1 + waste));

    // Output
    const hdrLabel = `${hdrStock?.value || "2x6"} (${plies}-ply)`;
    const openingsSummary =
      openings.length === 0
        ? "None"
        : openings.map(o => `${o.type} ${formatInchesAsFeetInches(o.widthIn)}`).join(", ");

    wallOut.textContent =
      `INPUTS\n` +
      `- Wall Length: ${formatInchesAsFeetInches(L_in)}\n` +
      `- Wall Height: ${formatInchesAsFeetInches(H_in)}\n` +
      `- Stud Spacing: ${spacing}" O.C.\n` +
      `- Corners: ${corners}\n` +
      `- T-Intersections: ${tees}\n` +
      `- Openings: ${openingsSummary}\n` +
      `- Waste: ${Math.round(waste * 100)}%\n\n` +

      `AREA + SHEETS\n` +
      `- Wall Area (one side): ${wallArea.toFixed(2)} sq ft\n` +
      `- Sheets (${(sheetSize?.value || "").toUpperCase()}): ${sheets} pcs (incl. waste)\n\n` +

      `STUDS (FAST ESTIMATE)\n` +
      `- Base studs along length: ${baseStuds}\n` +
      `- Removed interior (openings): ${removedInterior}\n` +
      `- King studs (openings): ${kingStuds}\n` +
      `- Jack studs (openings): ${jackStuds}\n` +
      `- Corner adds (3-stud corner model): ${cornerAdds}\n` +
      `- Tee adds: ${teeAdds}\n` +
      `= TOTAL STUDS (est.): ${studsTotal} pcs\n\n` +

      `HEADERS + OPENING PARTS\n` +
      `- Bearing rule used:\n` +
      `  • ≤ 5' opening → +3" total bearing\n` +
      `  • > 5' opening → +6" total bearing\n` +
      `- Header LF (one header length each): ${headerLF.toFixed(2)} lf\n` +
      `- Header material: ${hdrLabel}\n` +
      `- Header stock LF (plies included): ${headerBoardLF.toFixed(2)} lf\n` +
      `- Window sills: ${sillCount}\n` +
      `- Cripples above headers (rough): ${cripplesAbove}\n` +
      `- Cripples below sills (rough): ${cripplesBelow}\n\n` +

      `NOTES\n` +
      `- Openings, corners, and tees vary by framing method and plan.\n` +
      `- Use this as a field estimator; verify against drawings and code.\n` +
      `- Hang direction selected: ${(hangDir?.value || "vertical").toUpperCase()}\n`;
  }

  document.getElementById("btnCalcWall")?.addEventListener("click", calcWall);

  document.getElementById("btnClearWall")?.addEventListener("click", () => {
    if (wallLen) wallLen.value = "";
    if (wallHt) wallHt.value = "";
    if (studSpacing) studSpacing.value = "16";
    if (sheetSize) sheetSize.value = "4x8";
    if (hangDir) hangDir.value = "vertical";
    if (wastePct) wastePct.value = 10;
    if (wallCorners) wallCorners.value = 2;
    if (wallTees) wallTees.value = 0;
    if (openingsList) openingsList.value = "";
    if (hdrStock) hdrStock.value = "2x6";
    if (hdrPlies) hdrPlies.value = "2";
    if (wallOut) wallOut.textContent = "Enter wall length and height to estimate studs, sheets, corners, and headers.";
  });

  // =========================================================
  // SUBFLOOR — Estimator
  // =========================================================
  const sfLen = document.getElementById("sfLen");
  const sfWid = document.getElementById("sfWid");
  const sfSheet = document.getElementById("sfSheet");
  const sfWaste = document.getElementById("sfWaste");
  const sfPattern = document.getElementById("sfPattern");
  const sfEdge = document.getElementById("sfEdge");
  const sfField = document.getElementById("sfField");
  const sfAdhesive = document.getElementById("sfAdhesive");
  const subfloorOut = document.getElementById("subfloorOut");

  function applyPatternDefaults() {
    const mode = sfPattern?.value;
    if (!sfEdge || !sfField) return;

    if (mode === "std") {
      sfEdge.value = `6"`;
      sfField.value = `12"`;
      sfEdge.disabled = true;
      sfField.disabled = true;
    } else if (mode === "tight") {
      sfEdge.value = `4"`;
      sfField.value = `8"`;
      sfEdge.disabled = true;
      sfField.disabled = true;
    } else {
      sfEdge.disabled = false;
      sfField.disabled = false;
      if (!sfEdge.value) sfEdge.value = `6"`;
      if (!sfField.value) sfField.value = `12"`;
    }
  }

  sfPattern?.addEventListener("change", applyPatternDefaults);
  applyPatternDefaults();

  function inchesOnlyLabel(inchesVal){
    const s = formatInchesAsFeetInches(inchesVal);
    return s.replace(/^\-?\d+'\s/, "");
  }

  function calcSubfloor() {
    const L_in = parseCarpenterMeasure(sfLen?.value);
    const W_in = parseCarpenterMeasure(sfWid?.value);

    if (L_in == null || W_in == null || L_in <= 0 || W_in <= 0) {
      subfloorOut.textContent = "Enter valid room length and width (tape format).";
      return;
    }

    const waste = Math.max(0, Number(sfWaste?.value || 0)) / 100;
    const [sw, sh] = (sfSheet?.value === "4x4") ? [4, 4] : [4, 8];
    const sheetArea = sw * sh;

    const area = (L_in / 12) * (W_in / 12);
    const sheets = Math.ceil((area / sheetArea) * (1 + waste));

    const edgeSpacing = parseCarpenterMeasure(sfEdge?.value);
    const fieldSpacing = parseCarpenterMeasure(sfField?.value);

    if (edgeSpacing == null || fieldSpacing == null || edgeSpacing <= 0 || fieldSpacing <= 0) {
      subfloorOut.textContent = 'Fastener spacing is invalid. Use format like 6" or 5 1/2".';
      return;
    }

    const baseEdge = 6;
    const baseField = 12;
    const factor = (baseEdge / edgeSpacing) * 0.55 + (baseField / fieldSpacing) * 0.45;
    const screwsPer4x8 = 50 * factor;
    const sheetFactor = (sfSheet?.value === "4x4" ? 0.55 : 1);
    const screws = Math.ceil(screwsPer4x8 * sheets * sheetFactor);

    subfloorOut.textContent =
      `Room: ${formatInchesAsFeetInches(L_in)} × ${formatInchesAsFeetInches(W_in)}\n` +
      `Area: ${area.toFixed(2)} sq ft\n` +
      `Sheets (${(sfSheet?.value || "").toUpperCase()}): ${sheets} pcs (incl. ${Math.round(waste * 100)}% waste)\n\n` +
      `Fasteners:\n` +
      `- Edge spacing: ${inchesOnlyLabel(edgeSpacing)}\n` +
      `- Field spacing: ${inchesOnlyLabel(fieldSpacing)}\n` +
      `- Screws (rough est.): ${screws} pcs\n\n` +
      `Adhesive: ${sfAdhesive?.value === "yes" ? "YES (default)" : "NO"}\n` +
      `Note: Screw counts vary by layout/spec.`;
  }

  document.getElementById("btnCalcSubfloor")?.addEventListener("click", calcSubfloor);
  document.getElementById("btnClearSubfloor")?.addEventListener("click", () => {
    if (sfLen) sfLen.value = "";
    if (sfWid) sfWid.value = "";
    if (sfSheet) sfSheet.value = "4x8";
    if (sfWaste) sfWaste.value = 10;
    if (sfPattern) sfPattern.value = "std";
    if (sfAdhesive) sfAdhesive.value = "yes";
    applyPatternDefaults();
    if (subfloorOut) subfloorOut.textContent = "Enter room dimensions to estimate sheets, fasteners, and adhesive.";
  });

  // =========================================================
  // ROOFING — Quick estimate
  // =========================================================
  const roofLen = document.getElementById("roofLen");
  const roofWid = document.getElementById("roofWid");
  const roofPitch = document.getElementById("roofPitch");
  const roofPlanes = document.getElementById("roofPlanes");
  const roofWaste = document.getElementById("roofWaste");
  const roofBundlesPerSquare = document.getElementById("roofBundlesPerSquare");
  const roofOut = document.getElementById("roofOut");

  function parsePitch(p) {
    const s = (p || "").trim();
    if (!s) return null;

    const m = s.match(/^(\d+(\.\d+)?)\s*\/\s*12$/);
    if (m) return Number(m[1]);

    const m2 = s.match(/^(\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)$/);
    if (m2) {
      const rise = Number(m2[1]);
      const run = Number(m2[3]);
      if (!run) return null;
      return (rise / run) * 12;
    }

    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
    return null;
  }

  function calcRoof() {
    const L_in = parseCarpenterMeasure(roofLen?.value);
    const W_in = parseCarpenterMeasure(roofWid?.value);
    const pitchRisePer12 = parsePitch(roofPitch?.value);

    if (L_in == null || W_in == null || L_in <= 0 || W_in <= 0 || pitchRisePer12 == null || pitchRisePer12 < 0) {
      roofOut.textContent = "Enter valid roof length, ridge→eave run, and pitch (e.g. 6/12).";
      return;
    }

    const waste = Math.max(0, Number(roofWaste?.value || 0)) / 100;
    const bundlesPerSquare = Number(roofBundlesPerSquare?.value);

    const slopeFactor = Math.sqrt(12 * 12 + pitchRisePer12 * pitchRisePer12) / 12;
    const planes = (roofPlanes?.value === "two") ? 2 : 1;

    const L_ft = L_in / 12;
    const run_ft = W_in / 12;
    const slopeWidth_ft = run_ft * slopeFactor;

    const planeArea = L_ft * slopeWidth_ft;
    const totalArea = planeArea * planes;
    const totalAreaWithWaste = totalArea * (1 + waste);

    const squares = totalAreaWithWaste / 100;
    const bundles = Math.ceil(squares * bundlesPerSquare);

    roofOut.textContent =
      `INPUTS\n` +
      `- Eave length: ${formatInchesAsFeetInches(L_in)}\n` +
      `- Ridge→eave run: ${formatInchesAsFeetInches(W_in)} (${run_ft.toFixed(2)} ft)\n` +
      `- Pitch: ${pitchRisePer12.toFixed(2)}/12\n` +
      `- Planes: ${planes} (${planes === 2 ? "both planes / gable" : "single plane"})\n` +
      `- Waste: ${Math.round(waste * 100)}%\n\n` +
      `GEOMETRY\n` +
      `- Slope factor: ${slopeFactor.toFixed(4)}\n` +
      `- Slope width: ${slopeWidth_ft.toFixed(2)} ft\n\n` +
      `AREA + MATERIALS\n` +
      `- Total area (no waste): ${totalArea.toFixed(2)} sq ft\n` +
      `- Total area (+waste): ${totalAreaWithWaste.toFixed(2)} sq ft\n` +
      `- Squares: ${squares.toFixed(2)}\n` +
      `- Bundles (@ ${bundlesPerSquare}/square): ${bundles}\n\n` +
      `Note: Valleys, hips, dormers, ridge/edge details increase materials.`;
  }

  document.getElementById("btnCalcRoof")?.addEventListener("click", calcRoof);
  document.getElementById("btnClearRoof")?.addEventListener("click", () => {
    if (roofLen) roofLen.value = "";
    if (roofWid) roofWid.value = "";
    if (roofPitch) roofPitch.value = "";
    if (roofPlanes) roofPlanes.value = "one";
    if (roofWaste) roofWaste.value = 10;
    if (roofBundlesPerSquare) roofBundlesPerSquare.value = "3";
    if (roofOut) roofOut.textContent = "Enter roof dimensions + pitch to estimate square feet, squares, and bundles.";
  });

  // =========================================================
  // STAIRS — Framing Assistant
  // =========================================================
  const stTotalRise = document.getElementById("stTotalRise");
  const stRiserTarget = document.getElementById("stRiserTarget");
  const stTreadDepth = document.getElementById("stTreadDepth");
  const stNosing = document.getElementById("stNosing");
  const stairsOut = document.getElementById("stairsOut");

  document.getElementById("btnCalcStairs")?.addEventListener("click", () => {
    const totalRiseIn = parseCarpenterMeasure(stTotalRise?.value);
    const riserTargetIn = parseCarpenterMeasure(stRiserTarget?.value);
    const treadDepthIn = parseCarpenterMeasure(stTreadDepth?.value);

    if (
      totalRiseIn == null ||
      riserTargetIn == null ||
      treadDepthIn == null ||
      totalRiseIn <= 0 ||
      riserTargetIn <= 0 ||
      treadDepthIn <= 0
    ) {
      if (stairsOut) stairsOut.textContent = "Enter valid stair measurements.";
      return;
    }

    const risers = Math.max(1, Math.round(totalRiseIn / riserTargetIn));
    const actualRiser = totalRiseIn / risers;
    const treads = Math.max(0, risers - 1);
    const totalRunIn = treads * treadDepthIn;

    const stringerLenIn = Math.sqrt((totalRiseIn ** 2) + (totalRunIn ** 2));

    const riserOK = actualRiser >= 7 && actualRiser <= 7.75;
    const treadOK = treadDepthIn >= 10;

    if (!stairsOut) return;

    stairsOut.textContent =
`STAIR LAYOUT RESULTS

Total Rise: ${formatInchesAsFeetInches(totalRiseIn)}
Number of Risers: ${risers}
Actual Riser Height: ${formatInchesAsFeetInches(actualRiser)}

Number of Treads: ${treads}
Tread Depth: ${formatInchesAsFeetInches(treadDepthIn)}
Total Run: ${formatInchesAsFeetInches(totalRunIn)}

Stringer Length: ${formatInchesAsFeetInches(stringerLenIn)}

CHECKS
Riser Height: ${riserOK ? "OK" : "CHECK CODE"}
Tread Depth: ${treadOK ? "OK" : "CHECK CODE"}

Note:
• Stringer length is theoretical — verify with layout square
• Verify nosing + finish thickness before cutting
• Confirm local code requirements
`;
  });

  document.getElementById("btnClearStairs")?.addEventListener("click", () => {
    if (stTotalRise) stTotalRise.value = "";
    if (stRiserTarget) stRiserTarget.value = "";
    if (stTreadDepth) stTreadDepth.value = '10"';
    if (stNosing) stNosing.value = "yes";
    if (stairsOut) stairsOut.textContent = "Enter total rise and target riser height.";
  });

  // =========================================================
  // CONCRETE — Estimator (v16)
  // =========================================================
  const concType = document.getElementById("concType");
  const concTypeHint = document.getElementById("concTypeHint");
  const concQty = document.getElementById("concQty");
  const concLen = document.getElementById("concLen");
  const concWid = document.getElementById("concWid");
  const concHt = document.getElementById("concHt");
  const concThk = document.getElementById("concThk");
  const concWaste = document.getElementById("concWaste");
  const concRound = document.getElementById("concRound");
  const concWidthField = document.getElementById("concWidthField");
  const concHeightField = document.getElementById("concHeightField");
  const concThkLabel = document.getElementById("concThkLabel");
  const concThkHint = document.getElementById("concThkHint");
  const concreteOut = document.getElementById("concreteOut");

  function updateConcreteUI(){
    const t = concType?.value || "slab";
    if (!concTypeHint) return;

    if (t === "slab"){
      concTypeHint.textContent = "Slab = Length × Width × Thickness";
      if (concWidthField) concWidthField.style.display = "";
      if (concHeightField) concHeightField.style.display = "none";
      if (concThkLabel) concThkLabel.textContent = "Thickness";
      if (concThkHint) concThkHint.textContent = 'Slabs typically 4" or more.';
    } else if (t === "footing"){
      concTypeHint.textContent = "Footing = Length × Width × Depth";
      if (concWidthField) concWidthField.style.display = "";
      if (concHeightField) concHeightField.style.display = "none";
      if (concThkLabel) concThkLabel.textContent = "Depth";
      if (concThkHint) concThkHint.textContent = 'Footings often use inches for width/depth (e.g. 16").';
    } else {
      concTypeHint.textContent = "Wall = Length × Height × Thickness";
      if (concWidthField) concWidthField.style.display = "none";
      if (concHeightField) concHeightField.style.display = "";
      if (concThkLabel) concThkLabel.textContent = "Thickness";
      if (concThkHint) concThkHint.textContent = 'Walls: thickness is usually inches.';
    }
  }

  concType?.addEventListener("change", updateConcreteUI);
  updateConcreteUI();

  function roundUpTo(x, step){
    if (!isFinite(x)) return x;
    if (!step || step <= 0) return x;
    return Math.ceil(x / step) * step;
  }

  document.getElementById("btnCalcConcrete")?.addEventListener("click", () => {
    const t = concType?.value || "slab";
    const qty = Math.max(1, Math.floor(Number(concQty?.value || 1)));
    const waste = Math.max(0, Number(concWaste?.value || 0)) / 100;
    const roundStep = Number(concRound?.value || 0);

    const L_in = parseCarpenterMeasure(concLen?.value);
    const W_in = parseCarpenterMeasure(concWid?.value);
    const H_in = parseCarpenterMeasure(concHt?.value);
    const T_in = parseCarpenterMeasure(concThk?.value);

    let volIn3 = 0;

    if (t === "slab" || t === "footing"){
      if (L_in == null || W_in == null || T_in == null || L_in <= 0 || W_in <= 0 || T_in <= 0) {
        concreteOut.textContent = "Enter valid slab/footing dimensions.";
        return;
      }
      volIn3 = L_in * W_in * T_in;
    } else {
      if (L_in == null || H_in == null || T_in == null || L_in <= 0 || H_in <= 0 || T_in <= 0) {
        concreteOut.textContent = "Enter valid wall dimensions.";
        return;
      }
      volIn3 = L_in * H_in * T_in;
    }

    // total volume with quantity
    volIn3 *= qty;

    // convert cubic inches to cubic yards:
    // 1 yd = 36 in => 1 yd^3 = 36^3 in^3
    const yd3 = volIn3 / (36 ** 3);
    const yd3Waste = yd3 * (1 + waste);

    const ordered = (roundStep > 0) ? roundUpTo(yd3Waste, roundStep) : yd3Waste;

    // bag estimates (approx yield):
    // 80lb: ~0.60 ft^3, 60lb: ~0.45 ft^3 (approx)
    // 1 yd^3 = 27 ft^3
    const ft3 = yd3Waste * 27;
    const bags80 = Math.ceil(ft3 / 0.60);
    const bags60 = Math.ceil(ft3 / 0.45);

    concreteOut.textContent =
      `INPUTS\n` +
      `- Type: ${t.toUpperCase()}\n` +
      `- Quantity: ${qty}\n` +
      `- Waste: ${Math.round(waste*100)}%\n\n` +
      `VOLUME\n` +
      `- Cubic yards (raw): ${yd3.toFixed(3)} yd³\n` +
      `- Cubic yards (+waste): ${yd3Waste.toFixed(3)} yd³\n` +
      `- Order (rounded): ${ordered.toFixed(3)} yd³\n\n` +
      `BAG ESTIMATES (approx)\n` +
      `- 80 lb bags: ${bags80}\n` +
      `- 60 lb bags: ${bags60}\n\n` +
      `NOTE\n` +
      `- Bag yields vary by mix & water. Ready-mix is better for larger pours.\n`;
  });

  document.getElementById("btnClearConcrete")?.addEventListener("click", () => {
    if (concType) concType.value = "slab";
    if (concQty) concQty.value = 1;
    if (concLen) concLen.value = "";
    if (concWid) concWid.value = "";
    if (concHt) concHt.value = "";
    if (concThk) concThk.value = "";
    if (concWaste) concWaste.value = 10;
    if (concRound) concRound.value = "0.25";
    updateConcreteUI();
    if (concreteOut) concreteOut.textContent = "Enter concrete dimensions to estimate cubic yards and materials.";
  });

  // =========================================================
  // ELECTRICAL — Wire planner + load check
  // =========================================================
  const elCable = document.getElementById("elCable");
  const elRuns = document.getElementById("elRuns");
  const elRunLen = document.getElementById("elRunLen");
  const elSlack = document.getElementById("elSlack");
  const elWaste = document.getElementById("elWaste");
  const wireOut = document.getElementById("wireOut");

  document.getElementById("btnCalcWire")?.addEventListener("click", () => {
    const runs = Math.max(1, Math.floor(Number(elRuns?.value || 1)));
    const avg = Math.max(0, Number(elRunLen?.value || 0));
    const slack = Math.max(0, Number(elSlack?.value || 0));
    const waste = Math.max(0, Number(elWaste?.value || 0)) / 100;

    const base = runs * avg;
    const slackTotal = runs * slack;
    const total = (base + slackTotal) * (1 + waste);

    wireOut.textContent =
      `CABLE\n` +
      `- Type: ${elCable?.value || ""}\n` +
      `- Runs: ${runs}\n\n` +
      `LENGTH\n` +
      `- Base: ${base.toFixed(1)} ft\n` +
      `- Slack: ${slackTotal.toFixed(1)} ft\n` +
      `- Waste: ${Math.round(waste*100)}%\n` +
      `= TOTAL: ${total.toFixed(1)} ft\n`;
  });

  document.getElementById("btnClearWire")?.addEventListener("click", () => {
    if (elCable) elCable.value = "12/2";
    if (elRuns) elRuns.value = 1;
    if (elRunLen) elRunLen.value = 50;
    if (elSlack) elSlack.value = 3;
    if (elWaste) elWaste.value = 10;
    if (wireOut) wireOut.textContent = "Enter run details to estimate cable length.";
  });

  const elVoltage = document.getElementById("elVoltage");
  const elBreaker = document.getElementById("elBreaker");
  const elWatts = document.getElementById("elWatts");
  const loadOut = document.getElementById("loadOut");

  document.getElementById("btnCalcLoad")?.addEventListener("click", () => {
    const V = Number(elVoltage?.value || 120);
    const breaker = Number(elBreaker?.value || 20);
    const watts = Math.max(0, Number(elWatts?.value || 0));

    const amps = (V > 0) ? watts / V : 0;
    const maxContinuous = breaker * 0.80;
    const ok = amps <= maxContinuous;

    loadOut.textContent =
      `INPUTS\n` +
      `- Voltage: ${V}V\n` +
      `- Breaker: ${breaker}A\n` +
      `- Load: ${watts.toFixed(0)} W\n\n` +
      `CALC\n` +
      `- Current draw: ${amps.toFixed(2)} A\n` +
      `- 80% limit:    ${maxContinuous.toFixed(2)} A\n\n` +
      `RESULT\n` +
      `- Status: ${ok ? "OK (within 80%)" : "OVER (reduce load or upsize circuit)"}\n`;
  });

  document.getElementById("btnClearLoad")?.addEventListener("click", () => {
    if (elVoltage) elVoltage.value = "120";
    if (elBreaker) elBreaker.value = "20";
    if (elWatts) elWatts.value = 0;
    if (loadOut) loadOut.textContent = "Enter load to check breaker capacity.";
  });

})();
