#!/usr/bin/env python3
import json
import os
import re
import sys
import uuid
from typing import List
from urllib.parse import urlparse

import bs4
import requests
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel, Field


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def fetch_html(url: str) -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )
    }
    response = requests.get(url, headers=headers, timeout=25)
    response.raise_for_status()
    return response.text


def build_documents(url: str, html: str) -> List[Document]:
    soup = bs4.BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "noscript", "svg", "footer", "header"]):
        tag.decompose()

    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    meta_desc = ""
    meta_tag = soup.find("meta", attrs={"name": "description"})
    if meta_tag and meta_tag.get("content"):
        meta_desc = clean_text(meta_tag["content"])

    blocks: List[str] = []

    h1 = soup.find("h1")
    if h1:
        blocks.append(f"H1: {clean_text(h1.get_text(' ', strip=True))}")

    for el in soup.find_all(["h2", "h3", "p", "li"]):
        txt = clean_text(el.get_text(" ", strip=True))
        if len(txt) >= 25:
            blocks.append(txt)

    full_text = clean_text("\n".join(blocks))[:60000]

    return [
        Document(page_content=f"URL: {url}\nTITLE: {title}\nMETA: {meta_desc}", metadata={"source": url}),
        Document(page_content=full_text, metadata={"source": url}),
    ]


def retrieve_relevant_context(docs: List[Document]) -> str:
    splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        chunk_size=1200,
        chunk_overlap=150,
    )
    splits = splitter.split_documents(docs)

    collection_name = f"job-rag-{uuid.uuid4().hex[:10]}"
    vectorstore = Chroma.from_documents(
        documents=splits,
        collection_name=collection_name,
        embedding=OpenAIEmbeddings(model="text-embedding-3-small"),
    )

    try:
        retriever = vectorstore.as_retriever(search_kwargs={"k": 6})
        queries = [
            "Find exact job title, company name, and location.",
            "Find responsibilities, duties, or what you will do.",
            "Find qualifications, requirements, skills, and experience needed.",
        ]

        chunks: List[str] = []
        seen = set()

        for query in queries:
            for doc in retriever.invoke(query):
                text = clean_text(doc.page_content)
                if text and text not in seen:
                    seen.add(text)
                    chunks.append(text)

        return "\n\n".join(chunks)
    finally:
        # Keep local workspace clean from temporary collections.
        try:
            vectorstore.delete_collection()
        except Exception:
            pass


class JobFields(BaseModel):
    job_title: str = Field(description="Exact job title")
    company_name: str = Field(description="Company name")
    location: str = Field(description="Job location")
    responsibilities: List[str] = Field(description="Job responsibilities list")
    qualifications: List[str] = Field(description="Job qualifications list")


def extract_with_llm(url: str, context: str) -> JobFields:
    host = urlparse(url).netloc

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured = llm.with_structured_output(JobFields)

    prompt = f"""
Extract job details from the text below.
Source host: {host}

Return fields strictly based on provided text.
Rules:
- Use exact wording when possible.
- If unknown, return empty string for text fields and [] for lists.
- Responsibilities and qualifications should be concise, deduplicated, and factual.

TEXT:
{context}
"""

    return structured.invoke(prompt)


def heuristic_fallback(raw_text: str, fields: JobFields) -> JobFields:
    job_title = clean_text(fields.job_title)
    company_name = clean_text(fields.company_name)
    location = clean_text(fields.location)

    if not job_title or not company_name:
        title_match = re.search(
            r"([A-Z][A-Za-z0-9&/,+\-. ]{2,90})\s+at\s+([A-Z][A-Za-z0-9&/,+\-. ]{1,90})",
            raw_text,
        )
        if title_match:
            if not job_title:
                job_title = clean_text(title_match.group(1))
            if not company_name:
                company_name = clean_text(title_match.group(2))

    if not location:
        loc_match = re.search(r"(Remote|Hybrid|On[- ]site|[A-Z][a-zA-Z]+,\s*[A-Z]{2})", raw_text)
        if loc_match:
            location = clean_text(loc_match.group(1))

    responsibilities = [clean_text(x) for x in fields.responsibilities if clean_text(x)]
    qualifications = [clean_text(x) for x in fields.qualifications if clean_text(x)]

    return JobFields(
        job_title=job_title,
        company_name=company_name,
        location=location,
        responsibilities=responsibilities,
        qualifications=qualifications,
    )


def extract_job_fields(url: str) -> dict:
    html = fetch_html(url)
    docs = build_documents(url, html)
    raw_text = docs[1].page_content

    try:
        context = retrieve_relevant_context(docs)
        fields = extract_with_llm(url, context)
    except Exception:
        # Fallback when vector retrieval fails.
        fields = extract_with_llm(url, raw_text[:18000])

    fields = heuristic_fallback(raw_text, fields)

    return {
        "jobTitle": fields.job_title,
        "companyName": fields.company_name,
        "location": fields.location,
        "responsibilities": "\n".join(f"- {x}" for x in fields.responsibilities),
        "qualifications": "\n".join(f"- {x}" for x in fields.qualifications),
    }


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "URL argument is required"}, ensure_ascii=True))
        return 1

    if not os.getenv("OPENAI_API_KEY"):
        print(json.dumps({"error": "OPENAI_API_KEY is missing"}, ensure_ascii=True))
        return 1

    url = sys.argv[1].strip()

    try:
        fields = extract_job_fields(url)
        print(json.dumps(fields, ensure_ascii=True))
        return 0
    except Exception as exc:
        print(json.dumps({"error": f"Extraction failed: {str(exc)}"}, ensure_ascii=True))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
