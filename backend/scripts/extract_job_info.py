#!/usr/bin/env python3
import json
import html as ihtml
import os
import re
import sys
import uuid
from typing import Any, Dict, List
from urllib.parse import quote_plus, urlparse

import bs4
import requests
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel, Field

STATE_ABBR = {
    "alabama": "AL",
    "alaska": "AK",
    "arizona": "AZ",
    "arkansas": "AR",
    "california": "CA",
    "colorado": "CO",
    "connecticut": "CT",
    "delaware": "DE",
    "florida": "FL",
    "georgia": "GA",
    "hawaii": "HI",
    "idaho": "ID",
    "illinois": "IL",
    "indiana": "IN",
    "iowa": "IA",
    "kansas": "KS",
    "kentucky": "KY",
    "louisiana": "LA",
    "maine": "ME",
    "maryland": "MD",
    "massachusetts": "MA",
    "michigan": "MI",
    "minnesota": "MN",
    "mississippi": "MS",
    "missouri": "MO",
    "montana": "MT",
    "nebraska": "NE",
    "nevada": "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    "ohio": "OH",
    "oklahoma": "OK",
    "oregon": "OR",
    "pennsylvania": "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    "tennessee": "TN",
    "texas": "TX",
    "utah": "UT",
    "vermont": "VT",
    "virginia": "VA",
    "washington": "WA",
    "west virginia": "WV",
    "wisconsin": "WI",
    "wyoming": "WY",
}


def clean_text(text: str) -> str:
    text = text or ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&nbsp;|&#160;", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def clean_list(values: List[str]) -> List[str]:
    seen = set()
    out: List[str] = []
    for value in values:
        item = clean_text(value)
        if not item or len(item) < 4:
            continue
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def normalize_location(location: str, raw_text: str) -> str:
    loc = clean_text(location)
    if not loc:
        return ""

    if re.search(r",\s*[A-Z]{2}\b", loc):
        return loc

    m = re.search(r"([A-Za-z .'-]+),\s*([A-Za-z ]+)$", loc)
    if m:
        city = clean_text(m.group(1))
        state_name = clean_text(m.group(2)).lower()
        if state_name in STATE_ABBR:
            return f"{city}, {STATE_ABBR[state_name]}"

    city_only = re.sub(r"\s+", " ", loc).strip()
    state_names_pattern = "|".join(re.escape(s.title()) for s in STATE_ABBR.keys())
    city_state_match = re.search(
        rf"\b{re.escape(city_only)}\s*,\s*({state_names_pattern}|[A-Z]{{2}})\b",
        raw_text,
        flags=re.IGNORECASE,
    )
    if city_state_match:
        state_part = clean_text(city_state_match.group(1))
        state_abbr = STATE_ABBR.get(state_part.lower(), state_part.upper())
        return f"{city_only}, {state_abbr}"

    return loc


def extract_list_from_html_section(raw_html: str, section_names: List[str]) -> List[str]:
    if not raw_html:
        return []

    decoded = ihtml.unescape(raw_html)
    decoded = decoded.replace("\\u003c", "<").replace("\\u003e", ">").replace("\\n", " ")
    section_pattern = "|".join(re.escape(x) for x in section_names)

    # Try grabbing <ul> blocks after section headings.
    blocks = re.findall(
        rf"(?is)(?:{section_pattern})\\s*</[^>]+>\\s*(<ul[^>]*>.*?</ul>)",
        decoded,
    )

    items: List[str] = []
    for block in blocks:
        for li in re.findall(r"(?is)<li[^>]*>(.*?)</li>", block):
            text = clean_text(li)
            if text:
                items.append(text)

    # Fallback: if no explicit block matched, grab nearby list items in text window.
    if not items:
        for m in re.finditer(rf"(?is)({section_pattern})", decoded):
            window = decoded[m.end() : m.end() + 6000]
            for li in re.findall(r"(?is)<li[^>]*>(.*?)</li>", window):
                text = clean_text(li)
                if text:
                    items.append(text)
            if items:
                break

    return clean_list(items)


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


