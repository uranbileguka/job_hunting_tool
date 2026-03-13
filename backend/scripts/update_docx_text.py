#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path


def split_paragraphs(text: str):
    normalized = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    parts = [re.sub(r"\s+", " ", p).strip() for p in normalized.split("\n\n")]
    return [p for p in parts if p]


def main() -> int:
    try:
      payload = json.loads(sys.stdin.read() or "{}")
    except Exception:
      print(json.dumps({"error": "Invalid JSON payload"}, ensure_ascii=True))
      return 1

    file_path = Path(str(payload.get("filePath") or "")).expanduser().resolve()
    text = str(payload.get("text") or "")

    if not file_path.exists():
      print(json.dumps({"error": f"File not found: {file_path}"}, ensure_ascii=True))
      return 1
    if file_path.suffix.lower() != ".docx":
      print(json.dumps({"error": "Only .docx files are supported."}, ensure_ascii=True))
      return 1

    try:
      from docx import Document
    except Exception:
      print(
        json.dumps(
          {"error": "python-docx is not installed. Install from backend/scripts/requirements.txt"},
          ensure_ascii=True,
        )
      )
      return 1

    paragraphs = split_paragraphs(text)
    doc = Document(str(file_path))

    existing_count = len(doc.paragraphs)
    min_count = min(existing_count, len(paragraphs))

    for i in range(min_count):
      doc.paragraphs[i].text = paragraphs[i]

    if len(paragraphs) > existing_count:
      for p in paragraphs[existing_count:]:
        doc.add_paragraph(p)
    elif existing_count > len(paragraphs):
      for i in range(len(paragraphs), existing_count):
        doc.paragraphs[i].text = ""

    doc.save(str(file_path))
    print(json.dumps({"updated": True, "filePath": str(file_path)}, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
