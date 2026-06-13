# Karhabti admin — standalone image (Next.js standalone output).
# Build from the REPO ROOT (the pnpm workspace is the build context):
#   docker build -f apps/admin/Dockerfile -t karhabti-admin .

FROM node:22-alpine AS build
RUN corepack enable
# Standalone output is produced ONLY inside Docker (see next.config.mjs).
ENV NEXT_OUTPUT=standalone
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @karhabti/admin...
# Build workspace packages consumed via their dist output.
RUN pnpm --filter @karhabti/validation build
RUN pnpm --filter @karhabti/admin build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/apps/admin/.next/standalone ./
COPY --from=build /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build /repo/apps/admin/public ./apps/admin/public
EXPOSE 3002
USER node
CMD ["node", "apps/admin/server.js"]
