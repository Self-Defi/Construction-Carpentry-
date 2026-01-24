/* ---------------------------
   NAV + VIEW ROUTING
---------------------------- */
const views = {
  calc: document.getElementById("view-calc"),
  layout: document.getElementById("view-layout"),
  ref: document.getElementById("view-ref"),
};

function setActiveView(key){
  Object.keys(views).forEach(k => {
    views[k].classList.toggle("isActive", k === key);
  });

  document.querySelectorAll(".tab").forEach(btn => {
    btn.classList.toggle("isActive", btn.dataset.target === key);
  });

  localStorage.setItem("cc_last_tab", key);
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => setActiveView(btn.dataset.target));
});
setActiveView(localStorage.getItem("cc_last_tab") || "calc");

/* ---------------------------
   STEPS PANELS (per tool)
---------------------------- */
function wireStepsToggle(btnId, panelId){
  const btn = document.getElementById(btnId);
  const panel = document.getElementById(panelId);
  if(!btn || !panel) return;

  btn.addEventListener("click", () => {
    const nextHidden = !panel.hidden ? true : false;
    panel.hidden = nextHidden;
    btn.setAttribute("aria-expanded", String(!nextHidden));
  });
}

wireStepsToggle("btnStepsConv", "stepsConv");
wireStepsToggle("btnStepsOps", "stepsOps");
wireStepsToggle("btnStepsLayout", "stepsLayout");

const outStepsConv = document.getElementById("outStepsConv");
const outStepsOps = document.getElementById("outStepsOps");
const outStepsLayout = document.getElementById("outStepsLayout");

function setSteps(targetEl, title, lines){
  if(!targetEl) return;
  const safeLines = Array.isArray(lines) ? lines : [];
  targetEl.textContent = `${title}\n\n- ${safeLines.join("\n- ")}`;
}

/* ---------------------------
   FRACTIONS / TAPE TOOLS
   - supports: "a/b" and "1 a/b"
   - ALWAYS shows nearest 1/16 breakdown
---------------------------- */
const inpFraction = document.getElementById("inpFraction");
const inpDecimal  = document.getElementById("inpDecimal");
const outFracToDec = document.getElementById("outFracToDec");
const outDecToFrac = document.getElementById("outDecToFrac");

const inpF1 = document.getElementById("inpF1");
const inpF2 = document.getElementById("inpF2");
const outFracOps = document.getElementById("outFracOps");

function gcd(a,b){
  a = Math.abs(a); b = Math.abs(b);
  while(b){ [a,b] = [b, a % b]; }
  return a || 1;
}

function normalizeSpaces(s){
  return String(s || "").trim().replace(/\s+/g, " ");
}

function reduceFrac(n, d){
  if(d === 0) throw new Error("Division by zero");
  if(d < 0){ n = -n; d = -d; }
  const g = gcd(n,d);
  return { n: n/g, d: d/g };
}

function parseFraction(input){
  const s = normalizeSpaces(input);
  if(!s) throw new Error("Enter a fraction.");

  const sign = s.startsWith("-") ? -1 : 1;
  const t = s.replace(/^[+-]\s*/, "");

  if(t.includes(" ")){
    const [wholeStr, fracStr] = t.split(" ");
    const whole = parseInt(wholeStr, 10);
    if(!Number.isFinite(whole)) throw new Error("Invalid mixed number.");
    const f = parseFraction(fracStr);
    return reduceFrac(sign * (whole * f.d + f.n), f.d);
  }

  if(t.includes("/")){
    const [aStr, bStr] = t.split("/");
    const a = parseInt(aStr, 10);
    const b = parseInt(bStr, 10);
    if(!Number.isFinite(a) || !Number.isFinite(b)) throw new Error("Invalid fraction.");
    return reduceFrac(sign * a, b);
  }

  const whole = parseInt(t, 10);
  if(!Number.isFinite(whole)) throw new Error("Invalid number.");
  return reduceFrac(sign * whole, 1);
}

