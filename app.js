/* ---------------------------
   NAV + VIEW ROUTING
---------------------------- */
const views = {
  calc: document.getElementById("view-calc"),
  layout: document.getElementById("view-layout"),
  ref: document.getElementById("view-ref"),
  notes: document.getElementById("view-notes"),
};

function setActiveView(key){
  Object.keys(views).forEach(k => {
    views[k].classList.toggle("isActive", k === key);
  });

  document.querySelectorAll(".tab").forEach(btn => {
    btn.classList.toggle("isActive", btn.dataset.target === key);
  });

  // persist last tab
  localStorage.setItem("cc_last_tab", key);
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => setActiveView(btn.dataset.target));
});

// Restore last tab
setActiveView(localStorage.getItem("cc_last_tab") || "calc");

/* ---------------------------
   FRACTIONS / TAPE TOOLS
   - supports: "a/b" and "1 a/b"
   - decimal -> nearest 1/16
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

// parse strings like "3/16" or "1 1/2" into a rational {n,d}
function parseFraction(input){
  const s = normalizeSpaces(input);
  if(!s) throw new Error("Enter a fraction.");

  // allow leading +/-
  const sign = s.startsWith("-") ? -1 : 1;
  const t = s.replace(/^[+-]\s*/, "");

  // mixed number?
  if(t.includes(" ")){
    const [wholeStr, fracStr] = t.split(" ");
    const whole = parseInt(wholeStr, 10);
    if(!Number.isFinite(whole)) throw new Error("Invalid mixed number.");
    const f = parseFraction(fracStr); // already reduced
    const n = sign * (Math.abs(whole) * f.d + f.n) * (whole < 0 ? -1 : 1); // handle weirdness
    // simpler: whole is unsigned in mixed mode
    const nn = sign * (whole * f.d + f.n);
    return reduceFrac(nn, f.d);
  }

  // simple a/b
  if(t.includes("/")){
    const [aStr, bStr] = t.split("/");
    const a = parseInt(aStr, 10);
    const b = parseInt(bStr, 10);
    if(!Number.isFinite(a) || !Number.isFinite(b)) throw new Error("Invalid fraction.");
    return reduceFrac(sign * a, b);
  }

  // integer inches like "2"
  const whole = parseInt(t, 10);
  if(!Number.isFinite(whole)) throw new Error("Invalid number.");
  return reduceFrac(sign * whole, 1);
}

// fraction -> nice string "1 3/16" or "3/16" or "2"
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

function fracToDecimal(n, d){
  return n / d;
}

// decimal inches -> nearest 1/16 => fraction
function decimalToNearestSixteenth(x){
  if(!Number.isFinite(x)) throw new Error("Enter a valid decimal.");
  const denom = 16;
  const n = Math.round(x * denom);
  return reduceFrac(n, denom);
}

function formatDecimal(x){
  // keep sane precision, avoid floating garbage
  // show up to 6 decimals but trim trailing zeros
  const s = x.toFixed(6).replace(/\.?0+$/, "");
  return s;
}

// Buttons
document.getElementById("btnFracToDec").addEventListener("click", () => {
  try{
    const f = parseFraction(inpFraction.value);
    const dec = fracToDecimal(f.n, f.d);
    outFracToDec.textContent = `${fracToString(f.n,f.d)} in = ${formatDecimal(dec)} in`;
  }catch(e){
    outFracToDec.textContent = `Error: ${e.message}`;
  }
});

document.getElementById("btnDecToFrac").addEventListener("click", () => {
  try{
    const x = Number(String(inpDecimal.value).trim());
    const f = decimalToNearestSixteenth(x);
    outDecToFrac.textContent = `${formatDecimal(x)} in ≈ ${fracToString(f.n,f.d)} in (nearest 1/16)`;
  }catch(e){
    outDecToFrac.textContent = `Error: ${e.message}`;
  }
});

document.getElementById("btnAdd").addEventListener("click", () => {
  try{
    const a = parseFraction(inpF1.value);
    const b = parseFraction(inpF2.value);
    const n = a.n*b.d + b.n*a.d;
    const d = a.d*b.d;
    const r = reduceFrac(n,d);
    outFracOps.textContent = `${fracToString(a.n,a.d)} + ${fracToString(b.n,b.d)} = ${fracToString(r.n,r.d)} in`;
  }catch(e){
    outFracOps.textContent = `Error: ${e.message}`;
  }
});

document.getElementById("btnSub").addEventListener("click", () => {
  try{
    const a = parseFraction(inpF1.value);
    const b = parseFraction(inpF2.value);
    const n = a.n*b.d - b.n*a.d;
    const d = a.d*b.d;
    const r = reduceFrac(n,d);
    outFracOps.textContent = `${fracToString(a.n,a.d)} − ${fracToString(b.n,b.d)} = ${fracToString(r.n,r.d)} in`;
  }catch(e){
    outFracOps.textContent = `Error: ${e.message}`;
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
   NOTES (LOCAL ONLY)
---------------------------- */
const txtNotes = document.getElementById("txtNotes");
const notesStatus = document.getElementById("notesStatus");

function loadNotes(){
  txtNotes.value = localStorage.getItem("cc_notes") || "";
}
function setStatus(msg){
  notesStatus.textContent = msg;
  setTimeout(() => (notesStatus.textContent = ""), 1500);
}

document.getElementById("btnSaveNotes").addEventListener("click", () => {
  localStorage.setItem("cc_notes", txtNotes.value || "");
  setStatus("Saved.");
});
document.getElementById("btnClearNotes").addEventListener("click", () => {
  txtNotes.value = "";
  localStorage.removeItem("cc_notes");
  setStatus("Cleared.");
});

loadNotes();

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
