// backend/scripts/build_airports_min.js
// Run: node backend/scripts/build_airports_min.js
import { createReadStream, createWriteStream } from "fs";
import { stat } from "fs/promises";
import { pipeline } from "stream";

// stream-json is CommonJS; import default and extract parser
import streamJsonPkg from "stream-json";
const { parser } = streamJsonPkg;

// streamers are also CommonJS; import default and extract streamArray
import streamersPkg from "stream-json/streamers/StreamArray.js";
const { streamArray } = streamersPkg;

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT = resolve(__dirname, "../src/data/airports.json");
const OUTPUT = resolve(__dirname, "../src/data/airports.min.json");

console.log("Reading:", INPUT);

const readStream = createReadStream(INPUT);
const writeStream = createWriteStream(OUTPUT, { encoding: "utf8" });

writeStream.write("[");

let first = true;

pipeline(
  readStream,
  parser(),
  streamArray(),
  async function (source) {
    for await (const { value } of source) {
      const minimal = {
        id: value.objectID ?? null,
        name: value.name ?? "",
        city: value.city ?? "",
        country: value.country ?? "",
        iata: value.iata_code ?? "",
        q: `${value.name ?? ""} ${value.city ?? ""} ${value.country ?? ""} ${value.iata_code ?? ""}`.toLowerCase()
      };

      if (!first) writeStream.write(",\n");
      else first = false;

      writeStream.write(JSON.stringify(minimal));
    }
  },
  async (err) => {
    if (err) {
      console.error("❌ Pipeline failed:", err);
      process.exit(1);
    } else {
      writeStream.end("\n]\n", async () => {
        const stats = await stat(OUTPUT);
        console.log(`✅ Written: ${OUTPUT} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
    }
  }
);
