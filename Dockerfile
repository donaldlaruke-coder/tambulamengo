# Step 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY scripts ./scripts
RUN npm install --legacy-peer-deps

COPY . .

# Add build arguments for Vite static environment variable injection
ARG VITE_USE_DJANGO=true
ARG VITE_BACKEND_URL=https://api.tambulamengo.work.gd
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_URL

ENV VITE_USE_DJANGO=$VITE_USE_DJANGO
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL

# Build with node-server preset for standalone node execution
RUN NITRO_PRESET=node-server npm run build

# Step 2: Serve the application
FROM node:22-alpine

WORKDIR /app

# Only copy compiled server output
COPY --from=builder /app/.output /app/.output

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
