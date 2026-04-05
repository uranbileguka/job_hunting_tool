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

function createInitialForm() {
  return {
    role: "",
    linkedinLink: "",
    jobrightLink: "",
    officialJobLink: "",
    companyWebsiteLink: "",
    date: getTodayLocalDate(),
    appliedDate: "",
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
    qualifications: "",
    resumeSummary: "",
    resumeExperience: "",
    resumeSkills: "",
    coverLetterDocxPath: "",
    coverLetterPdfPath: "",
    resumeDocxPath: "",
    resumePdfPath: "",
    status: "in_process"
  };
}

function createEmptyResumeJob() {
  return {
    title: "",
    dateRange: "",
    company: "",
    details: ""
  };
}

function toFixedFiveResumeJobs(items = []) {
  const next = Array.from({ length: 5 }, (_, idx) => items[idx] || createEmptyResumeJob());
  return next.map((item) => ({
    title: String(item.title || ""),
    dateRange: String(item.dateRange || ""),
    company: String(item.company || ""),
    details: String(item.details || "")
  }));
}

function fileNameFromPath(filePath = "") {
  const value = String(filePath || "").trim();
  if (!value) return "";
  const normalized = value.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "";
}

function prettyStatus(status = "") {
  const raw = String(status || "").trim().toLowerCase();
  if (!raw) return "In Process";
  return raw
    .split("_")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function readApplicationIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("applicationId");
    if (!raw) return null;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
  } catch {
    return null;
  }
}

function readUiStateFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const menu = String(params.get("menu") || "").trim();
    const page = String(params.get("page") || "").trim();
    return { menu, page };
  } catch {
    return { menu: "", page: "" };
  }
}

