document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const btn = document.getElementById("analyzeBtn");
  const statusMsg = document.getElementById("status-msg");
  const resultContainer = document.getElementById("result-container");
  const verdictBanner = document.getElementById("verdict-banner");
  const gaugeValue = document.getElementById("gaugeValue");
  const explanationDiv = document.getElementById("explanation");
  const redFlagsList = document.getElementById("red-flags-list");
  const redFlagsSection = document.getElementById("red-flags-section");

  btn.disabled = true;
  statusMsg.innerText = "Extracting email...";
  resultContainer.style.display = "none";
  redFlagsList.innerHTML = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      statusMsg.innerText = "No active tab found.";
      btn.disabled = false;
      return;
    }

    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const bodyElement = document.querySelector('.a3s.aiL');
        return bodyElement ? bodyElement.innerText : null;
      }
    });

    const emailText = injectionResults[0]?.result;

    if (!emailText) {
      statusMsg.innerText = "No open email detected!";
      btn.disabled = false;
      return;
    }

    statusMsg.innerText = "Analyzing with AI...";

    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_text: emailText })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    statusMsg.innerText = "";

    verdictBanner.className = ""; 
    let themeColor = "#5cb85c";

    const verdict = (data.verdict || "").toUpperCase();

    if (verdict === "SCAM") {
      verdictBanner.innerText = "⚠️ SCAM DETECTED";
      verdictBanner.classList.add("scam");
      themeColor = "#d9534f";
    } else if (verdict === "SUSPICIOUS") {
      verdictBanner.innerText = "⚡ SUSPICIOUS EMAIL";
      verdictBanner.classList.add("suspicious");
      themeColor = "#f0ad4e";
    } else {
      verdictBanner.innerText = "✅ EMAIL SAFE";
      verdictBanner.classList.add("safe");
    }

    // --- UPDATED DROPDOWN & EXPLANATION LOGIC START ---
    explanationDiv.innerText = data.explanation || "No explanation available.";

    // Query element by ID right when it's needed
    const dropdownSummary = document.getElementById("dropdown-summary");

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
    // --- UPDATED LOGIC END ---

    resultContainer.style.display = "flex";

    const score = data.confidence_score ?? 0;
    gaugeValue.innerText = score;
    drawGauge(score, themeColor);

  } catch (err) {
    console.error(err);
    statusMsg.innerText = "Error contacting Python backend!";
  } finally {
    btn.disabled = false;
  }
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
    const startAngle = -0.5 * Math.PI; // Top center (-90deg)
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