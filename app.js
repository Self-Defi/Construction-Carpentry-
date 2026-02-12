/* app.js — v15
   App-wide measurement standardization + fraction calculator + concrete tab.
*/

(function () {
  // -----------------------------
  // Service worker "Cached/Live"
  // -----------------------------
  const buildLine = document.getElementById("buildLine");

  function updateCacheStatus() {
    const cached = !!navigator.serviceWorker?.controller;
    if (buildLine) buildLine.textContent = `Build: v15 • ${cached ? "Cached" : "Live"}`;
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
3) Output shows normalized tape format (nearest 1/16).<br/>
<br/>
<strong>Note:</strong> A × B returns area in square-inches and square-feet.
`,
    "home-fraction-calc": `
<strong>Fraction Calculator</strong><br/>
1) Enter A and B as any fraction style:<br/>
&nbsp;&nbsp;• <code>3/4</code> (proper) &nbsp; • <code>9/4</code> (improper) &nbsp; • <code>1 1/2</code> (mixed)<br/>
&nbsp;&nbsp;• <code>5</code> (whole) &nbsp; • <code>0.125</code> (decimal) &nbsp; • <code>-2 3/8</code> (negative mixed)<br/>
2) Tap +, −, ×, or ÷.<br/>
3) Output includes simplified fraction, mixed form, and decimal.<br/>
<br/>
<strong>Note:</strong> Division by zero is blocked.
`,
    "layout-wall": `
<strong>Wall Materials Estimator</strong><br/>
1) Enter wall length + height in tape format (feet/inches/fractions).<br/>
2) Choose stud spacing and sheet size.<br/>
3) Tap Calculate for studs + sheets estimate (includes waste %).<br/>
`,
    "subfloor": `
<strong>Subfloor Estimator</strong><br/>
1) Enter room length + width in tape format.<br/>
2) Choose sheet size and waste %.<br/>
3) Fastener spacing accepts tape format (e.g. <code>5 1/2"</code>).<br/>
4) Tap Calculate for sheets + rough fastener count + adhesive note.<br/>
`,
    "roofing": `
