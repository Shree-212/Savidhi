FROM node:20-alpine AS base
WORKDIR /app

# ── Development stage ─────────────────────────────────────────────────────────
FROM base AS development
COPY services/booking-service/package*.json ./
RUN npm ci
EXPOSE 4004
CMD ["npm", "run", "dev"]

# ── Production build stage ────────────────────────────────────────────────────
FROM base AS build
COPY services/booking-service/package*.json ./
RUN npm ci
COPY services/booking-service/ ./
RUN npm run build

# ── Production runner stage ───────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
COPY services/booking-service/package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist

EXPOSE 4004
CMD ["node", "dist/src/index.js"]
