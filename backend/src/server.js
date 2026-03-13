import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import pg from "pg";
import { spawn } from "node:child_process";
import { access, readdir } from "node:fs/promises";
import { constants as fsConstants, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";
import { JobApplication } from "./models/JobApplication.js";
import { runMigrations } from "./db/runMigrations.js";

dotenv.config({ path: "../.env" });
dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extractScriptPath = path.resolve(__dirname, "../scripts/extract_job_info.py");
const exportScriptPath = path.resolve(__dirname, "../scripts/export_cover_letter.py");
const pythonCmd =
  process.env.PYTHON_BIN ||
  (existsSync("/opt/anaconda3/bin/python3") ? "/opt/anaconda3/bin/python3" : "python3");

const roleTemplateEnvMap = {
  "Software engineering intern": "TEMPLATE_SOFTWARE_ENGINEERING_INTERN",
  "Software engineer": "TEMPLATE_SOFTWARE_ENGINEER",
  "Data engineer": "TEMPLATE_DATA_ENGINEER",
  "Data engineering intern": "TEMPLATE_DATA_ENGINEERING_INTERN",
  "Ai engineer": "TEMPLATE_AI_ENGINEER",
  "Ai engineer intern": "TEMPLATE_AI_ENGINEER_INTERN",
  "ERP consultant": "TEMPLATE_ERP_CONSULTANT",
  "ERP consulatnt inteneer": "TEMPLATE_ERP_CONSULATNT_INTENEER",
  "solution engineer": "TEMPLATE_SOLUTION_ENGINEER"
};

const dbPool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || "de_sales",
  password: process.env.POSTGRES_PASSWORD || "de_sales",
  database: process.env.POSTGRES_DB || "job_application"
});
let dbReady = false;

function pickJobLink(payload) {
  return (
    payload.officialJobLink?.trim() || payload.jobrightLink?.trim() || payload.linkedinLink?.trim() || ""
  );
}

function buildExtractionCandidates(rawLink) {
  const link = String(rawLink || "").trim();
  if (!link) return [];

  const candidates = new Set([link]);

  try {
    const url = new URL(link);
    const removableKeys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "source",
      "Source",
      "sourceDetails",
      "ref",
      "referral",
      "channel",
      "jobBoardSource",
      "gh_src",
      "iisn",
      "iis",
      "__jvst",
      "__jvsd",
      "trid",
      "rb",
      "rcid"
    ];
    for (const key of removableKeys) {
      url.searchParams.delete(key);
    }
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.toLowerCase().includes("handshake")) {
        url.searchParams.delete(key);
      }
    }

    candidates.add(url.toString());
    url.search = "";
    candidates.add(url.toString());
  } catch {
    // Keep original only if URL parsing fails.
  }

  return Array.from(candidates);
}

