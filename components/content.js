let lastExtractedText = "";
let analyzeTimeout = null;

function extractSenderDomain() {
  const hostname = window.location.hostname;
  let rawSender = "";

  if (hostname.includes("mail.google.com")) {
    // Gmail
    const senderEl = document.querySelector("span[email]") || document.querySelector(".gD");
    if (senderEl) {
      rawSender = senderEl.getAttribute("email") || senderEl.innerText || "";
    }
  } else if (hostname.includes("outlook.cloud.microsoft") || hostname.includes("outlook.live.com")) {
    // Outlook Web
    const senderEl = document.querySelector("[data-hovercard-id], [aria-label*='@']");
    if (senderEl) {
      rawSender = senderEl.getAttribute("data-hovercard-id") || senderEl.getAttribute("aria-label") || "";
    }
  } else if (hostname.includes("mail.yahoo.com")) {
    // Yahoo Mail
    const senderEl = document.querySelector('[data-test-id="message-view-sender-email"], [data-test-id="sender-email"]');
    if (senderEl) {
      rawSender = senderEl.innerText || senderEl.getAttribute("title") || "";
    }
  } else if (hostname.includes("mail.icloud.com")) {
    // iCloud Mail
    const senderEl = document.querySelector('.cw-email-header-from, [data-test-id="from-address"]');
    if (senderEl) {
      rawSender = senderEl.innerText || "";
    }
  } else if (hostname.includes("proton.me")) {
    // Proton Mail
    const senderEl = document.querySelector('.message-address[data-testid="message-header:from"]');
    if (senderEl) {
      rawSender = senderEl.getAttribute("title") || senderEl.innerText || "";
    }
  }

  const emailMatch = rawSender.match(/[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const extractedDomain = emailMatch ? emailMatch[1].toLowerCase() : "";

  // List of infrastructure/service domains that shouldn't leak as sender domains
  const blockedDomains = [
    "vercel.app",
    "vercel.com",
    "github.com",
    "github.io"
  ];

  if (blockedDomains.some((blocked) => extractedDomain.includes(blocked))) {
    return "";
  }

  return extractedDomain;
}

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
  const senderDomain = extractSenderDomain();

  if (!chrome.runtime || !chrome.runtime.id) {
    console.warn("[Pisces AI] Extension context invalidated. Please refresh the webmail page.");
    return;
  }

  try {
    chrome.runtime.sendMessage(
      { 
        action: "ANALYZE_EMAIL", 
        emailText: emailText,
        senderDomain: senderDomain 
      },
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