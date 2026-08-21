let lastExtractedText = "";
let analyzeTimeout = null;

function extractEmailBody() {
  const hostname = window.location.hostname;
  let bodyElement = null;

  if (hostname.includes("mail.google.com")) {
    bodyElement = document.querySelector(".a3s.aiL");
  } else if (hostname.includes("outlook.cloud.microsoft")) {
    bodyElement = document.querySelector('[aria-label="Message body"], .ItemBody');
  } else if (hostname.includes("mail.yahoo.com")) {
    bodyElement = document.querySelector('[data-test-id="message-view-body"]');
  } else if (hostname.includes("mail.icloud.com")) {
    bodyElement = document.querySelector('.cw-email-body, [role="main"]');
  } else if (hostname.includes("proton.me")) {
    bodyElement = document.querySelector('.message-content, [data-testid="message-content"]');
  }

  return bodyElement ? bodyElement.innerText.trim() : null;
}

async function autoAnalyze() {
  const emailText = extractEmailBody();

  if (!emailText || emailText === lastExtractedText) return;

  lastExtractedText = emailText;

  if (!chrome.runtime || !chrome.runtime.id) {
    console.warn("[Pisces AI] Extension context invalidated. Please refresh the webmail page.");
    return;
  }

  try {
    chrome.runtime.sendMessage(
      { action: "ANALYZE_EMAIL", emailText: emailText },
      (response) => {
        if (chrome.runtime.lastError) {
          return;
        }
      }
    );
  } catch (err) {
    console.warn("[Pisces AI] Message channel broken (extension reloaded/disabled):", err.message);
  }
}

function debounceAnalyze() {
  clearTimeout(analyzeTimeout);
  analyzeTimeout = setTimeout(() => {
    autoAnalyze();
  }, 300);
}

const observer = new MutationObserver(() => {
  debounceAnalyze();
});

observer.observe(document.body, { childList: true, subtree: true });

debounceAnalyze();