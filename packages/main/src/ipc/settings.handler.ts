import { ipcMain } from 'electron'
import {
  IpcChannels,
  type ClearProviderKeyRequest,
  type ProvidersStatus,
  type SetDefaultProviderRequest,
  type SetProviderKeyRequest,
  type SetProviderModelRequest,
} from '@buildoto/shared'
import {
  clearApiKey,
  getProvidersStatus,
  setApiKey,
  setDefaultProvider,
  setProviderModel,
} from '../store/settings'

export function registerSettingsHandlers() {
  ipcMain.handle(
    IpcChannels.SETTINGS_GET_PROVIDERS_STATUS,
    (): Promise<ProvidersStatus> => getProvidersStatus(),
  )

  ipcMain.handle(
    IpcChannels.SETTINGS_SET_PROVIDER_KEY,
    async (_e, req: SetProviderKeyRequest): Promise<ProvidersStatus> => {
      await setApiKey(req.providerId, req.apiKey)
      return getProvidersStatus()
    },
  )

  ipcMain.handle(
    IpcChannels.SETTINGS_CLEAR_PROVIDER_KEY,
    async (_e, req: ClearProviderKeyRequest): Promise<ProvidersStatus> => {
      await clearApiKey(req.providerId)
      return getProvidersStatus()
    },
  )

  ipcMain.handle(
    IpcChannels.SETTINGS_SET_PROVIDER_MODEL,
    async (_e, req: SetProviderModelRequest): Promise<ProvidersStatus> => {
      setProviderModel(req.providerId, req.model)
      return getProvidersStatus()
    },
  )

  ipcMain.handle(
    IpcChannels.SETTINGS_SET_DEFAULT_PROVIDER,
    async (_e, req: SetDefaultProviderRequest): Promise<ProvidersStatus> => {
      setDefaultProvider(req.providerId)
      return getProvidersStatus()
    },
  )
}
