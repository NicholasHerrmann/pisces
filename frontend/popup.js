document.addEventListener("DOMContentLoaded", async () => {
  const statusMsg = document.getElementById("status-msg");
  const resultContainer = document.getElementById("result-container");
  const verdictBanner = document.getElementById("verdict-banner");
  const gaugeValue = document.getElementById("gaugeValue");
  const redFlagsList = document.getElementById("red-flags-list");
  const redFlagsSection = document.getElementById("red-flags-section");
  const dropdownSummary = document.getElementById("dropdown-summary");

  statusMsg.innerText = "Fetching latest analysis...";

  // Retrieve cached analysis from chrome storage
  chrome.storage.local.get(["currentEmailAnalysis"], (result) => {
    const data = result.currentEmailAnalysis;

    if (!data) {
      statusMsg.innerText = "No open email analyzed yet.";
      return;
    }

    statusMsg.innerText = "";
    verdictBanner.className = "";
    let themeColor = "#5cb85c";

    const verdict = (data.verdict || "").toUpperCase();

    if (verdict === "SCAM") {
      verdictBanner.innerText = "SCAM";
      verdictBanner.classList.add("scam");
      themeColor = "#d9534f";
    } else if (verdict === "SUSPICIOUS") {
      verdictBanner.innerText = "⚡ SUSPICIOUS";
      verdictBanner.classList.add("suspicious");
      themeColor = "#f0ad4e";
    } else {
      verdictBanner.innerText = "SAFE";
      verdictBanner.classList.add("safe");
    }

    if (verdict === "SAFE") {
      if (dropdownSummary) dropdownSummary.innerText = "All Clear";
      redFlagsSection.style.display = "none";
      redFlagsList.innerHTML = "";
    } else {
      if (dropdownSummary) dropdownSummary.innerText = "Analysis Breakdown";

      if (data.red_flags && data.red_flags.length > 0) {
        redFlagsSection.style.display = "block";
        redFlagsList.innerHTML = "";
        data.red_flags.forEach((flag) => {
          const li = document.createElement("li");
          li.innerText = flag;
          redFlagsList.appendChild(li);
        });
      } else {
        redFlagsSection.style.display = "none";
      }
    }

    resultContainer.style.display = "flex";

    const score = data.confidence_score ?? 0;
    gaugeValue.innerText = score;
    drawGauge(score, themeColor);
  });
});

/**
 * @param {number} score
 * @param {string} color
 */
function drawGauge(score, color) {
  const canvas = document.getElementById("gaugeCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 62;
  const lineWidth = 12;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = "#f3f4f6";
  ctx.stroke();

  if (score > 0) {
    const clampedScore = Math.min(Math.max(score, 0), 100);
    const startAngle = -0.5 * Math.PI;
    const endAngle = startAngle + (clampedScore / 100) * (2 * Math.PI);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

document.querySelector(".details-dropdown")?.addEventListener("toggle", () => {
  document.body.style.height = "auto";
});