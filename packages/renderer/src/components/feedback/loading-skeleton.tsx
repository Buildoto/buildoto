import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted/50',
        className,
      )}
    />
  )
}

export function LoadingLines({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: lines }, (_, i) => (
        <LoadingSkeleton
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}
