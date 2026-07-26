# Step 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .

# Build with node-server preset for standalone node execution
RUN NITRO_PRESET=node-server npm run build

# Step 2: Serve the application
FROM node:20-alpine

WORKDIR /app

# Only copy compiled server output
COPY --from=builder /app/.output /app/.output

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
