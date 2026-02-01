/* -----------------------------
   Shared helpers
----------------------------- */
function wireStepsToggle(btnId, panelId) {
  const btn = document.getElementById(btnId);
  const panel = document.getElementById(panelId);
  btn.onclick = () => panel.hidden = !panel.hidden;
}

function setSteps(el, title, steps) {
  el.innerHTML = steps.map(s => "• " + s).join("\n");
}

function parseFeetInchesToTotalInches(str) {
  str = str.trim();
  if (str.includes("'")) {
    const [ft, rest] = str.split("'");
    return Number(ft) * 12 + parseFeetInchesToTotalInches(rest || "0");
  }
  if (str.includes("/")) {
    const [whole, frac] = str.split(" ");
    if (!frac) {
      const [n, d] = whole.split("/");
      return Number(n) / Number(d);
    }
    const [n, d] = frac.split("/");
    return Number(whole) + Number(n) / Number(d);
  }
  return Number(str);
}

function formatInches(inches) {
  const whole = Math.floor(inches);
  const frac = Math.round((inches - whole) * 16);
  if (frac === 0) return `${whole}"`;
  return `${whole} ${frac}/16"`;
}

/* -----------------------------
   Inches ↔ Decimal Feet
----------------------------- */
wireStepsToggle("btnStepsFeet", "stepsFeet");

btnToDecFt.onclick = () => {
  const inches = parseFeetInchesToTotalInches(inpFtIn.value);
  const ft = inches / 12;
  outToDecFt.textContent = `${ft.toFixed(6)} ft`;
  setSteps(outStepsFeet, "", [
    `Convert input to inches = ${inches}"`,
    `Decimal feet = inches ÷ 12 = ${ft.toFixed(6)}`
  ]);
};

btnToFtIn.onclick = () => {
  const ft = Number(inpDecFt.value);
  const inches = ft * 12;
  outToFtIn.textContent = formatInches(inches);
  setSteps(outStepsFeet, "", [
    `Convert feet to inches = ${ft} × 12`,
    `Round to nearest 1/16"`
  ]);
};

/* -----------------------------
   Pitch ↔ Angle
----------------------------- */
wireStepsToggle("btnStepsPitch", "stepsPitch");

btnPitchCalc.onclick = () => {
  const rise = Number(inpPitchRise.value);
  const run = Number(inpPitchRun.value || 12);
  const angle = Math.atan(rise / run) * 180 / Math.PI;
  const percent = (rise / run) * 100;

  outPitch.textContent =
    `Pitch: ${rise}/${run}\nAngle: ${angle.toFixed(1)}°\nSlope: ${percent.toFixed(1)}%`;

  setSteps(outStepsPitch, "", [
    `Ratio = rise ÷ run`,
    `Angle = atan(ratio) × 180/π`,
    `Slope % = ratio × 100`
  ]);
};

/* -----------------------------
   Rafter Length
----------------------------- */
wireStepsToggle("btnStepsRafter", "stepsRafter");

btnRafterCalc.onclick = () => {
  const run = parseFeetInchesToTotalInches(inpRun.value);
  const pitch = Number(inpPitch.value);
  const rise = run * (pitch / 12);
  const diag = Math.sqrt(run ** 2 + rise ** 2);
  const angle = Math.atan(rise / run) * 180 / Math.PI;

  outRafter.textContent =
    `Rise: ${formatInches(rise)}\nRafter: ${formatInches(diag)}\nAngle: ${angle.toFixed(1)}°`;

  setSteps(outStepsRafter, "", [
    `Rise = run × (pitch ÷ 12)`,
    `Diagonal = √(run² + rise²)`,
    `Angle = atan(rise/run)`
  ]);
};

/* -----------------------------
   Diagonal / Square
----------------------------- */
wireStepsToggle("btnStepsSquare", "stepsSquare");

btnSquareCalc.onclick = () => {
  const a = parseFeetInchesToTotalInches(inpSideA.value);
  const b = parseFeetInchesToTotalInches(inpSideB.value);
  const d = Math.sqrt(a ** 2 + b ** 2);

  outSquare.textContent = `Diagonal: ${formatInches(d)}`;

  setSteps(outStepsSquare, "", [
    `A² = ${a ** 2}`,
    `B² = ${b ** 2}`,
    `√(A² + B²) = ${d}`
  ]);
};
