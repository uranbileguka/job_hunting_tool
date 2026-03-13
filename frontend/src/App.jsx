import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

function getTodayLocalDate() {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

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

function createInitialForm() {
  return {
    role: "",
    linkedinLink: "",
    jobrightLink: "",
    officialJobLink: "",
    companyWebsiteLink: "",
    date: getTodayLocalDate(),
    companyName: "",
    jobTitle: "",
    location: "",
    webDescription: "",
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
}

export default function App() {
  const [activeMenu, setActiveMenu] = useState("new");
  const [form, setForm] = useState(createInitialForm());
  const [currentApplicationId, setCurrentApplicationId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [improving, setImproving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportInfo, setExportInfo] = useState("");
  const [fillInfo, setFillInfo] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
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

  const groupedApplications = useMemo(() => {
    const groups = new Map();
    for (const app of applications) {
      const key = app.companyName || "Unknown Company";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(app);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [applications]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const loadApplications = async () => {
    setLoadingApplications(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load applications.");
      setApplications(Array.isArray(data.applications) ? data.applications : []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingApplications(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/templates`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load templates.");
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch {
      setTemplates([]);
    }
  };

  useEffect(() => {
    loadApplications();
    loadTemplates();
  }, []);

  const startNewForm = () => {
    setForm(createInitialForm());
    setCurrentApplicationId(null);
    setLetter("");
    setExportInfo("");
    setError("");
    setFillInfo("Ready for a new application form.");
    setActiveMenu("new");
  };

  const loadApplication = async (id) => {
    setLoadingRecord(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load application.");
      setForm((prev) => ({ ...prev, ...(data.record || {}) }));
      setCurrentApplicationId(id);
      setActiveMenu("new");
      setFillInfo(`Loaded application #${id}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingRecord(false);
    }
  };

  const saveApplication = async () => {
    setSavingRecord(true);
    setError("");
    setFillInfo("");
    try {
      const method = currentApplicationId ? "PUT" : "POST";
      const url = currentApplicationId
        ? `${API_BASE_URL}/api/applications/${currentApplicationId}`
        : `${API_BASE_URL}/api/applications`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save application.");

      const id = currentApplicationId || data.id;
      if (id) setCurrentApplicationId(id);
      await loadApplications();
      setFillInfo(currentApplicationId ? `Application #${id} updated.` : `Application #${id} created.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingRecord(false);
    }
  };

  const deleteApplication = async (id) => {
    setDeletingId(id);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications/${id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete application.");

      if (currentApplicationId === id) {
        setCurrentApplicationId(null);
        setForm(createInitialForm());
        setLetter("");
      }
      await loadApplications();
      setFillInfo(`Application #${id} deleted.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  };

  const extractFieldsFromLink = async () => {
    setExtracting(true);
    setError("");
    setFillInfo("");

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
      if (!response.ok) throw new Error(data.error || "Failed to extract fields from link.");

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
      setFillInfo("Done: fields filled from link.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setExtracting(false);
    }
  };

  const extractFieldsFromWebDescription = async () => {
    setExtracting(true);
    setError("");
    setFillInfo("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/extract-job-fields-from-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webDescription: form.webDescription })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to extract fields from web description.");

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
      setFillInfo("Done: fields filled from web description.");
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
      if (!response.ok) throw new Error(data.error || "Failed to load template paragraphs.");

      const paragraphs = data.paragraphs || {};
      setForm((prev) => ({
        ...prev,
        paragraph1: paragraphs.paragraph1 || prev.paragraph1,
        paragraph2: paragraphs.paragraph2 || prev.paragraph2,
        paragraph3: paragraphs.paragraph3 || prev.paragraph3,
        paragraph4: paragraphs.paragraph4 || prev.paragraph4,
        paragraph5: paragraphs.paragraph5 || prev.paragraph5
      }));
      setFillInfo("Done: template paragraphs loaded.");
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
      if (!response.ok) throw new Error(data.error || "Failed to generate cover letter.");
      setLetter(data.letter || "");
      setFillInfo("Done: cover letter generated.");
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
      if (!response.ok) throw new Error(data.error || "Failed to improve template paragraphs.");

      const improved = data.improved || {};
      setForm((prev) => ({
        ...prev,
        improvedParagraph1: improved.improvedParagraph1 || prev.improvedParagraph1,
        improvedParagraph2: improved.improvedParagraph2 || prev.improvedParagraph2,
        improvedParagraph3: improved.improvedParagraph3 || prev.improvedParagraph3,
        improvedParagraph4: improved.improvedParagraph4 || prev.improvedParagraph4,
        improvedParagraph5: improved.improvedParagraph5 || prev.improvedParagraph5
      }));
      setFillInfo("Done: improved paragraphs generated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setImproving(false);
    }
  };

  const exportCoverLetterFiles = async () => {
    setExporting(true);
    setError("");
    setExportInfo("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/export-cover-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to export cover letter files.");

      const pdfPart = data.pdfCreated
        ? `PDF: ${data.pdfPath}`
        : `PDF not created${data.pdfError ? ` (${data.pdfError})` : ""}`;
      setExportInfo(`DOCX: ${data.docxPath} | ${pdfPart}`);
      setFillInfo("Done: export completed.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page app-layout">
      <aside className="card sidebar">
        <h2>Menu</h2>
        <button type="button" className={activeMenu === "new" ? "secondary active" : "secondary"} onClick={() => setActiveMenu("new")}>1. New Form</button>
        <button type="button" className={activeMenu === "applications" ? "secondary active" : "secondary"} onClick={() => setActiveMenu("applications")}>2. Applications ({applications.length})</button>
        <button type="button" className={activeMenu === "templates" ? "secondary active" : "secondary"} onClick={() => setActiveMenu("templates")}>3. Templates</button>
      </aside>

      <main className="container">
        <h1>Job Hunting Assistant</h1>
        <p className="subhead">Generate tailored cover letters with GenAI.</p>

        {activeMenu === "new" ? (
          <form onSubmit={generateCoverLetter} className="card compact-form">
            <div className="action-row">
              <button className="secondary" type="button" onClick={startNewForm}>New</button>
              <button
                className="secondary"
                type="button"
                onClick={saveApplication}
                disabled={savingRecord || loadingRecord || loading || extracting || improving || loadingTemplate}
              >
                {savingRecord ? "Saving..." : currentApplicationId ? `Update #${currentApplicationId}` : "Save New"}
              </button>
              {currentApplicationId ? (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => deleteApplication(currentApplicationId)}
                  disabled={deletingId === currentApplicationId}
                >
                  {deletingId === currentApplicationId ? "Deleting..." : "Delete Current"}
                </button>
              ) : null}
            </div>

            <div className="grid">
              <label>
                Role*
                <select name="role" value={form.role} onChange={updateField} required>
                  <option value="">Select role</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>
              <label>
                LinkedIn Link
                <input name="linkedinLink" type="url" value={form.linkedinLink} onChange={updateField} />
              </label>
              <label>
                Jobright Link
                <input name="jobrightLink" type="url" value={form.jobrightLink} onChange={updateField} />
              </label>
              <label>
                Official Job Link
                <input name="officialJobLink" type="url" value={form.officialJobLink} onChange={updateField} />
              </label>
              <label>
                Company Website Link
                <input name="companyWebsiteLink" type="url" value={form.companyWebsiteLink} onChange={updateField} />
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
              <label className="span-2">
                Web Description
                <textarea
                  name="webDescription"
                  value={form.webDescription}
                  onChange={updateField}
                  rows="2"
                  placeholder="Paste full job/company text from the web here..."
                />
              </label>
            </div>

            <div className="action-row">
              <button className="secondary" type="button" onClick={extractFieldsFromLink} disabled={!hasAnyJobLink || extracting || loading || savingRecord || loadingRecord}>
                {extracting ? "Filling..." : "Fill Fields From Link"}
              </button>
              <button className="secondary" type="button" onClick={loadParagraphsFromTemplate} disabled={!form.role || loadingTemplate || loading || improving || savingRecord || loadingRecord}>
                {loadingTemplate ? "Loading..." : "Load Paragraph 1-5 From Role Template"}
              </button>
              <button className="secondary" type="button" onClick={extractFieldsFromWebDescription} disabled={!form.webDescription || extracting || loading || improving || loadingTemplate || savingRecord || loadingRecord}>
                {extracting ? "Filling..." : "Fill From Web Description"}
              </button>
              <button className="secondary" type="button" onClick={generateImprovedParagraphs} disabled={loading || extracting || loadingTemplate || improving || exporting || savingRecord || loadingRecord}>
                {improving ? "Improving..." : "Generate Improved Paragraphs"}
              </button>
              <button className="secondary" type="button" onClick={exportCoverLetterFiles} disabled={loading || extracting || loadingTemplate || improving || exporting || savingRecord || loadingRecord}>
                {exporting ? "Exporting..." : "Export DOCX + PDF"}
              </button>
            </div>

            <div className="long-grid">
              <label className="span-2">
                Company Information*
                <textarea name="companyInformation" value={form.companyInformation} onChange={updateField} rows="2" required />
              </label>

              <label>
                Responsibilities*
                <textarea name="responsibilities" value={form.responsibilities} onChange={updateField} rows="2" required />
              </label>

              <label>
                Qualifications*
                <textarea name="qualifications" value={form.qualifications} onChange={updateField} rows="2" required />
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
                <textarea name="improvedParagraph1" value={form.improvedParagraph1} onChange={updateField} rows="2" />
              </label>
              <label>
                Improved Paragraph 2
                <textarea name="improvedParagraph2" value={form.improvedParagraph2} onChange={updateField} rows="2" />
              </label>
              <label>
                Improved Paragraph 3
                <textarea name="improvedParagraph3" value={form.improvedParagraph3} onChange={updateField} rows="2" />
              </label>
              <label>
                Improved Paragraph 4
                <textarea name="improvedParagraph4" value={form.improvedParagraph4} onChange={updateField} rows="2" />
              </label>
              <label className="span-2">
                Improved Paragraph 5
                <textarea name="improvedParagraph5" value={form.improvedParagraph5} onChange={updateField} rows="2" />
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
              disabled={isDisabled || loading || extracting || loadingTemplate || improving || exporting || savingRecord || loadingRecord}
            >
              {loading ? "Generating..." : "Generate Cover Letter"}
            </button>
          </form>
        ) : null}

        {activeMenu === "applications" ? (
          <section className="card compact-form">
            <div className="output-header">
              <h2>Applications</h2>
              <button type="button" className="secondary" onClick={loadApplications} disabled={loadingApplications}>
                {loadingApplications ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {groupedApplications.length === 0 ? <p>No applications yet.</p> : null}

            {groupedApplications.map(([company, apps]) => (
              <details key={company} className="tree-group" open>
                <summary>{company} ({apps.length})</summary>
                <div className="tree-items">
                  {apps.map((app) => (
                    <div className="tree-item" key={app.id}>
                      <div>
                        <strong>#{app.id}</strong> {app.jobTitle || "Untitled"}
                        <div className="muted">{app.role || "No role"} | {app.location || "No location"} | {app.date || "No date"}</div>
                      </div>
                      <div className="tree-actions">
                        <button type="button" className="secondary" onClick={() => loadApplication(app.id)}>Open/Edit</button>
                        <button type="button" className="secondary" onClick={() => deleteApplication(app.id)} disabled={deletingId === app.id}>
                          {deletingId === app.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </section>
        ) : null}

        {activeMenu === "templates" ? (
          <section className="card compact-form">
            <div className="output-header">
              <h2>Templates</h2>
              <button type="button" className="secondary" onClick={loadTemplates}>Refresh</button>
            </div>
            <p className="muted">Templates are loaded from backend `/templates` folder.</p>
            {templates.length === 0 ? <p>No template files found.</p> : null}
            {templates.map((tpl) => (
              <div key={tpl.path} className="tree-item">
                <div>
                  <strong>{tpl.name}</strong>
                  <div className="muted">{tpl.path}</div>
                </div>
              </div>
            ))}
          </section>
        ) : null}

        {error ? <p className="error">{error}</p> : null}
        {fillInfo ? <p className="success">{fillInfo}</p> : null}
        {exportInfo ? <p>{exportInfo}</p> : null}

        {letter ? (
          <section className="card output">
            <div className="output-header">
              <h2>Generated Cover Letter</h2>
              <button type="button" onClick={() => navigator.clipboard.writeText(letter)}>Copy</button>
            </div>
            <pre>{letter}</pre>
          </section>
        ) : null}
      </main>
    </div>
  );
}
