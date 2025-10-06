import os
from typing import List
from pypdf import PdfReader
from docx import Document
from PIL import Image
import pytesseract
from io import BytesIO

SUPPORTED_EXTS = {".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg"}

def ext_of(filename: str) -> str:
    return os.path.splitext(filename or "")[1].lower()

def extract_text_from_pdf(data: bytes) -> str:
    reader = PdfReader(BytesIO(data))
    chunks = []
    for page in reader.pages:
        try:
            chunks.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(chunks).strip()

def extract_text_from_docx(data: bytes) -> str:
    doc = Document(BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs).strip()

def extract_text_from_txt(data: bytes) -> str:
    for enc in ("utf-8", "latin-1"):
        try:
            return data.decode(enc)
        except Exception:
            continue
    return ""

def extract_text_from_image(data: bytes) -> str:
    img = Image.open(BytesIO(data))
    try:
        return pytesseract.image_to_string(img)
    except Exception:
        return ""

def extract_any(filename: str, data: bytes) -> str:
    ext = ext_of(filename)
    if ext == ".pdf":
        return extract_text_from_pdf(data)
    if ext == ".docx":
        return extract_text_from_docx(data)
    if ext == ".txt":
        return extract_text_from_txt(data)
    if ext in {".png", ".jpg", ".jpeg"}:
        return extract_text_from_image(data)
    return extract_text_from_txt(data)
