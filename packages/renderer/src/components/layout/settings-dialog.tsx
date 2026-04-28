import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  PROVIDER_IDS,
  type ProviderId,
  type ProvidersStatus,
} from '@buildoto/shared'
import { AccountTab } from './settings-account-tab'
import { AppearanceTab } from './settings-appearance-tab'
import { McpPanel } from './settings-mcp-panel'
import { PrivacyTab } from './settings-privacy-tab'
import { BuildotoAiRow } from './settings-buildoto-ai-row'
import { GenericProviderRow } from './settings-provider-row'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKeySet: boolean
  onStatusChange: (isSet: boolean) => void
}

export function SettingsDialog({ open, onOpenChange, onStatusChange }: SettingsDialogProps) {
  const [status, setStatus] = useState<ProvidersStatus | null>(null)
  const [defaultProvider, setDefaultProviderState] = useState<ProviderId>('anthropic')

  useEffect(() => {
    if (!open) return
    void window.buildoto.settings.getProvidersStatus().then((s) => {
      setStatus(s)
      onStatusChange(Object.values(s).some((p) => p.isSet))
    })
  }, [open, onStatusChange])

  const refresh = (s: ProvidersStatus) => {
    setStatus(s)
    onStatusChange(Object.values(s).some((p) => p.isSet))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Paramètres</DialogTitle>
          <DialogDescription>
            Clés API stockées dans le porte-clés système. Configuration MCP persistée localement.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="providers" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="providers">Fournisseurs</TabsTrigger>
            <TabsTrigger value="account">Compte</TabsTrigger>
            <TabsTrigger value="mcp">Serveurs MCP</TabsTrigger>
            <TabsTrigger value="appearance">Apparence</TabsTrigger>
            <TabsTrigger value="privacy">Confidentialité</TabsTrigger>
          </TabsList>

          <TabsContent value="providers">
            <ScrollArea className="h-[400px] pr-3">
              <div className="flex flex-col gap-3">
                {PROVIDER_IDS.map((id) => (
                  <ProviderRow
                    key={id}
                    providerId={id}
                    entry={status?.[id] ?? { isSet: false, model: null }}
                    isDefault={defaultProvider === id}
                    onChange={refresh}
                    onMakeDefault={async () => {
                      const next = await window.buildoto.settings.setDefaultProvider({
                        providerId: id,
                      })
                      setDefaultProviderState(id)
                      await window.buildoto.agent.setProvider({ providerId: id })
                      refresh(next)
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="account">
            <AccountTab />
          </TabsContent>

          <TabsContent value="mcp">
            <McpPanel />
          </TabsContent>

          <TabsContent value="appearance">
            <AppearanceTab />
          </TabsContent>

          <TabsContent value="privacy">
            <PrivacyTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function ProviderRow(props: {
  providerId: ProviderId
  entry: { isSet: boolean; model: string | null }
  isDefault: boolean
  onChange: (s: ProvidersStatus) => void
  onMakeDefault: () => void
}) {
  if (props.providerId === 'buildoto-ai') return <BuildotoAiRow {...props} />
  return <GenericProviderRow {...props} />
}
