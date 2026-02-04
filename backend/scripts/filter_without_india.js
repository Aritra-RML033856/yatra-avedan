import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT = resolve(__dirname, "../src/data/airports.min.json");
const OUTPUT = resolve(__dirname, "../src/data/airports.without_india.json");

async function run() {
  console.log("Reading:", INPUT);

  const raw = await fs.readFile(INPUT, "utf8");
  const data = JSON.parse(raw);

  const withoutIndia = data.filter(a => a.country !== "India");

  await fs.writeFile(OUTPUT, JSON.stringify(withoutIndia, null, 2));

  console.log("✅ Created:", OUTPUT);
  console.log("Count:", withoutIndia.length);
}

run().catch(err => console.error("Error:", err));
