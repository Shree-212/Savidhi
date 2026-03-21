FROM node:20-alpine AS base
WORKDIR /app

FROM base AS development
COPY services/catalog-service/package*.json ./
RUN npm ci
EXPOSE 4003
CMD ["npm", "run", "dev"]

FROM base AS build
COPY services/catalog-service/package*.json ./
RUN npm ci
COPY services/catalog-service/ ./
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY services/catalog-service/package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
EXPOSE 4003
CMD ["node", "dist/src/index.js"]
