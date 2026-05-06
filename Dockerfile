# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build --configuration production

FROM node:22-alpine AS api-deps
WORKDIR /api

COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime

RUN apk add --no-cache gettext nginx

COPY docker/nginx/default.conf /etc/nginx/http.d/default.conf
COPY docker/entrypoint/start.sh /usr/local/bin/beanconqueror-start
RUN chmod +x /usr/local/bin/beanconqueror-start

# Angular application build output
COPY --from=build /app/www/browser/ /usr/share/nginx/html/
# Runtime template for environment overrides
COPY docker/runtime-config/env.template.js /tmp/env.template.js
COPY api /app/api
COPY --from=api-deps /api/node_modules /app/api/node_modules

EXPOSE 80
CMD ["beanconqueror-start"]
