function getEmailText() {
  const emailElement = document.querySelector(".email"); // adjust selector
  return emailElement ? emailElement.innerText : "";
}

async function checkPhishing(emailText) {
  const response = await fetch("http://127.0.0.1:5000/check", { // Python backend
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailText })
  });
  const result = await response.json();
  if (result.phishing) {
    alert("⚠️ This email looks suspicious!");
  } else {
    alert("✅ This email seems safe.");
  }
}

const emailText = getEmailText();
if (emailText) checkPhishing(emailText);
