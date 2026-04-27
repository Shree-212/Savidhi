# Multi-stage build for Next.js standalone output. Container respects $PORT
# (Cloud Run sets PORT=8080 by default).
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
# NEXT_PUBLIC_* must be present at build time — Next.js inlines them into the
# client bundle. Cloud Run runtime env vars do nothing for these.
ARG NEXT_PUBLIC_API_URL=https://api.savidhi.in
ARG NEXT_PUBLIC_SITE_URL=https://savidhi.in
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_Si94Pz0tKzoMFn
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 8080
CMD ["node", "server.js"]
