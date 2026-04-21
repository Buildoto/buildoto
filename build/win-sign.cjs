// Windows code-signing hook for electron-builder. No-op when WIN_CSC_LINK is
// missing — alpha ships unsigned. When the env var is set, electron-builder
// handles signing natively via its built-in codesign flow; this hook exists so
// the config can point at a custom signer later (Azure Key Vault, etc.)
// without restructuring the yml.

module.exports = async function sign(configuration) {
  const cscLink = process.env.WIN_CSC_LINK
  if (!cscLink) {
    console.log('[win-sign] WIN_CSC_LINK not set — skipping signing.')
    return
  }

  // Placeholder — wire your signtool / Azure Key Vault / SignPath adapter here.
  // electron-builder passes { path, hash, isNest, name, site } on configuration.
  console.log(`[win-sign] would sign ${configuration.path} (not yet implemented).`)
}
