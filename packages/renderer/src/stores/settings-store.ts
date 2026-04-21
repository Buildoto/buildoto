import { create } from 'zustand'
import type {
  AppMetadata,
  AppSettings,
  TelemetryConsent,
  ThemePreference,
} from '@buildoto/shared'

interface SettingsStoreState extends AppSettings {
  metadata: AppMetadata | null
  bootstrapped: boolean
  setAll: (settings: AppSettings) => void
  setTheme: (theme: ThemePreference) => void
  setTelemetryConsent: (consent: TelemetryConsent) => void
  setOnboardingStep: (step: number) => void
  setOnboardingCompleted: (done: boolean) => void
  setCrashReporting: (enabled: boolean) => void
  setAutoUpdate: (enabled: boolean) => void
  setMetadata: (m: AppMetadata) => void
  setBootstrapped: (b: boolean) => void
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  theme: 'system',
  onboardingCompleted: false,
  onboardingStep: 1,
  telemetryConsent: 'pending',
  crashReportingEnabled: false,
  autoUpdateEnabled: true,
  metadata: null,
  bootstrapped: false,
  setAll: (settings) => set(settings),
  setTheme: (theme) => set({ theme }),
  setTelemetryConsent: (telemetryConsent) => set({ telemetryConsent }),
  setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
  setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
  setCrashReporting: (crashReportingEnabled) => set({ crashReportingEnabled }),
  setAutoUpdate: (autoUpdateEnabled) => set({ autoUpdateEnabled }),
  setMetadata: (metadata) => set({ metadata }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
}))
