/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /** Optional — when set, dashboard fetches OneSignal identity token after login. */
  readonly VITE_ONESIGNAL_APP_ID?: string
  /** `true` opens the console without auth. Default: require login. */
  readonly VITE_PLATFORM_PREVIEW?: string
  /** Restaurant dashboard origin, used on the login screen. */
  readonly VITE_RESTAURANT_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