export default function App() {
  const [activeMenu, setActiveMenu] = useState("new");
  const [form, setForm] = useState(createInitialForm());
  const [currentApplicationId, setCurrentApplicationId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateRoot, setTemplateRoot] = useState("");
  const [wordExportRoot, setWordExportRoot] = useState("");
  const [pdfExportRoot, setPdfExportRoot] = useState("");
  const [resumeDefaultRoot, setResumeDefaultRoot] = useState("");
  const [resumePdfRoot, setResumePdfRoot] = useState("");
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
  const [uploadingCvTemplate, setUploadingCvTemplate] = useState(false);
  const roleTemplateInputRef = useRef(null);
  const cvTemplateInputRef = useRef(null);
  const [roleTemplateText, setRoleTemplateText] = useState("");
  const [loadingRoleTemplateText, setLoadingRoleTemplateText] = useState(false);
  const [savingRoleTemplateText, setSavingRoleTemplateText] = useState(false);
  const [jobRoleForm, setJobRoleForm] = useState({
    userId: 1,
    name: "",
    coverLetterTemplate: "",
    cvTemplate: "",
    cvText: ""
  });
  const [loadingMasterCv, setLoadingMasterCv] = useState(false);
  const [savingMasterCv, setSavingMasterCv] = useState(false);

  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [improving, setImproving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportInfo, setExportInfo] = useState("");
  const [fillInfo, setFillInfo] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("in_process");
  const [applicationCompanySearch, setApplicationCompanySearch] = useState("");
  const [applicationFormPage, setApplicationFormPage] = useState("det");
  const [loadingResumeExperience, setLoadingResumeExperience] = useState(false);
  const [resumeExperienceItems, setResumeExperienceItems] = useState(
    toFixedFiveResumeJobs([])
  );
  const [stateLogs, setStateLogs] = useState([]);
  const [loadingStateLogs, setLoadingStateLogs] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const initializedFromUrlRef = useRef(false);
  const validMenus = useMemo(
    () => new Set(["new", "applications", "templates", "master-cv", "job-roles"]),
    []
  );
  const validPages = useMemo(
    () => new Set(["det", "resume", "cover-letter", "exported", "state"]),
    []
  );

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

  const filteredApplications = useMemo(() => {
    const normalizedSearch = String(applicationCompanySearch || "").trim().toLowerCase();
    return applications.filter((app) => {
      const status = String(app.status || "in_process");
      const company = String(app.companyName || "").toLowerCase();
      const matchesStatus =
        applicationStatusFilter === "all" ? true : status === applicationStatusFilter;
      const matchesCompany = normalizedSearch ? company.includes(normalizedSearch) : true;
      return matchesStatus && matchesCompany;
    });
  }, [applications, applicationStatusFilter, applicationCompanySearch]);

  const groupedApplications = useMemo(() => {
    const groups = new Map();
    for (const app of filteredApplications) {
      const key = app.role || "Unknown Role";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(app);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredApplications]);

  const applicationStatusStats = useMemo(() => {
    const total = applications.length;
    const applied = applications.filter((a) => String(a.status || "") === "applied").length;
    const inProcess = total - applied;
    const appliedPercent = total > 0 ? Math.round((applied / total) * 100) : 0;
    const inProcessPercent = total > 0 ? 100 - appliedPercent : 0;
    return { total, applied, inProcess, appliedPercent, inProcessPercent };
  }, [applications]);

  const sortedJobRoles = useMemo(
    () => [...jobRoles].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
    [jobRoles]
  );

  const roleOptions = useMemo(
    () => sortedJobRoles.map((r) => String(r.name || "").trim()).filter(Boolean),
    [sortedJobRoles]
  );

  const autoGrowTextarea = (textarea) => {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const updateFieldAutoGrow = (event) => {
    updateField(event);
    autoGrowTextarea(event.target);
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMenuSelect = (menuKey) => {
    setActiveMenu(menuKey);
    setMobileMenuOpen(false);
  };

  const extractSectionByHeaders = (rawText, sectionHeaders = []) => {
    const text = String(rawText || "").replace(/\r/g, "");
    const rawLines = text.split("\n");
    const lines = rawLines.map((raw) => ({ raw, trim: raw.trim() }));
    const sectionHeaderRegex = new RegExp(`^(${sectionHeaders.join("|")})\\b`, "i");
    const knownSectionHeaderRegex =
      /^(education|skills|technical skills|core skills|key skills|projects|certifications|summary|profile|objective|publications|awards|volunteer|interests|activities|experience|work experience|professional experience|employment history)\b/i;

    const startIdx = lines.findIndex((line) => sectionHeaderRegex.test(line.trim));
    if (startIdx === -1) return "";

    const collected = [];
    for (let i = startIdx + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (knownSectionHeaderRegex.test(line.trim)) break;
      collected.push(line.raw);
    }
    return collected.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  };

  const extractExperienceSection = (rawText) => {
    return extractSectionByHeaders(rawText, [
      "experience",
      "work experience",
      "professional experience",
      "employment history"
    ]);
  };

  const extractSkillsSection = (rawText) => {
    return extractSectionByHeaders(rawText, [
      "skills",
      "technical skills",
      "core skills",
      "key skills"
    ]);
  };

  const parseExperienceEntries = (experienceText) => {
    const sourceLines = String(experienceText || "").replace(/\r/g, "").split("\n");
    const lines = sourceLines.map((raw) => ({ raw, trim: raw.trim() }));
    if (!lines.some((line) => line.trim)) return [];

    const month = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
    const dateRangeRegex = new RegExp(
      `${month}\\s+\\d{4}\\s*[–-]\\s*(Present|${month}\\s+\\d{4})$`,
      "i"
    );

    const entries = [];
    const looksLikeCompanyLocation = (value) => {
      const line = String(value || "").trim();
      if (!line) return false;
      if (/^[-*•]\s*/.test(line)) return false;
      if (/\d{4}/.test(line)) return false;
      if (line.length > 120) return false;
      if (/[.!?]$/.test(line)) return false;
      if (line.split(/\s+/).length > 12) return false;
      if (line.includes(",")) return true;
      if (/\b(LLC|Inc|Corp|Ltd|University|College|Technologies|Company|Co\.|Group)\b/i.test(line)) {
        return true;
      }
      return false;
    };

    const toBulletedLines = (rawLines) => {
      return rawLines
        .map((line) => String(line || "").trim())
        .filter(Boolean)
        .map((line) => {
          const cleaned = line.replace(/^[-*•]\s*/, "").trim();
          return `- ${cleaned}`;
        })
        .join("\n");
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim) {
        i += 1;
        continue;
      }
      const match = line.trim.match(dateRangeRegex);
      if (!match) {
        i += 1;
        continue;
      }

      const dateRange = match[0].trim();
      const title = line.trim.slice(0, line.trim.length - dateRange.length).trim();
      let company = "";
      const details = [];

      if (i + 1 < lines.length && lines[i + 1].trim && !dateRangeRegex.test(lines[i + 1].trim)) {
        company = lines[i + 1].raw.trim();
        i += 1;
      }

      i += 1;
      while (i < lines.length && !dateRangeRegex.test(lines[i].trim)) {
        if (lines[i].trim) {
          details.push(lines[i].raw);
        }
        i += 1;
      }

      // If company/location was captured inside details, move it to company field.
      if (!company && details.length && looksLikeCompanyLocation(details[0])) {
        company = String(details.shift() || "").trim();
      }

      entries.push({
        title: title || "Untitled Role",
        dateRange,
        company,
        details: toBulletedLines(details)
      });
    }

    return entries.slice(0, 5);
  };

  const loadResumeExperienceFromRole = async () => {
    const selectedRoleName = String(form.role || "").trim();
    if (!selectedRoleName) {
      setError("Select Role first to load CV experience.");
      return;
    }
    const selectedRole = sortedJobRoles.find(
      (role) => String(role.name || "").trim() === selectedRoleName
    );
    const cvTemplatePath = String(selectedRole?.cvTemplate || "").trim();
    if (!cvTemplatePath) {
      setError(`No CV Template Path found for role "${selectedRoleName}".`);
      return;
    }

    setLoadingResumeExperience(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/template-file/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: cvTemplatePath })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load CV template.");

      const text = String(data.text || "");
      const experience = extractExperienceSection(text);
      const skills = extractSkillsSection(text);
      if (!experience && !skills) throw new Error("No EXPERIENCE or SKILLS section found in CV template.");

      setForm((prev) => ({
        ...prev,
        resumeExperience: experience || prev.resumeExperience || "",
        resumeSkills: skills || prev.resumeSkills || ""
      }));
      setResumeExperienceItems(toFixedFiveResumeJobs(parseExperienceEntries(experience)));
      setFillInfo(`Resume EXPERIENCE loaded from ${cvTemplatePath}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingResumeExperience(false);
    }
  };

  const loadAndSplitResume = async () => {
    const selectedRoleName = String(form.role || "").trim();
    const selectedRole = sortedJobRoles.find(
      (role) => String(role.name || "").trim() === selectedRoleName
    );
    const cvTemplatePath = String(selectedRole?.cvTemplate || "").trim();

    if (selectedRoleName && cvTemplatePath) {
      await loadResumeExperienceFromRole();
      return;
    }

    const parsed = parseExperienceEntries(form.resumeExperience || "");
    if (!parsed.length) {
      setError("No CV template path for selected role and no parseable EXPERIENCE text.");
      return;
    }
    setResumeExperienceItems(toFixedFiveResumeJobs(parsed));
    setFillInfo("Resume EXPERIENCE split into 5 job fields.");
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
      setWordExportRoot(String(data.wordExportRoot || data.exportRoot || ""));
      setPdfExportRoot(String(data.pdfExportRoot || data.exportRoot || ""));
      setResumeDefaultRoot(String(data.resumeDefaultRoot || ""));
      setResumePdfRoot(String(data.resumePdfRoot || data.resumeDefaultRoot || ""));
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
          wordExportRoot,
          pdfExportRoot,
          resumeDefaultRoot,
          resumePdfRoot
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save settings.");
      setTemplateRoot(String(data.templateRoot || ""));
      setWordExportRoot(String(data.wordExportRoot || ""));
      setPdfExportRoot(String(data.pdfExportRoot || ""));
      setResumeDefaultRoot(String(data.resumeDefaultRoot || ""));
      setResumePdfRoot(String(data.resumePdfRoot || ""));
      setFillInfo("Template/Export settings saved.");
      await loadTemplates();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const browseExportDirectory = async (target) => {
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/system/pick-directory`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to pick directory.");
      const picked = String(data.directoryPath || "").trim();
      if (!picked) return;
      if (target === "word") {
        setWordExportRoot(picked);
      } else if (target === "pdf") {
        setPdfExportRoot(picked);
      } else if (target === "resume-word") {
        setResumeDefaultRoot(picked);
      } else {
        setResumePdfRoot(picked);
      }
    } catch (requestError) {
      setError(requestError.message);
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
      coverLetterTemplate: "",
      cvTemplate: "",
      cvText: ""
    });
    setRoleTemplateText("");
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
        coverLetterTemplate: String(role.coverLetterTemplate || ""),
        cvTemplate: String(role.cvTemplate || ""),
        cvText: String(role.cvText || "")
      });
      setRoleTemplateText("");
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
        coverLetterTemplate: String(jobRoleForm.coverLetterTemplate || "").trim(),
        cvTemplate: String(jobRoleForm.cvTemplate || "").trim(),
        cvText: String(jobRoleForm.cvText || "")
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

  const onBrowseRoleTemplate = async () => {
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/system/pick-docx`);
      const data = await response.json();
      if (response.ok && data?.filePath) {
        setJobRoleForm((prev) => ({ ...prev, coverLetterTemplate: String(data.filePath) }));
        setRoleTemplateText("");
        setFillInfo(`Template selected: ${data.filePath}`);
        return;
      }
    } catch {
      // Fallback below.
    }

    if (roleTemplateInputRef.current) {
      roleTemplateInputRef.current.value = "";
      roleTemplateInputRef.current.click();
    }
  };

  const onRoleTemplatePicked = async (event) => {
    const picked = Array.from(event.target.files || []);
    if (!picked.length) return;
    const file = picked[0];
    const localPath =
      typeof file.path === "string" && file.path.trim().toLowerCase().endsWith(".docx")
        ? file.path.trim()
        : "";

    if (localPath) {
      setJobRoleForm((prev) => ({ ...prev, coverLetterTemplate: localPath }));
      setRoleTemplateText("");
      setFillInfo(`Template selected: ${localPath}`);
      event.target.value = "";
      return;
    }

    setUploadingRoleTemplate(true);
    setError("");
    try {
      const contentBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const bytes = new Uint8Array(reader.result);
            let binary = "";
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.subarray(i, i + chunkSize);
              binary += String.fromCharCode(...chunk);
            }
            resolve(btoa(binary));
          } catch {
            reject(new Error(`Failed to encode ${file.name}`));
          }
        };
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsArrayBuffer(file);
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
      const uploadedPath = String(data?.filePath || data?.files?.[0]?.path || "").trim();
      if (!uploadedPath) {
        throw new Error("Template uploaded but no file path was returned.");
      }
      setJobRoleForm((prev) => ({ ...prev, coverLetterTemplate: uploadedPath }));
      setRoleTemplateText("");
      setFillInfo(`Template selected and uploaded: ${file.name}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploadingRoleTemplate(false);
      event.target.value = "";
    }
  };

  const onBrowseCvTemplate = async () => {
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/system/pick-docx`);
      const data = await response.json();
      if (response.ok && data?.filePath) {
        setJobRoleForm((prev) => ({ ...prev, cvTemplate: String(data.filePath) }));
        setFillInfo(`CV template selected: ${data.filePath}`);
        return;
      }
    } catch {
      // Fallback below.
    }

    if (cvTemplateInputRef.current) {
      cvTemplateInputRef.current.value = "";
      cvTemplateInputRef.current.click();
    }
  };

  const onCvTemplatePicked = async (event) => {
    const picked = Array.from(event.target.files || []);
    if (!picked.length) return;
    const file = picked[0];
    const localPath =
      typeof file.path === "string" && file.path.trim().toLowerCase().endsWith(".docx")
        ? file.path.trim()
        : "";

    if (localPath) {
      setJobRoleForm((prev) => ({ ...prev, cvTemplate: localPath }));
      setFillInfo(`CV template selected: ${localPath}`);
      event.target.value = "";
      return;
    }

    setUploadingCvTemplate(true);
    setError("");
    try {
      const contentBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const bytes = new Uint8Array(reader.result);
            let binary = "";
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.subarray(i, i + chunkSize);
              binary += String.fromCharCode(...chunk);
            }
            resolve(btoa(binary));
          } catch {
            reject(new Error(`Failed to encode ${file.name}`));
          }
        };
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsArrayBuffer(file);
      });

      const response = await fetch(`${API_BASE_URL}/api/templates/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [{ name: file.name, contentBase64 }]
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to upload selected CV template file.");
      const uploadedPath = String(data?.filePath || data?.files?.[0]?.path || "").trim();
      if (!uploadedPath) {
        throw new Error("CV template uploaded but no file path was returned.");
      }
      setJobRoleForm((prev) => ({ ...prev, cvTemplate: uploadedPath }));
      setFillInfo(`CV template selected and uploaded: ${file.name}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploadingCvTemplate(false);
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
      if (typeof data.text === "string") {
        setRoleTemplateText(data.text);
      }
      if (!silent) setFillInfo("Word file updated.");
    } catch (requestError) {
      if (!silent) setError(requestError.message);
    } finally {
      setSavingRoleTemplateText(false);
    }
  };

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

  useEffect(() => {
    const url = new URL(window.location.href);
    if (currentApplicationId) {
      url.searchParams.set("applicationId", String(currentApplicationId));
    } else {
      url.searchParams.delete("applicationId");
    }
    url.searchParams.set("menu", activeMenu);
    url.searchParams.set("page", applicationFormPage);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [currentApplicationId, activeMenu, applicationFormPage]);

  useEffect(() => {
    if (activeMenu !== "new") return;
    const nodes = document.querySelectorAll('textarea[data-autogrow="true"]');
    nodes.forEach((node) => autoGrowTextarea(node));
  }, [activeMenu, applicationFormPage, form]);

  useEffect(() => {
    if (activeMenu !== "new" || applicationFormPage !== "resume") return;
    if (loadingResumeExperience) return;
    if (String(form.resumeExperience || "").trim()) return;
    if (!String(form.role || "").trim()) return;
    const selectedRole = sortedJobRoles.find(
      (role) => String(role.name || "").trim() === String(form.role || "").trim()
    );
    if (!String(selectedRole?.cvTemplate || "").trim()) return;
    loadResumeExperienceFromRole();
  }, [
    activeMenu,
    applicationFormPage,
    form.resumeExperience,
    form.role,
    sortedJobRoles,
    loadingResumeExperience
  ]);

  useEffect(() => {
    if (activeMenu !== "new" || applicationFormPage !== "state") return;
    if (!currentApplicationId) {
      setStateLogs([]);
      return;
    }
    loadStateLogs(currentApplicationId);
  }, [activeMenu, applicationFormPage, currentApplicationId]);

  const startNewForm = () => {
    setForm(createInitialForm());
    setCurrentApplicationId(null);
    setApplicationFormPage("det");
    setResumeExperienceItems(toFixedFiveResumeJobs([]));
    setStateLogs([]);
    setLetter("");
    setExportInfo("");
    setError("");
    setFillInfo("Ready for a new application form.");
    setActiveMenu("new");
  };

  const loadApplication = async (id, options = {}) => {
    const keepPage = Boolean(options.keepPage);
    const keepMenu = Boolean(options.keepMenu);
    setLoadingRecord(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load application.");
      setForm((prev) => ({
        ...prev,
        ...(data.record || {}),
        status: String(data.record?.status || "in_process"),
        appliedDate: String(data.record?.appliedDate || ""),
        resumeExperience: "",
        resumeSkills: ""
      }));
      setResumeExperienceItems(toFixedFiveResumeJobs([]));
      setCurrentApplicationId(id);
      if (!keepPage) setApplicationFormPage("det");
      if (!keepMenu) setActiveMenu("new");
      setFillInfo(`Loaded application #${id}.`);
      await loadStateLogs(id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingRecord(false);
    }
  };

  useEffect(() => {
    if (initializedFromUrlRef.current) return;
    initializedFromUrlRef.current = true;
    const { menu, page } = readUiStateFromUrl();
    if (validMenus.has(menu)) setActiveMenu(menu);
    if (validPages.has(page)) setApplicationFormPage(page);
    const applicationIdFromUrl = readApplicationIdFromUrl();
    if (applicationIdFromUrl) {
      loadApplication(applicationIdFromUrl, { keepPage: true, keepMenu: true });
    }
  }, [validMenus, validPages]);

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

  const persistApplicationAfterAction = async (nextForm, successMessage = "") => {
    try {
      const method = currentApplicationId ? "PUT" : "POST";
      const url = currentApplicationId
        ? `${API_BASE_URL}/api/applications/${currentApplicationId}`
        : `${API_BASE_URL}/api/applications`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to auto-save application.");

      const id = currentApplicationId || data.id;
      if (id) setCurrentApplicationId(id);
      await loadApplications();
      if (successMessage) setFillInfo(successMessage);
    } catch (requestError) {
      setError(requestError.message);
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
        setStateLogs([]);
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

  const loadStateLogs = async (applicationId) => {
    if (!applicationId) {
      setStateLogs([]);
      return;
    }
    setLoadingStateLogs(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/state-log`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load state logs.");
      setStateLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingStateLogs(false);
    }
  };

  const updateApplicationStatus = async (id, status) => {
    if (!id) {
      setError("Save the application first before changing status.");
      return;
    }
    setChangingStatus(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update application status.");

      setApplications((prev) =>
        prev.map((app) =>
          app.id === id
            ? {
                ...app,
                status: String(data.status || status),
                appliedDate: String(data.appliedDate || app.appliedDate || "")
              }
            : app
        )
      );
      if (currentApplicationId === id) {
        setForm((prev) => ({
          ...prev,
          status: String(data.status || status),
          appliedDate: String(data.appliedDate || prev.appliedDate || "")
        }));
      }
      setFillInfo(`Application #${id} status updated to ${prettyStatus(status)}.`);
      await loadStateLogs(id);
      await loadApplications();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setChangingStatus(false);
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
        responsibilities: String(extracted.responsibilities || ""),
        qualifications: String(extracted.qualifications || ""),
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
        responsibilities: String(extracted.responsibilities || ""),
        qualifications: String(extracted.qualifications || ""),
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

  // Combined helper: fill job fields from either link or pasted web description, then load role template paragraphs.
  const fillFieldsAndLoadParagraphs = async () => {
    setAutoFilling(true);
    setError("");
    setFillInfo("");

    try {
      let extracted = {};

      if (String(form.webDescription || "").trim()) {
        const response = await fetch(`${API_BASE_URL}/api/extract-job-fields-from-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            webDescription: form.webDescription
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to extract fields from web description.");
        }
        extracted = data.fields || {};
      } else if (hasAnyJobLink) {
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
        extracted = data.fields || {};
      } else {
        throw new Error("Provide at least one job link or web description.");
      }

      const nextRole = form.role;
      if (!nextRole) {
        throw new Error("Role is required to load template paragraphs.");
      }

      const templateResponse = await fetch(`${API_BASE_URL}/api/template-paragraphs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole })
      });
      const templateData = await templateResponse.json();
      if (!templateResponse.ok) {
        throw new Error(templateData.error || "Failed to load template paragraphs.");
      }
      const paragraphs = templateData.paragraphs || {};

      const nextForm = {
        ...form,
        companyName: extracted.companyName || form.companyName,
        jobTitle: extracted.jobTitle || form.jobTitle,
        location: extracted.location || form.location,
        responsibilities: String(extracted.responsibilities || ""),
        qualifications: String(extracted.qualifications || ""),
        companyInformation: extracted.companyInformation || form.companyInformation,
        companyWebsiteLink: extracted.companyWebsiteLink || form.companyWebsiteLink,
        paragraph1: paragraphs.paragraph1 || form.paragraph1,
        paragraph2: paragraphs.paragraph2 || form.paragraph2,
        paragraph3: paragraphs.paragraph3 || form.paragraph3,
        paragraph4: paragraphs.paragraph4 || form.paragraph4,
        paragraph5: paragraphs.paragraph5 || form.paragraph5
      };
      setForm(nextForm);
      await persistApplicationAfterAction(nextForm, "Done: fields filled and paragraphs loaded.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAutoFilling(false);
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
      await persistApplicationAfterAction(payload, "Done: cover letter generated.");
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
      const nextForm = {
        ...form,
        improvedParagraph1: improved.improvedParagraph1 || form.improvedParagraph1,
        improvedParagraph2: improved.improvedParagraph2 || form.improvedParagraph2,
        improvedParagraph3: improved.improvedParagraph3 || form.improvedParagraph3,
        improvedParagraph4: improved.improvedParagraph4 || form.improvedParagraph4,
        improvedParagraph5: improved.improvedParagraph5 || form.improvedParagraph5
      };
      setForm(nextForm);
      await persistApplicationAfterAction(nextForm, "Done: improved paragraphs generated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setImproving(false);
    }
  };

  const improveResumeFields = async () => {
    setImproving(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/improve-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          resumeExperienceItems
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to improve resume.");

      const improved = data.improved || {};
      const nextJobs = toFixedFiveResumeJobs(Array.isArray(improved.jobs) ? improved.jobs : []);
      setResumeExperienceItems(nextJobs);
      const nextForm = {
        ...form,
        resumeSummary: String(improved.summary || form.resumeSummary || ""),
        resumeSkills: String(improved.skills || form.resumeSkills || "")
      };
      setForm(nextForm);
      await persistApplicationAfterAction(nextForm, "Done: resume improved.");
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
      const nextForm = {
        ...form,
        coverLetterDocxPath: String(data.docxPath || ""),
        coverLetterPdfPath: data.pdfCreated ? String(data.pdfPath || "") : ""
      };
      setForm(nextForm);
      setApplicationFormPage("exported");
      setExportInfo(`Cover Letter DOCX: ${data.docxPath} | ${pdfPart}`);
      await persistApplicationAfterAction(nextForm, "Done: export completed.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setExporting(false);
    }
  };

  const exportResumeFiles = async () => {
    setExporting(true);
    setError("");
    setExportInfo("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/export-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          resumeExperienceItems
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to export resume files.");

      const pdfPart = data.pdfCreated
        ? `PDF: ${data.pdfPath}`
        : `PDF not created${data.pdfError ? ` (${data.pdfError})` : ""}`;
      const nextForm = {
        ...form,
        resumeDocxPath: String(data.docxPath || ""),
        resumePdfPath: data.pdfCreated ? String(data.pdfPath || "") : ""
      };
      setForm(nextForm);
      setApplicationFormPage("exported");
      setExportInfo(`Resume DOCX: ${data.docxPath} | ${pdfPart}`);
      await persistApplicationAfterAction(nextForm, "Done: resume export completed.");
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
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="hidden lg:block">Menu</CardTitle>
            <Button
              type="button"
              variant="secondary"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <span className="inline-flex flex-col gap-1">
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
              </span>
            </Button>
          </CardHeader>
          <CardContent className={`${mobileMenuOpen ? "block" : "hidden"} space-y-2 lg:block`}>
            <Button variant={activeMenu === "new" ? "default" : "secondary"} className="w-full justify-start" onClick={() => handleMenuSelect("new")}>1. New Form</Button>
            <Button variant={activeMenu === "applications" ? "default" : "secondary"} className="w-full justify-start" onClick={() => handleMenuSelect("applications")}>2. Applications ({applications.length})</Button>
            <Button variant={activeMenu === "templates" ? "default" : "secondary"} className="w-full justify-start" onClick={() => handleMenuSelect("templates")}>3. Templates</Button>
            <Button variant={activeMenu === "master-cv" ? "default" : "secondary"} className="w-full justify-start" onClick={() => handleMenuSelect("master-cv")}>4. Master CV</Button>
            <Button variant={activeMenu === "job-roles" ? "default" : "secondary"} className="w-full justify-start" onClick={() => handleMenuSelect("job-roles")}>5. Job Roles ({jobRoles.length})</Button>
          </CardContent>
        </Card>

        <div className="grid min-h-0 grid-rows-[auto_auto_1fr_auto_auto] gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Job Hunting Assistant</h1>
          <p className="text-sm text-muted-foreground">Generate tailored cover letters with GenAI.</p>

          {activeMenu === "new" ? (
            <Card className="min-h-0">
              <CardContent className="h-full overflow-auto pt-4">
                <form onSubmit={generateCoverLetter} className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    Form ID: {currentApplicationId ? `#${currentApplicationId}` : "New"} | Current State: {prettyStatus(form.status)}
                  </div>
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
                    <Button
                      type="button"
                      onClick={fillFieldsAndLoadParagraphs}
                      disabled={
                        autoFilling ||
                        loading ||
                        improving ||
                        exporting ||
                        savingRecord ||
                        loadingRecord ||
                        (!hasAnyJobLink && !String(form.webDescription || "").trim()) ||
                        !form.role
                      }
                    >
                      {autoFilling ? "Processing..." : "Fill from link"}
                    </Button>
                    {currentApplicationId ? (
                      <Button type="button" variant="destructive" onClick={() => deleteApplication(currentApplicationId)} disabled={deletingId === currentApplicationId}>
                        {deletingId === currentApplicationId ? "Deleting..." : "Delete"}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updateApplicationStatus(currentApplicationId, "applied")}
                      disabled={!currentApplicationId || changingStatus}
                    >
                      Applied
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updateApplicationStatus(currentApplicationId, "rejected")}
                      disabled={!currentApplicationId || changingStatus}
                    >
                      Rejected
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updateApplicationStatus(currentApplicationId, "assessment")}
                      disabled={!currentApplicationId || changingStatus}
                    >
                      Assessment
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updateApplicationStatus(currentApplicationId, "interview")}
                      disabled={!currentApplicationId || changingStatus}
                    >
                      Interview
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updateApplicationStatus(currentApplicationId, "offer")}
                      disabled={!currentApplicationId || changingStatus}
                    >
                      Offer
                    </Button>
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
                    <div className="space-y-1"><Label>Applied Date</Label><Input name="appliedDate" type="date" value={form.appliedDate || ""} readOnly disabled /></div>
                    <div className="space-y-1"><Label>Company Name*</Label><Input name="companyName" value={form.companyName} onChange={updateField} required /></div>
                    <div className="space-y-1"><Label>Job Title*</Label><Input name="jobTitle" value={form.jobTitle} onChange={updateField} required /></div>
                    <div className="space-y-1"><Label>Location*</Label><Input name="location" value={form.location} onChange={updateField} required /></div>
                    <div className="space-y-1 md:col-span-2 xl:col-span-2">
                      <Label>Web Description</Label>
                      <Textarea name="webDescription" value={form.webDescription} onChange={updateField} rows={2} placeholder="Paste full job/company text from the web here..." />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={applicationFormPage === "det" ? "default" : "secondary"}
                      onClick={() => setApplicationFormPage("det")}
                      className={applicationFormPage === "det" ? "bg-green-600 text-white hover:bg-green-700 border border-green-700 font-medium" : "bg-green-500 text-white hover:bg-green-600 border border-green-600 font-medium"}
                    >
                      Det
                    </Button>
                    <Button
                      type="button"
                      variant={applicationFormPage === "resume" ? "default" : "secondary"}
                      onClick={() => setApplicationFormPage("resume")}
                      className={applicationFormPage === "resume" ? "bg-green-600 text-white hover:bg-green-700 border border-green-700 font-medium" : "bg-green-500 text-white hover:bg-green-600 border border-green-600 font-medium"}
                    >
                      Resume
                    </Button>
                    <Button
                      type="button"
                      variant={applicationFormPage === "cover-letter" ? "default" : "secondary"}
                      onClick={() => setApplicationFormPage("cover-letter")}
                      className={applicationFormPage === "cover-letter" ? "bg-green-600 text-white hover:bg-green-700 border border-green-700 font-medium" : "bg-green-500 text-white hover:bg-green-600 border border-green-600 font-medium"}
                    >
                      Cover letter
                    </Button>
                    <Button
                      type="button"
                      variant={applicationFormPage === "exported" ? "default" : "secondary"}
                      onClick={() => setApplicationFormPage("exported")}
                      className={applicationFormPage === "exported" ? "bg-green-600 text-white hover:bg-green-700 border border-green-700 font-medium" : "bg-green-500 text-white hover:bg-green-600 border border-green-600 font-medium"}
                    >
                      Exported
                    </Button>
                    <Button
                      type="button"
                      variant={applicationFormPage === "state" ? "default" : "secondary"}
                      onClick={() => setApplicationFormPage("state")}
                      className={applicationFormPage === "state" ? "bg-green-600 text-white hover:bg-green-700 border border-green-700 font-medium" : "bg-green-500 text-white hover:bg-green-600 border border-green-600 font-medium"}
                    >
                      State
                    </Button>
                  </div>

                  {applicationFormPage === "det" ? (
                    <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                      <div className="space-y-1 xl:col-span-2"><Label>Company Information*</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="companyInformation" value={form.companyInformation} onChange={updateFieldAutoGrow} rows={2} required /></div>
                      <div className="space-y-1"><Label>Responsibilities*</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="responsibilities" value={form.responsibilities} onChange={updateFieldAutoGrow} rows={2} required /></div>
                      <div className="space-y-1"><Label>Qualifications*</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="qualifications" value={form.qualifications} onChange={updateFieldAutoGrow} rows={2} required /></div>
                    </div>
                  ) : null}

                  {applicationFormPage === "resume" ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={loadAndSplitResume}
                          disabled={loadingResumeExperience}
                        >
                          {loadingResumeExperience ? "Loading..." : "Load"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={exportResumeFiles}
                          disabled={
                            loading ||
                            extracting ||
                            loadingTemplate ||
                            improving ||
                            exporting ||
                            savingRecord ||
                            loadingRecord
                          }
                        >
                          {exporting ? "Exporting..." : "Export CV"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={improveResumeFields}
                          disabled={
                            loading ||
                            extracting ||
                            loadingTemplate ||
                            improving ||
                            exporting ||
                            savingRecord ||
                            loadingRecord
                          }
                        >
                          {improving ? "Improving..." : "Improve Resume"}
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <Label>Summary</Label>
                        <Textarea
                          data-autogrow="true"
                          className="resize-none overflow-hidden"
                          name="resumeSummary"
                          value={form.resumeSummary || ""}
                          onChange={updateFieldAutoGrow}
                          rows={3}
                          placeholder="Summary of what changed and what they are looking for..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Resume SKILLS</Label>
                        <Textarea
                          data-autogrow="true"
                          className="resize-none overflow-hidden"
                          name="resumeSkills"
                          value={form.resumeSkills || ""}
                          onChange={updateFieldAutoGrow}
                          rows={4}
                          placeholder="SKILLS section from selected role CV template will appear here..."
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                        {resumeExperienceItems.map((item, idx) => (
                          <div key={`resume-job-${idx}`} className="space-y-1">
                            <Label>{`Job ${idx + 1}`}</Label>
                            <Input
                              value={item.title}
                              onChange={(e) =>
                                setResumeExperienceItems((prev) =>
                                  prev.map((entry, entryIdx) =>
                                    entryIdx === idx ? { ...entry, title: e.target.value } : entry
                                  )
                                )
                              }
                              placeholder="Job Title"
                            />
                            <Input
                              value={item.dateRange}
                              onChange={(e) =>
                                setResumeExperienceItems((prev) =>
                                  prev.map((entry, entryIdx) =>
                                    entryIdx === idx ? { ...entry, dateRange: e.target.value } : entry
                                  )
                                )
                              }
                              placeholder="Date Range"
                            />
                            <Input
                              value={item.company}
                              onChange={(e) =>
                                setResumeExperienceItems((prev) =>
                                  prev.map((entry, entryIdx) =>
                                    entryIdx === idx ? { ...entry, company: e.target.value } : entry
                                  )
                                )
                              }
                              placeholder="Company, Location"
                            />
                            <Textarea
                              data-autogrow="true"
                              className="resize-none overflow-hidden"
                              value={item.details}
                              onChange={(e) =>
                                setResumeExperienceItems((prev) =>
                                  prev.map((entry, entryIdx) =>
                                    entryIdx === idx ? { ...entry, details: e.target.value } : entry
                                  )
                                )
                              }
                              rows={6}
                              placeholder="Responsibilities / achievements..."
                            />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <Label>Resume EXPERIENCE</Label>
                        <Textarea
                          data-autogrow="true"
                          className="resize-none overflow-hidden"
                          name="resumeExperience"
                          value={form.resumeExperience || ""}
                          onChange={updateFieldAutoGrow}
                          rows={8}
                          placeholder="EXPERIENCE section from selected role CV template will appear here..."
                        />
                      </div>
                    </div>
                  ) : null}

                  {applicationFormPage === "cover-letter" ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={generateImprovedParagraphs} disabled={loading || extracting || loadingTemplate || improving || exporting || savingRecord || loadingRecord}>{improving ? "Improving..." : "Generate Improved Paragraphs"}</Button>
                        <Button type="button" variant="secondary" onClick={exportCoverLetterFiles} disabled={loading || extracting || loadingTemplate || improving || exporting || savingRecord || loadingRecord}>{exporting ? "Exporting..." : "Export cover letter"}</Button>
                      </div>

                      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                        <div className="space-y-1 xl:col-span-2"><Label>Improvement Prompt (Optional)</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="improvementPrompt" value={form.improvementPrompt} onChange={updateFieldAutoGrow} rows={2} /></div>

                        <div className="space-y-1"><Label>Improved Paragraph 1</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="improvedParagraph1" value={form.improvedParagraph1} onChange={updateFieldAutoGrow} rows={2} /></div>
                        <div className="space-y-1"><Label>Improved Paragraph 2</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="improvedParagraph2" value={form.improvedParagraph2} onChange={updateFieldAutoGrow} rows={2} /></div>
                        <div className="space-y-1"><Label>Improved Paragraph 3</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="improvedParagraph3" value={form.improvedParagraph3} onChange={updateFieldAutoGrow} rows={2} /></div>
                        <div className="space-y-1"><Label>Improved Paragraph 4</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="improvedParagraph4" value={form.improvedParagraph4} onChange={updateFieldAutoGrow} rows={2} /></div>
                        <div className="space-y-1 xl:col-span-2"><Label>Improved Paragraph 5</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="improvedParagraph5" value={form.improvedParagraph5} onChange={updateFieldAutoGrow} rows={2} /></div>

                        <div className="space-y-1"><Label>Template Paragraph 1*</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="paragraph1" value={form.paragraph1} onChange={updateFieldAutoGrow} rows={2} required /></div>
                        <div className="space-y-1"><Label>Template Paragraph 2*</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="paragraph2" value={form.paragraph2} onChange={updateFieldAutoGrow} rows={2} required /></div>
                        <div className="space-y-1"><Label>Template Paragraph 3*</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="paragraph3" value={form.paragraph3} onChange={updateFieldAutoGrow} rows={2} required /></div>
                        <div className="space-y-1"><Label>Template Paragraph 4*</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="paragraph4" value={form.paragraph4} onChange={updateFieldAutoGrow} rows={2} required /></div>
                        <div className="space-y-1 xl:col-span-2"><Label>Template Paragraph 5*</Label><Textarea data-autogrow="true" className="resize-none overflow-hidden" name="paragraph5" value={form.paragraph5} onChange={updateFieldAutoGrow} rows={2} required /></div>
                      </div>
                    </>
                  ) : null}

                  {applicationFormPage === "exported" ? (
                    <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Resume Word Export Path</Label>
                        <Input value={form.resumeDocxPath || ""} readOnly />
                      </div>
                      <div className="space-y-1">
                        <Label>Resume PDF Export Path</Label>
                        <Input value={form.resumePdfPath || ""} readOnly />
                      </div>
                      <div className="space-y-1">
                        <Label>Cover Letter Word Export Path</Label>
                        <Input value={form.coverLetterDocxPath || ""} readOnly />
                      </div>
                      <div className="space-y-1">
                        <Label>Cover Letter PDF Export Path</Label>
                        <Input value={form.coverLetterPdfPath || ""} readOnly />
                      </div>
                      <div className="space-y-1">
                        <Label>Resume Word File Name</Label>
                        <Input className="bg-sky-50" value={fileNameFromPath(form.resumeDocxPath)} readOnly />
                      </div>
                      <div className="space-y-1">
                        <Label>Resume PDF File Name</Label>
                        <Input value={fileNameFromPath(form.resumePdfPath)} readOnly />
                      </div>
                      <div className="space-y-1">
                        <Label>Cover Letter Word File Name</Label>
                        <Input className="bg-sky-50" value={fileNameFromPath(form.coverLetterDocxPath)} readOnly />
                      </div>
                      <div className="space-y-1">
                        <Label>Cover Letter PDF File Name</Label>
                        <Input value={fileNameFromPath(form.coverLetterPdfPath)} readOnly />
                      </div>
                    </div>
                  ) : null}

                  {applicationFormPage === "state" ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={form.status === "applied" ? "default" : "secondary"}>
                          Current: {prettyStatus(form.status)}
                        </Badge>
                        <Button type="button" variant="secondary" onClick={() => loadStateLogs(currentApplicationId)} disabled={!currentApplicationId || loadingStateLogs}>
                          {loadingStateLogs ? "Refreshing..." : "Refresh Log"}
                        </Button>
                      </div>
                      <div className="space-y-2 rounded-md border border-border bg-white p-3">
                        <Label>State Change Log</Label>
                        {stateLogs.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No state changes yet.</p>
                        ) : (
                          <div className="space-y-1">
                            {stateLogs.map((log) => (
                              <div key={log.id} className="rounded border border-border p-2 text-sm">
                                <div className="font-medium">
                                  {prettyStatus(log.fromStatus)} → {prettyStatus(log.toStatus)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {log.changedAt ? new Date(log.changedAt).toLocaleString() : ""}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

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
                <div className="space-y-2 rounded-md border border-border bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">In Process: {applicationStatusStats.inProcess}</Badge>
                    <Badge>Applied: {applicationStatusStats.applied}</Badge>
                    <span className="text-xs text-muted-foreground">Total: {applicationStatusStats.total}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="flex h-full w-full">
                      <div
                        className="h-full bg-slate-400"
                        style={{ width: `${applicationStatusStats.inProcessPercent}%` }}
                      />
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${applicationStatusStats.appliedPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 rounded-md border border-border bg-white p-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Status Filter</Label>
                    <Select
                      value={applicationStatusFilter}
                      onChange={(e) => setApplicationStatusFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="in_process">In Process</option>
                      <option value="applied">Applied</option>
                      <option value="assessment">Assessment</option>
                      <option value="interview">Interview</option>
                      <option value="offer">Offer</option>
                      <option value="rejected">Rejected</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Search Company Name</Label>
                    <Input
                      value={applicationCompanySearch}
                      onChange={(e) => setApplicationCompanySearch(e.target.value)}
                      placeholder="Type company name..."
                    />
                  </div>
                </div>
                {groupedApplications.length === 0 ? <p className="text-sm text-muted-foreground">No applications yet.</p> : null}
                {groupedApplications.map(([company, apps]) => (
                  <details key={company} className="rounded-md border border-border bg-white p-2" open>
                    <summary className="cursor-pointer text-sm font-semibold">{company} ({apps.length})</summary>
                    <div className="mt-2 space-y-2">
                      {apps.map((app) => (
                        <div
                          key={app.id}
                          className={`flex cursor-pointer flex-col gap-2 rounded-md border p-2 md:flex-row md:items-start md:justify-between ${
                            currentApplicationId === app.id ? "border-primary bg-secondary/40" : "border-border"
                          }`}
                          onClick={() => loadApplication(app.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              loadApplication(app.id);
                            }
                          }}
                        >
                          <div>
                            <div className="font-semibold">#{app.id} {app.jobTitle || "Untitled"}</div>
                            <p className="text-xs font-medium text-muted-foreground">
                              Company: {app.companyName || "No company"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {app.role || "No role"} | {app.location || "No location"} | {app.date || "No date"} | Applied: {app.appliedDate || "-"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={app.status === "applied" ? "default" : "secondary"}>
                              {prettyStatus(app.status)}
                            </Badge>
                            <Button
                              type="button"
                              variant={app.status === "applied" ? "secondary" : "default"}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateApplicationStatus(app.id, "applied");
                              }}
                              disabled={app.status === "applied" || changingStatus}
                            >
                              {app.status === "applied" ? "Applied" : "Mark Applied"}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadApplication(app.id);
                              }}
                            >
                              Open/Edit
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteApplication(app.id);
                              }}
                              disabled={deletingId === app.id}
                            >
                              {deletingId === app.id ? "Deleting..." : "Delete"}
                            </Button>
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
                <p className="text-sm text-muted-foreground">Set default export folders for generated Word and PDF files.</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Default Export Folder (Word)</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        value={wordExportRoot}
                        onChange={(e) => setWordExportRoot(e.target.value)}
                        placeholder="/Users/uranbileg/Documents/JOB/cover_letter/word"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => browseExportDirectory("word")}
                      >
                        Browse
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Default Export Folder (PDF)</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        value={pdfExportRoot}
                        onChange={(e) => setPdfExportRoot(e.target.value)}
                        placeholder="/Users/uranbileg/Documents/JOB/cover_letter/pdf"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => browseExportDirectory("pdf")}
                      >
                        Browse
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Default Resume Folder (Word)</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        value={resumeDefaultRoot}
                        onChange={(e) => setResumeDefaultRoot(e.target.value)}
                        placeholder="/Users/uranbileg/Documents/JOB/resume"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => browseExportDirectory("resume-word")}
                      >
                        Browse
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Default Resume Folder (PDF)</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        value={resumePdfRoot}
                        onChange={(e) => setResumePdfRoot(e.target.value)}
                        placeholder="/Users/uranbileg/Documents/JOB/resume/pdf"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => browseExportDirectory("resume-pdf")}
                      >
                        Browse
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={saveSettings} disabled={savingSettings}>
                    {savingSettings ? "Saving..." : "Save Paths"}
                  </Button>
                </div>
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
                      <Label>CV Template Path</Label>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          value={jobRoleForm.cvTemplate}
                          onChange={(e) =>
                            setJobRoleForm((prev) => ({
                              ...prev,
                              cvTemplate: e.target.value
                            }))
                          }
                          placeholder="/Users/uranbileg/Documents/JOB/job_hunting_tool/templates/cv_data_engineer.docx"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={onBrowseCvTemplate}
                          disabled={uploadingCvTemplate}
                        >
                          {uploadingCvTemplate ? "Uploading..." : "Browse"}
                        </Button>
                        <input
                          ref={cvTemplateInputRef}
                          type="file"
                          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="hidden"
                          onChange={onCvTemplatePicked}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>CV Text</Label>
                      <Textarea
                        value={jobRoleForm.cvText}
                        onChange={(e) =>
                          setJobRoleForm((prev) => ({
                            ...prev,
                            cvText: e.target.value
                          }))
                        }
                        rows={6}
                        placeholder="Paste role-specific CV text here..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Template File Text</Label>
                      <Textarea
                        value={roleTemplateText}
                        onChange={(e) => setRoleTemplateText(e.target.value)}
                        rows={12}
                        placeholder="Click Load File to view template text. Editing this area updates the Word file."
                      />
                      <p className="text-xs text-muted-foreground">
                        Click Update File to write this text back into the Word file.
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
                            <p className="text-xs text-muted-foreground break-all">
                              CV: {role.cvTemplate || "No CV template path"}
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