function fracToString(n, d){
  const r = reduceFrac(n,d);
  const sign = r.n < 0 ? "-" : "";
  const nn = Math.abs(r.n);

  const whole = Math.floor(nn / r.d);
  const rem = nn % r.d;

  if(rem === 0) return `${sign}${whole}`;
  if(whole === 0) return `${sign}${rem}/${r.d}`;
  return `${sign}${whole} ${rem}/${r.d}`;
}

function fracToDecimal(n, d){ return n / d; }

function formatDecimal(x){
  return x.toFixed(6).replace(/\.?0+$/, "");
}

function nearestSixteenthFromDecimal(x){
  const denom = 16;
  const raw = x * denom;
  const rounded = Math.round(raw);
  const frac16 = reduceFrac(rounded, denom);
  const approxDec = frac16.n / frac16.d;
  const err = Math.abs(x - approxDec);
  return { denom, raw, rounded, frac16, approxDec, err };
}

function nearestSixteenthFromFraction(n, d){
  const dec = fracToDecimal(n,d);
  const pack = nearestSixteenthFromDecimal(dec);
  return { dec, ...pack };
}

/* Converter */
document.getElementById("btnFracToDec").addEventListener("click", () => {
  try{
    const f = parseFraction(inpFraction.value);
    const pack = nearestSixteenthFromFraction(f.n, f.d);

    outFracToDec.textContent =
      `${fracToString(f.n,f.d)} in = ${formatDecimal(pack.dec)} in (exact)\n` +
      `Nearest 1/16: ${formatDecimal(pack.dec)} × 16 = ${formatDecimal(pack.raw)} → round = ${pack.rounded}/16 = ${fracToString(pack.frac16.n, pack.frac16.d)} in\n` +
      `Error: ${formatDecimal(pack.err)} in`;

    setSteps(outStepsConv, "Fraction → Nearest 1/16", [
      `Parse input: ${fracToString(f.n,f.d)}`,
      `Decimal: n/d = ${formatDecimal(pack.dec)}`,
      `×16 = ${formatDecimal(pack.raw)}`,
      `Round to whole 16ths: ${pack.rounded}`,
      `Back to fraction: ${pack.rounded}/16 → ${fracToString(pack.frac16.n, pack.frac16.d)}`,
      `Error: ${formatDecimal(pack.err)} in`,
    ]);
  }catch(e){
    outFracToDec.textContent = `Error: ${e.message}`;
    setSteps(outStepsConv, "Error", [String(e.message)]);
  }
});

document.getElementById("btnDecToFrac").addEventListener("click", () => {
  try{
    const x = Number(String(inpDecimal.value).trim());
    if(!Number.isFinite(x)) throw new Error("Enter a valid decimal.");

    const pack = nearestSixteenthFromDecimal(x);

    outDecToFrac.textContent =
      `${formatDecimal(x)} in (input)\n` +
      `${formatDecimal(x)} × 16 = ${formatDecimal(pack.raw)} → round = ${pack.rounded}/16\n` +
      `Nearest 1/16 = ${fracToString(pack.frac16.n, pack.frac16.d)} in\n` +
      `Error: ${formatDecimal(pack.err)} in`;

    setSteps(outStepsConv, "Decimal → Nearest 1/16", [
      `Input: ${formatDecimal(x)}`,
      `×16 = ${formatDecimal(pack.raw)}`,
      `Round: ${pack.rounded}`,
      `Fraction: ${pack.rounded}/16 → ${fracToString(pack.frac16.n, pack.frac16.d)}`,
      `Error: ${formatDecimal(pack.err)} in`,
    ]);
  }catch(e){
    outDecToFrac.textContent = `Error: ${e.message}`;
    setSteps(outStepsConv, "Error", [String(e.message)]);
  }
});

