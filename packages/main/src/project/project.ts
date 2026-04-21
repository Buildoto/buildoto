import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path'
import { ulid } from 'ulid'
import simpleGit from 'simple-git'
import type {
  AnyProjectConfig,
  Project,
  ProjectConfig,
  ProjectConfigV1,
  ProjectConfigV2,
  ProjectGithubInfo,
  ProjectReadFileResult,
  ProjectTreeEntry,
} from '@buildoto/shared'
import {
  BUILDOTO_CACHE_DIR,
  BUILDOTO_CONFIG_FILE,
  BUILDOTO_DIR,
  BUILDOTO_SESSIONS_DIR,
  DEFAULT_AGENT_MODEL,
} from '../lib/constants'
import { buildAgentsMd } from '../templates/agents-md'
import { buildGitignore } from '../templates/gitignore'
import { buildReadmeMd } from '../templates/readme-md'

const PROJECT_ID_PREFIX = 'prj_'
const SESSION_ID_PREFIX = 'ses_'

export function newProjectId(): string {
  return `${PROJECT_ID_PREFIX}${ulid()}`
}

export function newSessionId(): string {
  return `${SESSION_ID_PREFIX}${ulid()}`
}

export function configPath(projectPath: string): string {
  return join(projectPath, BUILDOTO_DIR, BUILDOTO_CONFIG_FILE)
}

export function isProjectDirectory(projectPath: string): boolean {
  return existsSync(configPath(projectPath))
}

function migrateProjectConfigV1toV2(v1: ProjectConfigV1): ProjectConfigV2 {
  return {
    schemaVersion: 2,
    projectId: v1.projectId,
    name: v1.name,
    createdAt: v1.createdAt,
    agent: {
      defaultProvider: v1.agent.provider,
      mode: 'build',
      providers: {
        [v1.agent.provider]: {
          model: v1.agent.model,
          temperature: v1.agent.temperature,
        },
      },
    },
    mcpServers: [],
    git: v1.git,
    github: v1.github,
    paths: v1.paths,
    activeSessionId: v1.activeSessionId,
  }
}

export async function readConfig(projectPath: string): Promise<ProjectConfig> {
  const raw = await readFile(configPath(projectPath), 'utf8')
  const parsed = JSON.parse(raw) as AnyProjectConfig
  if (parsed.schemaVersion === 2) return parsed
  if (parsed.schemaVersion === 1) {
    const migrated = migrateProjectConfigV1toV2(parsed)
    await writeConfig(projectPath, migrated)
    return migrated
  }
  throw new Error(
    `Unsupported .buildoto/config.json schemaVersion: ${(parsed as { schemaVersion?: unknown }).schemaVersion}`,
  )
}

export async function writeConfig(projectPath: string, config: ProjectConfig): Promise<void> {
  await writeJsonAtomic(configPath(projectPath), config)
}

export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  const tmp = `${filePath}.${ulid()}.tmp`
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  await rename(tmp, filePath)
}

function toProject(config: ProjectConfig, projectPath: string): Project {
  return {
    projectId: config.projectId,
    path: projectPath,
    name: config.name,
    createdAt: config.createdAt,
    github: config.github,
    activeSessionId: config.activeSessionId ?? null,
  }
}

interface CreateProjectOptions {
  name: string
  parentPath: string
  github?: ProjectGithubInfo
}

export async function createProject(opts: CreateProjectOptions): Promise<Project> {
  const safeName = opts.name.trim()
  if (!safeName) throw new Error('Project name is empty')
  const projectPath = join(opts.parentPath, safeName)
  if (existsSync(projectPath)) {
    const entries = await stat(projectPath).catch(() => null)
    if (entries) throw new Error(`Path already exists: ${projectPath}`)
  }

  await mkdir(projectPath, { recursive: true })
  await mkdir(join(projectPath, BUILDOTO_DIR, BUILDOTO_SESSIONS_DIR), { recursive: true })
  await mkdir(join(projectPath, BUILDOTO_DIR, BUILDOTO_CACHE_DIR), { recursive: true })
  await mkdir(join(projectPath, 'generations'), { recursive: true })
  await mkdir(join(projectPath, 'documents'), { recursive: true })
  await mkdir(join(projectPath, 'exports'), { recursive: true })

  await writeFile(join(projectPath, 'AGENTS.md'), buildAgentsMd(safeName), 'utf8')
  await writeFile(join(projectPath, 'README.md'), buildReadmeMd(safeName), 'utf8')
  await writeFile(join(projectPath, '.gitignore'), buildGitignore(), 'utf8')

  const config: ProjectConfigV2 = {
    schemaVersion: 2,
    projectId: newProjectId(),
    name: safeName,
    createdAt: new Date().toISOString(),
    agent: {
      defaultProvider: 'anthropic',
      mode: 'build',
      providers: {
        anthropic: { model: DEFAULT_AGENT_MODEL, temperature: 1 },
      },
    },
    mcpServers: [],
    git: { autoCommit: true, commitMessageLanguage: 'fr' },
    github: opts.github ?? null,
    paths: { generations: 'generations', documents: 'documents', exports: 'exports' },
    activeSessionId: null,
  }
  await writeConfig(projectPath, config)

  const git = simpleGit(projectPath)
  await git.init()
  await git.add(['.gitignore', 'AGENTS.md', 'README.md', '.buildoto/config.json'])
  await git
    .env({ GIT_AUTHOR_NAME: 'Buildoto', GIT_AUTHOR_EMAIL: 'bot@buildoto.app' })
    .env({ GIT_COMMITTER_NAME: 'Buildoto', GIT_COMMITTER_EMAIL: 'bot@buildoto.app' })
    .commit('chore: buildoto project init')

  return toProject(config, projectPath)
}