function runPythonExtractor(jobLink) {
  return new Promise((resolve, reject) => {
    const python = spawn(pythonCmd, [extractScriptPath, jobLink], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    python.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    python.on("close", (code) => {
      const raw = stdout.trim();

      if (code !== 0) {
        return reject(new Error(raw || stderr || "Python extractor failed"));
      }

      try {
        const parsed = JSON.parse(raw);

        if (parsed.error) {
          return reject(new Error(parsed.error));
        }

        return resolve(parsed);
      } catch {
        return reject(new Error("Python extractor returned invalid JSON"));
      }
    });

    python.on("error", (error) => {
      reject(error);
    });
  });
}

function runPythonExporter(payload) {
  return new Promise((resolve, reject) => {
    const python = spawn(pythonCmd, [exportScriptPath], {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    python.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    python.on("close", (code) => {
      const raw = stdout.trim();
      if (code !== 0) {
        return reject(new Error(raw || stderr || "Python exporter failed"));
      }

      try {
        const parsed = JSON.parse(raw);
        if (parsed.error) {
          return reject(new Error(parsed.error));
        }
        return resolve(parsed);
      } catch {
        return reject(new Error("Python exporter returned invalid JSON"));
      }
    });

    python.on("error", (error) => reject(error));
    python.stdin.write(JSON.stringify(payload));
    python.stdin.end();
  });
}

function roleToSlug(role) {
  return String(role || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveTemplatePath(role) {
  const envKey = roleTemplateEnvMap[role];
  const envPath = envKey ? process.env[envKey] : "";
  const templateRoot = process.env.TEMPLATE_ROOT || process.cwd();
  const slug = roleToSlug(role);

  const candidates = [];

  if (envPath) {
    candidates.push(path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath));
  }

  candidates.push(path.resolve(templateRoot, "templates", `${slug}.docx`));
  candidates.push(path.resolve(templateRoot, "templates", `${slug}_cover_letter.docx`));
  candidates.push(path.resolve(templateRoot, "templates", `${slug}_template.docx`));
  candidates.push(path.resolve(templateRoot, `${slug}.docx`));
  candidates.push(path.resolve(templateRoot, "Uranbileg_CLetter.docx"));

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `No template found for role "${role}". Set ${envKey || "the role-specific template env"} or add a template file under templates/.`
  );
}

function splitParagraphs(rawText) {
  return rawText
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function findTemplateParagraphs(paragraphs) {
  const startMarker = "dear hiring team";
  const endMarker = "thank you for your time and consideration";

  const startIdx = paragraphs.findIndex((p) => p.toLowerCase().startsWith(startMarker));
  const endIdx = paragraphs.findIndex((p) => p.toLowerCase().includes(endMarker));

  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(
      'Could not find "Dear Hiring Team" to "Thank you for your time and consideration." in template.'
    );
  }

  // Exclude the salutation itself from paragraph fields.
  return paragraphs.slice(startIdx + 1, endIdx + 1);
}

function parseApplicationId(rawId) {
  const id = Number.parseInt(String(rawId || ""), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

function buildPrompt(payload) {
  const {
    role,
    linkedinLink,
    jobrightLink,
    officialJobLink,
    companyWebsiteLink,
    date,
    companyName,
    jobTitle,
    location,
    companyInformation,
    improvedParagraph1,
    improvedParagraph2,
    improvedParagraph3,
    improvedParagraph4,
    improvedParagraph5,
    paragraph1,
    paragraph2,
    paragraph3,
    paragraph4,
    paragraph5,
    responsibilities,
    qualifications
  } = payload;

  const effectiveParagraph1 = (improvedParagraph1 || "").trim() || paragraph1;
  const effectiveParagraph2 = (improvedParagraph2 || "").trim() || paragraph2;
  const effectiveParagraph3 = (improvedParagraph3 || "").trim() || paragraph3;
  const effectiveParagraph4 = (improvedParagraph4 || "").trim() || paragraph4;
  const effectiveParagraph5 = (improvedParagraph5 || "").trim() || paragraph5;

  return `You are an expert career coach and cover letter writer.

Generate a polished cover letter using ONLY the information provided below.

Job and company details:
- Role: ${role}
- Date: ${date}
- Company Name: ${companyName}
- Job Title: ${jobTitle}
- Location: ${location}
- Official Job Link: ${officialJobLink || "Not provided"}
- Company Website Link: ${companyWebsiteLink || "Not provided"}
- Jobright Link: ${jobrightLink || "Not provided"}
- LinkedIn Link: ${linkedinLink || "Not provided"}

Company information:
${companyInformation}

Paragraph guidance:
- Paragraph 1: ${effectiveParagraph1}
- Paragraph 2: ${effectiveParagraph2}
- Paragraph 3: ${effectiveParagraph3}
- Paragraph 4: ${effectiveParagraph4}
- Paragraph 5: ${effectiveParagraph5}

Responsibilities input:
${responsibilities}

Qualifications input:
${qualifications}

Requirements:
1) Return exactly 5 cover-letter paragraphs first.
2) Keep a professional and confident tone.
3) Use paragraph guidance as the primary content for each corresponding paragraph.
3.1) Keep [company] placeholders replaced with ${companyName}.
4) Make grammar and flow natural while preserving meaning.
5) Use Company information to strengthen relevance and company-specific alignment.
6) After the 5 paragraphs, append two sections at the end in this order:
Responsibilities:
- bullet list based on Responsibilities input
Qualifications:
- bullet list based on Qualifications input
7) Return only plain text with no markdown fences.`;
}

function buildTextExtractionPrompt(webDescription) {
  return `Extract job fields from the text below.

Return ONLY strict JSON with this shape:
{
  "jobTitle": "string",
  "companyName": "string",
  "location": "string",
  "responsibilities": ["string", "..."],
  "qualifications": ["string", "..."],
  "companyInformation": "string",
  "companyWebsiteLink": "string"
}

Rules:
1) If missing, return empty string or [].
2) Responsibilities/qualifications must be concise bullet-ready phrases.
3) companyInformation should be 2-5 sentences suitable for cover letter context.
4) Prefer City, ST for location when possible.
5) Do not include markdown fences.

TEXT:
${webDescription}`;
}

function cleanupWebDescription(rawText) {
  const text = String(rawText || "");
  const normalized = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  // Prefer the most relevant part of long pasted pages.
  const markers = ["Job description", "Description", "What You’ll Do", "What You'll Do", "Qualifications"];
  let startIndex = 0;
  for (const marker of markers) {
    const idx = normalized.toLowerCase().indexOf(marker.toLowerCase());
    if (idx !== -1) {
      startIndex = idx;
      break;
    }
  }

  const sliced = normalized.slice(startIndex).trim();
  // Keep prompt size manageable for consistent extraction.
  return sliced.slice(0, 18000);
}

function normalizeCityState(location) {
  const loc = String(location || "").trim();
  if (!loc) return "";
  const stateMap = {
    alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
    colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
    hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS",
    kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA",
    michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
    nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
    "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
    oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
    virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY"
  };
  const m = loc.match(/^([^,]+),\s*([A-Za-z ]+)$/);
  if (!m) return loc;
  const city = m[1].trim();
  const st = m[2].trim();
  const abbr = stateMap[st.toLowerCase()] || st.toUpperCase();
  return `${city}, ${abbr}`;
}

function extractBulletSection(text, headerRegex, stopRegexes) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const out = [];
  let inSection = false;

  for (const line of lines) {
    if (!inSection && headerRegex.test(line)) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (stopRegexes.some((r) => r.test(line))) break;

    const cleaned = line.replace(/^[•\-*]\s*/, "").trim();
    if (!cleaned) continue;
    if (cleaned.length < 4) continue;
    if (cleaned.endsWith(":")) continue;
    out.push(cleaned);
  }
  return Array.from(new Set(out)).slice(0, 12);
}

function heuristicTextExtraction(text) {
  const clean = String(text || "");
  const titleMatch =
    clean.match(/^\s*([^\n]{4,120})\n[^\n]*\nOverview/im) ||
    clean.match(/Job description\s*\n\s*([^\n]{4,120})/i);
  const companyMatch =
    clean.match(/About the employer\s*\n\s*([^\n]{2,120})/i) ||
    clean.match(/About\s+([A-Za-z0-9&.,' -]{2,120})/i);
  const locationMatch =
    clean.match(/\b([A-Z][a-zA-Z .'-]+,\s*[A-Z]{2}|[A-Z][a-zA-Z .'-]+,\s*[A-Za-z ]+)\b/) || [];

  const responsibilities = extractBulletSection(
    clean,
    /^(What You['’]ll Do|Responsibilities|Operational Metrics Support|Cost & Data Analysis|Project & Process Exposure|Reporting & Presentation)$/i,
    [/^(Qualifications|What You Bring|What Success Looks Like|Benefits|About the employer)$/i]
  );

  const qualifications = extractBulletSection(
    clean,
    /^(Qualifications|What You Bring)$/i,
    [/^(What Success Looks Like|Why |Benefits|About the employer)$/i]
  );

  const overviewMatch =
    clean.match(/(Founded in .*?\.|premier .*?\.|family-owned .*?\.)/i) ||
    clean.match(/(We['’]re seeking .*?growth\.)/i);

  return {
    jobTitle: titleMatch ? titleMatch[1].trim() : "",
    companyName: companyMatch ? companyMatch[1].trim() : "",
    location: normalizeCityState(locationMatch[1] || ""),
    responsibilities,
    qualifications,
    companyInformation: overviewMatch ? overviewMatch[1].trim() : "",
    companyWebsiteLink: ""
  };
}

async function extractJobFieldsFromText(webDescription) {
  const preparedText = cleanupWebDescription(webDescription);
  const fallback = heuristicTextExtraction(preparedText);
  let parsed = {};

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You extract structured job data from raw job-posting text and return strict JSON."
        },
        { role: "user", content: buildTextExtractionPrompt(preparedText) }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {};
  }
  const toBullets = (arr) =>
    Array.isArray(arr)
      ? arr
          .map((x) => String(x || "").trim())
          .filter(Boolean)
          .map((x) => `- ${x}`)
          .join("\n")
      : "";

  return {
    jobTitle: String(parsed.jobTitle || fallback.jobTitle || "").trim(),
    companyName: String(parsed.companyName || fallback.companyName || "").trim(),
    location: normalizeCityState(String(parsed.location || fallback.location || "").trim()),
    responsibilities: toBullets(
      Array.isArray(parsed.responsibilities) && parsed.responsibilities.length
        ? parsed.responsibilities
        : fallback.responsibilities
    ),
    qualifications: toBullets(
      Array.isArray(parsed.qualifications) && parsed.qualifications.length
        ? parsed.qualifications
        : fallback.qualifications
    ),
    companyInformation: String(parsed.companyInformation || fallback.companyInformation || "").trim(),
    companyWebsiteLink: String(parsed.companyWebsiteLink || fallback.companyWebsiteLink || "").trim()
  };
}

function buildImproveParagraphsPrompt(payload) {
  const {
    companyName,
    companyInformation,
    responsibilities,
    qualifications,
    improvementPrompt,
    improvedParagraph1,
    improvedParagraph2,
    improvedParagraph3,
    improvedParagraph4,
    improvedParagraph5,
    paragraph1,
    paragraph2,
    paragraph3,
    paragraph4,
    paragraph5
  } = payload;

  return `You are rewriting a cover-letter template into improved, role-tailored paragraphs.

Company: ${companyName}
Company information:
${companyInformation}

Responsibilities:
${responsibilities}

Qualifications:
${qualifications}

Template paragraphs:
1) ${paragraph1}
2) ${paragraph2}
3) ${paragraph3}
4) ${paragraph4}
5) ${paragraph5}

User custom improvement prompt (optional):
${improvementPrompt || "Not provided"}

Per-paragraph user notes/instructions (optional; if provided treat them as guidance and then rewrite):
1) ${improvedParagraph1 || "Not provided"}
2) ${improvedParagraph2 || "Not provided"}
3) ${improvedParagraph3 || "Not provided"}
4) ${improvedParagraph4 || "Not provided"}
5) ${improvedParagraph5 || "Not provided"}

Instructions:
1) Return ONLY valid JSON with keys: improvedParagraph1, improvedParagraph2, improvedParagraph3, improvedParagraph4, improvedParagraph5.
2) Keep each improved paragraph aligned to its template paragraph number.
3) Tailor wording to responsibilities and qualifications.
3.1) Apply any custom user notes/prompts provided above.
4) In improvedParagraph4, include company-specific information and replace any [company] placeholder with "${companyName}".
5) Keep each paragraph concise and natural (2-4 sentences each).`;
}

async function generateImprovedParagraphs(payload) {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "You improve template cover-letter paragraphs and return strict JSON when asked."
      },
      { role: "user", content: buildImproveParagraphsPrompt(payload) }
    ]
  });

  const raw = completion.choices?.[0]?.message?.content?.trim() || "";
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  return {
    improvedParagraph1: parsed.improvedParagraph1 || "",
    improvedParagraph2: parsed.improvedParagraph2 || "",
    improvedParagraph3: parsed.improvedParagraph3 || "",
    improvedParagraph4: parsed.improvedParagraph4 || "",
    improvedParagraph5: parsed.improvedParagraph5 || ""
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/master-cv", async (_req, res) => {
  try {
    if (!dbReady) {
      return res.status(503).json({
        error: "PostgreSQL is not available. Start DB and restart backend."
      });
    }
    const result = await dbPool.query("SELECT content, updated_at FROM master_cv WHERE id = 1");
    const row = result.rows[0] || { content: "", updated_at: null };
    return res.json({
      content: row.content || "",
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error("Load master CV failed:", error);
    return res.status(500).json({ error: "Failed to load master CV." });
  }
});

app.put("/api/master-cv", async (req, res) => {
  try {
    if (!dbReady) {
      return res.status(503).json({
        error: "PostgreSQL is not available. Start DB and restart backend."
      });
    }
    const content = String(req.body?.content || "");
    const result = await dbPool.query(
      `
      INSERT INTO master_cv (id, content, updated_at)
      VALUES (1, $1, NOW())
      ON CONFLICT (id)
      DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
      RETURNING updated_at
    `,
      [content]
    );
    return res.json({
      saved: true,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    console.error("Save master CV failed:", error);
    return res.status(500).json({ error: "Failed to save master CV." });
  }
});

app.get("/api/form-record", async (_req, res) => {
  try {
    if (!dbReady) {
      return res.status(503).json({
        error: "PostgreSQL is not available. Start DB and restart backend to use Save/Edit."
      });
    }
    const columnSelect = [...JobApplication.dbColumns, "updated_at"].join(", ");
    const result = await dbPool.query(`SELECT ${columnSelect} FROM job_application WHERE id = 1`);
    if (result.rowCount === 0) {
      return res.json({ record: null });
    }
    return res.json({
      record: {
        ...JobApplication.fromDbRow(result.rows[0]),
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error("Load form record failed:", error);
    return res.status(500).json({ error: "Failed to load saved form record." });
  }
});

app.get("/api/applications", async (_req, res) => {
  try {
    if (!dbReady) {
      return res.status(503).json({
        error: "PostgreSQL is not available. Start DB and restart backend."
      });
    }
    const result = await dbPool.query(`
      SELECT id, role, company_name, job_title, date, location, updated_at
      FROM job_application
      ORDER BY updated_at DESC, id DESC
    `);
    return res.json({
      applications: result.rows.map((row) => ({
        id: row.id,
        role: row.role || "",
        companyName: row.company_name || "",
        jobTitle: row.job_title || "",
        date: row.date || "",
        location: row.location || "",
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    console.error("List applications failed:", error);
    return res.status(500).json({ error: "Failed to list applications." });
  }
});

app.get("/api/applications/:id", async (req, res) => {
  try {
    if (!dbReady) {
      return res.status(503).json({
        error: "PostgreSQL is not available. Start DB and restart backend."
      });
    }
    const id = parseApplicationId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "Invalid application id." });
    }

    const columnSelect = [...JobApplication.dbColumns, "updated_at"].join(", ");
    const result = await dbPool.query(`SELECT ${columnSelect} FROM job_application WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Application not found." });
    }
    return res.json({
      id,
      record: {
        ...JobApplication.fromDbRow(result.rows[0]),
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error("Get application failed:", error);
    return res.status(500).json({ error: "Failed to load application." });
  }
});

app.post("/api/applications", async (req, res) => {
  try {
    if (!dbReady) {
      return res.status(503).json({
        error: "PostgreSQL is not available. Start DB and restart backend."
      });
    }
    const data = JobApplication.sanitizePayload(req.body || {});
    const dbValues = JobApplication.toDbValues(data);
    const cols = JobApplication.dbColumns;
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const result = await dbPool.query(
      `
      INSERT INTO job_application (${cols.join(", ")}, updated_at)
      VALUES (${placeholders}, NOW())
      RETURNING id, updated_at
    `,
      dbValues
    );
    return res.status(201).json({
      created: true,
      id: result.rows[0].id,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    console.error("Create application failed:", error);
    return res.status(500).json({ error: "Failed to create application." });
  }
});

app.put("/api/applications/:id", async (req, res) => {
  try {
    if (!dbReady) {
      return res.status(503).json({
        error: "PostgreSQL is not available. Start DB and restart backend."
      });
    }
    const id = parseApplicationId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "Invalid application id." });
    }

    const data = JobApplication.sanitizePayload(req.body || {});
    const dbValues = JobApplication.toDbValues(data);
    const cols = JobApplication.dbColumns;
    const setClause = cols.map((column, idx) => `${column} = $${idx + 1}`).join(", ");
    const result = await dbPool.query(
      `
      UPDATE job_application
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${cols.length + 1}
      RETURNING updated_at
    `,
      [...dbValues, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Application not found." });
    }

    return res.json({
      saved: true,
      id,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    console.error("Update application failed:", error);
    return res.status(500).json({ error: "Failed to update application." });
  }
});

app.delete("/api/applications/:id", async (req, res) => {
  try {
    if (!dbReady) {
      return res.status(503).json({
        error: "PostgreSQL is not available. Start DB and restart backend."
      });
    }
    const id = parseApplicationId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "Invalid application id." });
    }
    const result = await dbPool.query("DELETE FROM job_application WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Application not found." });
    }
    return res.json({ deleted: true, id });
  } catch (error) {
    console.error("Delete application failed:", error);
    return res.status(500).json({ error: "Failed to delete application." });
  }
});

app.get("/api/templates", async (_req, res) => {
  try {
    const templateRoot = process.env.TEMPLATE_ROOT || process.cwd();
    const templatesDir = path.resolve(templateRoot, "templates");
    const entries = await readdir(templatesDir, { withFileTypes: true });
    const templates = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".docx"))
      .map((entry) => ({
        name: entry.name,
        path: path.resolve(templatesDir, entry.name)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return res.json({ templates });
  } catch (error) {
    return res.json({ templates: [] });
  }
});

app.put("/api/form-record", async (req, res) => {
  try {
    if (!dbReady) {
      return res.status(503).json({
        error: "PostgreSQL is not available. Start DB and restart backend to use Save/Edit."
      });
    }
    const data = JobApplication.sanitizePayload(req.body || {});
    const dbValues = JobApplication.toDbValues(data);
    const cols = JobApplication.dbColumns;
    const insertCols = ["id", ...cols].join(", ");
    const placeholders = ["$1", ...cols.map((_, i) => `$${i + 2}`)].join(", ");
    const updateSet = cols.map((c) => `${c} = EXCLUDED.${c}`).join(", ");
    const result = await dbPool.query(
      `
      INSERT INTO job_application (${insertCols}, updated_at)
      VALUES (${placeholders}, NOW())
      ON CONFLICT (id)
      DO UPDATE SET ${updateSet}, updated_at = NOW()
      RETURNING updated_at
    `,
      [1, ...dbValues]
    );

    return res.json({
      saved: true,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    console.error("Save form record failed:", error);
    return res.status(500).json({ error: "Failed to save form record." });
  }
});

app.post("/api/extract-job-fields", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing. Add it to your environment before extracting fields."
      });
    }

    const jobLink = pickJobLink(req.body || {});

    if (!jobLink) {
      return res.status(400).json({
        error: "Provide one link: officialJobLink, jobrightLink, or linkedinLink."
      });
    }

    const candidates = buildExtractionCandidates(jobLink);
    let extracted = null;
    const errors = [];

    for (const candidate of candidates) {
      try {
        extracted = await runPythonExtractor(candidate);
        break;
      } catch (err) {
        errors.push(`${candidate} -> ${err.message}`);
      }
    }

    if (!extracted) {
      const reason = errors.join(" | ");
      const protectedHint =
        /403|forbidden|unauthorized|access denied/i.test(reason) &&
        /handshake|paycom|greenhouse|lever|workday/i.test(jobLink)
          ? " This job page appears protected. Use a public job post URL or paste the job description manually."
          : "";
      throw new Error(`Extraction failed for all URL variants.${protectedHint} Details: ${reason}`);
    }

    return res.json({
      jobLink,
      fields: {
        jobTitle: extracted.jobTitle || "",
        companyName: extracted.companyName || "",
        location: extracted.location || "",
        responsibilities: extracted.responsibilities || "",
        qualifications: extracted.qualifications || "",
        companyInformation: extracted.companyInformation || "",
        companyWebsiteLink: extracted.companyWebsiteLink || ""
      }
    });
  } catch (error) {
    console.error("Job field extraction failed:", error);

    return res.status(500).json({
      error: error.message || "Failed to extract fields from link."
    });
  }
});

app.post("/api/extract-job-fields-from-text", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing. Add it to your environment before extracting fields."
      });
    }

    const webDescription = req.body?.webDescription?.trim();
    if (!webDescription) {
      return res.status(400).json({
        error: "webDescription is required."
      });
    }

    const fields = await extractJobFieldsFromText(webDescription);
    return res.json({ fields });
  } catch (error) {
    console.error("Text-based extraction failed:", error);
    return res.status(500).json({
      error: error.message || "Failed to extract fields from pasted web description."
    });
  }
});

app.post("/api/template-paragraphs", async (req, res) => {
  try {
    const role = req.body?.role?.trim();

    if (!role) {
      return res.status(400).json({
        error: "Role is required to load template paragraphs."
      });
    }

    const templatePath = await resolveTemplatePath(role);
    const result = await mammoth.extractRawText({ path: templatePath });
    const allParagraphs = splitParagraphs(result.value || "");
    const selected = findTemplateParagraphs(allParagraphs);

    const payload = {
      paragraph1: selected[0] || "",
      paragraph2: selected[1] || "",
      paragraph3: selected[2] || "",
      paragraph4: selected[3] || "",
      paragraph5: selected[4] || ""
    };

    return res.json({
      templatePath,
      paragraphs: payload
    });
  } catch (error) {
    console.error("Template paragraph extraction failed:", error);
    return res.status(500).json({
      error: error.message || "Failed to load template paragraphs for role."
    });
  }
});

app.post("/api/improve-paragraphs", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing. Add it to your environment before improving paragraphs."
      });
    }

    const requiredFields = [
      "companyName",
      "companyInformation",
      "responsibilities",
      "qualifications",
      "paragraph1",
      "paragraph2",
      "paragraph3",
      "paragraph4",
      "paragraph5"
    ];
    const missing = requiredFields.filter((field) => !req.body[field]?.trim());
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(", ")}`
      });
    }

    const improved = await generateImprovedParagraphs(req.body);
    return res.json({ improved });
  } catch (error) {
    console.error("Paragraph improvement failed:", error);
    return res.status(500).json({
      error: "Failed to improve template paragraphs."
    });
  }
});

app.post("/api/export-cover-letter", async (req, res) => {
  try {
    const requiredFields = [
      "role",
      "date",
      "companyName",
      "location",
      "jobTitle",
      "improvedParagraph1",
      "improvedParagraph2",
      "improvedParagraph3",
      "improvedParagraph4",
      "improvedParagraph5"
    ];
    const missing = requiredFields.filter((field) => !req.body[field]?.trim());
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(", ")}`
      });
    }

    const templatePath = await resolveTemplatePath(req.body.role);
    const outputDir = path.resolve(__dirname, "../../..");

    const result = await runPythonExporter({
      ...req.body,
      templatePath,
      outputDir
    });

    return res.json({
      templatePath,
      outputDir,
      ...result
    });
  } catch (error) {
    console.error("Cover letter export failed:", error);
    return res.status(500).json({
      error:
        error.message ||
        "Failed to export cover letter. Ensure python-docx/docx2pdf dependencies are installed."
    });
  }
});

app.post("/api/generate-cover-letter", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing. Add it to your environment before generating letters."
      });
    }

    const requiredFields = [
      "role",
      "date",
      "companyName",
      "jobTitle",
      "location",
      "companyInformation",
      "paragraph1",
      "paragraph2",
      "paragraph3",
      "paragraph4",
      "paragraph5",
      "responsibilities",
      "qualifications"
    ];

    const missing = requiredFields.filter((field) => !req.body[field]?.trim());

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(", ")}`
      });
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You write compelling, truthful, ATS-friendly cover letters tailored to specific job details."
        },
        { role: "user", content: buildPrompt(req.body) }
      ]
    });

    const letter = completion.choices?.[0]?.message?.content?.trim();

    if (!letter) {
      return res.status(502).json({
        error: "Model returned an empty response."
      });
    }

    return res.json({ letter });
  } catch (error) {
    console.error("Cover letter generation failed:", error);

    return res.status(500).json({
      error: "Failed to generate cover letter. Please try again."
    });
  }
});

(async () => {
  try {
    await runMigrations(dbPool);
    dbReady = true;
  } catch (error) {
    dbReady = false;
    console.warn(
      "Database initialization failed. Save/Edit endpoints are disabled until Postgres is reachable.",
      error
    );
  }

  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
})();
