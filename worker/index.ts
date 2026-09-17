import { Worker } from 'bullmq'
import { getRedisConnection, getQueue, QUEUE_NAMES, type ScheduledJobData } from '@/lib/queue'
import { processSiteGenerate } from './processors/site-generate'
import { processHealthCheck } from './processors/health-check'
import { processSweepSearch } from './processors/sweep-search'
import { processScheduled } from './processors/scheduled'

async function main() {
  const connection = getRedisConnection()

  const workers = [
    new Worker(QUEUE_NAMES.siteGenerate, processSiteGenerate as any, {
      connection,
      concurrency: 2,
    }),
    new Worker(QUEUE_NAMES.healthCheck, processHealthCheck as any, {
      connection,
      concurrency: 2,
    }),
    new Worker(QUEUE_NAMES.sweepSearch, processSweepSearch as any, {
      connection,
      concurrency: 1, // Overpass oran limiti — sweep'ler sıralı çalışır
    }),
    new Worker(QUEUE_NAMES.scheduled, processScheduled as any, {
      connection,
      concurrency: 1,
    }),
  ]

  for (const w of workers) {
    w.on('failed', (job, err) => {
      console.error(`[worker] iş başarısız: ${w.name}/${job?.id} —`, err.message)
    })
    // 'error' dinleyicisi olmayan bir EventEmitter, Redis kesintisi gibi bir olayda
    // tüm süreci düşürür. Bunlar iş hatası değil altyapı hatası; loglanıp geçilir.
    w.on('error', (err) => {
      console.error(`[worker] kuyruk hatası: ${w.name} —`, err.message)
    })
  }

  // Tekrarlayan işler (idempotent upsert)
  const scheduled = getQueue<ScheduledJobData>(QUEUE_NAMES.scheduled)
  await scheduled.upsertJobScheduler(
    'health-recheck',
    { pattern: '0 4 * * *' },
    { name: 'health-recheck', data: { task: 'health-recheck' } }
  )
  await scheduled.upsertJobScheduler(
    'retention-purge',
    { pattern: '30 4 * * *' },
    { name: 'retention-purge', data: { task: 'retention-purge' } }
  )

  console.log('[worker] hazır — kuyruklar dinleniyor:', Object.values(QUEUE_NAMES).join(', '))

  async function shutdown() {
    console.log('[worker] kapanıyor…')
    await Promise.all(workers.map((w) => w.close()))
    await connection.quit()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((e) => {
  console.error('[worker] başlatma hatası:', e)
  process.exit(1)
})
