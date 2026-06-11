# Karhabti web — standalone image (Next.js standalone output).
# Build from the REPO ROOT (the pnpm workspace is the build context):
#   docker build -f apps/web/Dockerfile -t karhabti-web .

FROM node:22-alpine AS build
RUN corepack enable
# Standalone output is produced ONLY inside Docker (see next.config.mjs).
ENV NEXT_OUTPUT=standalone
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @karhabti/web...
RUN pnpm --filter @karhabti/web build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
USER node
CMD ["node", "apps/web/server.js"]
