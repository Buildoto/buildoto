// Provider registry — port of packages/opencode/src/provider/provider.ts
// @ v1.14.19 of sst/opencode. Wraps the six AI-SDK-compatible providers
// Buildoto ships with and resolves `LanguageModelV1` instances on demand.
//
// Credentials are never read here directly; the host (Buildoto main process)
// injects a `getKey(providerId)` callback that reads from keytar. Ollama is
// treated specially: it's a local HTTP endpoint with no key.

import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModelV1 } from 'ai'
import { createOllama } from 'ollama-ai-provider'

export const PROVIDER_IDS = [
  'buildoto-ai',
  'anthropic',
  'openai',
  'mistral',
  'google',
  'ollama',
  'openrouter',
] as const

export type ProviderId = (typeof PROVIDER_IDS)[number]

export type GetKeyFn = (providerId: ProviderId) => Promise<string | null>

export interface ProviderRegistryOptions {
  getKey: GetKeyFn
  ollamaBaseUrl?: string
  buildotoAiBaseUrl?: string
  // Invoked after every buildoto-ai HTTP response so the host can surface
  // ``X-Quota-*`` headers in the status bar without poking the AI SDK
  // internals. The promise return is ignored; tap implementations must not
  // throw.
  onBuildotoAiResponse?: (response: Response) => void
}

export class ProviderKeyMissingError extends Error {
  constructor(public readonly providerId: ProviderId) {
    super(`Missing API key for provider '${providerId}'`)
    this.name = 'ProviderKeyMissingError'
  }
}

export interface ProviderRegistry {
  getModel(providerId: ProviderId, modelId: string): Promise<LanguageModelV1>
  listProviders(): readonly ProviderId[]
  invalidate(providerId: ProviderId): void
}

type ModelFactory = (modelId: string) => LanguageModelV1

interface CachedFactory {
  apiKey: string
  factory: ModelFactory
}

export function createProviderRegistry(
  options: ProviderRegistryOptions,
): ProviderRegistry {
  const ollamaBaseUrl = options.ollamaBaseUrl ?? 'http://localhost:11434/api'
  const buildotoAiBaseUrl = options.buildotoAiBaseUrl ?? 'https://api.buildoto.com/v1'
  const cache = new Map<ProviderId, CachedFactory>()

  async function resolveFactory(id: ProviderId): Promise<ModelFactory> {
    const apiKey = (await options.getKey(id)) ?? ''
    const cached = cache.get(id)
    if (cached && cached.apiKey === apiKey) return cached.factory

    let factory: ModelFactory
    switch (id) {
      case 'buildoto-ai': {
        // OpenAI-compatible service. "apiKey" here is the short-lived JWT
        // minted by the portal; the host rotates it under the hood so we
        // simply surface it as a bearer credential on each request.
        if (!apiKey) throw new ProviderKeyMissingError(id)
        const tap = options.onBuildotoAiResponse
        const instrumentedFetch: typeof fetch | undefined = tap
          ? async (input, init) => {
              const res = await fetch(input, init)
              try {
                tap(res.clone())
              } catch {
                // Never let a tap error bubble into the agent loop.
              }
              return res
            }
          : undefined
        factory = createOpenAI({
          apiKey,
          baseURL: buildotoAiBaseUrl,
          ...(instrumentedFetch ? { fetch: instrumentedFetch } : {}),
        })
        break
      }
      case 'anthropic':
        if (!apiKey) throw new ProviderKeyMissingError(id)
        factory = createAnthropic({ apiKey })
        break
      case 'openai':
        if (!apiKey) throw new ProviderKeyMissingError(id)
        factory = createOpenAI({ apiKey })
        break
      case 'mistral':
        if (!apiKey) throw new ProviderKeyMissingError(id)
        factory = createMistral({ apiKey })
        break
      case 'google':
        if (!apiKey) throw new ProviderKeyMissingError(id)
        factory = createGoogleGenerativeAI({ apiKey })
        break
      case 'ollama':
        factory = createOllama({ baseURL: ollamaBaseUrl })
        break
      case 'openrouter':
        if (!apiKey) throw new ProviderKeyMissingError(id)
        factory = createOpenRouter({ apiKey })
        break
    }
    cache.set(id, { apiKey, factory })
    return factory
  }

  return {
    async getModel(providerId, modelId) {
      const factory = await resolveFactory(providerId)
      return factory(modelId)
    },
    listProviders() {
      return PROVIDER_IDS
    },
    invalidate(providerId) {
      cache.delete(providerId)
    },
  }
}
