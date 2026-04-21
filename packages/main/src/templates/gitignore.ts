export function buildGitignore(): string {
  return `# Buildoto — fichiers ignorés par défaut

# Exports volumineux régénérables
exports/

# Cache local (thumbnails, glTF intermédiaires)
.buildoto/cache/

# OS
.DS_Store
Thumbs.db

# Éditeurs
.idea/
.vscode/

# FreeCAD backups
*.FCStd1
`
}
