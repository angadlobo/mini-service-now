FROM node:20-alpine AS builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY shared /app/shared
COPY server/ .
RUN npx tsc || true

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/src ./src
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./
COPY --from=builder /app/shared ../shared
RUN mkdir -p /app/uploads
EXPOSE 3001
CMD ["npx", "tsx", "src/index.ts"]
