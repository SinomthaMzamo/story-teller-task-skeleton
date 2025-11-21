import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { validate, type Schema } from "@cfworker/json-schema";

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read JSON file from command-line argument
const jsonFile = process.argv[2];
if (!jsonFile) {
  console.error("Usage: ts-node src/validateStory.ts <path/to/story.json>");
  process.exit(1);
}

// Load JSON Schema
const schemaPath = path.join(__dirname, "../../schema/story.schema.json");
const schemaData: Schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

// Load JSON data
const data = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));

// Validate
const result = validate(data, schemaData);

if (result.valid) {
  console.log(`✅ ${jsonFile} is valid according to story.schema.json`);
} else {
  console.error(`❌ ${jsonFile} is invalid!`);
  console.error(JSON.stringify(result.errors, null, 2));
  process.exit(1);
}
