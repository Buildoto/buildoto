# L'agent IA

L'agent Buildoto est une boucle `LLM → tools → LLM` qui exécute des outils structurés pour
manipuler FreeCAD, Git et le système de fichiers.

## Providers supportés

- **Anthropic** (Claude 3.5/4 series) — par défaut
- **OpenAI** (gpt-4o, gpt-4o-mini)
- **Mistral** (mistral-large, mistral-small)
- **Google** (gemini-2.0-flash, gemini-1.5-pro)
- **OpenRouter** (accès agrégé, tarification à la demande)
- **Ollama** (modèles locaux, offline)

Chaque provider a sa propre clé stockée dans le trousseau OS. Vous pouvez définir un provider
par défaut et basculer ponctuellement dans la palette de commande.

## Modes Plan / Build

- **Plan** (lecture seule) — l'agent peut lire fichiers et appeler des outils non-mutateurs,
  mais pas modifier le projet. Utile pour explorer un codebase ou demander un diagnostic.
- **Build** (lecture/écriture) — tous les outils sont disponibles.

Raccourci : `Tab` dans le champ de saisie.

## Outils disponibles

Voir la [référence complète](../reference/freecad-tools).
