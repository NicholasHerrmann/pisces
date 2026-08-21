document.addEventListener("DOMContentLoaded", async () => {
  const statusMsg = document.getElementById("status-msg");
  const resultContainer = document.getElementById("result-container");
  const verdictBanner = document.getElementById("verdict-banner");
  const gaugeValue = document.getElementById("gaugeValue");
  const redFlagsList = document.getElementById("red-flags-list");
  const redFlagsSection = document.getElementById("red-flags-section");
  const dropdownSummary = document.getElementById("dropdown-summary");

  statusMsg.innerText = "Fetching latest analysis...";

  chrome.storage.local.get(["currentEmailAnalysis"], (result) => {
    const data = result.currentEmailAnalysis;

    if (!data) {
      statusMsg.innerText = "No open email analyzed yet.";
      return;
    }

    statusMsg.innerText = "";
    verdictBanner.className = "";
    let themeColor = "#10b981";

    const verdict = (data.verdict || "").toUpperCase();

    if (verdict === "SCAM") {
      verdictBanner.innerText = "SCAM";
      verdictBanner.classList.add("scam");
      themeColor = "#ef4444";
    } else if (verdict === "SUSPICIOUS") {
      verdictBanner.innerText = "SUSPICIOUS";
      verdictBanner.classList.add("suspicious");
      themeColor = "#f59e0b";
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

    const targetScore = Math.min(Math.max(data.confidence_score ?? 0, 0), 100);
    
    animateGauge(targetScore, themeColor, gaugeValue);
  });
});

/**
 * @param {number} targetScore
 * @param {string} color
 * @param {HTMLElement} labelElement
 */
function animateGauge(targetScore, color, labelElement) {
  const duration = 1200;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);

    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const currentScore = Math.round(easedProgress * targetScore);

    if (labelElement) {
      labelElement.innerText = currentScore;
    }

    drawGauge(easedProgress * targetScore, color);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * @param {number} score
 * @param {string} color
 */
function drawGauge(score, color) {
  const canvas = document.getElementById("gaugeCanvas");
  if (!canvas) return;

  canvas.width = 225;
  canvas.height = 225;

  const ctx = canvas.getContext("2d");
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 92;
  const lineWidth = 14;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = "#334155";
  ctx.stroke();

  if (score > 0) {
    const startAngle = -0.5 * Math.PI;
    const endAngle = startAngle + (score / 100) * (2 * Math.PI);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const details = document.querySelector(".details-dropdown");
  if (!details) return;

  const summary = details.querySelector("summary");

  summary.addEventListener("click", (e) => {
    e.preventDefault();

    if (details.hasAttribute("open")) {
      details.classList.remove("is-open");
      setTimeout(() => {
        details.removeAttribute("open");
      }, 250);
    } else {
      details.setAttribute("open", "");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          details.classList.add("is-open");
        });
      });
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  initWaterShader();
});

function initWaterShader() {
  const canvas = document.getElementById("waterCanvas");
  if (!canvas) return;

  const gl = canvas.getContext("webgl");
  if (!gl) return;

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  const vsSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      
      // Fluid wave distortions
      float time = u_time * 0.5; // Slightly slower, gentler motion
      vec2 p = uv * 6.0 - vec2(3.0);
      
      for(int i = 1; i < 4; i++) {
        float fi = float(i);
        p.x += 0.3 / fi * sin(fi * 3.0 * p.y + time) + 0.5;
        p.y += 0.3 / fi * cos(fi * 3.0 * p.x + time) + 0.5;
      }
      
      float wave = sin(p.x + p.y);
      
      // Very dark, muted color tones
      vec3 darkBase = vec3(0.02, 0.04, 0.08);
      vec3 subtleWave = vec3(0.08, 0.18, 0.35);
      
      vec3 color = mix(darkBase, subtleWave, wave * 0.2 + 0.2);
      
      // Dropped opacity to 0.25 (25% visible)
      gl_FragColor = vec4(color, 0.25);
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  const program = gl.createProgram();
  gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
  gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(program);
  gl.useProgram(program);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1, -1,  1,
    -1,  1,  1, -1,  1,  1,
  ]), gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const resLoc = gl.getUniformLocation(program, "u_resolution");
  const timeLoc = gl.getUniformLocation(program, "u_time");

  gl.uniform2f(resLoc, canvas.width, canvas.height);

  function render(time) {
    if (canvas.height !== canvas.clientHeight || canvas.width !== canvas.clientWidth) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
    }

    gl.uniform1f(timeLoc, time * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}