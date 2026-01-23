/* ---------------------------
   NAV + VIEW ROUTING
---------------------------- */
const views = {
  calc: document.getElementById("view-calc"),
  layout: document.getElementById("view-layout"),
  ref: document.getElementById("view-ref"),
  steps: document.getElementById("view-steps"),
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
   STEPS PANEL (last operation)
---------------------------- */
const outSteps = document.getElementById("outSteps");

function setSteps(title, lines){
  const safeLines = Array.isArray(lines) ? lines : [];
  outSteps.textContent = `${title}\n\n- ${safeLines.join("\n- ")}`;
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

// returns {n, d} as reduced fraction, d>0
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
  const s = x.toFixed(6).replace(/\.?0+$/, "");
  return s;
}

// decimal -> nearest 1/16 fraction (keeps sign)
function decimalToNearestSixteenth(x){
  if(!Number.isFinite(x)) throw new Error("Enter a valid decimal.");
  const denom = 16;
  const n = Math.round(x * denom);
  return reduceFrac(n, denom);
}

function nearestSixteenthFromFraction(n, d){
  const dec = fracToDecimal(n,d);
  const denom = 16;
  const raw = dec * denom;
  const rounded = Math.round(raw);
  const frac16 = reduceFrac(rounded, denom);
  const approxDec = frac16.n / frac16.d;
  return { dec, raw, rounded, frac16, approxDec };
}

/* --- Fraction -> Decimal + Nearest 1/16 breakdown --- */
document.getElementById("btnFracToDec").addEventListener("click", () => {
  try{
    const f = parseFraction(inpFraction.value);
    const pack = nearestSixteenthFromFraction(f.n, f.d);

    const exactLine = `${fracToString(f.n,f.d)} in = ${formatDecimal(pack.dec)} in (exact)`;
    const approxLine = `Nearest 1/16: ${formatDecimal(pack.dec)} × 16 = ${formatDecimal(pack.raw)} → round = ${pack.rounded}/16 = ${fracToString(pack.frac16.n, pack.frac16.d)} in`;
    const err = Math.abs(pack.dec - pack.approxDec);
    const errLine = `Error: ${formatDecimal(err)} in`;

    outFracToDec.textContent = `${exactLine}\n${approxLine}\n${errLine}`;

    setSteps("Fraction → Nearest 1/16", [
      `Parse input as fraction: ${fracToString(f.n,f.d)}`,
      `Convert to decimal: n/d = ${formatDecimal(pack.dec)}`,
      `Multiply by 16: ${formatDecimal(pack.dec)} × 16 = ${formatDecimal(pack.raw)}`,
      `Round to nearest whole 16th: ${pack.rounded}`,
      `Write as fraction: ${pack.rounded}/16 → reduce = ${fracToString(pack.frac16.n, pack.frac16.d)}`,
      `Report error: |exact − approx| = ${formatDecimal(err)} in`,
    ]);
  }catch(e){
    outFracToDec.textContent = `Error: ${e.message}`;
    setSteps("Error", [`${e.message}`]);
  }
});

/* --- Decimal -> Nearest 1/16 breakdown --- */
document.getElementById("btnDecToFrac").addEventListener("click", () => {
  try{
    const x = Number(String(inpDecimal.value).trim());
    if(!Number.isFinite(x)) throw new Error("Enter a valid decimal.");

    const denom = 16;
    const raw = x * denom;
    const rounded = Math.round(raw);
    const f = reduceFrac(rounded, denom);
    const approxDec = f.n / f.d;
    const err = Math.abs(x - approxDec);

    outDecToFrac.textContent =
      `${formatDecimal(x)} in (input)\n` +
      `${formatDecimal(x)} × 16 = ${formatDecimal(raw)} → round = ${rounded}/16\n` +
      `Nearest 1/16 = ${fracToString(f.n,f.d)} in\n` +
      `Error: ${formatDecimal(err)} in`;

    setSteps("Decimal → Nearest 1/16", [
      `Input decimal: ${formatDecimal(x)}`,
      `Multiply by 16: ${formatDecimal(x)} × 16 = ${formatDecimal(raw)}`,
      `Round: ${formatDecimal(raw)} → ${rounded}`,
      `Write as fraction: ${rounded}/16 → reduce = ${fracToString(f.n,f.d)}`,
      `Report error: |input − approx| = ${formatDecimal(err)} in`,
    ]);
  }catch(e){
    outDecToFrac.textContent = `Error: ${e.message}`;
    setSteps("Error", [`${e.message}`]);
  }
});

/* --- Fraction add/sub -> exact + nearest 1/16 --- */
function opsOutput(opName, a, b, rExact){
  const pack = nearestSixteenthFromFraction(rExact.n, rExact.d);
  const err = Math.abs(pack.dec - pack.approxDec);

  const exactLine = `Exact: ${fracToString(a.n,a.d)} ${opName} ${fracToString(b.n,b.d)} = ${fracToString(rExact.n,rExact.d)} in = ${formatDecimal(pack.dec)} in`;
  const approxLine = `Nearest 1/16: ${fracToString(pack.frac16.n, pack.frac16.d)} in`;
  const errLine = `Error: ${formatDecimal(err)} in`;

  return { exactLine, approxLine, errLine, pack };
}

document.getElementById("btnAdd").addEventListener("click", () => {
  try{
    const a = parseFraction(inpF1.value);
    const b = parseFraction(inpF2.value);
    const n = a.n*b.d + b.n*a.d;
    const d = a.d*b.d;
    const r = reduceFrac(n,d);

    const out = opsOutput("+", a, b, r);
    outFracOps.textContent = `${out.exactLine}\n${out.approxLine}\n${out.errLine}`;

    setSteps("A + B (then nearest 1/16)", [
      `Parse A: ${fracToString(a.n,a.d)}`,
      `Parse B: ${fracToString(b.n,b.d)}`,
      `Common denom: a.n*b.d + b.n*a.d = ${a.n}*${b.d} + ${b.n}*${a.d}`,
      `Exact result: ${fracToString(r.n,r.d)} in`,
      `Convert exact to decimal: ${formatDecimal(out.pack.dec)}`,
      `Nearest 1/16: ${fracToString(out.pack.frac16.n, out.pack.frac16.d)}`,
    ]);
  }catch(e){
    outFracOps.textContent = `Error: ${e.message}`;
    setSteps("Error", [`${e.message}`]);
  }
});

document.getElementById("btnSub").addEventListener("click", () => {
  try{
    const a = parseFraction(inpF1.value);
    const b = parseFraction(inpF2.value);
    const n = a.n*b.d - b.n*a.d;
    const d = a.d*b.d;
    const r = reduceFrac(n,d);

    const out = opsOutput("−", a, b, r);
    outFracOps.textContent = `${out.exactLine}\n${out.approxLine}\n${out.errLine}`;

    setSteps("A − B (then nearest 1/16)", [
      `Parse A: ${fracToString(a.n,a.d)}`,
      `Parse B: ${fracToString(b.n,b.d)}`,
      `Common denom: a.n*b.d − b.n*a.d = ${a.n}*${b.d} − ${b.n}*${a.d}`,
      `Exact result: ${fracToString(r.n,r.d)} in`,
      `Convert exact to decimal: ${formatDecimal(out.pack.dec)}`,
      `Nearest 1/16: ${fracToString(out.pack.frac16.n, out.pack.frac16.d)}`,
    ]);
  }catch(e){
    outFracOps.textContent = `Error: ${e.message}`;
    setSteps("Error", [`${e.message}`]);
  }
});

// Clear buttons
document.getElementById("btnClearA").addEventListener("click", () => {
  inpFraction.value = "";
  outFracToDec.textContent = "—";
  inpFraction.focus();
});
document.getElementById("btnClearB").addEventListener("click", () => {
  inpDecimal.value = "";
  outDecToFrac.textContent = "—";
  inpDecimal.focus();
});
document.getElementById("btnClearC").addEventListener("click", () => {
  inpF1.value = "";
  inpF2.value = "";
  outFracOps.textContent = "—";
  inpF1.focus();
});

/* ---------------------------
   LAYOUT TOOL
---------------------------- */
const inpLenFt = document.getElementById("inpLenFt");
const inpLenIn = document.getElementById("inpLenIn");
const selOC = document.getElementById("selOC");
const selFormat = document.getElementById("selFormat");
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

document.getElementById("btnLayout").addEventListener("click", () => {
  try{
    const ft = toIntOrZero(inpLenFt.value);
    const inch = toIntOrZero(inpLenIn.value);
    const totalIn = ft * 12 + inch;
    if(totalIn <= 0) throw new Error("Enter a wall length > 0.");

    const oc = parseInt(selOC.value, 10);
    const marks = [];
    for(let m = 0; m <= totalIn; m += oc){
      marks.push(m);
    }

    const fmt = selFormat.value;
    const formatted = marks.map(m => (fmt === "in" ? `${m}"` : inchesToFtIn(m)));

    outLayout.textContent =
      `Length: ${ft}' ${inch}" (${totalIn}" total)\n` +
      `Spacing: ${oc}" OC\n` +
      `Marks (${marks.length}):\n` +
      formatted.join(", ");

    setSteps("Stud/Joist Layout", [
      `Convert length to inches: ${ft}×12 + ${inch} = ${totalIn}"`,
      `Choose spacing: ${oc}"`,
      `Generate marks: 0, ${oc}, ${oc*2}, ... up to ≤ ${totalIn}"`,
      `Count marks: ${marks.length}`,
    ]);
  }catch(e){
    outLayout.textContent = `Error: ${e.message}`;
    setSteps("Error", [`${e.message}`]);
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
  // 1/16 through 16/16
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

// Service Worker register
if("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
