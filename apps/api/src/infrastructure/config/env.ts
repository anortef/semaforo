export interface Config {
  port: number;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  redis: {
    host: string;
    port: number;
  };
  cors: {
    origin: string;
  };
  jwt: {
    secret: string;
  };
}

export function loadConfig(): Config {
  return {
    port: parseInt(process.env.PORT ?? "3001", 10),
    database: {
      host: process.env.DB_HOST ?? "localhost",
      port: parseInt(process.env.DB_PORT ?? "5432", 10),
      user: process.env.DB_USER ?? "semaforo",
      password: process.env.DB_PASSWORD ?? "semaforo",
      name: process.env.DB_NAME ?? "semaforo",
    },
    redis: {
      host: process.env.REDIS_HOST ?? "localhost",
      port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    },
    cors: {
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    },
    jwt: {
      secret: process.env.JWT_SECRET ?? "semaforo-dev-secret",
    },
  };
}
