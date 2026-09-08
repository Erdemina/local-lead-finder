import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export const QUEUE_NAMES = {
  siteGenerate: 'site-generate',
  sweepSearch: 'sweep-search',
  healthCheck: 'health-check',
  scheduled: 'scheduled',
} as const

export interface SiteGenerateJobData {
  op: 'generate' | 'delete'
  siteId: string
  tenantId: string
}

export interface SweepSearchJobData {
  searchId: string
  tenantId: string
  userId: string
}

export interface HealthCheckJobData {
  tenantId: string
  leadIds: string[]
}

export interface ScheduledJobData {
  task: 'health-recheck' | 'retention-purge'
}

let redis: IORedis | null = null

export function getRedisConnection(): IORedis {
  if (!redis) {
    redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      // BullMQ zorunluluğu: bloklayan komutlar için retry kapalı olmalı
      maxRetriesPerRequest: null,
    })
  }
  return redis
}

const queues = new Map<string, Queue>()

export function getQueue<T = unknown>(name: string): Queue<T> {
  let q = queues.get(name)
  if (!q) {
    q = new Queue(name, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 },
        attempts: 2,
      },
    })
    queues.set(name, q)
  }
  return q as unknown as Queue<T>
}
