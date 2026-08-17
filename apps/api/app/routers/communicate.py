"""
AI Communication Mentor Router — Smart Email Generator.

POST /api/communicate/generate
  - Accepts recipient, purpose, context, tone, experience level
  - Uses the LLM to generate a professional email + subject + why-it-works explanation
"""

import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq")


class EmailRequest(BaseModel):
    recipient: str
    recipient_label: str
    purpose: str
    purpose_label: str
    context: str
    tone: str = "professional"
    experience_level: str = "B.Tech Student"
    desired_outcome: str = "Reply to me"


def _build_email_prompt(req: EmailRequest) -> str:
    return f"""
You are an expert professional communication coach for students and researchers in India.

A student needs help writing a professional email. Here is the context:

RECIPIENT TYPE: {req.recipient_label}
PURPOSE: {req.purpose_label}
DESIRED OUTCOME: {req.desired_outcome}
WRITING TONE: {req.tone}
STUDENT EXPERIENCE LEVEL: {req.experience_level}

STUDENT'S CONTEXT (what they told us in their own words):
\"\"\"{req.context}\"\"\"

Based on this, generate a complete professional email. Structure your response EXACTLY as follows:

SUBJECT: [Write the email subject line here]

EMAIL:
[Write the complete email body here. Use proper salutation, body paragraphs, and closing signature with "Best regards," and "[Your Name]" placeholder. Adapt the formality, warmth, and technical depth to match the recipient type and tone requested. Do NOT use markdown formatting inside the email body.]

REASON:
[Write 3-4 sentences explaining why you structured this email the way you did — what choices you made regarding opening, structure, tone, and closing, and why they work for this specific recipient and purpose.]

IMPORTANT RULES:
- NEVER fabricate specific achievements, publications, dates, or personal details not mentioned in the context.
- If a name is not provided, use [Professor's Name] or [Recipient Name] as placeholders.
- The email must feel natural, not robotic.
- Adapt vocabulary: formal+academic for professor/researcher, professional+clear for HR/manager, warm+collaborative for teammate/friend.
"""


def _call_groq_email(prompt: str) -> str:
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=800,
        temperature=0.7,
    )
    return completion.choices[0].message.content


def _call_gemini_email(prompt: str) -> str:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    return response.text


def _parse_response(raw: str) -> dict:
    """Parse the structured LLM output into subject, email, and reason."""
    subject = ""
    email_body = ""
    reason = ""

    lines = raw.strip().split("\n")
    section = None

    for line in lines:
        stripped = line.strip()
        if stripped.upper().startswith("SUBJECT:"):
            subject = stripped[8:].strip()
            section = None
        elif stripped.upper() == "EMAIL:":
            section = "email"
        elif stripped.upper() == "REASON:":
            section = "reason"
        else:
            if section == "email":
                email_body += line + "\n"
            elif section == "reason":
                reason += stripped + " "

    return {
        "subject": subject or "Email — ResearchMind AI",
        "email": email_body.strip(),
        "reason": reason.strip() or "This email was crafted to be professional and appropriate for the recipient."
    }


@router.post("/generate")
async def generate_email(req: EmailRequest):
    try:
        prompt = _build_email_prompt(req)

        if LLM_PROVIDER == "groq" and GROQ_API_KEY:
            try:
                raw = _call_groq_email(prompt)
            except Exception as e:
                logger.error("Groq API failed: %s. Attempting fallback to Gemini...", e)
                if GEMINI_API_KEY:
                    raw = _call_gemini_email(prompt)
                else:
                    raise e
        elif LLM_PROVIDER == "gemini" and GEMINI_API_KEY:
            raw = _call_gemini_email(prompt)
        else:
            # Mock fallback for development
            raw = f"""SUBJECT: {req.purpose_label} — {req.recipient_label}

EMAIL:
Dear [Recipient Name],

I hope this message finds you well. I am writing to {req.purpose_label.lower()}.

{req.context}

I would greatly appreciate your guidance and support regarding this matter. Please let me know if you need any additional information.

Looking forward to your response.

Best regards,
[Your Name]

REASON:
This email was structured with a clear purpose statement in the opening to respect the recipient's time. The context is presented concisely, followed by a clear and respectful request. The closing is professional and invites a response without being demanding."""
        
        parsed = _parse_response(raw)
        return parsed

    except Exception as e:
        logger.error(f"Error generating email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate email: {str(e)}")
