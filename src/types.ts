export type AllocationMethod = "unit" | "value";

export type InvoiceLine = {
  sku: string;
  description: string;
  quantity: number;
  unitCost: number;
};

export type InvoiceCostInput = {
  lines: InvoiceLine[];
  additionalCosts: number;
  discounts: number;
  allocationMethod: AllocationMethod;
};

export type SpreadLineResult = InvoiceLine & {
  lineBaseCost: number;
  allocatedCost: number;
  allocatedDiscount: number;
  adjustedLineCost: number;
  adjustedUnitCost: number;
};

export type SpreadResult = {
  allocationMethod: AllocationMethod;
  totalBaseCost: number;
  totalQuantity: number;
  additionalCosts: number;
  discounts: number;
  netAdditionalCost: number;
  lines: SpreadLineResult[];
  warnings: string[];
};