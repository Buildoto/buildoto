import { ipcMain } from 'electron'
import {
  IpcChannels,
  type DeviceAuthPollState,
  type DeviceAuthStart,
  type GithubAuthStatus,
  type GithubCreateRepoRequest,
  type GithubCreateRepoResult,
  type GithubLinkRemoteRequest,
} from '@buildoto/shared'
import { cancelDeviceAuth, pollDeviceAuth, startDeviceAuth } from '../github/device-flow'
import { createRepo, getAuthStatus } from '../github/octokit'
import { GitRepo } from '../git/repo'
import { projectRegistry } from '../project/registry'
import { clearGithubToken } from '../store/settings'

export function registerGithubHandlers() {
  ipcMain.handle(IpcChannels.GITHUB_START_DEVICE_AUTH, (): Promise<DeviceAuthStart> =>
    startDeviceAuth(),
  )

  ipcMain.handle(IpcChannels.GITHUB_POLL_DEVICE_AUTH, (): Promise<DeviceAuthPollState> =>
    pollDeviceAuth(),
  )

  ipcMain.handle(IpcChannels.GITHUB_CANCEL_DEVICE_AUTH, (): void => cancelDeviceAuth())

  ipcMain.handle(IpcChannels.GITHUB_GET_AUTH_STATUS, (): Promise<GithubAuthStatus> =>
    getAuthStatus(),
  )

  ipcMain.handle(IpcChannels.GITHUB_SIGN_OUT, async (): Promise<void> => {
    await clearGithubToken()
  })

  ipcMain.handle(
    IpcChannels.GITHUB_CREATE_REPO,
    async (_e, req: GithubCreateRepoRequest): Promise<GithubCreateRepoResult> => {
      return createRepo({ name: req.name, description: req.description, private: req.private })
    },
  )

  ipcMain.handle(
    IpcChannels.GITHUB_LINK_REMOTE,
    async (_e, req: GithubLinkRemoteRequest): Promise<void> => {
      const project = projectRegistry.get()
      if (!project) throw new Error('No active project')
      const repo = new GitRepo(project.path)
      await repo.addRemote('origin', req.cloneUrl)
    },
  )
}
