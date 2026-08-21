function updateIconForTab(tabId, verdict) {
  if (!tabId || tabId === chrome.tabs.TAB_ID_NONE) return;

  const upperVerdict = (verdict || "").toUpperCase();

  let iconFileName = "components/images/icon-default.png";

  if (upperVerdict === "SCAM") {
    iconFileName = "components/images/icon-scam.png";
  } else if (upperVerdict === "SUSPICIOUS") {
    iconFileName = "components/images/icon-suspicious.png";
  } else if (upperVerdict === "SAFE") {
    iconFileName = "components/images/icon-safe.png";
  }

  chrome.action.setIcon({
    tabId: tabId,
    path: {
      "128": chrome.runtime.getURL(iconFileName)
    }
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("[Pisces AI] Icon Error:", chrome.runtime.lastError.message);
    } else {
      console.log(`[Pisces AI] Icon updated successfully to ${iconFileName} for tab ${tabId}`);
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ANALYZE_EMAIL" && sender.tab) {
    const tabId = sender.tab.id;

    fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_text: request.emailText })
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const verdict = data.verdict;

        chrome.storage.local.set({ currentEmailAnalysis: data }, () => {
          updateIconForTab(tabId, verdict);
        });

        sendResponse({ success: true, data });
      })
      .catch((err) => {
        console.warn("[Pisces AI Background] Backend fetch skipped or offline:", err.message);
        updateIconForTab(tabId, "DEFAULT");
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }
});