/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USER_POOL_ID: string
  readonly VITE_USER_POOL_CLIENT_ID: string
  readonly VITE_IDENTITY_POOL_ID: string
  readonly VITE_API_URL: string
}

declare global {
  // eslint-disable-next-line no-unused-vars
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}
