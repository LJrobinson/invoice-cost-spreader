import { describe, expect, it } from "vitest";
import {
  createMobyRunManifest,
  toMobyRunStatus,
  toMobyWarning,
} from "../src/moby-run-manifest";
import { spreadInvoiceCosts } from "../src/spreader";
import type { InvoiceCostInput } from "../src/types";

const baseInput: InvoiceCostInput = {
  allocationMethod: "unit",
  additionalCosts: 180,
  discounts: 75,
  lines: [
    {
      sku: "FLOWER-BULK-001",
      description: "Bulk Flower",
      quantity: 1,
      unitCost: 800,
    },
    {
      sku: "PREROLL-240",
      description: "Pre-Rolls",
      quantity: 240,
      unitCost: 2.5,
    },
  ],
};

describe("MOBY run manifest adapter", () => {
  it("sets status to completed with no warnings", () => {
    const result = spreadInvoiceCosts(baseInput);

    expect(toMobyRunStatus(result)).toBe("completed");
  });

  it("sets status to completed_with_warnings when warnings are present", () => {
    const result = spreadInvoiceCosts({
      ...baseInput,
      additionalCosts: 25,
      discounts: 50,
    });

    expect(toMobyRunStatus(result)).toBe("completed_with_warnings");
  });

  it("includes input, spread result, and MOBY run manifest artifacts", () => {
    const manifest = createMobyRunManifest({
      runId: "spread-run-001",
      generatedAt: "2026-05-11T20:00:00.000Z",
      inputFile: "output/runs/spread-run-001/invoice-input.json",
      outputFile: "output/runs/spread-run-001/spread-result.json",
      manifestFile: "output/runs/spread-run-001/moby-run-manifest.json",
      input: baseInput,
      result: spreadInvoiceCosts(baseInput),
    });

    expect(manifest.artifacts.map((artifact) => artifact.id)).toEqual([
      "artifact_invoice_input_json",
      "artifact_spread_result_json",
      "artifact_moby_run_manifest_json",
    ]);
    expect(artifactById(manifest, "artifact_invoice_input_json")).toMatchObject(
      {
        role: "source",
        path: "invoice-input.json",
        format: "json",
        mediaType: "application/json",
      },
    );
    expect(artifactById(manifest, "artifact_spread_result_json")).toMatchObject(
      {
        role: "output",
        path: "spread-result.json",
        format: "json",
        mediaType: "application/json",
      },
    );
    expect(
      artifactById(manifest, "artifact_moby_run_manifest_json"),
    ).toMatchObject({
      role: "manifest",
      path: "moby-run-manifest.json",
      format: "json",
      mediaType: "application/json",
    });
  });

  it("sets summary artifactCount from artifacts.length", () => {
    const manifest = createMobyRunManifest({
      runId: "spread-run-001",
      generatedAt: "2026-05-11T20:00:00.000Z",
      inputFile: "output/runs/spread-run-001/invoice-input.json",
      outputFile: "output/runs/spread-run-001/spread-result.json",
      manifestFile: "output/runs/spread-run-001/moby-run-manifest.json",
      input: baseInput,
      result: spreadInvoiceCosts(baseInput),
    });

    expect(manifest.summary.artifactCount).toBe(manifest.artifacts.length);
  });

  it("maps discount warnings with code, field, artifact link, and metadata", () => {
    const warning =
      "Discounts are greater than additional costs; net additional cost is negative.";

    expect(
      toMobyWarning(warning, {
        ...baseInput,
        additionalCosts: 25,
        discounts: 50,
      }),
    ).toMatchObject({
      code: "DISCOUNTS_EXCEED_ADDITIONAL_COSTS",
      severity: "warning",
      message: warning,
      field: "discounts",
      artifactId: "artifact_spread_result_json",
      metadata: {
        originalMessage: warning,
        allocationMethod: "unit",
        additionalCosts: 25,
        discounts: 50,
      },
    });
  });

  it("maps line warnings with inferred sku metadata", () => {
    const warning = "Line BAD-SKU has negative unit cost.";

    expect(toMobyWarning(warning, baseInput)).toMatchObject({
      code: "LINE_UNIT_COST_NEGATIVE",
      severity: "warning",
      message: warning,
      field: "unitCost",
      artifactId: "artifact_spread_result_json",
      metadata: {
        originalMessage: warning,
        allocationMethod: "unit",
        sku: "BAD-SKU",
      },
    });
  });
});

function artifactById(
  manifest: ReturnType<typeof createMobyRunManifest>,
  artifactId: string,
) {
  return manifest.artifacts.find((artifact) => artifact.id === artifactId);
}
