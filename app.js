/* app.js — v17 (patched)
   Fixes:
   - No-crash guards
   - Measurements tab converter
   - Layout perimeter calculator
   - Wall estimator retained
   - Electrical Ohm's Law + Voltage Drop calculator added
*/

(function () {
  // -----------------------------
  // Helpers
  // -----------------------------
  const $ = (id) => document.getElementById(id);

  function setOut(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  // -----------------------------
  // Service worker "Cached/Live"
  // -----------------------------
  const buildLine = $("buildLine");

  function updateCacheStatus() {
    const cached = !!navigator.serviceWorker?.controller;
    if (buildLine) buildLine.textContent = `Build: v17 • ${cached ? "Cached" : "Live"}`;
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
    measurements: $("tab-measurements"),
    layout: $("tab-layout"),
    subfloor: $("tab-subfloor"),
    roofing: $("tab-roofing"),
    stairs: $("tab-stairs"),
    concrete: $("tab-concrete"),
    electrical: $("tab-electrical"),
  };

  function setActiveTab(name) {
    tabButtons.forEach((btn) => btn.classList.toggle("isActive", btn.dataset.tab === name));
    Object.entries(panels).forEach(([k, el]) => {
      if (!el) return;
      el.classList.toggle("isActive", k === name);
    });
    window.scrollTo(0, 0);
  }

  tabButtons.forEach((btn) => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab)));

  // -----------------------------
  // Modal Steps
  // -----------------------------
  const modal = $("modal");
  const modalBody = $("modalBody");
  const modalClose = $("modalClose");
  const modalBackdrop = $("modalBackdrop");

  const STEPS = {
    "measurements-convert": `
<strong>Measurement Converter</strong><br/>
1) Enter one measurement.<br/>
2) Tap <strong>Convert</strong>.<br/>
3) Outputs tape, fraction inches, decimal inches/feet, and mm.
`,
    "layout-perimeter": `
<strong>Perimeter Calculator</strong><br/>
Perimeter = 2 × (Length + Width).
`,
    "layout-wall": `
<strong>Wall Materials Estimator</strong><br/>
Openings: one per line. Example: <code>D 3' 0"</code> or <code>W 4' 0"</code>.
`,
    "subfloor": `
<strong>Subfloor Estimator</strong><br/>
Enter room length/width, sheet size, waste, and fastener pattern.
`,
    "roofing": `
<strong>Roofing</strong><br/>
Enter eave length, ridge-to-eave run, and pitch.
`,
    "stairs": `
<strong>Stairs</strong><br/>
Enter total rise and target riser height; verify code.
`,
    "concrete": `
<strong>Concrete</strong><br/>
Pick type, enter dimensions, waste, and rounding.
`,
    "electrical-wire": `
<strong>Wire Planner</strong><br/>
Estimate total cable based on runs, slack, and waste.
`,
    "electrical-ohms": `
<strong>Ohm's Law Calculator</strong><br/>
Enter any two known values.

<ul>
<li>E = I × R</li>
<li>I = E ÷ R</li>
<li>R = E ÷ I</li>
<li>P = E × I</li>
<li>I = P ÷ E</li>
</ul>

Voltage Drop:<br/>
VD = (2 × K × I × D) ÷ CM
`,
    "electrical-load": `
<strong>Load Check</strong><br/>
80% rule check for continuous load.
`,
    "electrical-ampacity": `
<strong>Ampacity Reference</strong><br/>
Quick copper reference only. Verify NEC + local code.
`,
  };

  Array.from(document.querySelectorAll("[data-steps]")).forEach((btn) => {
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
  // MEASUREMENT PARSING + FORMATTING
  // =========================================================
  function cleanQuotes(s) {
    return String(s).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
  }

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  }

  function simplifyFraction(num, den) {
    if (num === 0) return { num: 0, den: 1 };
    const g = gcd(num, den);
    return { num: num / g, den: den / g };
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

  function parseLengthToInches(input) {
    if (input == null) return null;
    let s = cleanQuotes(input);
    if (!s) return null;

    s = s.replace(/,/g, " ").replace(/\s+/g, " ").trim();

    if (s.endsWith("'") && !s.includes('"')) {
      const feetStr = s.slice(0, -1).trim();
      const ft = parseFractionToken(feetStr);
      if (ft == null) return null;
      return ft * 12;
    }

    if (s.includes("'")) {
      const parts = s.split("'");
      const feetStr = parts[0].trim();

      if (!/^\-?\d+$/.test(feetStr)) return null;
      const feet = Number(feetStr);

      const inchesPart = parts.slice(1).join("'").trim();
      const inches = parseInchesPart(inchesPart);
      if (inches == null) return null;

      return feet * 12 + inches;
    }

    const inches = parseInchesPart(s);
    if (inches == null) return null;
    return inches;
  }

  function roundToNearestFraction(value, denom) {
    const v = Math.abs(value);
    const whole = Math.floor(v);
    const frac = v - whole;
    const num = Math.round(frac * denom);
    if (num === denom) return { whole: whole + 1, num: 0, den: denom };
    return { whole, num, den: denom };
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

    let inchStr = `${wholeIn}`;
    if (num !== 0) {
      const simp = simplifyFraction(num, den);
      inchStr = wholeIn === 0 ? `${simp.num}/${simp.den}` : `${wholeIn} ${simp.num}/${simp.den}`;
    }

    return `${sign}${feet}' ${inchStr}"`;
  }

  function formatInchesAsFraction(inchesFloat, fracDen = 16) {
    if (inchesFloat == null || !isFinite(inchesFloat)) return "—";
    const sign = inchesFloat < 0 ? "-" : "";
    const total = Math.abs(inchesFloat);

    const r = roundToNearestFraction(total, fracDen);
    const w = r.whole;
    const num = r.num;
    const den = r.den;

    if (num === 0) return `${sign}${w}"`;

    const simp = simplifyFraction(num, den);
    return w === 0 ? `${sign}${simp.num}/${simp.den}"` : `${sign}${w} ${simp.num}/${simp.den}"`;
  }

  function roundMaybe(x, stepStr) {
    if (!isFinite(x)) return x;
    if (!stepStr || stepStr === "none") return x;
    const step = Number(stepStr);
    if (!isFinite(step) || step <= 0) return x;
    return Math.round(x / step) * step;
  }

  // =========================================================
  // MEASUREMENTS
  // =========================================================
  const measIn = $("measIn");
  const measRound = $("measRound");
  const measOut = $("measOut");

  $("btnMeasConvert")?.addEventListener("click", () => {
    const inches = parseLengthToInches(measIn?.value);

    if (inches == null || !isFinite(inches)) {
      setOut(measOut, `Enter a valid measurement.
Examples: 7' 10 7/8"  |  5 1/2"  |  96  |  1/4'`);
      return;
    }

    const r = measRound?.value || "none";

    const decInches = roundMaybe(inches, r);
    const decFeet = roundMaybe(inches / 12, r);
    const mm = roundMaybe(inches * 25.4, r);

    setOut(measOut, `INPUT
- Parsed inches: ${inches.toFixed(6)}

OUTPUTS
- Tape:           ${formatInchesAsFeetInches(inches)}
- Fraction inch:  ${formatInchesAsFraction(inches)}
- Decimal inches: ${decInches.toFixed(6)}
- Decimal feet:   ${decFeet.toFixed(6)}
- Millimeters:    ${mm.toFixed(3)} mm`);
  });

  $("btnMeasClear")?.addEventListener("click", () => {
    if (measIn) measIn.value = "";
    if (measRound) measRound.value = "0.01";
    setOut(measOut, `Enter a valid measurement.
Examples: 7' 10 7/8"  |  5 1/2"  |  96  |  1/4'`);
  });

  // =========================================================
  // LAYOUT — PERIMETER
  // =========================================================
  const perimLen = $("perimLen");
  const perimWid = $("perimWid");
  const perimOut = $("perimOut");

  $("btnCalcPerim")?.addEventListener("click", () => {
    const L = parseLengthToInches(perimLen?.value);
    const W = parseLengthToInches(perimWid?.value);

    if (L == null || W == null || L <= 0 || W <= 0) {
      setOut(perimOut, `Enter valid length and width. Example: 24' 0" and 12' 0".`);
      return;
    }

    const P = 2 * (L + W);

    setOut(perimOut, `INPUTS
- Length: ${formatInchesAsFeetInches(L)}
- Width:  ${formatInchesAsFeetInches(W)}

PERIMETER
- Inches: ${P.toFixed(2)}"
- Feet:   ${(P / 12).toFixed(2)} ft
- Tape:   ${formatInchesAsFeetInches(P)}`);
  });

  $("btnClearPerim")?.addEventListener("click", () => {
    if (perimLen) perimLen.value = "";
    if (perimWid) perimWid.value = "";
    setOut(perimOut, `Enter valid length and width. Example: 24' 0" and 12' 0".`);
  });

  // =========================================================
  // LAYOUT — WALL MATERIALS
  // =========================================================
  const wallLen = $("wallLen");
  const wallHt = $("wallHt");
  const studSpacing = $("studSpacing");
  const sheetSize = $("sheetSize");
  const hangDir = $("hangDir");
  const wastePct = $("wastePct");
  const wallCorners = $("wallCorners");
  const wallTees = $("wallTees");
  const openingsList = $("openingsList");
  const hdrStock = $("hdrStock");
  const hdrPlies = $("hdrPlies");
  const wallOut = $("wallOut");

  function parseOpenings(text) {
    const lines = String(text || "").split("\n").map((s) => s.trim()).filter(Boolean);
    const out = [];

    for (const line of lines) {
      const m = line.match(/^([DW])\s+(.+)$/i);
      if (!m) continue;

      const type = m[1].toUpperCase();
      const widthIn = parseLengthToInches(m[2]);

      if (widthIn == null || widthIn <= 0) continue;
      out.push({ type, widthIn, raw: line });
    }

    return out;
  }

  function bearingAllowanceTotal(widthIn) {
    return widthIn <= 60 ? 3 : 6;
  }

  $("btnCalcWall")?.addEventListener("click", () => {
    const L_in = parseLengthToInches(wallLen?.value);
    const H_in = parseLengthToInches(wallHt?.value);

    if (L_in == null || H_in == null || L_in <= 0 || H_in <= 0) {
      setOut(wallOut, "Enter valid wall length and height.");
      return;
    }

    const spacing = Number(studSpacing?.value || 16);
    const waste = Math.max(0, Number(wastePct?.value || 0)) / 100;
    const corners = Math.max(0, Math.floor(Number(wallCorners?.value || 0)));
    const tees = Math.max(0, Math.floor(Number(wallTees?.value || 0)));
    const plies = Math.max(1, Number(hdrPlies?.value || 2));

    const L_ft = L_in / 12;
    const H_ft = H_in / 12;
    const wallArea = L_ft * H_ft;
    const baseStuds = Math.ceil(L_in / spacing) + 1;
    const cornerAdds = corners * 2;
    const teeAdds = tees * 2;
    const openings = parseOpenings(openingsList?.value);

    let removedInterior = 0;
    let kingStuds = 0;
    let jackStuds = 0;
    let headerLF = 0;
    let headerBoardLF = 0;
    let sillCount = 0;
    let cripplesAbove = 0;
    let cripplesBelow = 0;

    for (const op of openings) {
      const interior = Math.max(0, Math.ceil(op.widthIn / spacing) - 1);
      removedInterior += interior;
      kingStuds += 2;
      jackStuds += 2;

      const headerLenIn = op.widthIn + bearingAllowanceTotal(op.widthIn);
      headerLF += headerLenIn / 12;
      headerBoardLF += (headerLenIn / 12) * plies;

      cripplesAbove += interior;

      if (op.type === "W") {
        sillCount += 1;
        cripplesBelow += interior;
      }
    }

    const studsTotal = Math.max(0, baseStuds - removedInterior + kingStuds + jackStuds + cornerAdds + teeAdds);
    const [sw, sh] = sheetSize?.value === "4x12" ? [4, 12] : [4, 8];
    const sheets = Math.ceil((wallArea / (sw * sh)) * (1 + waste));

    const openingsSummary =
      openings.length === 0
        ? "None"
        : openings.map((o) => `${o.type} ${formatInchesAsFeetInches(o.widthIn)}`).join(", ");

    setOut(wallOut, `INPUTS
- Wall Length: ${formatInchesAsFeetInches(L_in)}
- Wall Height: ${formatInchesAsFeetInches(H_in)}
- Stud Spacing: ${spacing}" O.C.
- Corners: ${corners}
- T-Intersections: ${tees}
- Openings: ${openingsSummary}
- Waste: ${Math.round(waste * 100)}%

AREA + SHEETS
- Wall Area: ${wallArea.toFixed(2)} sq ft
- Sheets: ${sheets} pcs

STUDS
- Base studs: ${baseStuds}
- Removed at openings: ${removedInterior}
- King studs: ${kingStuds}
- Jack studs: ${jackStuds}
- Corner adds: ${cornerAdds}
- Tee adds: ${teeAdds}
= TOTAL STUDS: ${studsTotal}

HEADERS
- Header LF: ${headerLF.toFixed(2)} lf
- Header material: ${hdrStock?.value || "2x6"} (${plies}-ply)
- Header stock LF: ${headerBoardLF.toFixed(2)} lf
- Window sills: ${sillCount}
- Cripples above: ${cripplesAbove}
- Cripples below: ${cripplesBelow}

NOTES
- Hang direction: ${(hangDir?.value || "vertical").toUpperCase()}
- Fast estimate only. Verify drawings/code.`);
  });

  $("btnClearWall")?.addEventListener("click", () => {
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
    setOut(wallOut, "Enter wall length and height to estimate studs, sheets, corners, and headers.");
  });

  // =========================================================
  // SUBFLOOR
  // =========================================================
  const sfLen = $("sfLen");
  const sfWid = $("sfWid");
  const sfSheet = $("sfSheet");
  const sfWaste = $("sfWaste");
  const sfPattern = $("sfPattern");
  const sfEdge = $("sfEdge");
  const sfField = $("sfField");
  const sfAdhesive = $("sfAdhesive");
  const subfloorOut = $("subfloorOut");

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

  $("btnCalcSubfloor")?.addEventListener("click", () => {
    const L_in = parseLengthToInches(sfLen?.value);
    const W_in = parseLengthToInches(sfWid?.value);

    if (L_in == null || W_in == null || L_in <= 0 || W_in <= 0) {
      setOut(subfloorOut, "Enter valid room length and width.");
      return;
    }

    const waste = Math.max(0, Number(sfWaste?.value || 0)) / 100;
    const [sw, sh] = sfSheet?.value === "4x4" ? [4, 4] : [4, 8];
    const area = (L_in / 12) * (W_in / 12);
    const sheets = Math.ceil((area / (sw * sh)) * (1 + waste));

    const edgeSpacing = parseLengthToInches(sfEdge?.value);
    const fieldSpacing = parseLengthToInches(sfField?.value);

    if (edgeSpacing == null || fieldSpacing == null || edgeSpacing <= 0 || fieldSpacing <= 0) {
      setOut(subfloorOut, `Fastener spacing is invalid. Use format like 6".`);
      return;
    }

    const factor = (6 / edgeSpacing) * 0.55 + (12 / fieldSpacing) * 0.45;
    const sheetFactor = sfSheet?.value === "4x4" ? 0.55 : 1;
    const screws = Math.ceil(50 * factor * sheets * sheetFactor);

    setOut(subfloorOut, `Room: ${formatInchesAsFeetInches(L_in)} × ${formatInchesAsFeetInches(W_in)}
Area: ${area.toFixed(2)} sq ft
Sheets: ${sheets} pcs

Fasteners:
- Edge spacing: ${formatInchesAsFraction(edgeSpacing)}
- Field spacing: ${formatInchesAsFraction(fieldSpacing)}
- Screws rough estimate: ${screws}

Adhesive: ${sfAdhesive?.value === "yes" ? "YES" : "NO"}`);
  });

  $("btnClearSubfloor")?.addEventListener("click", () => {
    if (sfLen) sfLen.value = "";
    if (sfWid) sfWid.value = "";
    if (sfSheet) sfSheet.value = "4x8";
    if (sfWaste) sfWaste.value = 10;
    if (sfPattern) sfPattern.value = "std";
    if (sfAdhesive) sfAdhesive.value = "yes";
    applyPatternDefaults();
    setOut(subfloorOut, "Enter room dimensions to estimate sheets, fasteners, and adhesive.");
  });

  // =========================================================
  // ROOFING
  // =========================================================
  const roofLen = $("roofLen");
  const roofWid = $("roofWid");
  const roofPitch = $("roofPitch");
  const roofPlanes = $("roofPlanes");
  const roofWaste = $("roofWaste");
  const roofBundlesPerSquare = $("roofBundlesPerSquare");
  const roofOut = $("roofOut");

  function parsePitch(p) {
    const s = String(p || "").trim();
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

  $("btnCalcRoof")?.addEventListener("click", () => {
    const L_in = parseLengthToInches(roofLen?.value);
    const W_in = parseLengthToInches(roofWid?.value);
    const pitchRisePer12 = parsePitch(roofPitch?.value);

    if (L_in == null || W_in == null || pitchRisePer12 == null || L_in <= 0 || W_in <= 0) {
      setOut(roofOut, "Enter valid roof length, run, and pitch.");
      return;
    }

    const waste = Math.max(0, Number(roofWaste?.value || 0)) / 100;
    const bundlesPerSquare = Number(roofBundlesPerSquare?.value || 3);
    const slopeFactor = Math.sqrt(144 + pitchRisePer12 * pitchRisePer12) / 12;
    const planes = roofPlanes?.value === "two" ? 2 : 1;

    const area = (L_in / 12) * (W_in / 12) * slopeFactor * planes;
    const areaWaste = area * (1 + waste);
    const squares = areaWaste / 100;
    const bundles = Math.ceil(squares * bundlesPerSquare);

    setOut(roofOut, `INPUTS
- Eave length: ${formatInchesAsFeetInches(L_in)}
- Run: ${formatInchesAsFeetInches(W_in)}
- Pitch: ${pitchRisePer12.toFixed(2)}/12
- Planes: ${planes}

AREA + MATERIALS
- Area no waste: ${area.toFixed(2)} sq ft
- Area with waste: ${areaWaste.toFixed(2)} sq ft
- Squares: ${squares.toFixed(2)}
- Bundles: ${bundles}`);
  });

  $("btnClearRoof")?.addEventListener("click", () => {
    if (roofLen) roofLen.value = "";
    if (roofWid) roofWid.value = "";
    if (roofPitch) roofPitch.value = "";
    if (roofPlanes) roofPlanes.value = "one";
    if (roofWaste) roofWaste.value = 10;
    if (roofBundlesPerSquare) roofBundlesPerSquare.value = "3";
    setOut(roofOut, "Enter roof dimensions + pitch to estimate square feet, squares, and bundles.");
  });

  // =========================================================
  // STAIRS
  // =========================================================
  const stTotalRise = $("stTotalRise");
  const stRiserTarget = $("stRiserTarget");
  const stTreadDepth = $("stTreadDepth");
  const stNosing = $("stNosing");
  const stairsOut = $("stairsOut");

  $("btnCalcStairs")?.addEventListener("click", () => {
    const totalRiseIn = parseLengthToInches(stTotalRise?.value);
    const riserTargetIn = parseLengthToInches(stRiserTarget?.value);
    const treadDepthIn = parseLengthToInches(stTreadDepth?.value);

    if (totalRiseIn == null || riserTargetIn == null || treadDepthIn == null || totalRiseIn <= 0 || riserTargetIn <= 0 || treadDepthIn <= 0) {
      setOut(stairsOut, "Enter valid stair measurements.");
      return;
    }

    const risers = Math.max(1, Math.round(totalRiseIn / riserTargetIn));
    const actualRiser = totalRiseIn / risers;
    const treads = Math.max(0, risers - 1);
    const totalRunIn = treads * treadDepthIn;
    const stringerLenIn = Math.sqrt(totalRiseIn ** 2 + totalRunIn ** 2);

    setOut(stairsOut, `STAIR LAYOUT RESULTS

Total Rise: ${formatInchesAsFeetInches(totalRiseIn)}
Number of Risers: ${risers}
Actual Riser Height: ${formatInchesAsFeetInches(actualRiser)}

Number of Treads: ${treads}
Tread Depth: ${formatInchesAsFeetInches(treadDepthIn)}
Total Run: ${formatInchesAsFeetInches(totalRunIn)}

Stringer Length: ${formatInchesAsFeetInches(stringerLenIn)}

Note: Verify code + finish thickness before cutting.`);
  });

  $("btnClearStairs")?.addEventListener("click", () => {
    if (stTotalRise) stTotalRise.value = "";
    if (stRiserTarget) stRiserTarget.value = "";
    if (stTreadDepth) stTreadDepth.value = `10"`;
    if (stNosing) stNosing.value = "yes";
    setOut(stairsOut, "Enter total rise and target riser height.");
  });

  // =========================================================
  // CONCRETE
  // =========================================================
  const concType = $("concType");
  const concTypeHint = $("concTypeHint");
  const concQty = $("concQty");
  const concLen = $("concLen");
  const concWid = $("concWid");
  const concHt = $("concHt");
  const concThk = $("concThk");
  const concWaste = $("concWaste");
  const concRound = $("concRound");
  const concWidthField = $("concWidthField");
  const concHeightField = $("concHeightField");
  const concThkLabel = $("concThkLabel");
  const concThkHint = $("concThkHint");
  const concreteOut = $("concreteOut");

  function updateConcreteUI() {
    const t = concType?.value || "slab";
    if (!concTypeHint) return;

    if (t === "slab") {
      concTypeHint.textContent = "Slab = Length × Width × Thickness";
      if (concWidthField) concWidthField.style.display = "";
      if (concHeightField) concHeightField.style.display = "none";
      if (concThkLabel) concThkLabel.textContent = "Thickness";
      if (concThkHint) concThkHint.textContent = `Slabs typically 4" or more.`;
    } else if (t === "footing") {
      concTypeHint.textContent = "Footing = Length × Width × Depth";
      if (concWidthField) concWidthField.style.display = "";
      if (concHeightField) concHeightField.style.display = "none";
      if (concThkLabel) concThkLabel.textContent = "Depth";
      if (concThkHint) concThkHint.textContent = `Footings often use inches.`;
    } else {
      concTypeHint.textContent = "Wall = Length × Height × Thickness";
      if (concWidthField) concWidthField.style.display = "none";
      if (concHeightField) concHeightField.style.display = "";
      if (concThkLabel) concThkLabel.textContent = "Thickness";
      if (concThkHint) concThkHint.textContent = "Walls: thickness is usually inches.";
    }
  }

  concType?.addEventListener("change", updateConcreteUI);
  updateConcreteUI();

  function roundUpTo(x, step) {
    if (!isFinite(x)) return x;
    if (!step || step <= 0) return x;
    return Math.ceil(x / step) * step;
  }

  $("btnCalcConcrete")?.addEventListener("click", () => {
    const t = concType?.value || "slab";
    const qty = Math.max(1, Math.floor(Number(concQty?.value || 1)));
    const waste = Math.max(0, Number(concWaste?.value || 0)) / 100;
    const roundStep = Number(concRound?.value || 0);

    const L_in = parseLengthToInches(concLen?.value);
    const W_in = parseLengthToInches(concWid?.value);
    const H_in = parseLengthToInches(concHt?.value);
    const T_in = parseLengthToInches(concThk?.value);

    let volIn3 = 0;

    if (t === "slab" || t === "footing") {
      if (L_in == null || W_in == null || T_in == null || L_in <= 0 || W_in <= 0 || T_in <= 0) {
        setOut(concreteOut, "Enter valid slab/footing dimensions.");
        return;
      }
      volIn3 = L_in * W_in * T_in;
    } else {
      if (L_in == null || H_in == null || T_in == null || L_in <= 0 || H_in <= 0 || T_in <= 0) {
        setOut(concreteOut, "Enter valid wall dimensions.");
        return;
      }
      volIn3 = L_in * H_in * T_in;
    }

    volIn3 *= qty;

    const yd3 = volIn3 / 46656;
    const yd3Waste = yd3 * (1 + waste);
    const ordered = roundStep > 0 ? roundUpTo(yd3Waste, roundStep) : yd3Waste;
    const ft3 = yd3Waste * 27;
    const bags80 = Math.ceil(ft3 / 0.6);
    const bags60 = Math.ceil(ft3 / 0.45);

    setOut(concreteOut, `VOLUME
- Cubic yards raw: ${yd3.toFixed(3)} yd³
- Cubic yards with waste: ${yd3Waste.toFixed(3)} yd³
- Order rounded: ${ordered.toFixed(3)} yd³

BAG ESTIMATES
- 80 lb bags: ${bags80}
- 60 lb bags: ${bags60}`);
  });

  $("btnClearConcrete")?.addEventListener("click", () => {
    if (concType) concType.value = "slab";
    if (concQty) concQty.value = 1;
    if (concLen) concLen.value = "";
    if (concWid) concWid.value = "";
    if (concHt) concHt.value = "";
    if (concThk) concThk.value = "";
    if (concWaste) concWaste.value = 10;
    if (concRound) concRound.value = "0.25";
    updateConcreteUI();
    setOut(concreteOut, "Enter concrete dimensions to estimate cubic yards and materials.");
  });

  // =========================================================
  // ELECTRICAL — WIRE LENGTH
  // =========================================================
  const elCable = $("elCable");
  const elRuns = $("elRuns");
  const elRunLen = $("elRunLen");
  const elSlack = $("elSlack");
  const elWaste = $("elWaste");
  const wireOut = $("wireOut");

  $("btnCalcWire")?.addEventListener("click", () => {
    const runs = Math.max(1, Math.floor(Number(elRuns?.value || 1)));
    const avg = Math.max(0, Number(elRunLen?.value || 0));
    const slack = Math.max(0, Number(elSlack?.value || 0));
    const waste = Math.max(0, Number(elWaste?.value || 0)) / 100;

    const base = runs * avg;
    const slackTotal = runs * slack;
    const total = (base + slackTotal) * (1 + waste);

    setOut(wireOut, `CABLE
- Type: ${elCable?.value || ""}
- Runs: ${runs}

LENGTH
- Base: ${base.toFixed(1)} ft
- Slack: ${slackTotal.toFixed(1)} ft
- Waste: ${Math.round(waste * 100)}%
= TOTAL: ${total.toFixed(1)} ft`);
  });

  $("btnClearWire")?.addEventListener("click", () => {
    if (elCable) elCable.value = "12/2";
    if (elRuns) elRuns.value = 1;
    if (elRunLen) elRunLen.value = 50;
    if (elSlack) elSlack.value = 3;
    if (elWaste) elWaste.value = 10;
    setOut(wireOut, "Enter run details to estimate cable length.");
  });

  // =========================================================
  // ELECTRICAL — LOAD CHECK
  // =========================================================
  const elVoltage = $("elVoltage");
  const elBreaker = $("elBreaker");
  const elWatts = $("elWatts");
  const loadOut = $("loadOut");

  $("btnCalcLoad")?.addEventListener("click", () => {
    const V = Number(elVoltage?.value || 120);
    const breaker = Number(elBreaker?.value || 20);
    const watts = Math.max(0, Number(elWatts?.value || 0));

    const amps = V > 0 ? watts / V : 0;
    const maxContinuous = breaker * 0.8;
    const ok = amps <= maxContinuous;

    setOut(loadOut, `INPUTS
- Voltage: ${V}V
- Breaker: ${breaker}A
- Load: ${watts.toFixed(0)} W

CALC
- Current draw: ${amps.toFixed(2)} A
- 80% limit: ${maxContinuous.toFixed(2)} A

RESULT
- Status: ${ok ? "OK" : "OVER"}`);
  });

  $("btnClearLoad")?.addEventListener("click", () => {
    if (elVoltage) elVoltage.value = "120";
    if (elBreaker) elBreaker.value = "20";
    if (elWatts) elWatts.value = 0;
    setOut(loadOut, "Enter load to check breaker capacity.");
  });

  // =========================================================
  // ELECTRICAL — OHM'S LAW + VOLTAGE DROP
  // =========================================================
  const ohmE = $("ohmE");
  const ohmI = $("ohmI");
  const ohmR = $("ohmR");
  const ohmP = $("ohmP");
  const ohmsOut = $("ohmsOut");

  function numOrNull(el) {
    const v = Number(el?.value);
    return isFinite(v) && v > 0 ? v : null;
  }

  $("btnCalcOhms")?.addEventListener("click", () => {
    let E = numOrNull(ohmE);
    let I = numOrNull(ohmI);
    let R = numOrNull(ohmR);
    let P = numOrNull(ohmP);

    let changed = true;
    let loops = 0;

    while (changed && loops < 10) {
      changed = false;
      loops++;

      if (E == null && I != null && R != null) { E = I * R; changed = true; }
      if (I == null && E != null && R != null) { I = E / R; changed = true; }
      if (R == null && E != null && I != null) { R = E / I; changed = true; }

      if (P == null && E != null && I != null) { P = E * I; changed = true; }
      if (E == null && P != null && I != null) { E = P / I; changed = true; }
      if (I == null && P != null && E != null) { I = P / E; changed = true; }

      if (P != null && R != null && I == null) { I = Math.sqrt(P / R); changed = true; }
      if (P != null && R != null && E == null) { E = Math.sqrt(P * R); changed = true; }
      if (E != null && P != null && R == null) { R = (E * E) / P; changed = true; }
      if (I != null && R != null && P == null) { P = I * I * R; changed = true; }
    }

    if (E == null || I == null || R == null || P == null) {
      setOut(ohmsOut, `Enter any two compatible values.

Examples:
- E + I → finds R and P
- E + R → finds I and P
- I + R → finds E and P
- P + E → finds I and R
- P + R → finds E and I`);
      return;
    }

    setOut(ohmsOut, `OHM'S LAW RESULTS

E / Voltage:
- ${E.toFixed(2)} V

I / A / Current:
- ${I.toFixed(2)} A

R / Resistance:
- ${R.toFixed(2)} Ω

P / W / Power:
- ${P.toFixed(2)} W

FORMULAS USED
- E = I × R
- I = E ÷ R
- R = E ÷ I
- P/W = E × I
- A = W ÷ E`);
  });

  $("btnClearOhms")?.addEventListener("click", () => {
    if (ohmE) ohmE.value = "";
    if (ohmI) ohmI.value = "";
    if (ohmR) ohmR.value = "";
    if (ohmP) ohmP.value = "";
    setOut(ohmsOut, "Enter any two values.");
  });

  const vdVoltage = $("vdVoltage");
  const vdAmps = $("vdAmps");
  const vdDistance = $("vdDistance");
  const vdMaterial = $("vdMaterial");
  const vdWire = $("vdWire");
  const vdOut = $("vdOut");

  $("btnCalcVD")?.addEventListener("click", () => {
    const V = Number(vdVoltage?.value || 0);
    const I = Number(vdAmps?.value || 0);
    const D = Number(vdDistance?.value || 0);
    const K = Number(vdMaterial?.value || 12.9);
    const CM = Number(vdWire?.value || 6530);

    if (V <= 0 || I <= 0 || D <= 0 || K <= 0 || CM <= 0) {
      setOut(vdOut, "Enter valid voltage, amps, distance, material, and wire size.");
      return;
    }

    const drop = (2 * K * I * D) / CM;
    const endVoltage = V - drop;
    const dropPct = (drop / V) * 100;

    let status = "OK";
    if (dropPct > 5) status = "HIGH — check wire size/distance/load";
    else if (dropPct > 3) status = "ACCEPTABLE BUT WATCH — over 3%";

    setOut(vdOut, `VOLTAGE DROP RESULTS

INPUTS
- Voltage: ${V.toFixed(1)} V
- Load: ${I.toFixed(2)} A
- One-way distance: ${D.toFixed(1)} ft
- K constant: ${K}
- Circular mils: ${CM}

CALC
- Voltage drop: ${drop.toFixed(2)} V
- Voltage at load: ${endVoltage.toFixed(2)} V
- Drop percentage: ${dropPct.toFixed(2)}%

RESULT
- Status: ${status}

FORMULA
VD = (2 × K × I × D) ÷ CM`);
  });

  $("btnClearVD")?.addEventListener("click", () => {
    if (vdVoltage) vdVoltage.value = 120;
    if (vdAmps) vdAmps.value = "";
    if (vdDistance) vdDistance.value = "";
    if (vdMaterial) vdMaterial.value = "12.9";
    if (vdWire) vdWire.value = "6530";
    setOut(vdOut, "Enter values to calculate voltage drop.");
  });
})();
