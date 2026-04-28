import { useMemo } from 'react'
import { Tree, type NodeRendererProps } from 'react-arborist'
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react'
import type { ProjectTreeEntry } from '@buildoto/shared'
import { useProjectTree } from '@/hooks/use-tree'

interface TreeNode {
  id: string
  name: string
  isDir: boolean
  children?: TreeNode[]
}

function toArboristNodes(entries: ProjectTreeEntry[]): TreeNode[] {
  return entries.map((e) => ({
    id: e.path,
    name: e.name,
    isDir: e.isDirectory,
    children: e.isDirectory ? toArboristNodes(e.children ?? []) : undefined,
  }))
}

interface FileTreeProps {
  onOpenFile?: (relativePath: string) => void
}

export function FileTree({ onOpenFile }: FileTreeProps) {
  const tree = useProjectTree()
  const data = useMemo(() => toArboristNodes(tree), [tree])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Explorateur
      </div>
      <div className="flex-1 overflow-hidden">
        {tree.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">
            Dossier vide
          </div>
        ) : (
          <Tree<TreeNode>
            data={data}
            openByDefault={false}
            rowHeight={24}
            indent={14}
            disableEdit
            disableDrag
            disableDrop
            width="100%"
            height={600}
            onActivate={(node) => {
              if (!node.data.isDir && onOpenFile) onOpenFile(node.id)
            }}
          >
            {Node}
          </Tree>
        )}
      </div>
    </div>
  )
}

function Node({ node, style, dragHandle }: NodeRendererProps<TreeNode>) {
  const Icon = node.data.isDir ? Folder : File
  const Chevron = node.isOpen ? ChevronDown : ChevronRight
  return (
    <div
      ref={dragHandle}
      style={style}
      className="flex cursor-pointer items-center gap-1 px-2 text-xs hover:bg-accent/50"
      onClick={() => node.toggle()}
    >
      {node.data.isDir ? (
        <Chevron className="h-3 w-3 text-muted-foreground" />
      ) : (
        <span className="w-3" />
      )}
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="truncate">{node.data.name}</span>
    </div>
  )
}