export async function openProject(projectPath: string): Promise<Project> {
  const absolute = resolve(projectPath)
  if (!isProjectDirectory(absolute)) {
    throw new Error(`Not a Buildoto project (missing .buildoto/config.json): ${absolute}`)
  }
  const config = await readConfig(absolute)
  return toProject(config, absolute)
}

interface CloneOptions {
  url: string
  destPath: string
}

export async function cloneProject(opts: CloneOptions): Promise<Project> {
  const dest = resolve(opts.destPath)
  await mkdir(dirname(dest), { recursive: true })
  const git = simpleGit()
  await git.clone(opts.url, dest)
  if (!isProjectDirectory(dest)) {
    throw new Error(`Cloned repo is not a Buildoto project (missing .buildoto/config.json): ${dest}`)
  }
  return openProject(dest)
}

// ── File IO, scoped to the project path to prevent escape via ../ ───────────

export function resolveWithin(projectPath: string, relativePath: string): string {
  if (isAbsolute(relativePath)) throw new Error(`Absolute path rejected: ${relativePath}`)
  const resolved = resolve(projectPath, relativePath)
  const rel = relative(projectPath, resolved)
  if (rel.startsWith('..') || rel.split(sep).includes('..')) {
    throw new Error(`Path escapes project root: ${relativePath}`)
  }
  return resolved
}

export async function readProjectFile(
  projectPath: string,
  relativePath: string,
): Promise<ProjectReadFileResult> {
  const abs = resolveWithin(projectPath, relativePath)
  const s = await stat(abs)
  if (s.isDirectory()) throw new Error(`Cannot read a directory: ${relativePath}`)
  const buf = await readFile(abs)
  const isText = isLikelyText(relativePath)
  return isText
    ? { relativePath, content: buf.toString('utf8'), encoding: 'utf-8', sizeBytes: s.size }
    : { relativePath, content: buf.toString('base64'), encoding: 'base64', sizeBytes: s.size }
}

export async function writeProjectFile(
  projectPath: string,
  relativePath: string,
  content: string,
  encoding: 'utf-8' | 'base64' = 'utf-8',
): Promise<void> {
  const abs = resolveWithin(projectPath, relativePath)
  await mkdir(dirname(abs), { recursive: true })
  const data = encoding === 'base64' ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf8')
  const tmp = `${abs}.${ulid()}.tmp`
  await writeFile(tmp, data)
  await rename(tmp, abs)
}

const TEXT_EXTENSIONS = new Set([
  '.md',
  '.py',
  '.txt',
  '.json',
  '.yml',
  '.yaml',
  '.toml',
  '.gitignore',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
])

function isLikelyText(path: string): boolean {
  const lower = path.toLowerCase()
  for (const ext of TEXT_EXTENSIONS) if (lower.endsWith(ext)) return true
  return false
}

// ── Tree listing (shallow by folder, lazy) ──────────────────────────────────

const IGNORED_TOP_LEVEL = new Set(['.git', 'node_modules'])

export async function listTree(projectPath: string, maxDepth = 4): Promise<ProjectTreeEntry[]> {
  return readDir(projectPath, '.', 0, maxDepth)
}

async function readDir(
  projectRoot: string,
  relPath: string,
  depth: number,
  maxDepth: number,
): Promise<ProjectTreeEntry[]> {
  const { readdir } = await import('node:fs/promises')
  const abs = relPath === '.' ? projectRoot : join(projectRoot, relPath)
  const entries = await readdir(abs, { withFileTypes: true })
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  const out: ProjectTreeEntry[] = []
  for (const e of entries) {
    if (depth === 0 && IGNORED_TOP_LEVEL.has(e.name)) continue
    const rel = normalize(join(relPath === '.' ? '' : relPath, e.name)).split(sep).join('/')
    if (e.isDirectory()) {
      const children = depth + 1 < maxDepth ? await readDir(projectRoot, rel, depth + 1, maxDepth) : []
      out.push({ path: rel, name: e.name, isDirectory: true, children })
    } else {
      out.push({ path: rel, name: e.name, isDirectory: false })
    }
  }
  return out
}
