export const migrations = [
  {
    id: "001_create_job_application_table",
    sql: `
      CREATE TABLE IF NOT EXISTS job_application (
        id INTEGER PRIMARY KEY,
        role TEXT NOT NULL DEFAULT '',
        linkedin_link TEXT NOT NULL DEFAULT '',
        jobright_link TEXT NOT NULL DEFAULT '',
        official_job_link TEXT NOT NULL DEFAULT '',
        company_website_link TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL DEFAULT '',
        company_name TEXT NOT NULL DEFAULT '',
        job_title TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        web_description TEXT NOT NULL DEFAULT '',
        company_information TEXT NOT NULL DEFAULT '',
        improvement_prompt TEXT NOT NULL DEFAULT '',
        improved_paragraph_1 TEXT NOT NULL DEFAULT '',
        improved_paragraph_2 TEXT NOT NULL DEFAULT '',
        improved_paragraph_3 TEXT NOT NULL DEFAULT '',
        improved_paragraph_4 TEXT NOT NULL DEFAULT '',
        improved_paragraph_5 TEXT NOT NULL DEFAULT '',
        paragraph_1 TEXT NOT NULL DEFAULT '',
        paragraph_2 TEXT NOT NULL DEFAULT '',
        paragraph_3 TEXT NOT NULL DEFAULT '',
        paragraph_4 TEXT NOT NULL DEFAULT '',
        paragraph_5 TEXT NOT NULL DEFAULT '',
        responsibilities TEXT NOT NULL DEFAULT '',
        qualifications TEXT NOT NULL DEFAULT '',
        data JSONB,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
  },
  {
    id: "002_ensure_job_application_columns",
    sql: `
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS linkedin_link TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS jobright_link TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS official_job_link TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS company_website_link TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS date TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS company_name TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS job_title TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS web_description TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS company_information TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS improvement_prompt TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS improved_paragraph_1 TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS improved_paragraph_2 TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS improved_paragraph_3 TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS improved_paragraph_4 TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS improved_paragraph_5 TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS paragraph_1 TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS paragraph_2 TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS paragraph_3 TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS paragraph_4 TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS paragraph_5 TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS responsibilities TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS qualifications TEXT NOT NULL DEFAULT '';
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS data JSONB;
      ALTER TABLE job_application ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `
  },
  {
    id: "003_backfill_fields_from_legacy_json_data",
    sql: `
      UPDATE job_application
      SET
        role = COALESCE(NULLIF(role, ''), COALESCE(data->>'role', '')),
        linkedin_link = COALESCE(NULLIF(linkedin_link, ''), COALESCE(data->>'linkedinLink', '')),
        jobright_link = COALESCE(NULLIF(jobright_link, ''), COALESCE(data->>'jobrightLink', '')),
        official_job_link = COALESCE(NULLIF(official_job_link, ''), COALESCE(data->>'officialJobLink', '')),
        company_website_link = COALESCE(NULLIF(company_website_link, ''), COALESCE(data->>'companyWebsiteLink', '')),
        date = COALESCE(NULLIF(date, ''), COALESCE(data->>'date', '')),
        company_name = COALESCE(NULLIF(company_name, ''), COALESCE(data->>'companyName', '')),
        job_title = COALESCE(NULLIF(job_title, ''), COALESCE(data->>'jobTitle', '')),
        location = COALESCE(NULLIF(location, ''), COALESCE(data->>'location', '')),
        web_description = COALESCE(NULLIF(web_description, ''), COALESCE(data->>'webDescription', '')),
        company_information = COALESCE(NULLIF(company_information, ''), COALESCE(data->>'companyInformation', '')),
        improvement_prompt = COALESCE(NULLIF(improvement_prompt, ''), COALESCE(data->>'improvementPrompt', '')),
        improved_paragraph_1 = COALESCE(NULLIF(improved_paragraph_1, ''), COALESCE(data->>'improvedParagraph1', '')),
        improved_paragraph_2 = COALESCE(NULLIF(improved_paragraph_2, ''), COALESCE(data->>'improvedParagraph2', '')),
        improved_paragraph_3 = COALESCE(NULLIF(improved_paragraph_3, ''), COALESCE(data->>'improvedParagraph3', '')),
        improved_paragraph_4 = COALESCE(NULLIF(improved_paragraph_4, ''), COALESCE(data->>'improvedParagraph4', '')),
        improved_paragraph_5 = COALESCE(NULLIF(improved_paragraph_5, ''), COALESCE(data->>'improvedParagraph5', '')),
        paragraph_1 = COALESCE(NULLIF(paragraph_1, ''), COALESCE(data->>'paragraph1', '')),
        paragraph_2 = COALESCE(NULLIF(paragraph_2, ''), COALESCE(data->>'paragraph2', '')),
        paragraph_3 = COALESCE(NULLIF(paragraph_3, ''), COALESCE(data->>'paragraph3', '')),
        paragraph_4 = COALESCE(NULLIF(paragraph_4, ''), COALESCE(data->>'paragraph4', '')),
        paragraph_5 = COALESCE(NULLIF(paragraph_5, ''), COALESCE(data->>'paragraph5', '')),
        responsibilities = COALESCE(NULLIF(responsibilities, ''), COALESCE(data->>'responsibilities', '')),
        qualifications = COALESCE(NULLIF(qualifications, ''), COALESCE(data->>'qualifications', ''))
      WHERE data IS NOT NULL
    `
  },
  {
    id: "004_drop_legacy_data_column",
    sql: `
      ALTER TABLE job_application
      DROP COLUMN IF EXISTS data
    `
  },
  {
    id: "005_job_application_id_sequence_default",
    sql: `
      CREATE SEQUENCE IF NOT EXISTS job_application_id_seq;
      SELECT setval(
        'job_application_id_seq',
        COALESCE((SELECT MAX(id) + 1 FROM job_application), 1),
        false
      );
      ALTER TABLE job_application
      ALTER COLUMN id SET DEFAULT nextval('job_application_id_seq');
    `
  },
  {
    id: "006_create_master_cv_table",
    sql: `
      CREATE TABLE IF NOT EXISTS master_cv (
        id INTEGER PRIMARY KEY,
        content TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO master_cv (id, content)
      VALUES (1, '')
      ON CONFLICT (id) DO NOTHING;
    `
  }
];
