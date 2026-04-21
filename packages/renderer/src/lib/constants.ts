// Buildoto portal URLs reachable from the renderer via shell.openExternal
// (window.open is intercepted by BrowserWindow.setWindowOpenHandler in
// packages/main/src/index.ts and forwarded to the user's default browser).
export const BUILDOTO_PORTAL_URL = 'https://app.buildoto.com'
export const BUILDOTO_BILLING_URL = `${BUILDOTO_PORTAL_URL}/billing`
export const BUILDOTO_API_KEYS_URL = `${BUILDOTO_PORTAL_URL}/settings`
