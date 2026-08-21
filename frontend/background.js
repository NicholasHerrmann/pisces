chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ANALYZE_EMAIL") {
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
        chrome.storage.local.set({ currentEmailAnalysis: data });
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        console.warn("[Pisces AI Background] Backend fetch skipped or offline:", err.message);
        sendResponse({ success: false, error: err.message });
      });

    return true; // Keeps the message channel open for async fetch
  }
});