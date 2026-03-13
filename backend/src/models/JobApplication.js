export class JobApplication {
  static fieldMap = [
    ["role", "role"],
    ["linkedinLink", "linkedin_link"],
    ["jobrightLink", "jobright_link"],
    ["officialJobLink", "official_job_link"],
    ["companyWebsiteLink", "company_website_link"],
    ["exportDirectory", "export_directory"],
    ["date", "date"],
    ["companyName", "company_name"],
    ["jobTitle", "job_title"],
    ["location", "location"],
    ["webDescription", "web_description"],
    ["companyInformation", "company_information"],
    ["improvementPrompt", "improvement_prompt"],
    ["improvedParagraph1", "improved_paragraph_1"],
    ["improvedParagraph2", "improved_paragraph_2"],
    ["improvedParagraph3", "improved_paragraph_3"],
    ["improvedParagraph4", "improved_paragraph_4"],
    ["improvedParagraph5", "improved_paragraph_5"],
    ["paragraph1", "paragraph_1"],
    ["paragraph2", "paragraph_2"],
    ["paragraph3", "paragraph_3"],
    ["paragraph4", "paragraph_4"],
    ["paragraph5", "paragraph_5"],
    ["responsibilities", "responsibilities"],
    ["qualifications", "qualifications"]
  ];

  static dbColumns = JobApplication.fieldMap.map(([, db]) => db);

  static sanitizePayload(payload = {}) {
    const clean = {};
    for (const [apiField] of JobApplication.fieldMap) {
      clean[apiField] = String(payload[apiField] || "");
    }
    return clean;
  }

  static toDbValues(payload = {}) {
    const clean = JobApplication.sanitizePayload(payload);
    return JobApplication.fieldMap.map(([apiField]) => clean[apiField]);
  }

  static fromDbRow(row = {}) {
    const out = {};
    for (const [apiField, dbField] of JobApplication.fieldMap) {
      out[apiField] = String(row[dbField] || "");
    }
    return out;
  }
}
