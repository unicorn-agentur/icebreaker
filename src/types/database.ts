export type Lead = {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company_name: string | null;
  website: string | null;
  linkedin: string | null;
  status: 'pending' | 'scraped' | 'generated' | 'error' | 'exported';
  scrape_summary: string | null;
  icebreaker: string | null;
  error_message: string | null;
  list_name: string | null;
};

export type Settings = {
  id: string;
  created_at: string;
  icebreaker_prompt: string | null;
  last_used_template_id: string | null; // New field
};

export type PromptTemplate = {
  id: string;
  created_at: string;
  name: string;
  content: string;
};
