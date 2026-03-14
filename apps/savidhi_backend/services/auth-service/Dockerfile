FROM node:20-alpine AS base
WORKDIR /app

# ── Development stage ─────────────────────────────────────────────────────────
FROM base AS development
COPY services/auth-service/package*.json ./
RUN npm ci
EXPOSE 4001
CMD ["npm", "run", "dev"]

# ── Production build stage ────────────────────────────────────────────────────
FROM base AS build
COPY services/auth-service/package*.json ./
RUN npm ci
COPY services/auth-service/ ./
RUN npm run build

# ── Production runner stage ───────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
COPY services/auth-service/package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist

EXPOSE 4001
CMD ["node", "dist/src/index.js"]
