import { app, ipcMain } from 'electron'
import {
  IpcChannels,
  type AppMetadata,
  type AppSettings,
  type SetAutoUpdateRequest,
  type SetCrashReportingRequest,
  type SetOnboardingStepRequest,
  type SetTelemetryConsentRequest,
  type SetThemeRequest,
} from '@buildoto/shared'
import {
  completeOnboarding,
  getAppSettings,
  resetAnonymousId,
  setAutoUpdate,
  setCrashReporting,
  setOnboardingStep,
  setTelemetryConsent,
  setTheme,
} from '../store/settings'

function buildMetadata(): AppMetadata {
  const channel =
    (process.env['BUILDOTO_CHANNEL'] as 'alpha' | 'beta' | 'stable' | undefined) ?? 'alpha'
  return {
    version: app.getVersion(),
    platform: process.platform as AppMetadata['platform'],
    arch: process.arch,
    channel,
    isPackaged: app.isPackaged,
  }
}

export function registerAppSettingsHandlers() {
  ipcMain.handle(IpcChannels.APP_SETTINGS_GET, (): AppSettings => getAppSettings())

  ipcMain.handle(IpcChannels.APP_SETTINGS_SET_THEME, (_e, req: SetThemeRequest) => {
    setTheme(req.theme)
    return getAppSettings()
  })

  ipcMain.handle(
    IpcChannels.APP_SETTINGS_SET_ONBOARDING_STEP,
    (_e, req: SetOnboardingStepRequest) => {
      setOnboardingStep(req.step)
      return getAppSettings()
    },
  )

  ipcMain.handle(IpcChannels.APP_SETTINGS_COMPLETE_ONBOARDING, () => {
    completeOnboarding()
    return getAppSettings()
  })

  ipcMain.handle(
    IpcChannels.APP_SETTINGS_SET_TELEMETRY_CONSENT,
    (_e, req: SetTelemetryConsentRequest) => {
      setTelemetryConsent(req.consent)
      return getAppSettings()
    },
  )

  ipcMain.handle(
    IpcChannels.APP_SETTINGS_SET_CRASH_REPORTING,
    (_e, req: SetCrashReportingRequest) => {
      setCrashReporting(req.enabled)
      return getAppSettings()
    },
  )

  ipcMain.handle(IpcChannels.APP_SETTINGS_SET_AUTO_UPDATE, (_e, req: SetAutoUpdateRequest) => {
    setAutoUpdate(req.enabled)
    return getAppSettings()
  })

  ipcMain.handle(IpcChannels.APP_SETTINGS_RESET_ANONYMOUS_ID, () => {
    resetAnonymousId()
  })

  ipcMain.handle(IpcChannels.APP_GET_METADATA, (): AppMetadata => buildMetadata())
}
