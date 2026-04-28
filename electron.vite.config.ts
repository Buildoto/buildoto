import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const EXTERNAL_MAIN_DEPS = [
  '@ai-sdk/anthropic',
  '@ai-sdk/google',
  '@ai-sdk/mistral',
  '@ai-sdk/openai',
  '@anthropic-ai/sdk',
  '@modelcontextprotocol/sdk',
  '@octokit/rest',
  '@openrouter/ai-sdk-provider',
  '@sentry/electron',
  'ai',
  'chokidar',
  'electron-store',
  'electron-updater',
  'keytar',
  'ollama-ai-provider',
  'posthog-node',
  'simple-git',
  'ulid',
  'ws',
  'zod',
]

// Sub-path exports for @buildoto/opencode-core — aliased individually so Vite
// resolves them to the vendored TypeScript source at bundle time.
const OPENCODE_CORE_ALIASES = {
  '@buildoto/opencode-core/agent': resolve(
    __dirname,
    'vendor/opencode-core/src/agent/agent.ts',
  ),
  '@buildoto/opencode-core/provider': resolve(
    __dirname,
    'vendor/opencode-core/src/provider/provider.ts',
  ),
  '@buildoto/opencode-core/tool': resolve(
    __dirname,
    'vendor/opencode-core/src/tool/registry.ts',
  ),
  '@buildoto/opencode-core/mcp': resolve(
    __dirname,
    'vendor/opencode-core/src/mcp/client.ts',
  ),
  '@buildoto/opencode-core/session': resolve(
    __dirname,
    'vendor/opencode-core/src/session/message.ts',
  ),
  '@buildoto/opencode-core': resolve(
    __dirname,
    'vendor/opencode-core/src/index.ts',
  ),
}

const MAIN_ENV_KEYS = ['BUILDOTO_GITHUB_CLIENT_ID', 'SENTRY_DSN', 'POSTHOG_KEY'] as const

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const mainDefine = Object.fromEntries(
    MAIN_ENV_KEYS.map((key) => [`process.env.${key}`, JSON.stringify(env[key] ?? '')]),
  )

  return {
    main: {
      plugins: [externalizeDepsPlugin({ include: EXTERNAL_MAIN_DEPS })],
      define: mainDefine,
      build: {
        outDir: 'out/main',
        lib: {
          entry: resolve(__dirname, 'packages/main/src/index.ts'),
        },
      },
      resolve: {
        alias: {
          '@buildoto/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
          ...OPENCODE_CORE_ALIASES,
        },
      },
    },
    preload: {
      plugins: [externalizeDepsPlugin({ include: EXTERNAL_MAIN_DEPS })],
      build: {
        outDir: 'out/preload',
        lib: {
          entry: resolve(__dirname, 'packages/main/src/preload.ts'),
        },
      },
      resolve: {
        alias: {
          '@buildoto/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
          ...OPENCODE_CORE_ALIASES,
        },
      },
    },
    renderer: {
      root: resolve(__dirname, 'packages/renderer'),
      plugins: [react(), tailwindcss()],
      build: {
        outDir: resolve(__dirname, 'out/renderer'),
        rollupOptions: {
          input: resolve(__dirname, 'packages/renderer/index.html'),
        },
      },
      resolve: {
        alias: {
          '@': resolve(__dirname, 'packages/renderer/src'),
          '@buildoto/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
        },
      },
      server: {
        port: 5173,
      },
    },
  }
})
