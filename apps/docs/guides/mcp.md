# Serveurs MCP

**MCP** (Model Context Protocol) permet d'étendre les capacités de l'agent avec des outils
externes : bases de données, APIs internes, systèmes de tickets, etc.

## Ajouter un serveur

Réglages (`⌘+,`) → onglet `Serveurs MCP` → `Ajouter un serveur`.

Deux transports supportés :
- **stdio** — lance un processus enfant (Node.js, Python, etc.)
- **SSE** — se connecte à un serveur distant par Server-Sent Events

## Exemple : serveur filesystem

```json
{
  "name": "fs",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/Documents"]
}
```

Une fois activé, l'agent voit les outils `fs:*` et peut lister / lire / écrire dans le
répertoire autorisé.

## Sécurité

- Les serveurs MCP tournent localement mais ont accès à ce que vous leur donnez — auditez
  avant d'activer.
- L'agent demande toujours confirmation avant les actions mutatrices MCP (mode Plan par défaut).
