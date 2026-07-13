/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SEARCH_PARSER_URL?: string;
  readonly VITE_ADVISOR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
