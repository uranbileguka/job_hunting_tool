import { useEffect, useMemo, useState } from "react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Select } from "./components/ui/select";
import { Textarea } from "./components/ui/textarea";

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
  const [masterCv, setMasterCv] = useState("");
  const [loadingMasterCv, setLoadingMasterCv] = useState(false);
  const [savingMasterCv, setSavingMasterCv] = useState(false);

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

  const loadMasterCv = async () => {
    setLoadingMasterCv(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/master-cv`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load master CV.");
      setMasterCv(String(data.content || ""));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingMasterCv(false);
    }
  };

  const saveMasterCv = async () => {
    setSavingMasterCv(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/master-cv`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: masterCv })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save master CV.");
      setFillInfo("Master CV saved.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingMasterCv(false);
    }
  };

  useEffect(() => {
    loadApplications();
    loadTemplates();
    loadMasterCv();
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
    <div className="h-full p-3">
      <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit lg:h-full">
          <CardHeader>
            <CardTitle>Menu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant={activeMenu === "new" ? "default" : "secondary"} className="w-full justify-start" onClick={() => setActiveMenu("new")}>1. New Form</Button>
            <Button variant={activeMenu === "applications" ? "default" : "secondary"} className="w-full justify-start" onClick={() => setActiveMenu("applications")}>2. Applications ({applications.length})</Button>
            <Button variant={activeMenu === "templates" ? "default" : "secondary"} className="w-full justify-start" onClick={() => setActiveMenu("templates")}>3. Templates</Button>
            <Button variant={activeMenu === "master-cv" ? "default" : "secondary"} className="w-full justify-start" onClick={() => setActiveMenu("master-cv")}>4. Master CV</Button>
          </CardContent>
        </Card>

        <div className="grid min-h-0 grid-rows-[auto_auto_1fr_auto_auto] gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Job Hunting Assistant</h1>
          <p className="text-sm text-muted-foreground">Generate tailored cover letters with GenAI.</p>

          {activeMenu === "new" ? (
            <Card className="min-h-0">
              <CardContent className="h-full overflow-auto pt-4">
                <form onSubmit={generateCoverLetter} className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={startNewForm}>New</Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={saveApplication}
                      disabled={savingRecord || loadingRecord || loading || extracting || improving || loadingTemplate}
                    >
                      {savingRecord ? "Saving..." : currentApplicationId ? `Update #${currentApplicationId}` : "Save New"}
                    </Button>
                    {currentApplicationId ? (
                      <Button type="button" variant="destructive" onClick={() => deleteApplication(currentApplicationId)} disabled={deletingId === currentApplicationId}>
                        {deletingId === currentApplicationId ? "Deleting..." : "Delete Current"}
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1">
                      <Label>Role*</Label>
                      <Select name="role" value={form.role} onChange={updateField} required>
                        <option value="">Select role</option>
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>LinkedIn Link</Label><Input name="linkedinLink" type="url" value={form.linkedinLink} onChange={updateField} /></div>
                    <div className="space-y-1"><Label>Jobright Link</Label><Input name="jobrightLink" type="url" value={form.jobrightLink} onChange={updateField} /></div>
                    <div className="space-y-1"><Label>Official Job Link</Label><Input name="officialJobLink" type="url" value={form.officialJobLink} onChange={updateField} /></div>
                    <div className="space-y-1"><Label>Company Website Link</Label><Input name="companyWebsiteLink" type="url" value={form.companyWebsiteLink} onChange={updateField} /></div>
                    <div className="space-y-1"><Label>Date*</Label><Input name="date" type="date" value={form.date} onChange={updateField} required /></div>
                    <div className="space-y-1"><Label>Company Name*</Label><Input name="companyName" value={form.companyName} onChange={updateField} required /></div>
                    <div className="space-y-1"><Label>Job Title*</Label><Input name="jobTitle" value={form.jobTitle} onChange={updateField} required /></div>
                    <div className="space-y-1"><Label>Location*</Label><Input name="location" value={form.location} onChange={updateField} required /></div>
                    <div className="space-y-1 md:col-span-2 xl:col-span-2">
                      <Label>Web Description</Label>
                      <Textarea name="webDescription" value={form.webDescription} onChange={updateField} rows={2} placeholder="Paste full job/company text from the web here..." />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={extractFieldsFromLink} disabled={!hasAnyJobLink || extracting || loading || savingRecord || loadingRecord}>{extracting ? "Filling..." : "Fill Fields From Link"}</Button>
                    <Button type="button" variant="secondary" onClick={loadParagraphsFromTemplate} disabled={!form.role || loadingTemplate || loading || improving || savingRecord || loadingRecord}>{loadingTemplate ? "Loading..." : "Load Paragraph 1-5 From Role Template"}</Button>
                    <Button type="button" variant="secondary" onClick={extractFieldsFromWebDescription} disabled={!form.webDescription || extracting || loading || improving || loadingTemplate || savingRecord || loadingRecord}>{extracting ? "Filling..." : "Fill From Web Description"}</Button>
                    <Button type="button" variant="secondary" onClick={generateImprovedParagraphs} disabled={loading || extracting || loadingTemplate || improving || exporting || savingRecord || loadingRecord}>{improving ? "Improving..." : "Generate Improved Paragraphs"}</Button>
                    <Button type="button" variant="secondary" onClick={exportCoverLetterFiles} disabled={loading || extracting || loadingTemplate || improving || exporting || savingRecord || loadingRecord}>{exporting ? "Exporting..." : "Export DOCX + PDF"}</Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                    <div className="space-y-1 xl:col-span-2"><Label>Company Information*</Label><Textarea name="companyInformation" value={form.companyInformation} onChange={updateField} rows={2} required /></div>
                    <div className="space-y-1"><Label>Responsibilities*</Label><Textarea name="responsibilities" value={form.responsibilities} onChange={updateField} rows={2} required /></div>
                    <div className="space-y-1"><Label>Qualifications*</Label><Textarea name="qualifications" value={form.qualifications} onChange={updateField} rows={2} required /></div>
                    <div className="space-y-1 xl:col-span-2"><Label>Improvement Prompt (Optional)</Label><Textarea name="improvementPrompt" value={form.improvementPrompt} onChange={updateField} rows={2} /></div>

                    <div className="space-y-1"><Label>Improved Paragraph 1</Label><Textarea name="improvedParagraph1" value={form.improvedParagraph1} onChange={updateField} rows={2} /></div>
                    <div className="space-y-1"><Label>Improved Paragraph 2</Label><Textarea name="improvedParagraph2" value={form.improvedParagraph2} onChange={updateField} rows={2} /></div>
                    <div className="space-y-1"><Label>Improved Paragraph 3</Label><Textarea name="improvedParagraph3" value={form.improvedParagraph3} onChange={updateField} rows={2} /></div>
                    <div className="space-y-1"><Label>Improved Paragraph 4</Label><Textarea name="improvedParagraph4" value={form.improvedParagraph4} onChange={updateField} rows={2} /></div>
                    <div className="space-y-1 xl:col-span-2"><Label>Improved Paragraph 5</Label><Textarea name="improvedParagraph5" value={form.improvedParagraph5} onChange={updateField} rows={2} /></div>

                    <div className="space-y-1"><Label>Template Paragraph 1*</Label><Textarea name="paragraph1" value={form.paragraph1} onChange={updateField} rows={2} required /></div>
                    <div className="space-y-1"><Label>Template Paragraph 2*</Label><Textarea name="paragraph2" value={form.paragraph2} onChange={updateField} rows={2} required /></div>
                    <div className="space-y-1"><Label>Template Paragraph 3*</Label><Textarea name="paragraph3" value={form.paragraph3} onChange={updateField} rows={2} required /></div>
                    <div className="space-y-1"><Label>Template Paragraph 4*</Label><Textarea name="paragraph4" value={form.paragraph4} onChange={updateField} rows={2} required /></div>
                    <div className="space-y-1 xl:col-span-2"><Label>Template Paragraph 5*</Label><Textarea name="paragraph5" value={form.paragraph5} onChange={updateField} rows={2} required /></div>
                  </div>

                  <Button type="submit" disabled={isDisabled || loading || extracting || loadingTemplate || improving || exporting || savingRecord || loadingRecord}>{loading ? "Generating..." : "Generate Cover Letter"}</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {activeMenu === "applications" ? (
            <Card className="min-h-0">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Applications</CardTitle>
                <Button type="button" variant="secondary" onClick={loadApplications} disabled={loadingApplications}>{loadingApplications ? "Refreshing..." : "Refresh"}</Button>
              </CardHeader>
              <CardContent className="h-full overflow-auto space-y-3">
                {groupedApplications.length === 0 ? <p className="text-sm text-muted-foreground">No applications yet.</p> : null}
                {groupedApplications.map(([company, apps]) => (
                  <details key={company} className="rounded-md border border-border bg-white p-2" open>
                    <summary className="cursor-pointer text-sm font-semibold">{company} ({apps.length})</summary>
                    <div className="mt-2 space-y-2">
                      {apps.map((app) => (
                        <div key={app.id} className="flex flex-col gap-2 rounded-md border border-border p-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="font-semibold">#{app.id} {app.jobTitle || "Untitled"}</div>
                            <p className="text-xs text-muted-foreground">{app.role || "No role"} | {app.location || "No location"} | {app.date || "No date"}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="secondary" onClick={() => loadApplication(app.id)}>Open/Edit</Button>
                            <Button type="button" variant="destructive" onClick={() => deleteApplication(app.id)} disabled={deletingId === app.id}>{deletingId === app.id ? "Deleting..." : "Delete"}</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {activeMenu === "templates" ? (
            <Card className="min-h-0">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Templates</CardTitle>
                <Button type="button" variant="secondary" onClick={loadTemplates}>Refresh</Button>
              </CardHeader>
              <CardContent className="h-full overflow-auto space-y-2">
                <p className="text-sm text-muted-foreground">Templates are loaded from backend templates folder.</p>
                {templates.length === 0 ? <p className="text-sm text-muted-foreground">No template files found.</p> : null}
                {templates.map((tpl) => (
                  <div key={tpl.path} className="rounded-md border border-border bg-white p-2">
                    <div className="font-medium">{tpl.name}</div>
                    <div className="text-xs text-muted-foreground break-all">{tpl.path}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {activeMenu === "master-cv" ? (
            <Card className="min-h-0">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Master CV</CardTitle>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={loadMasterCv} disabled={loadingMasterCv}>
                    {loadingMasterCv ? "Loading..." : "Refresh"}
                  </Button>
                  <Button type="button" onClick={saveMasterCv} disabled={savingMasterCv || loadingMasterCv}>
                    {savingMasterCv ? "Saving..." : "Save Master CV"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="h-full overflow-auto space-y-2">
                <p className="text-sm text-muted-foreground">
                  Store your full master CV text here. It is saved in PostgreSQL.
                </p>
                <Textarea
                  value={masterCv}
                  onChange={(e) => setMasterCv(e.target.value)}
                  rows={20}
                  className="min-h-[60vh]"
                  placeholder="Paste your full master CV text..."
                />
              </CardContent>
            </Card>
          ) : null}

          {error ? <Badge className="bg-destructive text-destructive-foreground">{error}</Badge> : null}
          {fillInfo ? <Badge>{fillInfo}</Badge> : null}
          {exportInfo ? <p className="text-sm text-muted-foreground">{exportInfo}</p> : null}

          {letter ? (
            <Card className="max-h-[28vh] overflow-auto">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Generated Cover Letter</CardTitle>
                <Button type="button" onClick={() => navigator.clipboard.writeText(letter)}>Copy</Button>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-serif leading-6">{letter}</pre>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
