export type ShortcutId =
  | 'palette.open'
  | 'settings.open'
  | 'project.new'
  | 'project.open'
  | 'agent.send'
  | 'mode.toggle'

export interface ShortcutDef {
  id: ShortcutId
  label: string
  description: string
  // display tokens, rendered by formatShortcut
  keys: string[]
  group: 'Navigation' | 'Projet' | 'Agent'
}

export const IS_MAC =
  typeof navigator !== 'undefined' &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent)

const MOD = IS_MAC ? '⌘' : 'Ctrl'

export const SHORTCUTS: ShortcutDef[] = [
  {
    id: 'palette.open',
    label: 'Ouvrir la palette de commandes',
    description: 'Accès rapide à toutes les actions',
    keys: [MOD, 'K'],
    group: 'Navigation',
  },
  {
    id: 'settings.open',
    label: 'Ouvrir les réglages',
    description: 'Clés API, MCP, apparence, confidentialité',
    keys: [MOD, ','],
    group: 'Navigation',
  },
  {
    id: 'project.new',
    label: 'Nouveau projet…',
    description: 'Créer un nouveau projet Buildoto',
    keys: [MOD, 'N'],
    group: 'Projet',
  },
  {
    id: 'project.open',
    label: 'Ouvrir un projet…',
    description: 'Ouvrir un projet existant',
    keys: [MOD, 'O'],
    group: 'Projet',
  },
  {
    id: 'agent.send',
    label: 'Envoyer le message',
    description: 'Envoyer le message en cours à l\'agent',
    keys: [MOD, 'Enter'],
    group: 'Agent',
  },
  {
    id: 'mode.toggle',
    label: 'Basculer mode Plan / Build',
    description: 'Bascule entre mode lecture et mode écriture',
    keys: ['Tab'],
    group: 'Agent',
  },
]

export function formatShortcut(keys: string[]): string {
  return keys.join(IS_MAC ? '' : '+')
}

export function matchesShortcut(e: KeyboardEvent, id: ShortcutId): boolean {
  const mod = IS_MAC ? e.metaKey : e.ctrlKey
  switch (id) {
    case 'palette.open':
      return mod && e.key.toLowerCase() === 'k'
    case 'settings.open':
      return mod && e.key === ','
    case 'project.new':
      return mod && e.key.toLowerCase() === 'n' && !e.shiftKey
    case 'project.open':
      return mod && e.key.toLowerCase() === 'o' && !e.shiftKey
    case 'agent.send':
      return mod && e.key === 'Enter'
    case 'mode.toggle':
      return e.key === 'Tab' && !mod && !e.shiftKey
    default:
      return false
  }
}
