import os, io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
API_KEY = "AIzaSyBWl60BJK0n3EbOPCJQB4gvYL95cEkfaeU"#os.getenv("GOOGLE_API_KEY")
if not API_KEY:
    raise RuntimeError("Set GOOGLE_API_KEY in your .env")
genai.configure(api_key=API_KEY)
MODEL_NAME = os.getenv("MODEL_NAME", "models/gemini-2.5-flash")
model = genai.GenerativeModel(MODEL_NAME)

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

from pypdf import PdfReader

def extract_text_from_upload(upload: UploadFile) -> str:
    name = (upload.filename or "").lower()
    raw = upload.file.read()
    upload.file.seek(0)

    if name.endswith(".txt"):
        try:
            return raw.decode("utf-8", errors="ignore")
        except Exception:
            return raw.decode("latin-1", errors="ignore")

    if name.endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(raw))
            pages = []
            for p in reader.pages:
                pages.append(p.extract_text() or "")
            return "\n".join(pages)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")

    try:
        return raw.decode("utf-8", errors="ignore")
    except Exception:
        return raw.decode("latin-1", errors="ignore")

LAST_TEXT: str | None = None

@app.get("/", response_class=HTMLResponse)
def ui():
    return """
<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Aware Recap</title></head>
  <body style="background:#fff;color:#000;font-family:system-ui, -apple-system, Segoe UI, Arial; margin:0;">
    <div style="max-width:720px;margin:10vh auto 0 auto;padding:0 20px;text-align:center;">
      <h1 style="margin:0 0 12px 0;">Aware Recap</h1>
      <p style="margin:0 0 24px 0;">Upload a PDF or text file and click Recap.</p>

      <div style="display:flex;gap:12px;justify-content:center;align-items:center;margin-bottom:12px;">
        <input id="file" type="file" style="font-size:14px;">
        <button id="go" style="padding:8px 16px;border:1px solid #000;background:#fff;color:#000;cursor:pointer;">Recap</button>
      </div>

      <div id="status" style="min-height:24px;margin-bottom:12px;"></div>

      <pre id="out" style="text-align:left;white-space:pre-wrap;border:1px solid #000;padding:12px;border-radius:4px;min-height:160px;max-width:720px;margin:0 auto;">
No recap.
      </pre>
    </div>

    <script>
      const API = location.origin;
      const $ = id => document.getElementById(id);

      $("go").onclick = async () => {
        const f = $("file").files[0];
        if (!f) { alert("Select a file first."); return; }

        $("status").textContent = "Uploading...";
        const fd = new FormData(); fd.append("f", f);
        let res = await fetch(API + "/upload", { method: "POST", body: fd });
        let js = await res.json();
        if (!res.ok) { $("status").textContent = "Upload error."; $("out").textContent = JSON.stringify(js); return; }

        $("status").textContent = "Generating recap...";
        res = await fetch(API + "/recap", { method: "POST" });
        const text = await res.text();
        $("status").textContent = "Done.";
        $("out").textContent = text || "No recap.";
      };
    </script>
  </body>
</html>
"""

@app.post("/upload")
async def upload(f: UploadFile = File(...)):
    global LAST_TEXT
    try:
        LAST_TEXT = extract_text_from_upload(f)
        if not LAST_TEXT or LAST_TEXT.strip() == "":
            raise HTTPException(status_code=400, detail="No readable text found in file.")
        MAX_CHARS = 80_000
        if len(LAST_TEXT) > MAX_CHARS:
            LAST_TEXT = LAST_TEXT[:MAX_CHARS]
        return {"ok": True, "chars": len(LAST_TEXT)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

@app.post("/recap", response_class=PlainTextResponse)
def recap():
    if not LAST_TEXT:
        raise HTTPException(status_code=400, detail="No file uploaded yet.")
    prompt = (
        "You are a study assistant. Given the document text below, produce a concise recap as clear bullet points. "
        "Use up to 10 bullets. Avoid fluff. If slide or section names are obvious in the text, reference them.\n\n"
        "=== DOCUMENT TEXT START ===\n"
        f"{LAST_TEXT}\n"
        "=== DOCUMENT TEXT END ==="
    )
    try:
        resp = model.generate_content(prompt)
        return resp.text or "No recap generated."
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recap failed: {e}")
