// Notarization hook for electron-builder. Runs only on macOS builds after code
// signing. Cleanly no-ops when required env vars are missing — lets the alpha
// channel ship unsigned until signing credentials are provisioned.

module.exports = async function notarize(context) {
  const { electronPlatformName, appOutDir, packager } = context
  if (electronPlatformName !== 'darwin') return

  const appleId = process.env.APPLE_ID
  const appleIdPassword = process.env.APPLE_APP_PASSWORD
  const teamId = process.env.APPLE_TEAM_ID

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('[notarize] APPLE_ID / APPLE_APP_PASSWORD / APPLE_TEAM_ID not set — skipping notarization.')
    return
  }

  let notarize
  try {
    notarize = require('@electron/notarize').notarize
  } catch (err) {
    console.log('[notarize] @electron/notarize not installed — skipping notarization.', err.message)
    return
  }

  const appName = packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`
  const appBundleId = packager.appInfo.macBundleIdentifier

  console.log(`[notarize] submitting ${appPath} for ${appBundleId}…`)
  await notarize({
    tool: 'notarytool',
    appPath,
    appBundleId,
    appleId,
    appleIdPassword,
    teamId,
  })
  console.log('[notarize] success')
}
