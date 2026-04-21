export function buildAgentsMd(projectName: string): string {
  return `# AGENTS.md — ${projectName}

Ce fichier contient le contexte que l'agent Buildoto lit au début de chaque tour.
Il est committé dans le repo Git et évolue avec le projet.

## Objectif du projet

> Décris ici ce que tu construis, les contraintes (site, programme, matériaux),
> et tout ce qui doit rester stable d'un tour à l'autre.

## Structure du repo

- \`generations/\` — chaque exécution Python réussie produit ici un fichier
  horodaté. Ne pas éditer à la main en général — l'agent les écrit.
- \`documents/\` — fichiers FreeCAD (\`.FCStd\`). \`main.FCStd\` est le document
  principal réutilisé entre générations.
- \`exports/\` — IFC, glTF, PDF générés. **Ignoré par Git** (\`.gitignore\`).
- \`.buildoto/sessions/\` — historique complet des échanges chat. Committé.

## Conventions de code

- Unités : **millimètres** dans FreeCAD (1 m = 1000 mm).
- Document actif : créer ou réutiliser celui nommé \`"Buildoto"\`.
- Nommer les objets FreeCAD avec un préfixe explicite : \`mur_nord\`, \`dalle_rdc\`.
- Toujours recompute : \`App.ActiveDocument.recompute()\` avant l'export.

## Contraintes projet

> Liste ici les règles qui doivent guider toutes les générations :
> - matériaux autorisés
> - épaisseurs de parois standard
> - hauteurs sous plafond
> - contraintes réglementaires
`
}
