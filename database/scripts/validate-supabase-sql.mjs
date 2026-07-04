import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "..", "supabase", "migrations");
const files = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();

if (files.length === 0) {
  console.error("No Supabase SQL migrations found.");
  process.exit(1);
}

for (const file of files) {
  const content = readFileSync(join(migrationsDir, file), "utf8");
  if (!content.trim()) {
    console.error(`${file} is empty.`);
    process.exit(1);
  }
  if (content.includes("TODO") || content.includes("FIXME")) {
    console.error(`${file} contains unfinished markers.`);
    process.exit(1);
  }
}

console.log(`Validated ${files.length} Supabase SQL migration(s).`);
