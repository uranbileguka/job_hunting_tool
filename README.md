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
