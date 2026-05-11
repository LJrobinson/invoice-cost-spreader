import { basename, dirname, relative, resolve } from "node:path";
import type {
  ExternalSystem,
  MobyArtifact,
  MobyRunManifest,
  MobyRunStatus,
  MobyWarning,
} from "moby-core";
import type { InvoiceCostInput, SpreadResult } from "./types";

export const SPREAD_RESULT_FILE_NAME = "spread-result.json";
export const MOBY_RUN_MANIFEST_FILE_NAME = "moby-run-manifest.json";

export type InvoiceWarningCode =
  | "TOTAL_QUANTITY_NOT_POSITIVE"
  | "TOTAL_BASE_COST_NOT_POSITIVE"
  | "LINE_QUANTITY_NOT_POSITIVE"
  | "LINE_UNIT_COST_NEGATIVE"
  | "DISCOUNTS_EXCEED_ADDITIONAL_COSTS"
  | "INVOICE_COST_WARNING";

export type MobyRunManifestInput = {
  runId: string;
  generatedAt: string;
  inputFile: string;
  outputFile: string;
  manifestFile: string;
  input: InvoiceCostInput;
  result: SpreadResult;
};

export function toMobyRunStatus(result: SpreadResult): MobyRunStatus {
  return result.warnings.length > 0 ? "completed_with_warnings" : "completed";
}

export function createMobyRunManifest(
  args: MobyRunManifestInput,
): MobyRunManifest {
  const artifacts = toArtifacts(args);

  return {
    schemaVersion: "1.0",
    runId: args.runId,
    runType: "invoice_cost_spread",
    generatedBy: "invoice-cost-spreader",
    generatedAt: args.generatedAt,
    status: toMobyRunStatus(args.result),
    startedAt: args.generatedAt,
    completedAt: args.generatedAt,
    sources: [
      {
        system: getInvoiceSourceSystem(),
        name: "Invoice cost input",
        fileName: basename(args.inputFile),
        filePath: args.inputFile,
        receivedAt: args.generatedAt,
        metadata: {
          allocationMethod: args.input.allocationMethod,
          lineCount: args.input.lines.length,
          additionalCosts: args.input.additionalCosts,
          discounts: args.input.discounts,
        },
      },
    ],
    artifacts,
    warnings: args.result.warnings.map((warning) =>
      toMobyWarning(warning, args.input),
    ),
    summary: {
      processedCount: args.input.lines.length,
      successCount: args.result.lines.length,
      warningCount: args.result.warnings.length,
      errorCount: 0,
      artifactCount: artifacts.length,
      metadata: {
        allocationMethod: args.result.allocationMethod,
        totalBaseCost: args.result.totalBaseCost,
        totalQuantity: args.result.totalQuantity,
        additionalCosts: args.result.additionalCosts,
        discounts: args.result.discounts,
        netAdditionalCost: args.result.netAdditionalCost,
      },
    },
    metadata: {
      inputFile: args.inputFile,
      outputFile: args.outputFile,
      lineCount: args.input.lines.length,
      allocationMethod: args.result.allocationMethod,
      totalBaseCost: args.result.totalBaseCost,
      totalQuantity: args.result.totalQuantity,
      additionalCosts: args.result.additionalCosts,
      discounts: args.result.discounts,
      netAdditionalCost: args.result.netAdditionalCost,
    },
  };
}

export function toMobyWarning(
  message: string,
  input: InvoiceCostInput,
): MobyWarning {
  const code = inferWarningCode(message);
  const field = inferWarningField(code);
  const sku = inferWarningSku(message);

  return {
    code,
    severity: "warning",
    message,
    artifactId: "artifact_spread_result_json",
    ...(field ? { field } : {}),
    metadata: {
      originalMessage: message,
      allocationMethod: input.allocationMethod,
      ...(sku ? { sku } : {}),
      ...(code === "DISCOUNTS_EXCEED_ADDITIONAL_COSTS"
        ? {
            additionalCosts: input.additionalCosts,
            discounts: input.discounts,
          }
        : {}),
    },
  };
}

export function inferWarningCode(message: string): InvoiceWarningCode {
  if (message === "Total quantity must be greater than zero.") {
    return "TOTAL_QUANTITY_NOT_POSITIVE";
  }

  if (message === "Total base cost must be greater than zero.") {
    return "TOTAL_BASE_COST_NOT_POSITIVE";
  }

  if (message.includes(" has quantity less than or equal to zero.")) {
    return "LINE_QUANTITY_NOT_POSITIVE";
  }

  if (message.includes(" has negative unit cost.")) {
    return "LINE_UNIT_COST_NEGATIVE";
  }

  if (
    message ===
    "Discounts are greater than additional costs; net additional cost is negative."
  ) {
    return "DISCOUNTS_EXCEED_ADDITIONAL_COSTS";
  }

  return "INVOICE_COST_WARNING";
}

function inferWarningField(code: InvoiceWarningCode): string | undefined {
  if (
    code === "TOTAL_QUANTITY_NOT_POSITIVE" ||
    code === "LINE_QUANTITY_NOT_POSITIVE"
  ) {
    return "quantity";
  }

  if (code === "TOTAL_BASE_COST_NOT_POSITIVE") {
    return "totalBaseCost";
  }

  if (code === "LINE_UNIT_COST_NEGATIVE") {
    return "unitCost";
  }

  if (code === "DISCOUNTS_EXCEED_ADDITIONAL_COSTS") {
    return "discounts";
  }

  return undefined;
}

function toArtifacts(args: MobyRunManifestInput): MobyArtifact[] {
  const baseDir = dirname(resolve(args.manifestFile));

  return [
    {
      id: "artifact_invoice_input_json",
      role: "source",
      path: toPortableRelativePath(baseDir, args.inputFile),
      format: "json",
      label: "Invoice input",
      mediaType: "application/json",
    },
    {
      id: "artifact_spread_result_json",
      role: "output",
      path: toPortableRelativePath(baseDir, args.outputFile),
      format: "json",
      label: "Spread result",
      mediaType: "application/json",
    },
    {
      id: "artifact_moby_run_manifest_json",
      role: "manifest",
      path: toPortableRelativePath(baseDir, args.manifestFile),
      format: "json",
      label: "MOBY run manifest",
      mediaType: "application/json",
    },
  ];
}

function getInvoiceSourceSystem(): ExternalSystem {
  return "manual";
}

function inferWarningSku(message: string): string | undefined {
  const match = /^Line (.+) has /.exec(message);
  return match?.[1];
}

function toPortableRelativePath(baseDir: string, filePath: string): string {
  const relativePath = relative(baseDir, resolve(filePath));
  const portablePath = relativePath.replace(/\\/g, "/");

  return portablePath || basename(filePath);
}
