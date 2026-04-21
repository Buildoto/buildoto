# FAQ

## Buildoto est-il gratuit ?

Oui, Buildoto est open-source sous licence MIT et gratuit pour un usage personnel et commercial.
Une offre SaaS (Buildoto AI, corpus RAG hébergé) sera disponible plus tard — toujours optionnelle.

## Mes données restent-elles locales ?

Oui. Les projets, prompts et fichiers restent sur votre machine. Les requêtes IA sortent vers le
provider que vous avez choisi (Anthropic, OpenAI, etc.) sans proxy par Buildoto. La télémétrie
(anonyme, opt-in) contient uniquement des métriques agrégées — pas de contenu.

## Puis-je utiliser Buildoto sans internet ?

Oui, avec Ollama : configurez un modèle local (llama3, qwen2, etc.) dans les réglages et l'agent
fonctionnera 100% offline. FreeCAD et Git tournent déjà en local.

## Quels formats FreeCAD sont supportés ?

Buildoto travaille sur des fichiers `.FCStd` et `.FCMacro`. L'export glTF pour le modeleur
3D est géré automatiquement. Import/export IFC, STEP, BREP via les outils FreeCAD standards.

## Puis-je ajouter mes propres outils ?

Oui, via **MCP** (Model Context Protocol). Ajoutez un serveur MCP dans les réglages : l'agent y
aura accès à la prochaine conversation.

## J'ai un bug / une demande de feature

Ouvrez une issue sur [GitHub](https://github.com/buildoto/buildoto/issues).
