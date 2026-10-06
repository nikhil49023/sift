FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends git python3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace backend --workspace shared --include-workspace-root
COPY shared shared
COPY backend backend
COPY migrations migrations
RUN npm run build -w backend
ENV NODE_ENV=production
USER node
EXPOSE 3001
CMD ["npm", "run", "start", "-w", "backend"]
