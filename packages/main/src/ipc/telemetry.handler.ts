import { ipcMain } from 'electron'
import { IpcChannels, type TelemetryCaptureRequest } from '@buildoto/shared'
import { captureEvent } from '../telemetry/posthog'

export function registerTelemetryHandlers() {
  ipcMain.handle(IpcChannels.TELEMETRY_CAPTURE, (_e, req: TelemetryCaptureRequest) => {
    captureEvent(req.event, req.properties)
  })
}
