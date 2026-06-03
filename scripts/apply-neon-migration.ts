import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { requireDatabaseUrl } from "@/lib/server/env";
import { loadLocalEnvFile } from "./load-local-env";

async function main() {
  await loadLocalEnvFile();

  const migrationsDir = path.join(process.cwd(), "db/migrations");
  const migrationFiles = (await readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  const client = new Client({
    connectionString: requireDatabaseUrl(),
    ssl: {
      rejectUnauthorized: false
    }
  });

  await client.connect();

  for (const fileName of migrationFiles) {
    const migrationPath = path.join(migrationsDir, fileName);
    const migrationSql = await readFile(migrationPath, "utf8");

    await client.query(migrationSql);
    console.log(`Applied Neon migration: db/migrations/${fileName}`);
  }

  await client.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
