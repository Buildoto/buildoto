import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useGitActions } from '@/hooks/use-git'
import { useProjectStore } from '@/stores/project-store'

export function BranchSwitcher() {
  const [branches, setBranches] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const status = useProjectStore((s) => s.gitStatus)
  const { listBranches, checkout, createBranch } = useGitActions()

  useEffect(() => {
    if (open) {
      setLoading(true)
      listBranches().then((list) => {
        if (list) setBranches(list)
      }).finally(() => setLoading(false))
    }
  }, [open, listBranches])

  const onCheckout = async (b: string) => {
    await checkout(b, false)
    setOpen(false)
  }

  const onCreate = async () => {
    const name = window.prompt('Nom de la nouvelle branche ?')
    if (!name?.trim()) return
    await createBranch(name.trim(), true)
    setOpen(false)
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        {status?.branch ?? '—'}
      </Button>
      {open && (
        <div className="absolute bottom-full mb-1 w-56 rounded-md border border-border bg-popover p-1 shadow-lg">
          {loading && (
            <div className="px-2 py-1 text-xs text-muted-foreground">Chargement…</div>
          )}
          {!loading && branches.map((b) => (
            <button
              key={b}
              className="flex w-full items-center px-2 py-1 text-left text-xs hover:bg-accent"
              onClick={() => void onCheckout(b)}
            >
              {b === status?.branch ? '● ' : '  '}
              {b}
            </button>
          ))}
          {!loading && <div className="my-1 border-t border-border" />}
          <button
            className="flex w-full items-center px-2 py-1 text-left text-xs hover:bg-accent"
            onClick={() => void onCreate()}
          >
            + Nouvelle branche…
          </button>
        </div>
      )}
    </div>
  )
}
