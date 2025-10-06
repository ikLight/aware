from typing import List

def clean_text(s: str) -> str:
    if not s:
        return ""
    s = s.replace("\r", "\n")
    while "\n\n\n" in s:
        s = s.replace("\n\n\n", "\n\n")
    return s.strip()

def chunk_text(s: str, max_chars: int = 5000, overlap: int = 300) -> List[str]:
    s = clean_text(s)
    if len(s) <= max_chars:
        return [s]
    parts: List[str] = []
    start = 0
    n = len(s)
    while start < n:
        end = min(n, start + max_chars)
        parts.append(s[start:end])
        if end == n:
            break
        start = max(0, end - overlap)
    return parts
