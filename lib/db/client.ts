import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("dotenv").config({ path: ".env.local" });
      return process.env.DATABASE_URL;
    } catch {
      return undefined;
    }
  })();

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new pg.Pool({ connectionString });

export const db = drizzle(pool, { schema });
export { pool };
