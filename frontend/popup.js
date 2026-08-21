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

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    statusMsg.innerText = "No active tab found.";
    btn.disabled = false;
    return;
  }

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: () => {
        const bodyElement = document.querySelector('.a3s.aiL');
        return bodyElement ? bodyElement.innerText : null;
      }
    },
    async (injectionResults) => {
      const emailText = injectionResults[0]?.result;

      if (!emailText) {
        statusMsg.innerText = "No open email detected!";
        btn.disabled = false;
        return;
      }

      statusMsg.innerText = "Analyzing with AI...";

      try {
        const response = await fetch("http://127.0.0.1:8000/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email_text: emailText })
        });

        const data = await response.json();
        statusMsg.innerText = "";

        // 1. Update Banner Block
        verdictBanner.className = ""; 
        let themeColor = "#5cb85c";

        if (data.verdict === "SCAM") {
          verdictBanner.innerText = "⚠️ SCAM DETECTED";
          verdictBanner.classList.add("scam");
          themeColor = "#d9534f";
        } else if (data.verdict === "SUSPICIOUS") {
          verdictBanner.innerText = "⚡ SUSPICIOUS EMAIL";
          verdictBanner.classList.add("suspicious");
          themeColor = "#f0ad4e";
        } else {
          verdictBanner.innerText = "✅ EMAIL SAFE";
          verdictBanner.classList.add("safe");
        }

        // 2. Draw Gauge Chart
        const score = data.confidence_score || 0;
        gaugeValue.innerText = score;
        drawGauge(score, themeColor);

        // 3. Populate Dropdown Content
        explanationDiv.innerText = data.explanation || "No explanation available.";

        if (data.red_flags && data.red_flags.length > 0) {
          redFlagsSection.style.display = "block";
          data.red_flags.forEach((flag) => {
            const li = document.createElement("li");
            li.innerText = flag;
            redFlagsList.appendChild(li);
          });
        } else {
          redFlagsSection.style.display = "none";
        }

        resultContainer.style.display = "block";

      } catch (err) {
        console.error(err);
        statusMsg.innerText = "Error contacting Python backend!";
      } finally {
        btn.disabled = false;
      }
    }
  );
});

// Canvas Arc Drawer Function
function drawGauge(score, color) {
  const canvas = document.getElementById("gaugeCanvas");
  const ctx = canvas.getContext("2d");
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 65;
  const lineWidth = 12;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background Track
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = "#e6e6e6";
  ctx.stroke();

  // Score Arc
  const startAngle = -0.5 * Math.PI; // Top center
  const endAngle = startAngle + (score / 100) * (2 * Math.PI);

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.stroke();
}