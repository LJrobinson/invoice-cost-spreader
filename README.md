# Invoice Cost Spreader

Invoice Cost Spreader is a lightweight landed-cost calculator for cannabis operators.

It spreads invoice-level costs like freight, fees, and discounts across received inventory lines using explicit allocation methods. The goal is to produce more defensible adjusted unit costs for inventory, margin analysis, COGS review, and reconciliation workflows.

## Product Doctrine

Do not blindly spread invoice costs per line.

Cannabis invoices often contain wildly different quantities and values per line. A single invoice may include one bulk flower line, hundreds of pre-rolls, a few dozen eighths, and additional freight or fees. Spreading costs evenly across invoice lines can distort unit cost, margin, and COGS.

Invoice Cost Spreader supports allocation by unit count or invoice value so operators can calculate landed cost with clearer assumptions.

In short:

> Better landed cost in.  
> Better COGS out.

## Why This Exists

Cannabis operators often receive inventory in systems that do not make landed cost easy to review or explain.

Common problems include:

- Freight or delivery fees listed at the invoice level
- Discounts applied across an entire invoice
- Multiple product types on one invoice
- Large quantity differences between invoice lines
- Manual spreadsheets used for cost adjustments
- Confusion between line-level cost and unit-level cost
- COGS reports that do not explain where the numbers came from

This tool helps turn invoice-level adjustments into structured, line-level landed cost data.

## Features

- Spread invoice-level additional costs across received lines
- Support allocation by unit count
- Support allocation by invoice value
- Apply invoice-level discounts
- Calculate adjusted line cost
- Calculate adjusted unit cost
- Return structured JSON output
- Warn when discounts exceed additional costs
- Includes automated tests with Vitest
- Runs from the command line

## Allocation Methods

### Unit Allocation

Unit allocation spreads costs based on each line’s share of total received units.

Example:

```txt
Line share = line quantity / total quantity
````

This is useful when the additional cost should be distributed evenly across sellable units.

### Value Allocation

Value allocation spreads costs based on each line’s share of the invoice’s base cost.

Example:

```txt
Line share = line base cost / total base cost
```

This is useful when higher-value products should carry a larger share of the additional invoice costs.

## Example Input

```json
{
  "allocationMethod": "unit",
  "additionalCosts": 180,
  "discounts": 75,
  "lines": [
    {
      "sku": "FLOWER-BULK-001",
      "description": "Bulk Flower",
      "quantity": 1,
      "unitCost": 800
    },
    {
      "sku": "PREROLL-240",
      "description": "Pre-Rolls",
      "quantity": 240,
      "unitCost": 2.5
    },
    {
      "sku": "EIGHTH-036",
      "description": "Eighths",
      "quantity": 36,
      "unitCost": 12
    }
  ]
}
```

## Example Output

```json
{
  "allocationMethod": "unit",
  "totalBaseCost": 1832,
  "totalQuantity": 277,
  "additionalCosts": 180,
  "discounts": 75,
  "netAdditionalCost": 105,
  "lines": [
    {
      "sku": "FLOWER-BULK-001",
      "description": "Bulk Flower",
      "quantity": 1,
      "unitCost": 800,
      "lineBaseCost": 800,
      "allocatedCost": 0.65,
      "allocatedDiscount": 0.27,
      "adjustedLineCost": 800.38,
      "adjustedUnitCost": 800.38
    },
    {
      "sku": "PREROLL-240",
      "description": "Pre-Rolls",
      "quantity": 240,
      "unitCost": 2.5,
      "lineBaseCost": 600,
      "allocatedCost": 155.96,
      "allocatedDiscount": 64.98,
      "adjustedLineCost": 690.97,
      "adjustedUnitCost": 2.88
    },
    {
      "sku": "EIGHTH-036",
      "description": "Eighths",
      "quantity": 36,
      "unitCost": 12,
      "lineBaseCost": 432,
      "allocatedCost": 23.39,
      "allocatedDiscount": 9.75,
      "adjustedLineCost": 445.65,
      "adjustedUnitCost": 12.38
    }
  ],
  "warnings": []
}
```

## Installation

Clone the repo and install dependencies:

```bash
npm install
```

## Usage

Run the example invoice:

```bash
npm run spread -- examples/invoice-input.json --json
```

The CLI reads an invoice JSON file and outputs a structured landed-cost result.

## Scripts

```bash
npm test
```

Runs the test suite.

```bash
npm run spread -- examples/invoice-input.json --json
```

Runs the invoice cost spreader CLI.

## Data Model

### InvoiceCostInput

```ts
export type InvoiceCostInput = {
  lines: InvoiceLine[];
  additionalCosts: number;
  discounts: number;
  allocationMethod: "unit" | "value";
};
```

### InvoiceLine

```ts
export type InvoiceLine = {
  sku: string;
  description: string;
  quantity: number;
  unitCost: number;
};
```

### SpreadResult

```ts
export type SpreadResult = {
  allocationMethod: "unit" | "value";
  totalBaseCost: number;
  totalQuantity: number;
  additionalCosts: number;
  discounts: number;
  netAdditionalCost: number;
  lines: SpreadLineResult[];
  warnings: string[];
};
```

## Example Use Cases

* Cannabis invoice review
* Landed cost calculation
* COGS reconciliation
* Receiving audit support
* Margin analysis
* Inventory cost correction
* Finance handoff preparation
* POS or accounting import preparation

## Current Limitations

This is an early MVP and intentionally stays small.

Current limitations:

* Supports only `unit` and `value` allocation methods
* Does not yet support weight-based allocation
* Does not yet support manual per-line overrides
* Does not persist invoice history
* Does not connect directly to POS, accounting, or compliance systems
* Outputs JSON only

## Roadmap

Possible future improvements:

* Markdown summary output
* CSV export
* Weight-based allocation
* Manual allocation overrides
* Per-line warning details
* Rounding mode configuration
* Invoice comparison examples
* POS import/export templates
* Integration into a larger cannabis operations workbench

## Philosophy

Invoice Cost Spreader is part of a broader operator-first approach to cannabis tooling.

The goal is not to force operators into perfect enterprise workflows. The goal is to accept messy operational inputs, preserve the useful signal, and translate it into structured business data.

Or, less formally:

> Landed cost with paws.

## License

MIT