/* Ops */
function opsOutput(opName, a, b, rExact){
  const pack = nearestSixteenthFromFraction(rExact.n, rExact.d);
  return {
    pack,
    text:
      `Exact: ${fracToString(a.n,a.d)} ${opName} ${fracToString(b.n,b.d)} = ${fracToString(rExact.n,rExact.d)} in = ${formatDecimal(pack.dec)} in\n` +
      `Nearest 1/16: ${fracToString(pack.frac16.n, pack.frac16.d)} in\n` +
      `Error: ${formatDecimal(pack.err)} in`
  };
}

document.getElementById("btnAdd").addEventListener("click", () => {
  try{
    const a = parseFraction(inpF1.value);
    const b = parseFraction(inpF2.value);
    const r = reduceFrac(a.n*b.d + b.n*a.d, a.d*b.d);

    const out = opsOutput("+", a, b, r);
    outFracOps.textContent = out.text;

    setSteps(outStepsOps, "A + B (then nearest 1/16)", [
      `Parse A: ${fracToString(a.n,a.d)}`,
      `Parse B: ${fracToString(b.n,b.d)}`,
      `Exact: (a.n*b.d + b.n*a.d) / (a.d*b.d)`,
      `Exact result: ${fracToString(r.n,r.d)}`,
      `Nearest 1/16: ${fracToString(out.pack.frac16.n, out.pack.frac16.d)}`,
      `Error: ${formatDecimal(out.pack.err)} in`,
    ]);
  }catch(e){
    outFracOps.textContent = `Error: ${e.message}`;
    setSteps(outStepsOps, "Error", [String(e.message)]);
  }
});

document.getElementById("btnSub").addEventListener("click", () => {
  try{
    const a = parseFraction(inpF1.value);
    const b = parseFraction(inpF2.value);
    const r = reduceFrac(a.n*b.d - b.n*a.d, a.d*b.d);

    const out = opsOutput("−", a, b, r);
    outFracOps.textContent = out.text;

    setSteps(outStepsOps, "A − B (then nearest 1/16)", [
      `Parse A: ${fracToString(a.n,a.d)}`,
      `Parse B: ${fracToString(b.n,b.d)}`,
      `Exact: (a.n*b.d − b.n*a.d) / (a.d*b.d)`,
      `Exact result: ${fracToString(r.n,r.d)}`,
      `Nearest 1/16: ${fracToString(out.pack.frac16.n, out.pack.frac16.d)}`,
      `Error: ${formatDecimal(out.pack.err)} in`,
    ]);
  }catch(e){
    outFracOps.textContent = `Error: ${e.message}`;
    setSteps(outStepsOps, "Error", [String(e.message)]);
  }
});

document.getElementById("btnClearA").addEventListener("click", () => {
  inpFraction.value = "";
  outFracToDec.textContent = "—";
});
document.getElementById("btnClearB").addEventListener("click", () => {
  inpDecimal.value = "";
  outDecToFrac.textContent = "—";
});
document.getElementById("btnClearC").addEventListener("click", () => {
  inpF1.value = "";
  inpF2.value = "";
  outFracOps.textContent = "—";
});

/* ---------------------------
   STUD LAYOUT (framing-accurate rules)
---------------------------- */
const inpLenFt = document.getElementById("inpLenFt");
const inpLenIn = document.getElementById("inpLenIn");
const selOC = document.getElementById("selOC");
const selFormat = document.getElementById("selFormat");
const chkEndStuds = document.getElementById("chkEndStuds");
const chkDropNearEnd = document.getElementById("chkDropNearEnd");
const outLayout = document.getElementById("outLayout");

