let lastExtractedText = "";
let analyzeTimeout = null;

function extractSenderDomain() {
  const hostname = window.location.hostname;
  let rawSender = "";

  if (hostname.includes("mail.google.com")) {
    // Gmail: Target active message card header (.h7 / .gE)
    const activeHeader = document.querySelector(".h7.aYd .gE") || 
                         document.querySelector(".h7 .gE") || 
                         document.querySelector(".gE") || 
                         document;
                         
    const senderEl = activeHeader.querySelector("span[email]") || 
                      activeHeader.querySelector(".gD[email]") || 
                      activeHeader.querySelector(".gD");

    if (senderEl) {
      rawSender = senderEl.getAttribute("email") || senderEl.innerText || "";
    }
  } else if (hostname.includes("outlook.cloud.microsoft") || hostname.includes("outlook.live.com")) {
    const activeMessage = document.querySelector('[role="main"]') || document;
    const senderEl = activeMessage.querySelector("[aria-label*='@'] [data-hovercard-id], [aria-label*='@']");
    if (senderEl) {
      rawSender = senderEl.getAttribute("data-hovercard-id") || senderEl.getAttribute("aria-label") || "";
    }
  } else if (hostname.includes("mail.yahoo.com")) {
    const senderEl = document.querySelector('[data-test-id="message-view-sender-email"]');
    if (senderEl) {
      rawSender = senderEl.innerText || senderEl.getAttribute("title") || "";
    }
  } else if (hostname.includes("mail.icloud.com")) {
    const senderEl = document.querySelector('.cw-email-header-from');
    if (senderEl) {
      rawSender = senderEl.innerText || "";
    }
  } else if (hostname.includes("proton.me")) {
    const senderEl = document.querySelector('.message-address[data-testid="message-header:from"]');
    if (senderEl) {
      rawSender = senderEl.getAttribute("title") || senderEl.innerText || "";
    }
  }

  const emailMatch = rawSender.match(/[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  let extractedDomain = emailMatch ? emailMatch[1].toLowerCase().trim() : "";

  // Infrastructure & platform blocklist
  const blockedDomains = [
    "github.com",
    "github.io",
    "githubusercontent.com",
    "vercel.app",
    "vercel.com"
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