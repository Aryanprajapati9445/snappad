# Build from the repo root:
# docker build -f backend/Dockerfile -t snappad-backend .

FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json

FROM base AS deps
RUN npm ci --workspace backend --include-workspace-root=false

FROM deps AS build
COPY backend ./backend
RUN npm run build --workspace backend

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=5000

RUN npm ci --omit=dev --workspace backend --include-workspace-root=false \
  && npm cache clean --force

COPY --from=build /app/backend/dist ./backend/dist

WORKDIR /app/backend
EXPOSE 5000

CMD ["node", "dist/server.js"]
