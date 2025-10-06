# Flashcards Maker API (Gemini)

Turn uploaded study materials into flashcards using Google’s Gemini.  
Supports **PDF**, **DOCX**, **TXT**, and **images** (JPG/PNG via OCR).

---

## 🚀 Quickstart

```bash
# 1) Clone & enter
git clone https://github.com/<you>/flashcards_api_gemini.git
cd flashcards_api_gemini

# 2) Virtual env
python -m venv .venv
source .venv/bin/activate          # Windows: .\.venv\Scripts\activate

# 3) Install deps
pip install -r requirements.txt

# 4) Env vars (use a model your account supports)
export GOOGLE_API_KEY="YOUR_GEMINI_KEY"
export GEMINI_MODEL="gemini-flash-latest"   # e.g. from your account’s list

# 5) Run the server
uvicorn app.main:app --reload --port 8001
