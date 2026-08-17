/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_EDGE_URL?: string;
  readonly VITE_APP_MCP_URL?: string;
  readonly VITE_APP_EATERY_URL?: string;
  readonly VITE_APP_RESELLER_URL?: string;
  readonly VITE_APP_FARMER_URL?: string;
  readonly VITE_APP_MANUFACTURING_URL?: string;
  readonly VITE_APP_MANUFACTURER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
