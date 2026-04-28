import { useCallback, useEffect, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { AppShell } from '@/components/layout/app-shell'
import { CommandPalette } from '@/components/palette/command-palette'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { SettingsDialog } from '@/components/layout/settings-dialog'
import { useActiveSessionStream, useAgentEvents } from '@/hooks/use-agent'
import { useFreecadStatus } from '@/hooks/use-freecad'
import { useProjectBootstrap } from '@/hooks/use-project'
import { useSettingsBootstrap } from '@/hooks/use-settings-bootstrap'
import { useTelemetry } from '@/hooks/use-telemetry'
import { useProjectStore } from '@/stores/project-store'
import { useSettingsStore } from '@/stores/settings-store'

export function App() {
  useAgentEvents()
  useFreecadStatus()
  useProjectBootstrap()
  useActiveSessionStream()
  useSettingsBootstrap()

  const activeProject = useProjectStore((s) => s.activeProject)
  const projectBootstrapped = useProjectStore((s) => s.bootstrapped)
  const settingsBootstrapped = useSettingsStore((s) => s.bootstrapped)
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted)
  const metadata = useSettingsStore((s) => s.metadata)

  const [apiKeySet, setApiKeySet] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [apiBootstrapped, setApiBootstrapped] = useState(false)
  const [forceOnboarding, setForceOnboarding] = useState(false)
  const { capture } = useTelemetry()
  const launchedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      const [status, auth] = await Promise.all([
        window.buildoto.settings.getProvidersStatus(),
        window.buildoto.buildotoAuth.getStatus(),
      ])
      if (cancelled) return
      const anyKeySet = Object.values(status).some((p) => p.isSet)
      setApiKeySet(anyKeySet || auth.kind === 'signed-in')
    }

    void refresh().finally(() => {
      if (!cancelled) setApiBootstrapped(true)
    })
    const unsub = window.buildoto.buildotoAuth.onStatusChanged(() => {
      void refresh()
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  useEffect(() => {
    if (!settingsBootstrapped || !metadata || launchedRef.current) return
    launchedRef.current = true
    capture('app_launched', {
      os: metadata.platform,
      appVersion: metadata.version,
      channel: metadata.channel,
      providerConfigured: apiKeySet,
    })
  }, [settingsBootstrapped, metadata, apiKeySet, capture])

  useEffect(() => {
    const unsub = window.buildoto.menu.onAction(async (action) => {
      if (action.kind === 'open-settings') setSettingsOpen(true)
      if (action.kind === 'close-project') {
        setForceOnboarding(true)
      }
      if (action.kind === 'new-project') setForceOnboarding(true)
      if (action.kind === 'open-project') {
        const path = await window.buildoto.project.pickDirectory({
          title: 'Ouvrir un projet Buildoto',
        })
        if (path) {
          try { await window.buildoto.project.open({ path }) }
          catch (e) { toast.error(String(e)) }
        }
      }
      if (action.kind === 'open-recent') {
        try { await window.buildoto.project.open({ path: action.path }) }
        catch (e) { toast.error(String(e)) }
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (activeProject) setForceOnboarding(false)
  }, [activeProject])

  const openProjectFromDialog = useCallback(async () => {
    const path = await window.buildoto.project.pickDirectory({
      title: 'Ouvrir un projet Buildoto',
    })
    if (path) {
      try { await window.buildoto.project.open({ path }) }
      catch (e) { toast.error(String(e)) }
    }
  }, [])

  const closeProject = useCallback(() => {
    setForceOnboarding(true)
  }, [])

  if (!apiBootstrapped || !projectBootstrapped || !settingsBootstrapped) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Chargement…
      </div>
    )
  }

  const showOnboarding = !onboardingCompleted || forceOnboarding || !activeProject

  return (
    <>
      {showOnboarding ? (
        <OnboardingWizard
          onDone={() => setForceOnboarding(false)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : (
        <AppShell apiKeySet={apiKeySet} onOpenSettings={() => setSettingsOpen(true)} />
      )}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        apiKeySet={apiKeySet}
        onStatusChange={setApiKeySet}
      />
      <CommandPalette
        onOpenSettings={() => setSettingsOpen(true)}
        onNewProject={() => setForceOnboarding(true)}
        onOpenProject={() => void openProjectFromDialog()}
        onCloseProject={closeProject}
      />
      <Toaster position="bottom-right" theme="system" />
    </>
  )
}
