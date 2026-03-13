import { loadConfig } from "./infrastructure/config/env.js";
import { createPool } from "./infrastructure/persistence/database.js";
import { createExpressApp } from "./infrastructure/http/app.js";

const config = loadConfig();
const pool = createPool(config.database);
const app = createExpressApp(pool, config);

app.listen(config.port, () => {
  console.log(`Semaforo API running on port ${config.port}`);
});
