# ============================================
# NOT: WORKDIR asla /app OLMAMALI.
# Repoda App Router kökü <workdir>/app, içinde de "/app" URL segmenti için app/app/ var.
# WORKDIR /app iken bu ikisi (/app/app) çakışıyor ve Next, app/app/<route> dosyalarını
# /<route> olarak derliyor: /settings, /login, / kök sayfaları eziliyor ve giriş
# ekranı sonsuz yönlendirme döngüsüne giriyor. Lokalde proje klasörü "app" adında
# olmadığı için bu hata yalnızca container'da görünür.
# ============================================

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /srv/web

COPY package.json yarn.lock* ./
COPY prisma ./prisma/

RUN yarn install --frozen-lockfile --production=false && \
    yarn prisma generate

# ============================================
# Stage 2: Build
# ============================================
FROM node:22-alpine AS builder
WORKDIR /srv/web

COPY --from=deps /srv/web/node_modules ./node_modules
COPY . .

# .env dosyasını build sırasında kullanma — runtime'da inject edilecek
RUN rm -f .env

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_OUTPUT_MODE=standalone

RUN yarn build

# ============================================
# Stage 3: Worker (BullMQ) — builder'dan tureyip tam node_modules kullanir.
# Standalone output worker icin YETERSIZ (lib/** ve prisma CLI icermez), bu yuzden builder tabanli.
# ============================================
FROM builder AS worker

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 workeruser && \
    mkdir -p /data/websites && \
    chown -R workeruser:nodejs /data/websites

USER workeruser

CMD ["node_modules/.bin/tsx", "worker/index.ts"]

# ============================================
# Stage 4: Production Runner
# ============================================
FROM node:22-alpine AS runner
WORKDIR /srv/web

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# outputFileTracingRoot proje kokune esit oldugu icin standalone ciktisi duz: server.js kokte.
COPY --from=builder --chown=nextjs:nodejs /srv/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /srv/web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /srv/web/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
