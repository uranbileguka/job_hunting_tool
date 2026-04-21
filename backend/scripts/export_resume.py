#!/usr/bin/env python3
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


def clean_filename(text: str) -> str:
    value = (text or "").strip()
    value = re.sub(r"[^A-Za-z0-9\s-]", "", value)
    value = re.sub(r"\s+", "_", value)
    return value or "Unknown"


def resolve_soffice() -> str:
    env_soffice = os.getenv("SOFFICE_BIN", "").strip()
    if env_soffice and Path(env_soffice).exists():
        return env_soffice

    found = shutil.which("soffice") or shutil.which("libreoffice")
    if found:
        return found

    candidates = [
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        "/Applications/OpenOffice.app/Contents/MacOS/soffice",
        "/opt/homebrew/bin/soffice",
        "/usr/local/bin/soffice",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return candidate
    return ""


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except Exception:
        print(json.dumps({"error": "Invalid JSON payload"}, ensure_ascii=True))
        return 1

    template_path = Path(payload.get("templatePath", "")).expanduser().resolve()
    output_dir_word = Path(payload.get("outputDirWord") or "").expanduser().resolve()
    output_dir_pdf = Path(payload.get("outputDirPdf") or "").expanduser().resolve()

    if not template_path.exists():
        print(json.dumps({"error": f"Template file not found: {template_path}"}, ensure_ascii=True))
        return 1
    if template_path.suffix.lower() != ".docx":
        print(json.dumps({"error": "Resume template must be a .docx file."}, ensure_ascii=True))
        return 1

    output_dir_word.mkdir(parents=True, exist_ok=True)
    output_dir_pdf.mkdir(parents=True, exist_ok=True)

    company_clean = clean_filename(payload.get("companyName") or "Company")
    job_title_clean = clean_filename(payload.get("jobTitle") or "JobTitle")
    file_name = f"Uranbileg_resume_{company_clean}_{job_title_clean}.docx"
    save_path = output_dir_word / file_name

    # Export as-is without preserving the template's modified timestamp.
    shutil.copyfile(str(template_path), str(save_path))
    shutil.copymode(str(template_path), str(save_path))

    pdf_path = (output_dir_pdf / file_name).with_suffix(".pdf")
    pdf_created = False
    pdf_error = ""

    soffice = resolve_soffice()
    if soffice:
        try:
            result = subprocess.run(
                [
                    soffice,
                    "--headless",
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    str(output_dir_pdf),
                    str(save_path),
                ],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            pdf_created = pdf_path.exists()
            if not pdf_created:
                details = (result.stderr or result.stdout or "").strip()
                pdf_error = (
                    "LibreOffice conversion ran but PDF file was not produced."
                    + (f" Details: {details}" if details else "")
                )
        except Exception as exc:
            pdf_error = f"LibreOffice conversion failed: {exc}"
    else:
        pdf_error = (
            "PDF skipped to avoid permission prompts. Install LibreOffice "
            "(soffice) for headless PDF export."
        )

    print(
        json.dumps(
            {
                "docxPath": str(save_path),
                "pdfPath": str(pdf_path) if pdf_created else "",
                "pdfCreated": pdf_created,
                "pdfError": pdf_error,
            },
            ensure_ascii=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
