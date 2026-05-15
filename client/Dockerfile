FROM node:20-alpine AS builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY shared /app/shared
COPY client/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
