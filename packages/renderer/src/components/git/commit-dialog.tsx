import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useGitActions } from '@/hooks/use-git'

interface CommitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommitDialog({ open, onOpenChange }: CommitDialogProps) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const actions = useGitActions()

  const submit = async () => {
    if (!message.trim()) return
    setBusy(true)
    setError(null)
    try {
      await actions.commit(message.trim())
      setMessage('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau commit</DialogTitle>
          <DialogDescription>
            Conventional Commit recommandé (feat/fix/chore/docs/refactor/style/test).
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="feat: …"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          autoFocus
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !message.trim()}>
            {busy ? 'Commit…' : 'Commit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
