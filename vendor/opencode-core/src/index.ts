// Barrel for @buildoto/opencode-core. Consumers are expected to import from
// the sub-path exports (./agent, ./provider, ./tool, ./mcp, ./session) for
// tree-shaking; this root export is a convenience for adapters.

export * from './agent/agent'
export * from './provider/provider'
export * from './tool/registry'
export * from './mcp/client'
export * from './session/message'
