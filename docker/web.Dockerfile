FROM node:20-alpine

WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/

RUN npm install

# Copy source
COPY apps/web/ ./apps/web/

EXPOSE 5173

CMD ["npm", "run", "dev", "--workspace=@semaforo/web"]
