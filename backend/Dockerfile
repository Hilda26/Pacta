FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json
COPY database/package.json database/package.json
RUN pnpm install --filter @pacta/backend... --frozen-lockfile

FROM deps AS build
COPY backend backend
COPY shared shared
COPY database database
RUN pnpm --filter @pacta/backend build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "dist/main.js"]
