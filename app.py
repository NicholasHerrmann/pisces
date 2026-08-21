import json
import os
import re
from urllib.parse import urlparse
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


class EmailRequest(BaseModel):
    email_text: str
    sender_domain: str = ""


def check_suspicious_links(urls, sender_domain=""):
    suspicious_flags = []
    for url in urls:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()

        if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", domain):
            suspicious_flags.append(f"URL uses a raw IP address instead of a domain: {url}")

        if sender_domain and sender_domain not in domain:
            suspicious_flags.append(
                f"Link domain ({domain}) does not match declared sender domain ({sender_domain})"
            )

        suspicious_tlds = [".xyz", ".top", ".zip", ".buzz", ".work", ".tk", ".fit", ".rest"]
        if any(domain.endswith(tld) for tld in suspicious_tlds):
            suspicious_flags.append(f"High-risk top-level domain detected: {domain}")

    return suspicious_flags


SYSTEM_PROMPT = """You are a senior Cybersecurity Incident Handler specializing in email fraud, spear-phishing, credential harvesting, and social engineering detection.

Your role is to rigorously evaluate emails and determine their threat level with minimal false positives and zero missed threats.

### CLASSIFICATION CRITERIA:

1. **SCAM** (High Risk)
   - Malicious intent detected: Credential harvesting, fake login portals, advance-fee scams, gift card requests, spoofed internal executives, urgent wire/banking changes.
   - Fake urgency combined with external links or attachments.
   - Domain mismatches (e.g., email claims to be PayPal, but links go to a third-party domain).
   - High-risk TLDs or raw IP addresses used in links.

2. **SUSPICIOUS** (Medium Risk)
   - Unsolicited cold outreach with unusual demands or aggressive sales tactics.
   - Poor grammar/formatting from purportedly formal institutions.
   - Generic greetings ("Dear Valued Customer") combined with account-action requests.
   - Inconclusive sender identity or minor anomalies without explicit malicious payloads.

3. **SAFE** (Low Risk)
   - Legitimate transactional messages, internal company communications, known newsletters, or routine personal/work communications.
   - Contextually normal conversation with no manipulative pressure, deceptive links, or credential requests.

### ANALYSIS RULES:
- Perform a step-by-step risk assessment considering psychological triggers (fear, artificial urgency, authority impersonation, greed, curiosity).
- Examine link targets carefully against claim context.
- Keep `explanation` clear, direct, and non-technical so a non-expert user immediately understands the risk.
- Populate `red_flags` with specific concise indicators. If the verdict is SAFE, `red_flags` should be an empty list [].
"""


@app.post("/analyze")
def analyze_email_endpoint(payload: EmailRequest):
    try:
        urls = list(set(re.findall(r"https?://[^\s<>\"']+", payload.email_text)))
        link_issues = check_suspicious_links(urls, payload.sender_domain)

        user_prompt = f"""ANALYZE THE FOLLOWING EMAIL:

[SENDER DOMAIN]: {payload.sender_domain or "Not provided"}
[EXTRACTED LINKS]: {json.dumps(urls)}
[PRE-PARSED LINK WARNINGS]: {json.dumps(link_issues)}

[EMAIL BODY START]
{payload.email_text}
[EMAIL BODY END]

Return ONLY a valid JSON object matching this schema:
{{
  "verdict": "SCAM" | "SUSPICIOUS" | "SAFE",
  "confidence_score": 0-100 (integer representing probability of scam/suspicious risk),
  "red_flags": ["Specific flag 1", "Specific flag 2", "Specific flag 3"]
}}"""

        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            model="openai/gpt-oss-120b",
            response_format={"type": "json_object"},
            temperature=0.0,
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("The AI model returned an empty response.")

        return json.loads(content)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)