import type { InvoiceCostInput, SpreadResult } from "./types";

export function spreadInvoiceCosts(input: InvoiceCostInput): SpreadResult {
  const warnings: string[] = [];

  const totalQuantity = input.lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalBaseCost = input.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitCost,
    0
  );

  if (totalQuantity <= 0) {
    warnings.push("Total quantity must be greater than zero.");
  }

  if (totalBaseCost <= 0) {
    warnings.push("Total base cost must be greater than zero.");
  }

  for (const line of input.lines) {
    if (line.quantity <= 0) {
      warnings.push(`Line ${line.sku} has quantity less than or equal to zero.`);
    }

    if (line.unitCost < 0) {
      warnings.push(`Line ${line.sku} has negative unit cost.`);
    }
  }

  if (input.discounts > input.additionalCosts) {
    warnings.push(
      "Discounts are greater than additional costs; net additional cost is negative."
    );
  }

  function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  const netAdditionalCost = input.additionalCosts - input.discounts;

  const lines = input.lines.map((line) => {
    const lineBaseCost = line.quantity * line.unitCost;

    let share = 0;

    if (input.allocationMethod === "unit") {
      share = totalQuantity > 0 ? line.quantity / totalQuantity : 0;
    }

    if (input.allocationMethod === "value") {
      share = totalBaseCost > 0 ? lineBaseCost / totalBaseCost : 0;
    }

    const allocatedCost = input.additionalCosts * share;
    const allocatedDiscount = input.discounts * share;
    const adjustedLineCost = lineBaseCost + allocatedCost - allocatedDiscount;
    const adjustedUnitCost =
      line.quantity > 0 ? adjustedLineCost / line.quantity : 0;

    return {
  ...line,
  lineBaseCost: roundMoney(lineBaseCost),
  allocatedCost: roundMoney(allocatedCost),
  allocatedDiscount: roundMoney(allocatedDiscount),
  adjustedLineCost: roundMoney(adjustedLineCost),
  adjustedUnitCost: roundMoney(adjustedUnitCost),
};
  });

  return {
  allocationMethod: input.allocationMethod,
  totalBaseCost: roundMoney(totalBaseCost),
  totalQuantity,
  additionalCosts: roundMoney(input.additionalCosts),
  discounts: roundMoney(input.discounts),
  netAdditionalCost: roundMoney(netAdditionalCost),
  lines,
  warnings,
  };
}