def safe_json_loads(text: str) -> Any:
    text = (text or "").strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        pass

    match = re.search(r"(\{.*\}|\[.*\])", text, flags=re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            return None
    return None


def recursive_collect(obj: Any, target_keys: set, out: List[str]) -> None:
    if isinstance(obj, dict):
        for k, v in obj.items():
            key = k.lower()
            if key in target_keys:
                if isinstance(v, str):
                    out.append(v)
                elif isinstance(v, list):
                    for item in v:
                        if isinstance(item, str):
                            out.append(item)
                        elif isinstance(item, dict):
                            for maybe in [item.get("text"), item.get("value"), item.get("name"), item.get("url")]:
                                if isinstance(maybe, str):
                                    out.append(maybe)
                elif isinstance(v, dict):
                    for maybe in [v.get("text"), v.get("value"), v.get("name"), v.get("url")]:
                        if isinstance(maybe, str):
                            out.append(maybe)
            recursive_collect(v, target_keys, out)
    elif isinstance(obj, list):
        for item in obj:
            recursive_collect(item, target_keys, out)


def parse_section_list_items(soup: bs4.BeautifulSoup, section_names: List[str]) -> List[str]:
    target = set(name.lower() for name in section_names)
    items: List[str] = []

    for heading in soup.find_all(["h1", "h2", "h3", "h4", "strong", "b", "p", "span"]):
        title = clean_text(heading.get_text(" ", strip=True)).lower().rstrip(":")
        if title not in target:
            continue

        node = heading.find_next_sibling()
        for _ in range(25):
            if node is None:
                break
            if node.name in ["h1", "h2", "h3", "h4"]:
                break
            if node.name in ["ul", "ol"]:
                for li in node.find_all("li"):
                    text = clean_text(li.get_text(" ", strip=True))
                    if text:
                        items.append(text)
            elif node.name == "li":
                text = clean_text(node.get_text(" ", strip=True))
                if text:
                    items.append(text)
            node = node.find_next_sibling()

    return clean_list(items)


def parse_section_paragraphs(soup: bs4.BeautifulSoup, section_names: List[str]) -> List[str]:
    target = set(name.lower() for name in section_names)
    paragraphs: List[str] = []

    for heading in soup.find_all(["h1", "h2", "h3", "h4", "strong", "b", "p", "span"]):
        title = clean_text(heading.get_text(" ", strip=True)).lower().rstrip(":")
        if title not in target:
            continue

        node = heading.find_next_sibling()
        for _ in range(12):
            if node is None:
                break
            if node.name in ["h1", "h2", "h3", "h4"]:
                break
            if node.name in ["p", "div", "li", "span"]:
                text = clean_text(node.get_text(" ", strip=True))
                if 30 <= len(text) <= 450:
                    paragraphs.append(text)
            node = node.find_next_sibling()

    return clean_list(paragraphs)


def extract_from_embedded_json(soup: bs4.BeautifulSoup) -> Dict[str, Any]:
    json_blobs: List[Any] = []

    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        data = safe_json_loads(script.string or script.get_text(" ", strip=True))
        if data is not None:
            json_blobs.append(data)

    next_script = soup.find("script", attrs={"id": "__NEXT_DATA__"})
    if next_script:
        data = safe_json_loads(next_script.string or next_script.get_text(" ", strip=True))
        if data is not None:
            json_blobs.append(data)

    for script in soup.find_all("script"):
        text = script.string or script.get_text(" ", strip=True)
        if not text:
            continue
        if "job" not in text.lower() and "qualif" not in text.lower() and "respons" not in text.lower():
            continue
        if len(text) > 350000:
            continue
        data = safe_json_loads(text)
        if data is not None:
            json_blobs.append(data)

    job_title_candidates: List[str] = []
    company_candidates: List[str] = []
    location_candidates: List[str] = []
    responsibilities: List[str] = []
    qualifications: List[str] = []
    website_candidates: List[str] = []
    overview_candidates: List[str] = []

    for blob in json_blobs:
        recursive_collect(blob, {"jobtitle", "job_title", "positiontitle", "title"}, job_title_candidates)
        recursive_collect(blob, {"company", "companyname", "organization", "hiringorganization", "employer"}, company_candidates)
        recursive_collect(blob, {"location", "joblocation", "addresslocality", "city", "state", "joblocationtype"}, location_candidates)
        recursive_collect(blob, {"responsibilities", "responsibility", "jobresponsibilities", "duties", "whatyouwilldo"}, responsibilities)
        recursive_collect(
            blob,
            {"qualifications", "qualification", "requirements", "minimumqualifications", "preferredqualifications", "skills"},
            qualifications,
        )
        recursive_collect(blob, {"website", "url", "companywebsite", "homepage", "companyurl"}, website_candidates)
        recursive_collect(blob, {"companyoverview", "overview", "about", "description"}, overview_candidates)

    return {
        "jobTitle": next((x for x in clean_list(job_title_candidates) if 3 <= len(x) <= 120 and "http" not in x.lower()), ""),
        "companyName": next((x for x in clean_list(company_candidates) if 2 <= len(x) <= 120 and "http" not in x.lower()), ""),
        "location": next((x for x in clean_list(location_candidates) if 2 <= len(x) <= 120), ""),
        "responsibilities": clean_list(responsibilities)[:12],
        "qualifications": clean_list(qualifications)[:12],
        "companyWebsiteLink": next((x for x in clean_list(website_candidates) if x.startswith("http")), ""),
        "companyOverview": next((x for x in clean_list(overview_candidates) if 30 <= len(x) <= 450), ""),
    }


def build_documents(url: str, html: str, embedded: Dict[str, Any]) -> List[Document]:
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

    embedded_summary = [
        f"EMBEDDED_JOB_TITLE: {embedded.get('jobTitle', '')}",
        f"EMBEDDED_COMPANY: {embedded.get('companyName', '')}",
        f"EMBEDDED_LOCATION: {embedded.get('location', '')}",
        f"EMBEDDED_OVERVIEW: {embedded.get('companyOverview', '')}",
        f"EMBEDDED_WEBSITE: {embedded.get('companyWebsiteLink', '')}",
        "EMBEDDED_RESPONSIBILITIES: " + " | ".join(embedded.get("responsibilities", [])),
        "EMBEDDED_QUALIFICATIONS: " + " | ".join(embedded.get("qualifications", [])),
    ]

    full_text = clean_text("\n".join(blocks + embedded_summary))[:65000]

    return [
        Document(page_content=f"URL: {url}\nTITLE: {title}\nMETA: {meta_desc}", metadata={"source": url}),
        Document(page_content=full_text, metadata={"source": url}),
    ]


def retrieve_relevant_context(docs: List[Document]) -> str:
    splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(chunk_size=1200, chunk_overlap=150)
    splits = splitter.split_documents(docs)

    collection_name = f"job-rag-{uuid.uuid4().hex[:10]}"
    vectorstore = Chroma.from_documents(
        documents=splits,
        collection_name=collection_name,
        embedding=OpenAIEmbeddings(model="text-embedding-3-small"),
    )

    try:
        retriever = vectorstore.as_retriever(search_kwargs={"k": 8})
        queries = [
            "Find exact job title, company name, and location.",
            "Find responsibilities, duties, and day-to-day tasks.",
            "Find qualifications, requirements, skills, and experience needed.",
            "Find company overview and mission statement.",
            "Find company website URL.",
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


class CompanyInfo(BaseModel):
    company_information: str = Field(description="Concise company information for cover letter usage")


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

    return JobFields(
        job_title=job_title,
        company_name=company_name,
        location=location,
        responsibilities=clean_list(fields.responsibilities),
        qualifications=clean_list(fields.qualifications),
    )


def merge_embedded_priority(fields: JobFields, embedded: Dict[str, Any]) -> JobFields:
    return JobFields(
        job_title=clean_text(embedded.get("jobTitle") or fields.job_title),
        company_name=clean_text(embedded.get("companyName") or fields.company_name),
        location=clean_text(embedded.get("location") or fields.location),
        responsibilities=clean_list((embedded.get("responsibilities") or []) + list(fields.responsibilities)),
        qualifications=clean_list((embedded.get("qualifications") or []) + list(fields.qualifications)),
    )


def fetch_company_site_context(website_url: str) -> str:
    if not website_url:
        return ""
    try:
        html = fetch_html(website_url)
    except Exception:
        return ""

    soup = bs4.BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    title = clean_text(soup.title.get_text(" ", strip=True)) if soup.title else ""
    meta_desc = ""
    meta = soup.find("meta", attrs={"name": "description"})
    if meta and meta.get("content"):
        meta_desc = clean_text(meta.get("content"))

    paras: List[str] = []
    for el in soup.find_all(["p", "li"]):
        t = clean_text(el.get_text(" ", strip=True))
        if 40 <= len(t) <= 240:
            paras.append(t)
        if len(paras) >= 8:
            break

    blocks = clean_list([title, meta_desc] + paras)
    return "\n".join(blocks[:8])


def fetch_recent_news(company_name: str) -> List[str]:
    if not company_name:
        return []

    rss_url = (
        "https://news.google.com/rss/search?q="
        + quote_plus(f'"{company_name}" when:45d')
        + "&hl=en-US&gl=US&ceid=US:en"
    )

    try:
        resp = requests.get(rss_url, timeout=20)
        resp.raise_for_status()
        soup = bs4.BeautifulSoup(resp.text, "xml")
        titles: List[str] = []
        for item in soup.find_all("item")[:5]:
            t = clean_text(item.title.get_text(" ", strip=True) if item.title else "")
            if t and " - " in t:
                t = t.split(" - ")[0].strip()
            if t:
                titles.append(t)
        return clean_list(titles)[:4]
    except Exception:
        return []


def compose_company_information(
    company_name: str,
    job_overview: str,
    website_context: str,
    news_titles: List[str],
    llm: ChatOpenAI,
) -> str:
    if not any([job_overview, website_context, news_titles]):
        return ""

    structured = llm.with_structured_output(CompanyInfo)
    prompt = f"""
Create concise company information for a cover letter.
Company: {company_name}

Job-posting company overview:
{job_overview}

Official website context:
{website_context}

Recent news headlines:
{chr(10).join(f"- {x}" for x in news_titles)}

Requirements:
1) 3-5 short sentences total.
2) First sentence: what the company does / mission.
3) One sentence: why this company is relevant for this role.
4) If news exists, include one sentence beginning with "Recent news:" summarizing 1-2 concrete items.
5) Plain text only, no markdown.
"""

    try:
        result = structured.invoke(prompt)
        return clean_text(result.company_information)
    except Exception:
        parts: List[str] = []
        if job_overview:
            parts.append(job_overview)
        if website_context:
            parts.append(website_context.split("\n")[0])
        if news_titles:
            parts.append("Recent news: " + "; ".join(news_titles[:2]))
        return clean_text(" ".join(parts))[:700]


def extract_job_fields(url: str) -> dict:
    html = fetch_html(url)
    soup = bs4.BeautifulSoup(html, "html.parser")

    embedded = extract_from_embedded_json(soup)

    html_resp = parse_section_list_items(soup, ["responsibilities", "what you'll do", "what you will do"])
    html_qual = parse_section_list_items(
        soup,
        ["qualifications", "requirements", "skills", "minimum qualifications", "preferred qualifications"],
    )
    regex_resp = extract_list_from_html_section(
        html, ["Responsibilities", "What you'll do", "What you will do"]
    )
    regex_qual = extract_list_from_html_section(
        html,
        [
            "Qualifications",
            "Requirements",
            "Skills",
            "Minimum Qualifications",
            "Preferred Qualifications",
        ],
    )
    html_overview = parse_section_paragraphs(soup, ["company overview", "about company", "about", "overview"])

    if html_resp or regex_resp:
        embedded["responsibilities"] = clean_list(
            (embedded.get("responsibilities") or []) + html_resp + regex_resp
        )
    if html_qual or regex_qual:
        embedded["qualifications"] = clean_list(
            (embedded.get("qualifications") or []) + html_qual + regex_qual
        )
    if html_overview and not embedded.get("companyOverview"):
        embedded["companyOverview"] = html_overview[0]

    docs = build_documents(url, html, embedded)
    raw_text = docs[1].page_content

    try:
        context = retrieve_relevant_context(docs)
        fields = extract_with_llm(url, context)
    except Exception:
        fields = extract_with_llm(url, raw_text[:18000])

    fields = merge_embedded_priority(fields, embedded)
    fields = heuristic_fallback(raw_text, fields)
    fields.location = normalize_location(fields.location, f"{raw_text} {ihtml.unescape(html)}")

    company_name = fields.company_name
    company_website_link = embedded.get("companyWebsiteLink", "")

    # Fall back: infer website URL from raw text if embedded extraction misses it.
    if not company_website_link:
        website_match = re.search(r"https?://[\w./-]+", raw_text)
        if website_match:
            company_website_link = website_match.group(0)

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    website_context = fetch_company_site_context(company_website_link)
    news_titles = fetch_recent_news(company_name)

    company_information = compose_company_information(
        company_name=company_name,
        job_overview=embedded.get("companyOverview", ""),
        website_context=website_context,
        news_titles=news_titles,
        llm=llm,
    )

    return {
        "jobTitle": fields.job_title,
        "companyName": fields.company_name,
        "location": fields.location,
        "responsibilities": "\n".join(f"- {x}" for x in fields.responsibilities[:12]),
        "qualifications": "\n".join(f"- {x}" for x in fields.qualifications[:12]),
        "companyInformation": company_information,
        "companyWebsiteLink": company_website_link,
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
