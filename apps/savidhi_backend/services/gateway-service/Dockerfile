FROM node:20-alpine AS base
WORKDIR /app

# ── Development stage ─────────────────────────────────────────────────────────
FROM base AS development
COPY services/gateway-service/package*.json ./
RUN npm ci
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ── Production build stage ────────────────────────────────────────────────────
FROM base AS build
COPY services/gateway-service/package*.json ./
RUN npm ci
COPY services/gateway-service/ ./
RUN npm run build

# ── Production runner stage ───────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
COPY services/gateway-service/package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/src/index.js"]
