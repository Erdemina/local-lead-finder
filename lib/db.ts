import { PrismaClient } from '@prisma/client'

// Tenant'a ait modellerde tenantId'siz sorguları dev/test'te yakalayan guard.
// Admin/sistem kodu bilinçli olarak kapsam dışı sorgu yapacaksa `prismaUnscoped` kullanmalı.
const TENANT_SCOPED_MODELS = new Set([
  'Lead',
  'LeadNote',
  'Search',
  'SearchResult',
  'Action',
  'GeneratedSite',
])

const guardEnabled = process.env.NODE_ENV !== 'production'

function createClient() {
  const base = new PrismaClient()
  const extended = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (guardEnabled && model && TENANT_SCOPED_MODELS.has(model)) {
            const serialized = JSON.stringify(args ?? {})
            if (!serialized.includes('"tenantId"')) {
              throw new Error(
                `[tenant-guard] ${model}.${operation} tenantId olmadan çağrıldı. ` +
                  'Sorguyu tenantId ile kapsayın veya bilinçli admin erişimi için prismaUnscoped kullanın.'
              )
            }
          }
          return query(args)
        },
      },
    },
  })
  return { base, extended }
}

type Clients = ReturnType<typeof createClient>

const globalForPrisma = globalThis as unknown as {
  prismaClients: Clients | undefined
}

const clients = globalForPrisma.prismaClients ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaClients = clients

export const prisma = clients.extended
export const prismaUnscoped = clients.base
