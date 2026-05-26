/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAME_SERVER_URL: string;
  readonly VITE_DEFAULT_PLAYER_NAME: string;
  readonly VITE_PUBLIC_SITE_URL: string;
  readonly VITE_PUBLIC_ACCOUNT_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
