from typing import List
import json, re
import google.generativeai as genai
from .config import settings

PROMPT_TEMPLATE = """
You are an expert educator. Create high-quality FLASHCARDS from the provided study text.

Requirements:
- Return ONLY JSON with this schema: {{\"cards\": [{{\"question\": str, \"answer\": str, \"tags\": [str], \"difficulty\": \"easy|medium|hard\"}}]}}.
- Prioritize core concepts, definitions, theorems, formulas, cause→effect, and common pitfalls.
- Use clear, concise, exam-ready wording. Avoid trivia.
- Prefer active-recall questions. If 'style' is 'cloze', include {{'{{'}}...{{'}}'}} gaps. If 'mcq', produce a direct Q and the best concise A; DO NOT include choices.
- Balance difficulties (roughly 40% easy, 40% medium, 20% hard) unless instructed otherwise.
- Deduplicate and avoid near-duplicates.

User preferences:
- Desired number of cards: {num_cards}
- Style: {style}
- Answer format: {answer_format}

Now generate a coherent set of {num_cards} cards strictly grounded in the text.
BEGIN SOURCE CHUNKS:

{joined_chunks}

END SOURCE CHUNKS.
"""

def _ensure_client():
    if not settings.google_api_key:
        raise RuntimeError("GOOGLE_API_KEY not set")
    genai.configure(api_key=settings.google_api_key)
    return genai.GenerativeModel(settings.model_name)

def make_cards(chunks: List[str], num_cards: int, style: str, answer_format: str) -> List[dict]:
    model = _ensure_client()
    prompt = PROMPT_TEMPLATE.format(
        num_cards=num_cards,
        style=style,
        answer_format=answer_format,
        joined_chunks="\n\n".join(chunks),
    )
    resp = model.generate_content(
        prompt,
        generation_config={
            "temperature": 0.4,
            "top_p": 0.9,
            "max_output_tokens": 4096,
            "response_mime_type": "application/json",
        },
    )
    data = resp.text or ""
    try:
        parsed = json.loads(data)
        return parsed.get("cards", [])
    except Exception:
        match = re.search(r"\{[\s\S]*\}$", data)
        if match:
            parsed = json.loads(match.group(0))
            return parsed.get("cards", [])
        raise
