/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETSENSE_DATA_MODE?: 'fixture' | 'live';
  readonly VITE_NETSENSE_API_BASE_URL?: string;
  readonly VITE_NETSENSE_TENANT_ID?: string;
  readonly VITE_NETSENSE_ORGANISATION_ID?: string;
  readonly VITE_NETSENSE_SITE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
