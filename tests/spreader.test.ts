import { describe, expect, it } from "vitest";
import { spreadInvoiceCosts } from "../src/spreader";

describe("Invoice Cost Spreader", () => {
  it("spreads net additional invoice costs by unit count", () => {
    const result = spreadInvoiceCosts({
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
        {
          sku: "EIGHTH-036",
          description: "Eighths",
          quantity: 36,
          unitCost: 12,
        },
      ],
    });

    expect(result.totalQuantity).toBe(277);
    expect(result.totalBaseCost).toBe(1832);
    expect(result.netAdditionalCost).toBe(105);

    const preRolls = result.lines.find((line) => line.sku === "PREROLL-240");

    expect(preRolls).toBeDefined();
    expect(preRolls?.allocatedCost).toBeCloseTo(155.96, 2);
    expect(preRolls?.allocatedDiscount).toBeCloseTo(64.98, 2);
    expect(preRolls?.adjustedUnitCost).toBeCloseTo(2.88, 2);
  });

  it("spreads net additional invoice costs by invoice value", () => {
    const result = spreadInvoiceCosts({
      allocationMethod: "value",
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
        {
          sku: "EIGHTH-036",
          description: "Eighths",
          quantity: 36,
          unitCost: 12,
        },
      ],
    });

    const bulkFlower = result.lines.find((line) => line.sku === "FLOWER-BULK-001");

    expect(bulkFlower).toBeDefined();
    expect(bulkFlower?.allocatedCost).toBeCloseTo(78.60, 2);
    expect(bulkFlower?.allocatedDiscount).toBeCloseTo(32.75, 2);
    expect(bulkFlower?.adjustedUnitCost).toBeCloseTo(845.85, 2);
  });

  it("warns when discounts are greater than additional costs", () => {
    const result = spreadInvoiceCosts({
      allocationMethod: "unit",
      additionalCosts: 25,
      discounts: 50,
      lines: [
        {
          sku: "TEST-001",
          description: "Test Product",
          quantity: 10,
          unitCost: 5,
        },
      ],
    });

    expect(result.warnings).toContain(
      "Discounts are greater than additional costs; net additional cost is negative."
    );
  });
});