# Karhabti API — standalone image, knows nothing about any frontend.
# Build from the REPO ROOT (the pnpm workspace is the build context):
#   docker build -f apps/api/Dockerfile -t karhabti-api .
# --filter ensures only the API and the packages it depends on are installed.

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @karhabti/api...
# Generate the Prisma client (schema lives in packages/database).
RUN pnpm --filter @karhabti/database db:generate
# Build workspace packages the API consumes at runtime (main -> dist).
RUN pnpm --filter @karhabti/validation build
RUN pnpm --filter @karhabti/api build
RUN pnpm --filter @karhabti/api deploy --prod --legacy /out
# pnpm deploy copies packages, not the GENERATED .prisma client beside
# @prisma/client in the store — carry it over explicitly.
RUN cp -r /repo/node_modules/.pnpm/@prisma+client*/node_modules/.prisma /out/node_modules/.prisma

# One-off migration runner (has the prisma CLI + schema):
#   docker compose --profile migrate run --rm migrate
FROM build AS migrate
WORKDIR /repo/packages/database
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
COPY --from=build /repo/apps/api/dist ./dist
EXPOSE 3001
USER node
CMD ["node", "dist/main.js"]
