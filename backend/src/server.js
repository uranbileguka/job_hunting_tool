import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";

dotenv.config({ path: "../.env" });
dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extractScriptPath = path.resolve(__dirname, "../scripts/extract_job_info.py");

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

function pickJobLink(payload) {
  return (
    payload.officialJobLink?.trim() || payload.jobrightLink?.trim() || payload.linkedinLink?.trim() || ""
  );
}

function runPythonExtractor(jobLink) {
  return new Promise((resolve, reject) => {
    const python = spawn("python3", [extractScriptPath, jobLink], {
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

    const extracted = await runPythonExtractor(jobLink);

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
      error:
        "Failed to extract fields from link. Ensure Python dependencies from backend/scripts/requirements.txt are installed."
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

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
