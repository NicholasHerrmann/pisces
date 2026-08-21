import json
import os
import re
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from groq import Groq
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()

# Allow the browser extension to send HTTP requests to localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
            suspicious_flags.append(f"URL uses a raw IP address: {url}")

        if sender_domain and sender_domain not in domain:
            suspicious_flags.append(
                f"Link domain ({domain}) mismatch with sender ({sender_domain})"
            )

        suspicious_tlds = [".xyz", ".top", ".zip", ".buzz", ".work", ".tk"]
        if any(domain.endswith(tld) for tld in suspicious_tlds):
            suspicious_flags.append(f"High-risk TLD: {domain}")

    return suspicious_flags


@app.post("/analyze")
def analyze_email_endpoint(payload: EmailRequest):
    try:
        urls = list(set(re.findall(r"https?://[^\s<>\"']+", payload.email_text)))
        link_issues = check_suspicious_links(urls, payload.sender_domain)

        prompt = f"""
You are a Cyber Security Analyst. Analyze this email for phishing or scam indicators.

EXTRACTED LINKS: {urls}
LINK WARNINGS: {link_issues}
EMAIL CONTENT:
{payload.email_text}

Respond ONLY with a valid JSON object strictly matching this schema:
{{
  "verdict": "SCAM" | "SUSPICIOUS" | "SAFE",
  "confidence_score": 85,
  "red_flags": ["Reason 1", "Reason 2", etc.],
}}
"""

        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="openai/gpt-oss-120b",
            response_format={"type": "json_object"},
            temperature=0.1,
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