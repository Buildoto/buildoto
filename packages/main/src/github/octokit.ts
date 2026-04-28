import { Octokit } from '@octokit/rest'
import type { GithubAuthStatus, GithubCreateRepoResult } from '@buildoto/shared'
import { getGithubToken } from '../store/settings'

const USER_AGENT = 'buildoto-desktop'

export function getOctokitForToken(token: string): Octokit {
  return new Octokit({ auth: token, userAgent: USER_AGENT })
}

export async function getOctokit(): Promise<Octokit | null> {
  const token = await getGithubToken()
  if (!token) return null
  return getOctokitForToken(token)
}

export async function getAuthStatus(): Promise<GithubAuthStatus> {
  const octokit = await getOctokit()
  if (!octokit) return { isAuthed: false }
  try {
    const { data } = await octokit.rest.users.getAuthenticated()
    return { isAuthed: true, login: data.login }
  } catch {
    return { isAuthed: false }
  }
}

export interface CreateRepoInput {
  name: string
  description?: string
  private: boolean
}

export async function createRepo(input: CreateRepoInput): Promise<GithubCreateRepoResult> {
  const octokit = await getOctokit()
  if (!octokit) throw new Error('Authentification GitHub requise.')
  try {
    const { data } = await octokit.rest.repos.createForAuthenticatedUser({
      name: input.name,
      description: input.description,
      private: input.private,
      auto_init: false,
    })
    return {
      cloneUrl: data.clone_url,
      htmlUrl: data.html_url,
      fullName: data.full_name,
    }
  } catch (err) {
    throw mapOctokitError(err)
  }
}

export async function getLogin(): Promise<string | null> {
  const octokit = await getOctokit()
  if (!octokit) return null
  try {
    const { data } = await octokit.rest.users.getAuthenticated()
    return data.login
  } catch {
    return null
  }
}

function mapOctokitError(err: unknown): Error {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status
    if (status === 401) return new Error('Authentification GitHub requise.')
    if (status === 403) return new Error('Limite de taux GitHub atteinte. Réessaye plus tard.')
    if (status === 422) return new Error('Données de création de dépôt invalides.')
  }
  return err instanceof Error ? err : new Error(String(err))
}
