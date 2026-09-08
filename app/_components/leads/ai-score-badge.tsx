'use client'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Skor rengi sıcaklık göstergesi: 8+ sıcak aday, 4-7 orta, 3 ve altı soğuk.
function toneFor(score: number): string {
  if (score >= 8) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
  if (score >= 4) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
}

export function AiScoreBadge({
  score,
  note,
}: {
  score: number | null | undefined
  note?: string | null
}) {
  if (typeof score !== 'number') return <span className="text-muted-foreground">—</span>

  const badge = (
    <Badge variant="outline" className={`border-0 font-semibold ${toneFor(score)}`}>
      {score}
    </Badge>
  )

  if (!note) return badge

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{badge}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{note}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
