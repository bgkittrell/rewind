/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COGNITO_USER_POOL_ID: string
  readonly VITE_COGNITO_CLIENT_ID: string
  readonly VITE_COGNITO_REGION: string
  readonly VITE_COGNITO_IDENTITY_POOL_ID: string
  readonly VITE_COGNITO_DOMAIN: string
  readonly VITE_AWS_ACCOUNT_ID: string
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
