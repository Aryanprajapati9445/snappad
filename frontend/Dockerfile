# Build from the repo root:
# docker build -f frontend/Dockerfile -t snappad-frontend .

FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

FROM base AS deps
RUN npm ci --workspace frontend --include-workspace-root=false

FROM deps AS build
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY frontend ./frontend
RUN npm run build --workspace frontend

FROM nginx:1.27-alpine AS runtime
ENV API_GATEWAY_URL=http://api-gateway:4000

COPY frontend/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
