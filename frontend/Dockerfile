# Stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:1.27-alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback — send all 404s to index.html so React Router works
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
