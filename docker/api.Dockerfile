FROM node:20-alpine

WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json* ./
COPY packages/domain/package.json ./packages/domain/
COPY apps/api/package.json ./apps/api/

RUN npm install

# Copy source
COPY tsconfig.base.json ./
COPY packages/domain/ ./packages/domain/
COPY apps/api/ ./apps/api/

# Build domain first, then api
RUN npm run build --workspace=@semaforo/domain

EXPOSE 3001

CMD ["npm", "run", "dev", "--workspace=@semaforo/api"]
