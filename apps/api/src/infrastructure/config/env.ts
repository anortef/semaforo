export interface Config {
  port: number;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  cors: {
    origin: string;
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
    cors: {
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    },
  };
}
