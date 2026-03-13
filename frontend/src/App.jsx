import { useEffect, useMemo, useRef, useState } from "react";
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
    exportDirectory: "",
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
  const [templateRoot, setTemplateRoot] = useState("");
  const [exportRoot, setExportRoot] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [templateFiles, setTemplateFiles] = useState([]);
  const [uploadingTemplates, setUploadingTemplates] = useState(false);
  const [masterCv, setMasterCv] = useState("");
  const [jobRoles, setJobRoles] = useState([]);
  const [loadingJobRoles, setLoadingJobRoles] = useState(false);
  const [savingJobRole, setSavingJobRole] = useState(false);
  const [deletingJobRoleId, setDeletingJobRoleId] = useState(null);
  const [selectedJobRoleId, setSelectedJobRoleId] = useState(null);
  const [showJobRoleForm, setShowJobRoleForm] = useState(false);
  const [uploadingRoleTemplate, setUploadingRoleTemplate] = useState(false);
  const roleTemplateInputRef = useRef(null);
  const [roleTemplateText, setRoleTemplateText] = useState("");
  const [loadingRoleTemplateText, setLoadingRoleTemplateText] = useState(false);
  const [savingRoleTemplateText, setSavingRoleTemplateText] = useState(false);
  const [roleTemplateTextDirty, setRoleTemplateTextDirty] = useState(false);
  const [jobRoleForm, setJobRoleForm] = useState({
    userId: 1,
    name: "",
    coverLetterTemplate: ""
  });
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

  const sortedJobRoles = useMemo(
    () => [...jobRoles].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
    [jobRoles]
  );

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
      if (data.templateRoot) {
        setTemplateRoot(String(data.templateRoot));
      }
    } catch {
      setTemplates([]);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load settings.");
      setTemplateRoot(String(data.templateRoot || ""));
      setExportRoot(String(data.exportRoot || ""));
      setForm((prev) => ({
        ...prev,
        exportDirectory: prev.exportDirectory || String(data.exportRoot || "")
      }));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateRoot,
          exportRoot
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save settings.");
      setTemplateRoot(String(data.templateRoot || ""));
      setExportRoot(String(data.exportRoot || ""));
      setFillInfo("Template/Export settings saved.");
      await loadTemplates();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const uploadTemplateFiles = async () => {
    if (!templateFiles.length) {
      setError("Choose one or more .docx template files first.");
      return;
    }
    setUploadingTemplates(true);
    setError("");
    try {
      const files = await Promise.all(
        templateFiles.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const raw = String(reader.result || "");
                const contentBase64 = raw.includes(",") ? raw.split(",")[1] : "";
                resolve({
                  name: file.name,
                  contentBase64
                });
              };
              reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
              reader.readAsDataURL(file);
            })
        )
      );

      const response = await fetch(`${API_BASE_URL}/api/templates/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to upload templates.");

      setFillInfo(`Uploaded ${data.uploaded || 0} template file(s).`);
      setTemplateFiles([]);
      await loadTemplates();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploadingTemplates(false);
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

  const loadJobRoles = async () => {
    setLoadingJobRoles(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/job-roles`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load job roles.");
      const nextRoles = Array.isArray(data.jobRoles) ? data.jobRoles : [];
      setJobRoles(nextRoles);
      if (nextRoles.length === 0) {
        setShowJobRoleForm(false);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingJobRoles(false);
    }
  };

  const resetJobRoleForm = () => {
    setSelectedJobRoleId(null);
    setJobRoleForm({
      userId: 1,
      name: "",
      coverLetterTemplate: ""
    });
    setRoleTemplateText("");
    setRoleTemplateTextDirty(false);
  };

  const startCreateJobRole = () => {
    resetJobRoleForm();
    setShowJobRoleForm(true);
  };

  const openJobRole = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/job-roles/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load job role.");
      const role = data.jobRole || {};
      setSelectedJobRoleId(role.id || id);
      setJobRoleForm({
        userId: Number(role.userId || 1),
        name: String(role.name || ""),
        coverLetterTemplate: String(role.coverLetterTemplate || "")
      });
      setRoleTemplateText("");
      setRoleTemplateTextDirty(false);
      setShowJobRoleForm(true);
      setFillInfo(`Loaded job role #${id}.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveJobRole = async () => {
    setSavingJobRole(true);
    setError("");
    try {
      const payload = {
        name: String(jobRoleForm.name || "").trim(),
        coverLetterTemplate: String(jobRoleForm.coverLetterTemplate || "").trim()
      };
      if (!payload.name) {
        throw new Error("Job role name is required.");
      }
      const method = selectedJobRoleId ? "PUT" : "POST";
      const url = selectedJobRoleId
        ? `${API_BASE_URL}/api/job-roles/${selectedJobRoleId}`
        : `${API_BASE_URL}/api/job-roles`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save job role.");
      const savedId = selectedJobRoleId || data.id;
      if (savedId) setSelectedJobRoleId(savedId);
      setShowJobRoleForm(true);
      await loadJobRoles();
      setFillInfo(selectedJobRoleId ? `Job role #${savedId} updated.` : `Job role #${savedId} created.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingJobRole(false);
    }
  };

  const onBrowseRoleTemplate = () => {
    roleTemplateInputRef.current?.click();
  };

  const onRoleTemplatePicked = async (event) => {
    const picked = Array.from(event.target.files || []);
    if (!picked.length) return;
    const file = picked[0];
    setUploadingRoleTemplate(true);
    setError("");
    try {
      const contentBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const raw = String(reader.result || "");
          resolve(raw.includes(",") ? raw.split(",")[1] : "");
        };
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      });

      const response = await fetch(`${API_BASE_URL}/api/templates/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [{ name: file.name, contentBase64 }]
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to upload selected template file.");
      const uploadedPath = data?.files?.[0]?.path || "";
      if (!uploadedPath) {
        throw new Error("Template uploaded but no file path was returned.");
      }
      setJobRoleForm((prev) => ({ ...prev, coverLetterTemplate: uploadedPath }));
      setRoleTemplateText("");
      setRoleTemplateTextDirty(false);
      setFillInfo(`Template selected and uploaded: ${file.name}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploadingRoleTemplate(false);
      event.target.value = "";
    }
  };

  const loadRoleTemplateFile = async () => {
    const filePath = String(jobRoleForm.coverLetterTemplate || "").trim();
    if (!filePath) {
      setError("Cover Letter Template Path is required.");
      return;
    }
    setLoadingRoleTemplateText(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/template-file/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load file text.");
      setRoleTemplateText(String(data.text || ""));
      setRoleTemplateTextDirty(false);
      setFillInfo("Template file loaded.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingRoleTemplateText(false);
    }
  };

  const saveRoleTemplateFile = async (silent = false) => {
    const filePath = String(jobRoleForm.coverLetterTemplate || "").trim();
    if (!filePath) {
      if (!silent) setError("Cover Letter Template Path is required.");
      return;
    }
    setSavingRoleTemplateText(true);
    if (!silent) setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/template-file/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath,
          text: roleTemplateText
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save file text.");
      setRoleTemplateTextDirty(false);
      if (!silent) setFillInfo("Word file updated.");
    } catch (requestError) {
      if (!silent) setError(requestError.message);
    } finally {
      setSavingRoleTemplateText(false);
    }
  };

  useEffect(() => {
    if (!roleTemplateTextDirty) return;
    const filePath = String(jobRoleForm.coverLetterTemplate || "").trim();
    if (!filePath) return;
    const timer = setTimeout(() => {
      saveRoleTemplateFile(true);
    }, 900);
    return () => clearTimeout(timer);
  }, [roleTemplateText, roleTemplateTextDirty, jobRoleForm.coverLetterTemplate]);

  const deleteJobRole = async (id) => {
    setDeletingJobRoleId(id);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/job-roles/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete job role.");
      if (selectedJobRoleId === id) {
        resetJobRoleForm();
        setShowJobRoleForm(false);
      }
      await loadJobRoles();
      setFillInfo(`Job role #${id} deleted.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingJobRoleId(null);
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
    loadSettings();
    loadApplications();
    loadTemplates();
    loadMasterCv();
    loadJobRoles();
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
            <Button variant={activeMenu === "job-roles" ? "default" : "secondary"} className="w-full justify-start" onClick={() => setActiveMenu("job-roles")}>5. Job Roles ({jobRoles.length})</Button>
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
                    <div className="space-y-1"><Label>Export Directory</Label><Input name="exportDirectory" value={form.exportDirectory} onChange={updateField} placeholder="/Users/uranbileg/Documents/JOB/cover_letter" /></div>
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
                <p className="text-sm text-muted-foreground">Change template folder path, then browse/upload `.docx` files from your laptop.</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Template Root Path</Label>
                    <Input
                      value={templateRoot}
                      onChange={(e) => setTemplateRoot(e.target.value)}
                      placeholder="/Users/uranbileg/Documents/JOB/job_hunting_tool"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Default Export Folder (Word/PDF)</Label>
                    <Input
                      value={exportRoot}
                      onChange={(e) => setExportRoot(e.target.value)}
                      placeholder="/Users/uranbileg/Documents/JOB/cover_letter"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={saveSettings} disabled={savingSettings}>
                    {savingSettings ? "Saving..." : "Save Paths"}
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label>Browse Template Files (.docx)</Label>
                  <Input
                    type="file"
                    multiple
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => setTemplateFiles(Array.from(e.target.files || []))}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={uploadTemplateFiles}
                    disabled={uploadingTemplates || templateFiles.length === 0}
                  >
                    {uploadingTemplates ? "Uploading..." : "Upload Selected Templates"}
                  </Button>
                  {templateFiles.length ? (
                    <p className="text-sm text-muted-foreground">
                      {templateFiles.length} file(s) selected
                    </p>
                  ) : null}
                </div>
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

          {activeMenu === "job-roles" ? (
            <Card className="min-h-0">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Job Roles</CardTitle>
                <Button type="button" variant="secondary" onClick={loadJobRoles} disabled={loadingJobRoles}>
                  {loadingJobRoles ? "Refreshing..." : "Refresh"}
                </Button>
              </CardHeader>
              <CardContent className="h-full overflow-auto space-y-3">
                {showJobRoleForm ? (
                  <div className="rounded-md border border-border bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Form View</h3>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowJobRoleForm(false)}
                      >
                        Back To Tree
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={saveJobRole} disabled={savingJobRole}>
                        {savingJobRole ? "Saving..." : selectedJobRoleId ? `Update #${selectedJobRoleId}` : "Create"}
                      </Button>
                      <Button type="button" variant="secondary" onClick={startCreateJobRole}>
                        Clear
                      </Button>
                      {selectedJobRoleId ? (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => deleteJobRole(selectedJobRoleId)}
                          disabled={deletingJobRoleId === selectedJobRoleId}
                        >
                          {deletingJobRoleId === selectedJobRoleId ? "Deleting..." : "Delete Current"}
                        </Button>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <Label>User ID</Label>
                      <Input value={String(jobRoleForm.userId || 1)} readOnly />
                    </div>
                    <div className="space-y-1">
                      <Label>Name*</Label>
                      <Input
                        value={jobRoleForm.name}
                        onChange={(e) =>
                          setJobRoleForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Data engineer"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Cover Letter Template Path</Label>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          value={jobRoleForm.coverLetterTemplate}
                          onChange={(e) =>
                            setJobRoleForm((prev) => ({
                              ...prev,
                              coverLetterTemplate: e.target.value
                            }))
                          }
                          placeholder="/Users/uranbileg/Documents/JOB/job_hunting_tool/templates/data_engineer.docx"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={onBrowseRoleTemplate}
                          disabled={uploadingRoleTemplate}
                        >
                          {uploadingRoleTemplate ? "Uploading..." : "Browse"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={loadRoleTemplateFile}
                          disabled={loadingRoleTemplateText || uploadingRoleTemplate}
                        >
                          {loadingRoleTemplateText ? "Loading..." : "Load File"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => saveRoleTemplateFile(false)}
                          disabled={savingRoleTemplateText || loadingRoleTemplateText}
                        >
                          {savingRoleTemplateText ? "Updating..." : "Update File"}
                        </Button>
                        <input
                          ref={roleTemplateInputRef}
                          type="file"
                          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="hidden"
                          onChange={onRoleTemplatePicked}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Template File Text</Label>
                      <Textarea
                        value={roleTemplateText}
                        onChange={(e) => {
                          setRoleTemplateText(e.target.value);
                          setRoleTemplateTextDirty(true);
                        }}
                        rows={12}
                        placeholder="Click Load File to view template text. Editing this area updates the Word file."
                      />
                      <p className="text-xs text-muted-foreground">
                        Changes auto-save to the Word file after you pause typing.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-border bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Tree View</h3>
                      <Button type="button" variant="secondary" size="sm" onClick={startCreateJobRole}>
                        Create
                      </Button>
                    </div>
                    {sortedJobRoles.length === 0 && !showJobRoleForm ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">No job roles yet.</p>
                        <Button type="button" onClick={startCreateJobRole}>Create</Button>
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      {sortedJobRoles.map((role) => (
                        <div
                          key={role.id}
                          className={`flex cursor-pointer flex-col gap-2 rounded border p-2 md:flex-row md:items-start md:justify-between ${
                            selectedJobRoleId === role.id
                              ? "border-primary bg-secondary/40"
                              : "border-border"
                          }`}
                          onClick={() => openJobRole(role.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openJobRole(role.id);
                            }
                          }}
                        >
                          <div>
                            <div className="font-medium">#{role.id} {role.name}</div>
                            <p className="text-xs text-muted-foreground break-all">
                              {role.coverLetterTemplate || "No template path"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openJobRole(role.id);
                              }}
                            >
                              Open
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteJobRole(role.id);
                              }}
                              disabled={deletingJobRoleId === role.id}
                            >
                              {deletingJobRoleId === role.id ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
