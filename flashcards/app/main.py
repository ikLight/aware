from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from typing import List
from .schemas import GenerateResponse, Flashcard
from .config import settings
from .extractors import extract_any
from .utils import chunk_text, clean_text
from .llm import make_cards

app = FastAPI(title="Flashcards Maker API (Gemini)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    ok = bool(settings.google_api_key)
    return {"ok": ok, "model": settings.model_name}

# ---------- Minimal Web UI ----------
@app.get("/", response_class=HTMLResponse)
def home():
    return """
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Flashcards Maker</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; max-width: 880px; }
    .card { border: 1px solid #ccc; border-radius: 12px; padding: 16px; margin: 12px 0; }
    .q { font-weight: 600; margin-bottom: 6px; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    input[type="number"], select { padding: 6px 8px; border-radius: 8px; border: 1px solid #bbb; }
    button { padding: 10px 16px; border: 0; border-radius: 10px; font-weight: 600; cursor: pointer; }
    button.primary { background: #0ea5e9; color: white; }
    .muted { opacity: .8; font-size: .9rem; }
    .error { color: #b00020; font-weight: 600; margin: 8px 0; }
    .ok { color: #0a7d32; font-weight: 600; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
    @media (min-width: 720px){ .grid { grid-template-columns: 1fr 1fr; } }
    .tag { display:inline-block; padding:2px 8px; border-radius: 999px; border:1px solid #bbb; font-size: .8rem; margin-right: 6px; }
  </style>
</head>
<body>
  <h1>Flashcards Maker (Gemini)</h1>
  <p class="muted">Upload your study material → get Q/A flashcards. Supports PDF, DOCX, TXT, JPG/PNG (OCR).</p>

  <div class="card">
    <div class="row" style="margin-bottom:10px;">
      <input id="files" type="file" multiple />
      <label>Cards: <input id="num" type="number" min="1" max="200" value="10"></label>
      <label>Style:
        <select id="style">
          <option value="active_recall" selected>active_recall</option>
          <option value="cloze">cloze</option>
          <option value="mcq">mcq</option>
        </select>
      </label>
      <label>Answer:
        <select id="format">
          <option value="short" selected>short</option>
          <option value="bullet">bullet</option>
          <option value="detailed">detailed</option>
        </select>
      </label>
      <button class="primary" id="go">Generate</button>
    </div>
    <div id="status" class="muted">Ready.</div>
    <div id="err" class="error" style="display:none;"></div>
  </div>

  <div id="out"></div>

<script>
const $ = s => document.querySelector(s);
const statusEl = $("#status");
const errEl = $("#err");
const out = $("#out");

$("#go").addEventListener("click", async () => {
  errEl.style.display = "none";
  out.innerHTML = "";
  const filesEl = $("#files");
  if (!filesEl.files.length) {
    errEl.textContent = "Please choose at least one file.";
    errEl.style.display = "block";
    return;
  }
  const fd = new FormData();
  for (const file of filesEl.files) fd.append("files", file);
  fd.append("num_cards", $("#num").value || "10");
  fd.append("style", $("#style").value);
  fd.append("answer_format", $("#format").value);

  statusEl.textContent = "Generating flashcards… (this can take a few seconds)";
  try {
    const res = await fetch("/generate", { method: "POST", body: fd });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || (res.status + " " + res.statusText));
    }
    const data = await res.json();
    statusEl.innerHTML = `<span class="ok">Done.</span> Created ${data.num_cards} cards from ${data.total_chars} chars.`;
    renderCards(data.cards || []);
  } catch (e) {
    errEl.textContent = "Error: " + (e.message || e);
    errEl.style.display = "block";
    statusEl.textContent = "Ready.";
  }
});

function renderCards(cards){
  if (!cards.length) { out.innerHTML = "<p>No cards returned.</p>"; return; }
  const wrap = document.createElement("div");
  wrap.className = "grid";
  for (const c of cards) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="q">${escapeHtml(c.question || "")}</div>
      <div>${escapeHtml(c.answer || "")}</div>
      <div style="margin-top:8px;">
        ${(c.tags||[]).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        <span class="tag">difficulty: ${escapeHtml(c.difficulty || "medium")}</span>
      </div>
    `;
    wrap.appendChild(div);
  }
  out.innerHTML = "";
  out.appendChild(wrap);
}

function escapeHtml(s){
  return (s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":'&#39;'}[m]));
}
</script>
</body>
</html>
"""

@app.post("/generate", response_model=GenerateResponse)
async def generate(
    files: List[UploadFile] = File(..., description="One or more source files (.pdf, .docx, .txt, .png, .jpg)."),
    num_cards: int = Form(20),
    style: str = Form("active_recall"),
    answer_format: str = Form("short"),
):
    if not settings.google_api_key:
        raise HTTPException(status_code=400, detail="GOOGLE_API_KEY not set in environment")

    total_bytes = 0
    all_text = []

    for f in files:
        data = await f.read()
        total_bytes += len(data)
        try:
            text = extract_any(f.filename or "uploaded", data)
        except Exception as e:
            raise HTTPException(status_code=415, detail=f"Failed to read {f.filename}: {e}")
        if text:
            all_text.append(text)

    if not all_text:
        raise HTTPException(status_code=400, detail="No extractable text found in uploads")

    combined = clean_text("\n\n".join(all_text))[: settings.max_context_chars]
    chunks = chunk_text(combined, max_chars=4500, overlap=250)

    cards_raw = make_cards(chunks, num_cards=num_cards, style=style, answer_format=answer_format)

    cards = []
    for c in cards_raw[:num_cards]:
        q = str(c.get("question", "")).strip()
        a = str(c.get("answer", "")).strip()
        if not q or not a:
            continue
        tags = c.get("tags", []) or []
        diff = c.get("difficulty", "medium")
        cards.append(Flashcard(question=q, answer=a, tags=tags, difficulty=diff))

    if not cards:
        raise HTTPException(status_code=502, detail="Model returned no cards. Try fewer files or fewer num_cards.")

    return GenerateResponse(
        source_bytes=total_bytes,
        total_chars=len(combined),
        num_cards=len(cards),
        cards=cards,
    )
