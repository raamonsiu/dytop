# ---- deps: installed separately so source edits don't invalidate the layer ----
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder ----
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- runner: static files only, no Node at runtime ----
# The app is a pure SPA; nginx serves it and proxies the one thing a browser
# can't reach on its own, YouTube search.
FROM nginx:alpine AS runner
# A template so the entrypoint can fill in the container's own DNS resolver,
# which the search proxy needs to resolve YouTube at request time.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY docker/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
