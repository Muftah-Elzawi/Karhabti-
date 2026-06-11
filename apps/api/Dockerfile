# Karhabti API — standalone image, knows nothing about any frontend.
# Build from the REPO ROOT (the pnpm workspace is the build context):
#   docker build -f apps/api/Dockerfile -t karhabti-api .
# --filter ensures only the API and the packages it depends on are installed.

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @karhabti/api...
RUN pnpm --filter @karhabti/api build
RUN pnpm --filter @karhabti/api deploy --prod --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
COPY --from=build /repo/apps/api/dist ./dist
EXPOSE 3001
USER node
CMD ["node", "dist/main.js"]
