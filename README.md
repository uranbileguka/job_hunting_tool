# Job Hunting Tool (React + Node + GenAI)

This project includes:
- `frontend/`: React app for entering candidate/job details
- `backend/`: Node.js/Express API for extraction + cover letter generation
- `backend/scripts/extract_job_info.py`: Python extractor using BeautifulSoup + LangChain + OpenAI

## 1) Setup

From project root:

```bash
cp .env.example .env
```

Then set `OPENAI_API_KEY` in `.env`.

## 2) Install dependencies

Node dependencies:

```bash
npm install
npm run install:all
```

Python dependencies (for link extraction endpoint, including Chroma vector store + LangChain):

```bash
python3 -m pip install -r backend/scripts/requirements.txt
```

## 3) Run both frontend + backend (recommended)

```bash
npm run dev
```

This starts:
- Backend on `http://localhost:5001`
- Frontend on Vite URL (typically `http://localhost:5173`)

## 4) Optional: run separately

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

## API

### `POST /api/template-paragraphs`
Body:
- `role`

Behavior:
- Loads a `.docx` template based on role
- Extracts text from `Dear Hiring Team,` to `Thank you for your time and consideration.`
- Returns first 5 paragraphs as `paragraph1..paragraph5`

Template resolution order:
1. Role-specific env var (examples below)
2. `templates/<role_slug>.docx`
3. `templates/<role_slug>_cover_letter.docx`
4. `templates/<role_slug>_template.docx`
5. `<role_slug>.docx`
6. `Uranbileg_CLetter.docx`

Useful env vars:
- `TEMPLATE_ROOT`
- `TEMPLATE_SOFTWARE_ENGINEERING_INTERN`
- `TEMPLATE_SOFTWARE_ENGINEER`
- `TEMPLATE_DATA_ENGINEER`
- `TEMPLATE_DATA_ENGINEERING_INTERN`
- `TEMPLATE_AI_ENGINEER`
- `TEMPLATE_AI_ENGINEER_INTERN`
- `TEMPLATE_ERP_CONSULTANT`
- `TEMPLATE_ERP_CONSULATNT_INTENEER`
- `TEMPLATE_SOLUTION_ENGINEER`

### `POST /api/improve-paragraphs`
Uses template paragraphs + company info + responsibilities + qualifications to generate:
- `improvedParagraph1`
- `improvedParagraph2`
- `improvedParagraph3`
- `improvedParagraph4` (must include company-specific info and company name)
- `improvedParagraph5`

### `POST /api/export-cover-letter`
Uses role template `.docx` and writes:
- Date
- Company name
- Location
- Improved paragraphs 1-5

Behavior:
- Preserves template style/layout by updating fixed paragraph slots (same pattern as notebook)
- Saves files to parent folder of this project with notebook naming:
  - `Uranbileg_CL_{Company}_{JobTitle}.docx`
  - `Uranbileg_CL_{Company}_{JobTitle}.pdf` (if `docx2pdf` succeeds)

### `POST /api/extract-job-fields`
Provide at least one of these links:
- `officialJobLink`
- `jobrightLink`
- `linkedinLink`

If multiple are present, backend picks the first non-empty in this order:
1. `officialJobLink`
2. `jobrightLink`
3. `linkedinLink`

Returns extracted fields to auto-fill:

```json
{
  "jobLink": "https://...",
  "fields": {
    "jobTitle": "...",
    "companyName": "...",
    "location": "...",
    "responsibilities": "- ...\n- ...",
    "qualifications": "- ...\n- ..."
  }
}
```

### `POST /api/generate-cover-letter`
Required fields in JSON body:
- `role`
- `date`
- `companyName`
- `jobTitle`
- `location`
- `companyInformation`
- `paragraph1`
- `paragraph2`
- `paragraph3`
- `paragraph4`
- `paragraph5`
- `responsibilities`
- `qualifications`

Returns:

```json
{
  "letter": "Generated cover letter text..."
}
```
