import { readFileSync } from "node:fs";
import { spreadInvoiceCosts } from "./spreader";

const args = process.argv.slice(2);
const filePath = args.find((arg) => !arg.startsWith("--"));
const jsonOutput = args.includes("--json");

if (!filePath) {
  console.error("Usage: npm run spread -- <path-to-invoice-json> [--json]");
  process.exit(1);
}

const input = JSON.parse(readFileSync(filePath, "utf8"));
const result = spreadInvoiceCosts(input);

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(JSON.stringify(result, null, 2));
}