<strong>Roof Area + Materials (Framer-ready)</strong><br/>
1) Enter Eave Length (outside edge).<br/>
2) Enter Ridge→Eave (run) for ONE side (plan).<br/>
3) Enter Pitch as <code>6/12</code> (or a number).<br/>
4) Choose One plane vs Both planes (gable).<br/>
5) Tap Calculate for: sq ft, squares, bundles (includes waste).<br/>
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
1) Choose Type: Slab, Footing, or Wall.<br/>
2) Enter dimensions in tape format.<br/>
&nbsp;&nbsp;• Slab: Length, Width, Thickness<br/>
&nbsp;&nbsp;• Footing: Length, Width (often inches), Depth<br/>
&nbsp;&nbsp;• Wall: Length, Height, Thickness<br/>
3) Quantity multiplies the pour (same dimensions repeated).<br/>
4) Waste % adds extra volume to reduce shortages.<br/>
5) Rounding rounds UP your order (common for ready-mix).<br/>
<br/>
<strong>Output includes:</strong> ft³, yd³, yd³ w/ waste, rounded order, bag estimates, truck estimates.
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
      if (!/^\d+$/.test(feetStr)) return null;
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
  // HOME — Measurement Operations (Tape-format)
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
  // HOME — Fraction Calculator (Pure rational math)
  // =========================================================
  const mathA = document.getElementById("mathA");
  const mathB = document.getElementById("mathB");
  const fracCalcOut = document.getElementById("fracCalcOut");

  function normalizeR(n, d) {
    if (!isFinite(n) || !isFinite(d)) return null;
    if (d === 0) return null;
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }

  function decimalToFraction(s) {
    const t = s.trim();
    const m = t.match(/^([+-])?(\d*)\.(\d+)$/);
    if (!m) return null;

    const sign = (m[1] === "-") ? -1 : 1;
    const intPart = m[2] ? m[2] : "0";
    const fracPart = m[3];

    const den = 10 ** fracPart.length;
    const numAbs = Number(intPart) * den + Number(fracPart);
    const num = sign * numAbs;

    return normalizeR(num, den);
  }

  function parseMathFraction(input) {
    if (input == null) return null;
    let s = cleanQuotes(String(input)).replace(/,/g, " ").replace(/\s+/g, " ").trim();
    if (!s) return null;

    if (s.startsWith("+")) s = s.slice(1).trim();

    if (/^[+-]?(\d+)?\.\d+$/.test(s)) {
      return decimalToFraction(s);
    }

    if (/^[+-]?\d+$/.test(s)) {
      return { n: Number(s), d: 1 };
    }

    if (/^[+-]?\d+\s*\/\s*\d+$/.test(s)) {
      const m = s.match(/^([+-])?(\d+)\s*\/\s*(\d+)$/);
      if (!m) return null;
      const sign = (m[1] === "-") ? -1 : 1;
      const num = sign * Number(m[2]);
      const den = Number(m[3]);
      if (!den) return null;
      return normalizeR(num, den);
    }

    if (/^[+-]?\d+\s+\d+\s*\/\s*\d+$/.test(s)) {
      const m = s.match(/^([+-])?(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
      if (!m) return null;
      const sign = (m[1] === "-") ? -1 : 1;
      const whole = Number(m[2]);
      const num = Number(m[3]);
      const den = Number(m[4]);
      if (!den) return null;
      const improperNum = sign * (whole * den + num);
      return normalizeR(improperNum, den);
    }

    return null;
  }

  function toMixedString(r) {
    const n = r.n, d = r.d;
    if (d === 1) return `${n}`;
    const sign = n < 0 ? "-" : "";
    const a = Math.abs(n);
    const whole = Math.floor(a / d);
    const rem = a % d;

    if (rem === 0) return `${sign}${whole}`;
    if (whole === 0) return `${sign}${rem}/${d}`;
    return `${sign}${whole} ${rem}/${d}`;
  }

  function toFracString(r) {
    if (r.d === 1) return `${r.n}`;
    return `${r.n}/${r.d}`;
  }

  function showFracResult(label, A, B, R) {
    const aDec = (A.n / A.d);
    const bDec = (B.n / B.d);
    const rDec = (R.n / R.d);

    fracCalcOut.textContent =
      `A = ${toMixedString(A)}   (${toFracString(A)})   ≈ ${aDec.toFixed(6)}\n` +
      `B = ${toMixedString(B)}   (${toFracString(B)})   ≈ ${bDec.toFixed(6)}\n\n` +
      `${label}\n` +
      `= ${toFracString(R)}\n` +
      `= ${toMixedString(R)}\n` +
      `≈ ${rDec.toFixed(6)}`;
  }

  function getMathAB() {
    const A = parseMathFraction(mathA?.value);
    const B = parseMathFraction(mathB?.value);
    if (!A || !B) return null;
    return { A, B };
  }

  document.getElementById("btnFAdd")?.addEventListener("click", () => {
    const ab = getMathAB();
    if (!ab) return (fracCalcOut.textContent = "Enter valid fractions for A and B.");
    const R = normalizeR(ab.A.n * ab.B.d + ab.B.n * ab.A.d, ab.A.d * ab.B.d);
    if (!R) return (fracCalcOut.textContent = "Math error.");
    showFracResult("A + B", ab.A, ab.B, R);
  });

  document.getElementById("btnFSub")?.addEventListener("click", () => {
    const ab = getMathAB();
    if (!ab) return (fracCalcOut.textContent = "Enter valid fractions for A and B.");
    const R = normalizeR(ab.A.n * ab.B.d - ab.B.n * ab.A.d, ab.A.d * ab.B.d);
    if (!R) return (fracCalcOut.textContent = "Math error.");
    showFracResult("A − B", ab.A, ab.B, R);
  });

  document.getElementById("btnFMul")?.addEventListener("click", () => {
    const ab = getMathAB();
    if (!ab) return (fracCalcOut.textContent = "Enter valid fractions for A and B.");
    const R = normalizeR(ab.A.n * ab.B.n, ab.A.d * ab.B.d);
    if (!R) return (fracCalcOut.textContent = "Math error.");
    showFracResult("A × B", ab.A, ab.B, R);
  });

  document.getElementById("btnFDiv")?.addEventListener("click", () => {
    const ab = getMathAB();
    if (!ab) return (fracCalcOut.textContent = "Enter valid fractions for A and B.");
    if (ab.B.n === 0) return (fracCalcOut.textContent = "B cannot be zero (division by zero).");
    const R = normalizeR(ab.A.n * ab.B.d, ab.A.d * ab.B.n);
    if (!R) return (fracCalcOut.textContent = "Math error.");
    showFracResult("A ÷ B", ab.A, ab.B, R);
  });

  document.getElementById("btnFClear")?.addEventListener("click", () => {
    if (mathA) mathA.value = "";
    if (mathB) mathB.value = "";
    if (fracCalcOut) fracCalcOut.textContent = "Enter valid fractions for A and B.";
  });

  // =========================================================
  // LAYOUT — Wall Materials Estimator (studs + sheets)
  // =========================================================
  const wallLen = document.getElementById("wallLen");
  const wallHt = document.getElementById("wallHt");
  const studSpacing = document.getElementById("studSpacing");
  const sheetSize = document.getElementById("sheetSize");
  const wastePct = document.getElementById("wastePct");
  const wallOut = document.getElementById("wallOut");

  function calcWall() {
    const L_in = parseCarpenterMeasure(wallLen?.value);
    const H_in = parseCarpenterMeasure(wallHt?.value);

    if (L_in == null || H_in == null || L_in <= 0 || H_in <= 0) {
      wallOut.textContent = "Enter valid wall length and height (tape format).";
      return;
    }

    const spacing = Number(studSpacing?.value);
    const waste = Math.max(0, Number(wastePct?.value || 0)) / 100;

    const L_ft = L_in / 12;
    const H_ft = H_in / 12;
    const wallArea = L_ft * H_ft;

    const studs = Math.ceil(L_in / spacing) + 1;

    const [sw, sh] = (sheetSize?.value === "4x12") ? [4, 12] : [4, 8];
    const sheetArea = sw * sh;

    const sheets = Math.ceil((wallArea / sheetArea) * (1 + waste));

    wallOut.textContent =
      `Wall Length: ${formatInchesAsFeetInches(L_in)}\n` +
      `Wall Height: ${formatInchesAsFeetInches(H_in)}\n` +
      `Stud Spacing: ${spacing}" O.C.\n` +
      `Wall Area (one side): ${wallArea.toFixed(2)} sq ft\n\n` +
      `Studs (est.): ${studs} pcs\n` +
      `Sheets (${(sheetSize?.value || "").toUpperCase()}): ${sheets} pcs (incl. ${Math.round(waste * 100)}% waste)\n\n` +
      `Note: Openings/corners/backing change counts. This is a fast estimator.`;
  }

  document.getElementById("btnCalcWall")?.addEventListener("click", calcWall);
  document.getElementById("btnClearWall")?.addEventListener("click", () => {
    if (wallLen) wallLen.value = "";
    if (wallHt) wallHt.value = "";
    if (wastePct) wastePct.value = 10;
    if (wallOut) wallOut.textContent = "Enter wall length and height to estimate studs and sheets.";
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
    if (stairsOut) stairsOut.textContent = "Enter total rise and target riser height.";
  });

  // =========================================================
  // CONCRETE — Estimator (yd³, bags, trucks) using tape-format inputs
  // =========================================================
  const concType = document.getElementById("concType");
  const concTypeHint = document.getElementById("concTypeHint");
  const concLen = document.getElementById("concLen");
  const concWid = document.getElementById("concWid");
  const concHt = document.getElementById("concHt");
  const concThk = document.getElementById("concThk");
  const concQty = document.getElementById("concQty");
  const concWaste = document.getElementById("concWaste");
  const concRound = document.getElementById("concRound");
  const concWidthField = document.getElementById("concWidthField");
  const concHeightField = document.getElementById("concHeightField");
  const concThkLabel = document.getElementById("concThkLabel");
  const concThkHint = document.getElementById("concThkHint");
  const concreteOut = document.getElementById("concreteOut");

  function setConcreteUI() {
    const t = concType?.value || "slab";

    if (t === "slab") {
      if (concWidthField) concWidthField.style.display = "";
      if (concHeightField) concHeightField.style.display = "none";
      if (concThkLabel) concThkLabel.textContent = "Thickness";
      if (concThkHint) concThkHint.textContent = 'Typical slab thickness: 4" or more.';
      if (concTypeHint) concTypeHint.textContent = "Slab = Length × Width × Thickness";
    } else if (t === "footing") {
      if (concWidthField) concWidthField.style.display = "";
      if (concHeightField) concHeightField.style.display = "none";
      if (concThkLabel) concThkLabel.textContent = "Depth";
      if (concThkHint) concThkHint.textContent = 'Footing depth often 8"–24". Width often entered as inches (e.g. 16").';
      if (concTypeHint) concTypeHint.textContent = "Footing = Length × Width × Depth";
    } else {
      if (concWidthField) concWidthField.style.display = "none";
      if (concHeightField) concHeightField.style.display = "";
      if (concThkLabel) concThkLabel.textContent = "Thickness";
      if (concThkHint) concThkHint.textContent = 'Wall thickness often 6"–12" (verify spec).';
      if (concTypeHint) concTypeHint.textContent = "Wall = Length × Height × Thickness";
    }
  }

  concType?.addEventListener("change", () => {
    setConcreteUI();
    if (concreteOut) concreteOut.textContent = "Enter concrete dimensions to estimate cubic yards and materials.";
  });

  setConcreteUI();

  function roundUpTo(x, inc){
    const i = Number(inc);
    if (!i) return x;
    return Math.ceil(x / i) * i;
  }

  function calcConcrete() {
    const t = concType?.value || "slab";
    const qty = Math.max(1, Math.floor(Number(concQty?.value || 1)));
    const wastePct = Math.max(0, Number(concWaste?.value || 0));
    const roundInc = Number(concRound?.value || 0);

    // All parsed to inches (since parseCarpenterMeasure returns inches)
    const L_in = parseCarpenterMeasure(concLen?.value);
    const W_in = parseCarpenterMeasure(concWid?.value);
    const H_in = parseCarpenterMeasure(concHt?.value);
    const T_in = parseCarpenterMeasure(concThk?.value);

    // Validate based on type
    if (L_in == null || L_in <= 0) {
      concreteOut.textContent = "Enter a valid Length (tape format).";
      return;
    }

    if (T_in == null || T_in <= 0) {
      concreteOut.textContent = "Enter a valid Thickness/Depth (tape format, e.g. 4\").";
      return;
    }

    if (t === "slab" || t === "footing") {
      if (W_in == null || W_in <= 0) {
        concreteOut.textContent = "Enter a valid Width (tape format).";
        return;
      }
    } else {
      if (H_in == null || H_in <= 0) {
        concreteOut.textContent = "Enter a valid Height (tape format).";
        return;
      }
    }

    // Volume in cubic inches
    let volIn3 = 0;
    if (t === "slab") {
      volIn3 = L_in * W_in * T_in * qty;
    } else if (t === "footing") {
      volIn3 = L_in * W_in * T_in * qty; // here T_in is depth
    } else {
      volIn3 = L_in * H_in * T_in * qty;
    }

    // Convert
    const volFt3 = volIn3 / 1728;      // 12^3
    const volYd3 = volFt3 / 27;

    const wasteMult = 1 + (wastePct / 100);
    const volFt3Waste = volFt3 * wasteMult;
    const volYd3Waste = volYd3 * wasteMult;

    const orderYd3 = roundUpTo(volYd3Waste, roundInc);

    // Bag yields (ft³ per bag) — approximations
    const Y80 = 0.60, Y60 = 0.45, Y50 = 0.375;
    const bags80 = Math.ceil(volFt3Waste / Y80);
    const bags60 = Math.ceil(volFt3Waste / Y60);
    const bags50 = Math.ceil(volFt3Waste / Y50);

    // Trucks (rounded order)
    const trucks9 = Math.ceil(orderYd3 / 9);
    const trucks10 = Math.ceil(orderYd3 / 10);

    // Build output text (jobsite readable)
    const Ls = formatInchesAsFeetInches(L_in);
    const Ws = (W_in != null) ? formatInchesAsFeetInches(W_in) : "";
    const Hs = (H_in != null) ? formatInchesAsFeetInches(H_in) : "";
    const Ts = formatInchesAsFeetInches(T_in).replace(/^\-?\d+'\s/, ""); // show inches-only-ish

    const typeLine =
      (t === "slab") ? `SLAB` :
      (t === "footing") ? `FOOTING` :
      `WALL`;

    const dimsLine =
      (t === "wall")
        ? `Length: ${Ls}\nHeight: ${Hs}\nThickness: ${Ts}`
        : `Length: ${Ls}\nWidth: ${Ws}\n${t === "footing" ? "Depth" : "Thickness"}: ${Ts}`;

    const roundingLine =
      roundInc
        ? `Order (rounded up to ${roundInc} yd³): ${orderYd3.toFixed(2)} yd³`
        : `Order (no rounding): ${orderYd3.toFixed(3)} yd³`;

    // Steps (for "show your work" inside the output)
    const steps =
      `STEPS\n` +
      `1) Compute volume in inches³ (dims in inches).\n` +
      `2) Convert: in³ ÷ 1728 = ft³\n` +
      `3) Convert: ft³ ÷ 27 = yd³\n` +
      `4) Apply waste: × (1 + waste%)\n` +
      (roundInc ? `5) Round UP to order increment.\n` : "");

    concreteOut.textContent =
`${typeLine}

${dimsLine}
Quantity: ${qty}
Waste: ${Math.round(wastePct)}%

VOLUME
- Cubic feet: ${volFt3.toFixed(3)} ft³
- Cubic yards: ${volYd3.toFixed(3)} yd³
- Yards w/ waste: ${volYd3Waste.toFixed(3)} yd³
- ${roundingLine}

BAGS (approx, includes waste)
- 80 lb: ${bags80}
- 60 lb: ${bags60}
- 50 lb: ${bags50}

READY-MIX TRUCKS (based on rounded order)
- 9 yd³ / truck: ${trucks9}
- 10 yd³ / truck: ${trucks10}

${steps}
Note: Bag yields and truck capacities vary by product/supplier. Always verify minimum delivery + slump/spec.
`;
  }

  document.getElementById("btnCalcConcrete")?.addEventListener("click", calcConcrete);

  document.getElementById("btnClearConcrete")?.addEventListener("click", () => {
    if (concLen) concLen.value = "";
    if (concWid) concWid.value = "";
    if (concHt) concHt.value = "";
    if (concThk) concThk.value = "";
    if (concQty) concQty.value = 1;
    if (concWaste) concWaste.value = 10;
    if (concRound) concRound.value = "0.25";
    setConcreteUI();
    if (concreteOut) concreteOut.textContent = "Enter concrete dimensions to estimate cubic yards and materials.";
  });

})();
