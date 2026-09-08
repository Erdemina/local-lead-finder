import { SweepClient } from '@/app/_components/sweep/sweep-client'
import { NationwideSweep } from '@/app/_components/sweep/nationwide-sweep'

export const dynamic = 'force-dynamic'

export default function SweepPage() {
  return (
    <div className="space-y-6">
      <NationwideSweep />
      <SweepClient />
    </div>
  )
}
