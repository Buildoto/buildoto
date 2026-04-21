import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Buildoto',
  description: "Documentation de Buildoto — l'IDE construction piloté par IA.",
  lang: 'fr-FR',
  base: '/',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  ],
  themeConfig: {
    nav: [
      { text: 'Introduction', link: '/' },
      { text: 'Installation', link: '/installation' },
      { text: 'Prise en main', link: '/getting-started' },
      { text: 'Guides', link: '/guides/agent' },
      { text: 'Référence', link: '/reference/freecad-tools' },
      { text: 'Site', link: 'https://buildoto.com' },
    ],
    sidebar: [
      {
        text: 'Démarrer',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Installation', link: '/installation' },
          { text: 'Prise en main', link: '/getting-started' },
          { text: 'FAQ', link: '/faq' },
        ],
      },
      {
        text: 'Guides',
        items: [
          { text: "L'agent IA", link: '/guides/agent' },
          { text: 'Outils FreeCAD', link: '/guides/freecad' },
          { text: 'Git et GitHub', link: '/guides/git' },
          { text: 'Serveurs MCP', link: '/guides/mcp' },
          { text: 'Modes Plan / Build', link: '/guides/modes' },
        ],
      },
      {
        text: 'Référence',
        items: [
          { text: 'Outils FreeCAD', link: '/reference/freecad-tools' },
          { text: 'Raccourcis clavier', link: '/reference/shortcuts' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/buildoto/buildoto' }],
    footer: {
      message: 'Publié sous licence MIT.',
      copyright: 'Copyright © 2026 Buildoto contributors',
    },
    search: { provider: 'local' },
  },
})
