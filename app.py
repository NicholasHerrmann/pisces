# pip install beautifulsoup4 groq

import json
import os
import re
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

# Initialize the Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


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


def analyze_email(email_text):
    urls = list(set(re.findall(r"https?://[^\s<>\"']+", email_text)))
    link_issues = check_suspicious_links(urls)

    prompt = f"""
You are a Cyber Security Analyst. Analyze this email for phishing or scam indicators.

EXTRACTED LINKS: {urls}
LINK WARNINGS: {link_issues}
EMAIL CONTENT:
{email_text}

Respond ONLY with a valid JSON object strictly matching this schema:
{{
  "verdict": "SCAM" | "SUSPICIOUS" | "SAFE",
  "confidence_score": 85,
  "red_flags": ["Reason 1", "Reason 2"],
  "explanation": "Brief 2-sentence summary of why this is or isn't a scam."
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


if __name__ == "__main__":
    email_sample = """
    Dear Customer,
    Your account has been suspended! Please log in at http://192.168.1.1/login.xyz 
    to verify your credentials immediately or your account will be deleted.
    """

    print("Analyzing email...")
    try:
        analysis_result = analyze_email(email_sample)
        print(json.dumps(analysis_result, indent=2))
    except Exception as e:
        print(f"Error: {e}")