import { Command } from 'cmdk'
import { useEffect, useState } from 'react'
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import { formatShortcut, matchesShortcut, SHORTCUTS, type ShortcutId } from '@/lib/shortcuts'
import { useTheme } from '@/hooks/use-theme'
import { useGithubAuth } from '@/hooks/use-github-auth'
import { cn } from '@/lib/utils'

interface PaletteAction {
  id: string
  label: string
  group: string
  keywords?: string[]
  shortcutId?: ShortcutId
  run: () => void | Promise<void>
}

interface CommandPaletteProps {
  onOpenSettings: () => void
  onNewProject: () => void
  onOpenProject: () => void
  onCloseProject: () => void
}

export function CommandPalette({
  onOpenSettings,
  onNewProject,
  onOpenProject,
  onCloseProject,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { status, startFlow } = useGithubAuth()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, 'palette.open')) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const close = () => setOpen(false)

  const actions: PaletteAction[] = [
    {
      id: 'project.new',
      label: 'Nouveau projet…',
      group: 'Projet',
      shortcutId: 'project.new',
      run: () => {
        close()
        onNewProject()
      },
    },
    {
      id: 'project.open',
      label: 'Ouvrir un projet…',
      group: 'Projet',
      shortcutId: 'project.open',
      run: () => {
        close()
        onOpenProject()
      },
    },
    {
      id: 'project.close',
      label: 'Fermer le projet',
      group: 'Projet',
      run: () => {
        close()
        onCloseProject()
      },
    },
    {
      id: 'settings.open',
      label: 'Ouvrir les réglages',
      group: 'Navigation',
      shortcutId: 'settings.open',
      run: () => {
        close()
        onOpenSettings()
      },
    },
    {
      id: 'theme.light',
      label: 'Apparence — Clair',
      group: 'Apparence',
      keywords: ['theme', 'light', 'clair'],
      run: () => {
        close()
        void setTheme('light')
      },
    },
    {
      id: 'theme.dark',
      label: 'Apparence — Sombre',
      group: 'Apparence',
      keywords: ['theme', 'dark', 'sombre'],
      run: () => {
        close()
        void setTheme('dark')
      },
    },
    {
      id: 'theme.system',
      label: 'Apparence — Système',
      group: 'Apparence',
      keywords: ['theme', 'system', 'auto'],
      run: () => {
        close()
        void setTheme('system')
      },
    },
    {
      id: 'github.connect',
      label: status.isAuthed
        ? `GitHub — Connecté comme ${status.login}`
        : 'GitHub — Connecter le compte',
      group: 'Navigation',
      keywords: ['github', 'auth', 'connect'],
      run: () => {
        close()
        if (!status.isAuthed) void startFlow()
      },
    },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay />
        <Command.Dialog
          open={open}
          onOpenChange={setOpen}
          label="Palette de commandes"
          className={cn(
            'fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-background shadow-xl',
          )}
        >
          <Command.Input
            autoFocus
            placeholder="Chercher une commande…"
            className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-[50vh] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Aucune commande trouvée.
            </Command.Empty>
            {groupActions(actions).map(([group, items]) => (
              <Command.Group
                key={group}
                heading={group}
                className="px-1 py-1 text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {items.map((a) => (
                  <Command.Item
                    key={a.id}
                    value={`${a.label} ${(a.keywords ?? []).join(' ')}`}
                    onSelect={() => void a.run()}
                    className="flex items-center justify-between gap-2 rounded px-2 py-2 text-sm text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <span>{a.label}</span>
                    {a.shortcutId && (
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {formatShortcut(
                          SHORTCUTS.find((s) => s.id === a.shortcutId)?.keys ?? [],
                        )}
                      </kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
              <span>Apparence actuelle : {theme}</span>
              <span>
                <kbd className="rounded border border-border bg-muted px-1 py-0.5">Esc</kbd> fermer
              </span>
            </div>
          </Command.List>
        </Command.Dialog>
      </DialogPortal>
    </Dialog>
  )
}

function groupActions(actions: PaletteAction[]): Array<[string, PaletteAction[]]> {
  const map = new Map<string, PaletteAction[]>()
  for (const a of actions) {
    const list = map.get(a.group) ?? []
    list.push(a)
    map.set(a.group, list)
  }
  return Array.from(map.entries())
}
