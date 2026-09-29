import type { ReactNode } from 'react'

import { cn } from '../../lib/utils'

type BadgeProps = {
  children: ReactNode
  className?: string
  icon?: ReactNode
}

export function Badge({ children, className, icon }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 border border-cyan-200/45 bg-cyan-200/10 px-3 py-2 font-heading text-xs font-bold uppercase tracking-[0] text-cyan-200',
        'max-w-full whitespace-normal text-left leading-tight [overflow-wrap:anywhere]',
        className
      )}
    >
      {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      <span className="min-w-0">{children}</span>
    </span>
  )
}
