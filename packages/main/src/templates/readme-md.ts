export function buildReadmeMd(projectName: string): string {
  return `# ${projectName}

Projet Buildoto — généré automatiquement.

## Ouvrir dans Buildoto

\`\`\`
File > Open Project… > ce dossier
\`\`\`

## Structure

- \`generations/\` — code Python produit par l'agent
- \`documents/\` — documents FreeCAD (\`.FCStd\`)
- \`exports/\` — IFC, glTF, PDF (ignorés par Git)
- \`AGENTS.md\` — contexte du projet pour l'agent
- \`.buildoto/\` — configuration + sessions de chat
`
}
