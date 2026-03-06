import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    paragraph1,
    paragraph2,
    paragraph3,
    paragraph4,
    paragraph5,
    responsibilities,
    qualifications
  } = payload;

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
- Paragraph 1: ${paragraph1}
- Paragraph 2: ${paragraph2}
- Paragraph 3: ${paragraph3}
- Paragraph 4: ${paragraph4}
- Paragraph 5: ${paragraph5}

Responsibilities input:
${responsibilities}

Qualifications input:
${qualifications}

Requirements:
1) Return exactly 5 cover-letter paragraphs first.
2) Keep a professional and confident tone.
3) Use paragraph guidance as the primary content for each corresponding paragraph.
4) Make grammar and flow natural while preserving meaning.
5) Use Company information to strengthen relevance and company-specific alignment.
6) After the 5 paragraphs, append two sections at the end in this order:
Responsibilities:
- bullet list based on Responsibilities input
Qualifications:
- bullet list based on Qualifications input
7) Return only plain text with no markdown fences.`;
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
        qualifications: extracted.qualifications || ""
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
