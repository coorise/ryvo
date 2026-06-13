# Ryvo admin web — Next.js standalone
# Bun for deps (ignore-scripts for CPUs without AVX); Node for build/run on VPS.
FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
# `next build` runs in production mode — inlines NEXT_PUBLIC_* from .env.production (see write-web-env-production.sh).
COPY .env.production .env.production
ARG NEXT_PUBLIC_SUPABASE_URL=http://localhost:8400
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=
ARG NEXT_PUBLIC_FUNCTIONS_URL=http://localhost:8400/functions/v1
ARG NEXT_PUBLIC_APP_ENV=production
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_FUNCTIONS_URL=$NEXT_PUBLIC_FUNCTIONS_URL
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
RUN grep -qE '^NEXT_PUBLIC_SUPABASE_ANON_KEY=.+$' .env.production || (echo "ERROR: missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.production — run write-web-env-production.sh before docker build" && exit 1)
RUN ./node_modules/.bin/next build

FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN useradd --system --uid 1001 nextjs
USER nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
