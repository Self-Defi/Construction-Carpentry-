/* app.js — v9
   App-wide measurement standardization:
   Accepts carpenter-native inputs like:
   7' 10 7/8"
   12' 3/8"
   7'
   10 7/8"
   3/8"
   144 3/8
*/

(function () {
  // -----------------------------
  // Service worker "Cached/Live"
  // -----------------------------
  const buildLine = document.getElementById("buildLine");
  function updateCacheStatus() {
    const cached = !!navigator.serviceWorker?.controller;
    if (buildLine) buildLine.textContent = `Build: v9 • ${cached ? "Cached" : "Live"}`;
  }
  updateCacheStatus();
  navigator.serviceWorker?.addEventListener("controllerchange", updateCacheStatus);

  // -----------------------------
  // Tabs
  // -----------------------------
  const tabButtons = Array.from(document.querySelectorAll(".tabBtn"));
  const panels = {
    home: document.getElementById("tab-home"),
    layout: document.getElementById("tab-layout"),
    subfloor: document.getElementById("tab-subfloor"),
    roofing: document.getElementById("tab-roofing"),
    reference: document.getElementById("tab-reference"),
  };

  function setActiveTab(name) {
    tabButtons.forEach(btn => btn.classList.toggle("isActive", btn.dataset.tab === name));
    Object.entries(panels).forEach(([k, el]) => el.classList.toggle("isActive", k === name));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  // -----------------------------
  // Modal Steps
  // -----------------------------
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");
  const modalBackdrop = document.getElementById("modalBackdrop");

  const STEPS = {
    "home-fractions": `
<strong>Fraction Operations</strong><br/>
1) Enter A and B in tape format: <code>7' 10 7/8"</code>, <code>12' 3/8"</code><br/>
2) Tap an operation.<br/>
3) Output is normalized and shown as feet-inches-fraction (nearest 1/16).<br/>
<br/>
<strong>Tip:</strong> You can also enter inches-only: <code>94 7/8"</code> or <code>94 7/8</code>.
`,
    "layout-wall": `
<strong>Wall Materials Estimator</strong><br/>
1) Enter wall length + height in tape format (feet/inches/fractions).<br/>
2) Choose stud spacing and sheet size/direction.<br/>
3) Tap Calculate for studs + sheets estimate (includes waste %).<br/>
`,
    "subfloor": `
<strong>Subfloor Estimator</strong><br/>
1) Enter room length + width in tape format.<br/>
2) Choose sheet size and waste %.<br/>
3) Fastener spacing accepts the same format (e.g. <code>5 1/2"</code>).<br/>
4) Tap Calculate for sheets + rough fastener count + adhesive note.<br/>
`,
    "roofing": `
<strong>Roof Area + Materials</strong><br/>
1) Enter roof length + width in tape format.<br/>
2) Enter pitch as <code>6/12</code> (common) or a number (rise per 12).<br/>
3) Tap Calculate. You’ll get area, squares, bundles (includes waste).<br/>
`,
  };

  document.querySelectorAll("[data-steps]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-steps");
      modalBody.innerHTML = STEPS[key] || "No steps.";
      modal.classList.add("isOpen");
      modal.setAttribute("aria-hidden", "false");
    });
  });
  function closeModal() {
    modal.classList.remove("isOpen");
    modal.setAttribute("aria-hidden", "true");
  }
  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("isOpen")) closeModal();
  });

  // =========================================================
  // MEASUREMENT STANDARDIZATION (APP-WIDE)
  // =========================================================

  function cleanQuotes(s) {
    // normalize curly quotes to plain
    return s
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();
  }

  function parseFractionToken(tok) {
    // tok can be "a/b" or "a"
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
    // part examples:
    // "10 7/8"
    // "3/8"
    // "10"
    // "10 1/2"
    // "" (valid)
    const p = part.trim();
    if (!p) return 0;

    // allow inches symbol
    const noQuote = p.replace(/"/g, "").trim();
    if (!noQuote) return 0;

    // split by spaces, but preserve fraction
    const tokens = noQuote.split(/\s+/).filter(Boolean);

    if (tokens.length === 1) {
      // "10" or "3/8"
      const v = parseFractionToken(tokens[0]);
      if (v == null) return null;
      return v;
    }

    if (tokens.length === 2) {
      // "10 7/8" or "10 1/2"
      const whole = parseFractionToken(tokens[0]);
      const frac = parseFractionToken(tokens[1]);
      if (whole == null || frac == null) return null;
      return whole + frac;
    }

    // if someone types more stuff, reject
    return null;
  }

  function parseCarpenterMeasure(input) {
    // Returns total inches (float) or null if invalid.
    if (input == null) return null;
    let s = cleanQuotes(String(input));
    if (!s) return null;

    // Remove commas and double spaces
    s = s.replace(/,/g, " ").replace(/\s+/g, " ").trim();

    // Patterns we support:
    // 1) feet + optional inches: 7' 10 7/8"
    // 2) feet + fraction inches: 12' 3/8"
    // 3) feet only: 7'
    // 4) inches only: 10 7/8"  OR  3/8"
    // 5) inches only without quote: 10 7/8  OR  3/8
    //
    // Strategy:
    // - If contains ', parse feet first
    // - Whatever remains after feet parse is inches part
    // - If no ', parse as inches part directly

    let feet = 0;
    let inchesPart = "";

    if (s.includes("'")) {
      // split on first foot mark
      const parts = s.split("'");
      if (parts.length < 2) return null;

      const feetStr = parts[0].trim();
      if (!/^\d+$/.test(feetStr)) return null;
      feet = Number(feetStr);

      inchesPart = parts.slice(1).join("'").trim(); // anything after first '
      // inchesPart might be: 10 7/8", 3/8", 10", "" etc.
      // If user wrote only "7'", inchesPart will be ""
    } else {
      inchesPart = s;
    }

    // Clean inchesPart: allow leading/trailing quotes
    inchesPart = inchesPart.trim();

    // Some users type 12' 3/8" (good) but also 12' 3/8 (no ")
    // Both OK. parseInchesPart strips quotes anyway.
    const inches = parseInchesPart(inchesPart);
    if (inches == null) return null;

    return feet * 12 + inches;
  }

  function roundToNearestFraction(value, denom) {
    // value is inches float
    const sign = value < 0 ? -1 : 1;
    const v = Math.abs(value);

    const whole = Math.floor(v);
    const frac = v - whole;
    const num = Math.round(frac * denom);

    if (num === denom) {
      return { sign, whole: whole + 1, num: 0, den: denom };
    }
    return { sign, whole, num, den: denom };
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

    // round remainder to nearest 1/16
    const r = roundToNearestFraction(rem, fracDen);
    let wholeIn = r.whole;
    let num = r.num;
    let den = r.den;

    // carry if rounding pushed inches to 12
    if (wholeIn >= 12) {
      feet += 1;
      wholeIn -= 12;
    }

    // simplify fraction
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

  // Make these available in console if needed
  window.__MEASURE__ = {
    parseCarpenterMeasure,
    formatInchesAsFeetInches,
  };

  // =========================================================
  // HOME — Fraction Operations (using standardized measure)
  // =========================================================
  const fracA = document.getElementById("fracA");
  const fracB = document.getElementById("fracB");
  const fracOut = document.getElementById("fracOut");

  function getAB() {
    const a = parseCarpenterMeasure(fracA.value);
    const b = parseCarpenterMeasure(fracB.value);
    if (a == null || b == null) return null;
    return { a, b };
  }

  function setFracOut(text) {
    fracOut.textContent = text;
  }

  document.getElementById("btnAdd").addEventListener("click", () => {
    const ab = getAB();
    if (!ab) return setFracOut("Enter valid A and B measurements.");
    const res = ab.a + ab.b;
    setFracOut(
      `A = ${formatInchesAsFeetInches(ab.a)}  (${ab.a.toFixed(3)}")\n` +
      `B = ${formatInchesAsFeetInches(ab.b)}  (${ab.b.toFixed(3)}")\n\n` +
      `A + B = ${formatInchesAsFeetInches(res)}  (${res.toFixed(3)}")`
    );
  });

  document.getElementById("btnSub").addEventListener("click", () => {
    const ab = getAB();
    if (!ab) return setFracOut("Enter valid A and B measurements.");
    const res = ab.a - ab.b;
    setFracOut(
      `A = ${formatInchesAsFeetInches(ab.a)}  (${ab.a.toFixed(3)}")\n` +
      `B = ${formatInchesAsFeetInches(ab.b)}  (${ab.b.toFixed(3)}")\n\n` +
      `A − B = ${formatInchesAsFeetInches(res)}  (${res.toFixed(3)}")`
    );
  });

  document.getElementById("btnMul").addEventListener("click", () => {
    const ab = getAB();
    if (!ab) return setFracOut("Enter valid A and B measurements.");
    const res = ab.a * ab.b;
    setFracOut(
      `A(in) = ${ab.a.toFixed(3)}"\nB(in) = ${ab.b.toFixed(3)}"\n\n` +
      `A × B = ${res.toFixed(3)} (square-inches)\n` +
      `Note: Multiplying lengths yields area.`
    );
  });

  document.getElementById("btnDiv").addEventListener("click", () => {
    const ab = getAB();
    if (!ab) return setFracOut("Enter valid A and B measurements.");
    if (ab.b === 0) return setFracOut("B cannot be zero.");
    const res = ab.a / ab.b;
    setFracOut(
      `A(in) = ${ab.a.toFixed(3)}"\nB(in) = ${ab.b.toFixed(3)}"\n\n` +
      `A ÷ B = ${res.toFixed(4)}`
    );
  });

  document.getElementById("btnClearFrac").addEventListener("click", () => {
    fracA.value = "";
    fracB.value = "";
    setFracOut("Enter valid A and B measurements.");
  });

  // =========================================================
  // LAYOUT — Wall Materials Estimator
  // =========================================================
  const wallLen = document.getElementById("wallLen");
  const wallHt = document.getElementById("wallHt");
  const studSpacing = document.getElementById("studSpacing");
  const sheetSize = document.getElementById("sheetSize");
  const hangDir = document.getElementById("hangDir");
  const wastePct = document.getElementById("wastePct");
  const wallOut = document.getElementById("wallOut");

  function calcWall() {
    const L_in = parseCarpenterMeasure(wallLen.value);
    const H_in = parseCarpenterMeasure(wallHt.value);
    if (L_in == null || H_in == null || L_in <= 0 || H_in <= 0) {
      wallOut.textContent = "Enter valid wall length and height (tape format).";
      return;
    }

    const spacing = Number(studSpacing.value); // inches
    const waste = Math.max(0, Number(wastePct.value || 0)) / 100;

    const L_ft = L_in / 12;
    const H_ft = H_in / 12;
    const wallArea = L_ft * H_ft; // one side

    // studs estimate:
    // studs at each end + intermediate: floor(L/spacing)+1, then +1 for far end
    // Equivalent: ceil(L/spacing)+1
    const studs = Math.ceil(L_in / spacing) + 1;

    // sheet coverage
    const [sw, sh] = (sheetSize.value === "4x12") ? [4, 12] : [4, 8];
    const sheetArea = sw * sh;

    let sheets;
    if (hangDir.value === "vertical") {
      // vertical: sheet height matters, still area-based with practical rounding
      sheets = Math.ceil((wallArea / sheetArea) * (1 + waste));
    } else {
      // horizontal: still area-based estimate
      sheets = Math.ceil((wallArea / sheetArea) * (1 + waste));
    }

    wallOut.textContent =
      `Wall Length: ${formatInchesAsFeetInches(L_in)}\n` +
      `Wall Height: ${formatInchesAsFeetInches(H_in)}\n` +
      `Stud Spacing: ${spacing}" O.C.\n` +
      `Wall Area (one side): ${wallArea.toFixed(2)} sq ft\n\n` +
      `Studs (est.): ${studs} pcs\n` +
      `Sheets (${sheetSize.value.toUpperCase()}): ${sheets} pcs (incl. ${Math.round(waste*100)}% waste)\n\n` +
      `Note: This is a fast estimator. Openings, corners, and backing will change counts.`;
  }

  document.getElementById("btnCalcWall").addEventListener("click", calcWall);
  document.getElementById("btnClearWall").addEventListener("click", () => {
    wallLen.value = "";
    wallHt.value = "";
    wastePct.value = 10;
    wallOut.textContent = "Enter wall length and height to estimate studs and sheets.";
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
    const mode = sfPattern.value;
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
  sfPattern.addEventListener("change", applyPatternDefaults);
  applyPatternDefaults();

  function calcSubfloor() {
    const L_in = parseCarpenterMeasure(sfLen.value);
    const W_in = parseCarpenterMeasure(sfWid.value);
    if (L_in == null || W_in == null || L_in <= 0 || W_in <= 0) {
      subfloorOut.textContent = "Enter valid room length and width (tape format).";
      return;
    }

    const waste = Math.max(0, Number(sfWaste.value || 0)) / 100;

    const [sw, sh] = (sfSheet.value === "4x4") ? [4, 4] : [4, 8];
    const sheetArea = sw * sh;

    const area = (L_in / 12) * (W_in / 12);
    const sheets = Math.ceil((area / sheetArea) * (1 + waste));

    // Screw spacing inputs (inches)
    const edgeSpacing = parseCarpenterMeasure(sfEdge.value);
    const fieldSpacing = parseCarpenterMeasure(sfField.value);
    if (edgeSpacing == null || fieldSpacing == null || edgeSpacing <= 0 || fieldSpacing <= 0) {
      subfloorOut.textContent = "Fastener spacing is invalid. Use format like 6\" or 5 1/2\".";
      return;
    }

    // Very rough screw count estimate:
    // Assume ~ 50 screws per 4x8 at 6/12 as a ballpark (varies heavily).
    // We'll scale by spacing: tighter spacing => more screws.
    const baseEdge = 6;   // inches
    const baseField = 12; // inches
    const factor = (baseEdge / (edgeSpacing)) * 0.55 + (baseField / (fieldSpacing)) * 0.45;
    const screwsPer4x8 = 50 * factor;
    const screws = Math.ceil(screwsPer4x8 * sheets * (sfSheet.value === "4x4" ? 0.55 : 1));

    subfloorOut.textContent =
      `Room: ${formatInchesAsFeetInches(L_in)} × ${formatInchesAsFeetInches(W_in)}\n` +
      `Area: ${area.toFixed(2)} sq ft\n` +
      `Sheets (${sfSheet.value.toUpperCase()}): ${sheets} pcs (incl. ${Math.round(waste*100)}% waste)\n\n` +
      `Fasteners:\n` +
      `- Edge spacing: ${formatInchesAsFeetInches(edgeSpacing).replace(/^\d+'\s/, "")}\n` +
      `- Field spacing: ${formatInchesAsFeetInches(fieldSpacing).replace(/^\d+'\s/, "")}\n` +
      `- Screws (rough est.): ${screws} pcs\n\n` +
      `Adhesive: ${sfAdhesive.value === "yes" ? "YES (default)" : "NO"}\n` +
      `Note: Screw counts vary by joist layout, blocking, and code/spec.`;
  }

  document.getElementById("btnCalcSubfloor").addEventListener("click", calcSubfloor);
  document.getElementById("btnClearSubfloor").addEventListener("click", () => {
    sfLen.value = "";
    sfWid.value = "";
    sfSheet.value = "4x8";
    sfWaste.value = 10;
    sfPattern.value = "std";
    sfAdhesive.value = "yes";
    applyPatternDefaults();
    subfloorOut.textContent = "Enter room dimensions to estimate sheets, fasteners, and adhesive.";
  });

  // =========================================================
  // ROOFING — Roof Area + Materials
  // =========================================================
  const roofLen = document.getElementById("roofLen");
  const roofWid = document.getElementById("roofWid");
  const roofPitch = document.getElementById("roofPitch");
  const roofWaste = document.getElementById("roofWaste");
  const roofBundlesPerSquare = document.getElementById("roofBundlesPerSquare");
  const roofOut = document.getElementById("roofOut");

  function parsePitch(p) {
    const s = (p || "").trim();
    if (!s) return null;

    // "6/12" -> 6
    const m = s.match(/^(\d+(\.\d+)?)\s*\/\s*12$/);
    if (m) return Number(m[1]);

    // "6/12 " variations
    const m2 = s.match(/^(\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)$/);
    if (m2) {
      const rise = Number(m2[1]);
      const run = Number(m2[3]);
      if (!run) return null;
      // normalize to "per 12"
      return (rise / run) * 12;
    }

    // plain number = rise per 12
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);

    return null;
  }

  function calcRoof() {
    const L_in = parseCarpenterMeasure(roofLen.value);
    const W_in = parseCarpenterMeasure(roofWid.value);
    const pitchRisePer12 = parsePitch(roofPitch.value);
    if (L_in == null || W_in == null || L_in <= 0 || W_in <= 0 || pitchRisePer12 == null || pitchRisePer12 < 0) {
      roofOut.textContent = "Enter valid roof length, width, and pitch (e.g. 6/12).";
      return;
    }

    const waste = Math.max(0, Number(roofWaste.value || 0)) / 100;
    const bundlesPerSquare = Number(roofBundlesPerSquare.value);

    // Convert plan width to slope width using pitch
    // slope factor = sqrt(12^2 + rise^2) / 12
    const slopeFactor = Math.sqrt(12 * 12 + pitchRisePer12 * pitchRisePer12) / 12;

    const L_ft = L_in / 12;
    const W_ft = (W_in / 12) * slopeFactor;

    const area = L_ft * W_ft; // one plane
    // If user enters full roof width for both planes, they should enter that; we keep it simple: ONE plane estimate.
    // You can duplicate if needed or add a toggle later.

    const areaWithWaste = area * (1 + waste);
    const squares = areaWithWaste / 100;
    const bundles = Math.ceil(squares * bundlesPerSquare);

    roofOut.textContent =
      `Roof Length (eave): ${formatInchesAsFeetInches(L_in)}\n` +
      `Roof Width (ridge→eave, plan): ${formatInchesAsFeetInches(W_in)}\n` +
      `Pitch: ${pitchRisePer12.toFixed(2)}/12\n` +
      `Slope Factor: ${slopeFactor.toFixed(4)}\n\n` +
      `Slope Width: ${(W_ft).toFixed(2)} ft\n` +
      `Area (one plane): ${area.toFixed(2)} sq ft\n` +
      `Area (+${Math.round(waste*100)}% waste): ${areaWithWaste.toFixed(2)} sq ft\n\n` +
      `Squares: ${squares.toFixed(2)}\n` +
      `Bundles (@ ${bundlesPerSquare}/square): ${bundles}\n\n` +
      `Note: This estimates ONE roof plane. If you want both planes, run twice or we’ll add a “Both sides” toggle.`;
  }

  document.getElementById("btnCalcRoof").addEventListener("click", calcRoof);
  document.getElementById("btnClearRoof").addEventListener("click", () => {
    roofLen.value = "";
    roofWid.value = "";
    roofPitch.value = "";
    roofWaste.value = 10;
    roofBundlesPerSquare.value = "3";
    roofOut.textContent = "Enter roof dimensions + pitch to estimate area, squares, and bundles.";
  });

})();