function toIntOrZero(v){
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function inchesToFtIn(inches){
  const sign = inches < 0 ? "-" : "";
  const x = Math.abs(inches);
  const ft = Math.floor(x / 12);
  const inch = x % 12;
  return `${sign}${ft}' ${inch}"`;
}

function formatMark(inches, mode){
  return mode === "in" ? `${inches}"` : inchesToFtIn(inches);
}

document.getElementById("btnLayout").addEventListener("click", () => {
  try{
    const ft = toIntOrZero(inpLenFt.value);
    const inch = toIntOrZero(inpLenIn.value);
    const totalIn = ft * 12 + inch;
    if(totalIn <= 0) throw new Error("Enter a wall length > 0.");

    const oc = parseInt(selOC.value, 10);
    const fmt = selFormat.value;

    const includeEnds = !!chkEndStuds?.checked;
    const dropNearEnd = !!chkDropNearEnd?.checked;

    // Typical stud thickness used as "too close to end" threshold
    const END_THRESHOLD_IN = 1.5;

    // Build interior OC marks
    const interior = [];
    for(let m = oc; m < totalIn; m += oc){
      interior.push(m);
    }

    // Optionally drop the last interior mark if it's too close to the end
    let dropped = null;
    if(dropNearEnd && interior.length){
      const last = interior[interior.length - 1];
      const gap = totalIn - last;
      if(gap <= END_THRESHOLD_IN){
        dropped = interior.pop();
      }
    }

    // Final stud center marks
    const marks = [];
    if(includeEnds){
      marks.push(0);
      marks.push(...interior);
      if(totalIn !== 0) marks.push(totalIn);
    } else {
      marks.push(...interior);
    }

    // Count = studs at these center marks
    const studCount = marks.length;

    const formatted = marks.map(m => formatMark(m, fmt)).join(", ");

    const summary =
      `Wall: ${ft}' ${inch}" (${totalIn}" total)\n` +
      `Spacing: ${oc}" OC • End studs: ${includeEnds ? "YES" : "NO"} • Drop-near-end: ${dropNearEnd ? "YES" : "NO"}\n` +
      `Stud count: ${studCount}\n` +
      `Center marks:\n${formatted}`;

    outLayout.textContent = summary;

    const steps = [
      `Convert length → inches: ${ft}×12 + ${inch} = ${totalIn}"`,
      `Generate interior OC marks: ${oc}", ${oc*2}", ... < ${totalIn}"`,
    ];

    if(dropNearEnd){
      if(dropped !== null){
        steps.push(`Last interior mark was within 1½" of end: end − last = ${totalIn} − ${dropped} = ${totalIn - dropped}" → dropped ${dropped}"`);
      } else {
        steps.push(`Check last interior mark vs end: no mark within 1½" → none dropped`);
      }
    } else {
      steps.push(`Drop-near-end disabled → keep all interior marks`);
    }

    if(includeEnds){
      steps.push(`Add end studs: include 0" and ${totalIn}"`);
    } else {
      steps.push(`End studs disabled: interior marks only`);
    }

    steps.push(`Final stud count = number of center marks = ${studCount}`);

    setSteps(outStepsLayout, "Stud Layout Steps", steps);
  }catch(e){
    outLayout.textContent = `Error: ${e.message}`;
    setSteps(outStepsLayout, "Error", [String(e.message)]);
  }
});

document.getElementById("btnLayoutClear").addEventListener("click", () => {
  inpLenFt.value = "";
  inpLenIn.value = "";
  outLayout.textContent = "—";
});

/* ---------------------------
   REFERENCE TABLES
---------------------------- */
const tbl16ths = document.getElementById("tbl16ths");

(function build16thsTable(){
  const lines = [];
  for(let n = 1; n <= 16; n++){
    const dec = n / 16;
    const frac = reduceFrac(n,16);
    const label = fracToString(frac.n, frac.d).padEnd(5, " ");
    lines.push(`${label} = ${formatDecimal(dec)}`);
  }
  tbl16ths.textContent = lines.join("\n");
})();

/* ---------------------------
   PWA: INSTALL + SERVICE WORKER
---------------------------- */
let deferredPrompt = null;
const btnInstall = document.getElementById("btnInstall");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstall.hidden = false;
});

btnInstall.addEventListener("click", async () => {
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  btnInstall.hidden = true;
});

if("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
