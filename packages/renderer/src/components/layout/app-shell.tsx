import { useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatPanel } from '@/components/agent/chat-panel'
import { CodeEditor } from '@/components/editor/code-editor'
import { FileTree } from '@/components/explorer/file-tree'
import { GitPanel } from '@/components/git/git-panel'
import { Viewport } from '@/components/modeler/viewport'
import { useSessionStore } from '@/stores/session-store'
import { useProjectStore } from '@/stores/project-store'
import { UpdateBanner } from '@/components/feedback/update-banner'
import { QuotaBanner } from '@/components/feedback/quota-banner'
import { useBuildotoUsage } from '@/hooks/use-buildoto-usage'
import { useBuildotoAuth } from '@/hooks/use-buildoto-auth'
import { useQuotaToasts } from '@/hooks/use-quota-toasts'
import { cn } from '@/lib/utils'

interface AppShellProps {
  apiKeySet: boolean
  onOpenSettings: () => void
}

export function AppShell({ apiKeySet, onOpenSettings }: AppShellProps) {
  const freecadStatus = useSessionStore((s) => s.freecadStatus)
  const activeProject = useProjectStore((s) => s.activeProject)
  const gitStatus = useProjectStore((s) => s.gitStatus)
  const usage = useBuildotoUsage()
  const buildotoAuth = useBuildotoAuth()
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [centerTab, setCenterTab] = useState<'agent' | 'modeler' | 'editor'>('agent')
  useQuotaToasts(usage)

  const openFile = (relativePath: string) => {
    setSelectedFile(relativePath)
    setCenterTab('editor')
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <UpdateBanner />
      <QuotaBanner usage={usage} onOpenSettings={onOpenSettings} />
      <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-tight">Buildoto</span>
          {activeProject ? (
            <span className="text-xs text-muted-foreground">
              {activeProject.name}
              {gitStatus && <span className="ml-2 font-mono">{gitStatus.branch}</span>}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Aucun projet ouvert</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {buildotoAuth.kind === 'signed-in' && usage.known && (
            <BuildotoAiPill usage={usage} onClick={onOpenSettings} />
          )}
          <StatusPill
            label="FreeCAD"
            state={freecadStatus.state}
            detail={freecadStatus.state === 'ready' ? `v${freecadStatus.version}` : undefined}
          />
          <StatusPill label="API" state={apiKeySet ? 'ready' : 'stopped'} />
          <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Paramètres">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <PanelGroup direction="vertical" className="flex-1">
        <Panel defaultSize={72} minSize={40}>
          <PanelGroup direction="horizontal">
            <Panel defaultSize={20} minSize={14} maxSize={40}>
              <div className="h-full border-r border-border bg-card/60">
                <FileTree onOpenFile={openFile} />
              </div>
            </Panel>
            <PanelResizeHandle className="w-[3px] bg-border hover:bg-primary/40" />
            <Panel minSize={40}>
              <Tabs
                value={centerTab}
                onValueChange={(v) => setCenterTab(v as 'agent' | 'modeler' | 'editor')}
                className="flex h-full flex-col"
              >
                <TabsList className="m-2 self-start">
                  <TabsTrigger value="agent">Agent</TabsTrigger>
                  <TabsTrigger value="modeler">Modeleur</TabsTrigger>
                  <TabsTrigger value="editor">Éditeur</TabsTrigger>
                </TabsList>
                <TabsContent value="agent" className="min-h-0 flex-1 data-[state=inactive]:hidden">
                  <ChatPanel apiKeySet={apiKeySet} />
                </TabsContent>
                <TabsContent value="modeler" className="min-h-0 flex-1 data-[state=inactive]:hidden">
                  <Viewport />
                </TabsContent>
                <TabsContent value="editor" className="min-h-0 flex-1 data-[state=inactive]:hidden">
                  <CodeEditor relativePath={selectedFile} />
                </TabsContent>
              </Tabs>
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="h-[3px] bg-border hover:bg-primary/40" />
        <Panel defaultSize={28} minSize={15} maxSize={60}>
          <GitPanel />
        </Panel>
      </PanelGroup>
    </div>
  )
}

function BuildotoAiPill({
  usage,
  onClick,
}: {
  usage: { planTier: string; limit: number; used: number; remaining: number }
  onClick: () => void
}) {
  const ratio = usage.limit > 0 ? usage.used / usage.limit : 0
  const dot =
    ratio >= 1
      ? 'bg-destructive animate-pulse'
      : ratio >= 0.8
        ? 'bg-amber-500'
        : 'bg-emerald-500'
  const plan =
    usage.planTier.charAt(0).toUpperCase() + usage.planTier.slice(1).toLowerCase()
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:border-primary/40"
      aria-label="Quota Buildoto AI"
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      <span className="text-muted-foreground">Buildoto AI · {plan}</span>
      <span className="font-mono text-foreground">
        {usage.used.toLocaleString('fr-FR')} / {usage.limit.toLocaleString('fr-FR')}
      </span>
    </button>
  )
}

function StatusPill({
  label,
  state,
  detail,
}: {
  label: string
  state: 'booting' | 'ready' | 'error' | 'stopped'
  detail?: string
}) {
  const dot =
    state === 'ready'
      ? 'bg-emerald-500'
      : state === 'booting'
        ? 'bg-amber-500 animate-pulse'
        : state === 'error'
          ? 'bg-destructive'
          : 'bg-muted-foreground'
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1 text-xs',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      <span className="text-muted-foreground">{label}</span>
      {detail && <span className="text-foreground">{detail}</span>}
    </div>
  )
}
