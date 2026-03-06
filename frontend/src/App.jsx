import { useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const roleOptions = [
  "Software engineering intern",
  "Software engineer",
  "Data engineer",
  "Data engineering intern",
  "Ai engineer",
  "Ai engineer intern",
  "ERP consultant",
  "ERP consulatnt inteneer",
  "solution engineer"
];

const initialForm = {
  role: "",
  linkedinLink: "",
  jobrightLink: "",
  officialJobLink: "",
  companyWebsiteLink: "",
  date: "",
  companyName: "",
  jobTitle: "",
  location: "",
  companyInformation: "",
  improvementPrompt: "",
  improvedParagraph1: "",
  improvedParagraph2: "",
  improvedParagraph3: "",
  improvedParagraph4: "",
  improvedParagraph5: "",
  paragraph1: "",
  paragraph2: "",
  paragraph3: "",
  paragraph4: "",
  paragraph5: "",
  responsibilities: "",
  qualifications: ""
};

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [improving, setImproving] = useState(false);
  const [error, setError] = useState("");

  const isDisabled = useMemo(
    () =>
      !form.role ||
      !form.date ||
      !form.companyName ||
      !form.jobTitle ||
      !form.location ||
      !form.companyInformation ||
      !form.paragraph1 ||
      !form.paragraph2 ||
      !form.paragraph3 ||
      !form.paragraph4 ||
      !form.paragraph5 ||
      !form.responsibilities ||
      !form.qualifications,
    [form]
  );

  const hasAnyJobLink = useMemo(
    () => Boolean(form.officialJobLink || form.jobrightLink || form.linkedinLink),
    [form]
  );

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const extractFieldsFromLink = async () => {
    setExtracting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/extract-job-fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officialJobLink: form.officialJobLink,
          jobrightLink: form.jobrightLink,
          linkedinLink: form.linkedinLink
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract fields from link.");
      }

      const extracted = data.fields || {};

      setForm((prev) => ({
        ...prev,
        companyName: extracted.companyName || prev.companyName,
        jobTitle: extracted.jobTitle || prev.jobTitle,
        location: extracted.location || prev.location,
        responsibilities: extracted.responsibilities || prev.responsibilities,
        qualifications: extracted.qualifications || prev.qualifications,
        companyInformation: extracted.companyInformation || prev.companyInformation,
        companyWebsiteLink: extracted.companyWebsiteLink || prev.companyWebsiteLink
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setExtracting(false);
    }
  };

  const loadParagraphsFromTemplate = async () => {
    setLoadingTemplate(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/template-paragraphs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: form.role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load template paragraphs.");
      }

      const paragraphs = data.paragraphs || {};

      setForm((prev) => ({
        ...prev,
        paragraph1: paragraphs.paragraph1 || prev.paragraph1,
        paragraph2: paragraphs.paragraph2 || prev.paragraph2,
        paragraph3: paragraphs.paragraph3 || prev.paragraph3,
        paragraph4: paragraphs.paragraph4 || prev.paragraph4,
        paragraph5: paragraphs.paragraph5 || prev.paragraph5
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingTemplate(false);
    }
  };

  const generateCoverLetter = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      let payload = { ...form };
      const improvedEmpty = [
        payload.improvedParagraph1,
        payload.improvedParagraph2,
        payload.improvedParagraph3,
        payload.improvedParagraph4,
        payload.improvedParagraph5
      ].every((p) => !String(p || "").trim());

      if (improvedEmpty) {
        const improveResponse = await fetch(`${API_BASE_URL}/api/improve-paragraphs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const improveData = await improveResponse.json();
        if (!improveResponse.ok) {
          throw new Error(improveData.error || "Failed to improve template paragraphs.");
        }

        const improved = improveData.improved || {};
        payload = {
          ...payload,
          improvedParagraph1: improved.improvedParagraph1 || "",
          improvedParagraph2: improved.improvedParagraph2 || "",
          improvedParagraph3: improved.improvedParagraph3 || "",
          improvedParagraph4: improved.improvedParagraph4 || "",
          improvedParagraph5: improved.improvedParagraph5 || ""
        };

        setForm((prev) => ({
          ...prev,
          improvedParagraph1: payload.improvedParagraph1,
          improvedParagraph2: payload.improvedParagraph2,
          improvedParagraph3: payload.improvedParagraph3,
          improvedParagraph4: payload.improvedParagraph4,
          improvedParagraph5: payload.improvedParagraph5
        }));
      }

      const response = await fetch(`${API_BASE_URL}/api/generate-cover-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate cover letter.");
      }

      setLetter(data.letter || "");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const generateImprovedParagraphs = async () => {
    setImproving(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/improve-paragraphs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to improve template paragraphs.");
      }

      const improved = data.improved || {};
      setForm((prev) => ({
        ...prev,
        improvedParagraph1: improved.improvedParagraph1 || prev.improvedParagraph1,
        improvedParagraph2: improved.improvedParagraph2 || prev.improvedParagraph2,
        improvedParagraph3: improved.improvedParagraph3 || prev.improvedParagraph3,
        improvedParagraph4: improved.improvedParagraph4 || prev.improvedParagraph4,
        improvedParagraph5: improved.improvedParagraph5 || prev.improvedParagraph5
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setImproving(false);
    }
  };

  return (
    <div className="page">
      <main className="container">
        <h1>Job Hunting Assistant</h1>
        <p className="subhead">Generate tailored cover letters with GenAI.</p>

        <form onSubmit={generateCoverLetter} className="card compact-form">
          <div className="grid">
            <label>
              Role*
              <select name="role" value={form.role} onChange={updateField} required>
                <option value="">Select role</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label>
              LinkedIn Link
              <input
                name="linkedinLink"
                type="url"
                value={form.linkedinLink}
                onChange={updateField}
              />
            </label>
            <label>
              Jobright Link
              <input name="jobrightLink" type="url" value={form.jobrightLink} onChange={updateField} />
            </label>
            <label>
              Official Job Link
              <input
                name="officialJobLink"
                type="url"
                value={form.officialJobLink}
                onChange={updateField}
              />
            </label>
            <label>
              Company Website Link
              <input
                name="companyWebsiteLink"
                type="url"
                value={form.companyWebsiteLink}
                onChange={updateField}
              />
            </label>
            <label>
              Date*
              <input name="date" type="date" value={form.date} onChange={updateField} required />
            </label>
            <label>
              Company Name*
              <input name="companyName" value={form.companyName} onChange={updateField} required />
            </label>
            <label>
              Job Title*
              <input name="jobTitle" value={form.jobTitle} onChange={updateField} required />
            </label>
            <label>
              Location*
              <input name="location" value={form.location} onChange={updateField} required />
            </label>
          </div>

          <div className="action-row">
            <button
              className="secondary"
              type="button"
              onClick={extractFieldsFromLink}
              disabled={!hasAnyJobLink || extracting || loading}
            >
              {extracting ? "Filling..." : "Fill Fields From Link"}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={loadParagraphsFromTemplate}
              disabled={!form.role || loadingTemplate || loading || improving}
            >
              {loadingTemplate ? "Loading..." : "Load Paragraph 1-5 From Role Template"}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={generateImprovedParagraphs}
              disabled={loading || extracting || loadingTemplate || improving}
            >
              {improving ? "Improving..." : "Generate Improved Paragraphs"}
            </button>
          </div>

          <div className="long-grid">
            <label className="span-2">
              Company Information*
              <textarea
                name="companyInformation"
                value={form.companyInformation}
                onChange={updateField}
                rows="2"
                required
              />
            </label>

            <label>
              Responsibilities*
              <textarea
                name="responsibilities"
                value={form.responsibilities}
                onChange={updateField}
                rows="2"
                required
              />
            </label>

            <label>
              Qualifications*
              <textarea
                name="qualifications"
                value={form.qualifications}
                onChange={updateField}
                rows="2"
                required
              />
            </label>

            <label className="span-2">
              Improvement Prompt (Optional)
              <textarea
                name="improvementPrompt"
                value={form.improvementPrompt}
                onChange={updateField}
                rows="2"
                placeholder="Example: Add leadership impact, mention cloud migration, keep tone concise."
              />
            </label>

            <label>
              Improved Paragraph 1
              <textarea
                name="improvedParagraph1"
                value={form.improvedParagraph1}
                onChange={updateField}
                rows="2"
              />
            </label>

            <label>
              Improved Paragraph 2
              <textarea
                name="improvedParagraph2"
                value={form.improvedParagraph2}
                onChange={updateField}
                rows="2"
              />
            </label>

            <label>
              Improved Paragraph 3
              <textarea
                name="improvedParagraph3"
                value={form.improvedParagraph3}
                onChange={updateField}
                rows="2"
              />
            </label>

            <label>
              Improved Paragraph 4
              <textarea
                name="improvedParagraph4"
                value={form.improvedParagraph4}
                onChange={updateField}
                rows="2"
              />
            </label>

            <label className="span-2">
              Improved Paragraph 5
              <textarea
                name="improvedParagraph5"
                value={form.improvedParagraph5}
                onChange={updateField}
                rows="2"
              />
            </label>

            <label>
              Template Paragraph 1*
              <textarea name="paragraph1" value={form.paragraph1} onChange={updateField} rows="2" required />
            </label>

            <label>
              Template Paragraph 2*
              <textarea name="paragraph2" value={form.paragraph2} onChange={updateField} rows="2" required />
            </label>

            <label>
              Template Paragraph 3*
              <textarea name="paragraph3" value={form.paragraph3} onChange={updateField} rows="2" required />
            </label>

            <label>
              Template Paragraph 4*
              <textarea name="paragraph4" value={form.paragraph4} onChange={updateField} rows="2" required />
            </label>

            <label className="span-2">
              Template Paragraph 5*
              <textarea name="paragraph5" value={form.paragraph5} onChange={updateField} rows="2" required />
            </label>
          </div>

          <button
            type="submit"
            disabled={isDisabled || loading || extracting || loadingTemplate || improving}
          >
            {loading ? "Generating..." : "Generate Cover Letter"}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        {letter ? (
          <section className="card output">
            <div className="output-header">
              <h2>Generated Cover Letter</h2>
              <button type="button" onClick={() => navigator.clipboard.writeText(letter)}>
                Copy
              </button>
            </div>
            <pre>{letter}</pre>
          </section>
        ) : null}
      </main>
    </div>
  );
}
