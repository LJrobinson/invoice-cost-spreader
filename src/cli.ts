import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createMobyRunManifest,
  MOBY_RUN_MANIFEST_FILE_NAME,
  SPREAD_RESULT_FILE_NAME,
} from "./moby-run-manifest";
import { spreadInvoiceCosts } from "./spreader";
import type { InvoiceCostInput, SpreadResult } from "./types";

type CliArgs = {
  filePath: string;
  jsonOutput: boolean;
  runDir?: string;
  runId?: string;
};

const args = parseArgs(process.argv.slice(2)) ?? usage();

const input = JSON.parse(readFileSync(args.filePath, "utf8"));
const result = spreadInvoiceCosts(input);

if (args.runDir) {
  writeRunOutputs(args, input, result);
}

if (args.jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(argv: string[]): CliArgs | undefined {
  let filePath: string | undefined;
  let jsonOutput = false;
  let runDir: string | undefined;
  let runId: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      jsonOutput = true;
    } else if (arg === "--run-dir") {
      const value = argv[index + 1];

      if (!value) {
        return undefined;
      }

      runDir = value;
      index += 1;
    } else if (arg === "--run-id") {
      const value = argv[index + 1];

      if (!value) {
        return undefined;
      }

      runId = value;
      index += 1;
    } else if (!arg.startsWith("--") && !filePath) {
      filePath = arg;
    }
  }

  if (!filePath) {
    return undefined;
  }

  return {
    filePath,
    jsonOutput,
    runDir,
    runId,
  };
}

function usage(): never {
  console.error(
    "Usage: npm run spread -- <path-to-invoice-json> [--json] [--run-dir <dir>] [--run-id <id>]"
  );
  process.exit(1);
}

function writeRunOutputs(
  args: CliArgs,
  input: InvoiceCostInput,
  result: SpreadResult,
): void {
  if (!args.runDir) {
    return;
  }

  const generatedAtDate = new Date();
  const runId = args.runId ?? formatRunTimestamp(generatedAtDate);
  const generatedAt = generatedAtDate.toISOString();
  const runPath = join(args.runDir, runId);
  const outputPath = join(runPath, SPREAD_RESULT_FILE_NAME);
  const manifestPath = join(runPath, MOBY_RUN_MANIFEST_FILE_NAME);

  mkdirSync(runPath, { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      createMobyRunManifest({
        runId,
        generatedAt,
        inputFile: args.filePath,
        outputFile: outputPath,
        manifestFile: manifestPath,
        input,
        result,
      }),
      null,
      2
    )}\n`,
    "utf8"
  );
}

function formatRunTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = padDatePart(date.getUTCMonth() + 1);
  const day = padDatePart(date.getUTCDate());
  const hour = padDatePart(date.getUTCHours());
  const minute = padDatePart(date.getUTCMinutes());
  const second = padDatePart(date.getUTCSeconds());

  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}
