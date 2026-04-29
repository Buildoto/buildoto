import Anthropic from '@anthropic-ai/sdk'
import {
  COMMIT_MESSAGE_CODE_SLICE,
  COMMIT_MESSAGE_MAX_TOKENS,
  COMMIT_MESSAGE_MODEL,
  COMMIT_MESSAGE_TRUNCATE,
} from '../lib/constants'

const SYSTEM = `Tu génères des messages de commit Git au format Conventional Commits (fr).
Format: "<type>: <description courte impérative>" sur une seule ligne, max 72 caractères.
Types autorisés : feat, fix, refactor, chore, docs, style, test.
Ne mets pas de point final. Ne mets pas d'emojis.
Exemples :
  feat: ajoute un cube de 2m à l'origine
  fix: corrige la position de la fenêtre sud
  refactor: extrait la logique de dalle dans une fonction`

export interface CommitMessageInput {
  apiKey?: string
  code: string
  stdoutPreview: string
  filesChanged: string[]
}

export async function generateCommitMessage(input: CommitMessageInput): Promise<string> {
  const fallback = `feat: buildoto generation ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`
  if (!input.apiKey) return fallback
  try {
    const client = new Anthropic({ apiKey: input.apiKey })
    const response = await client.messages.create({
      model: COMMIT_MESSAGE_MODEL,
      max_tokens: COMMIT_MESSAGE_MAX_TOKENS,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Python FreeCAD exécuté:
\`\`\`python
${input.code.slice(0, COMMIT_MESSAGE_CODE_SLICE)}
\`\`\`

Fichiers modifiés: ${input.filesChanged.join(', ')}

Stdout (aperçu): ${input.stdoutPreview.slice(0, 200) || '(vide)'}

Rédige un seul message de commit concis.`,
            },
          ],
        },
      ],
    })
    const raw = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    const firstLine = raw.split('\n')[0]?.trim() ?? ''
    if (!firstLine) return fallback
    return firstLine.slice(0, COMMIT_MESSAGE_TRUNCATE)
  } catch (err) {
    console.warn('[commit-message] generation failed, using fallback:', err)
    return fallback
  }
}
