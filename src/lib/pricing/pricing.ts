import Decimal from "decimal.js";
import { convertToBaseUnit } from "../conversion/conversion";

// Set standard precision for Pricing operations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

/**
 * Calculates the line total for an item based on base unit quantity and price per base unit.
 * Keeps full precision (doesn't round until final display).
 */
export function calculateLineTotal(
  baseQuantity: number | string | Decimal,
  pricePerBaseUnit: number | string | Decimal
): Decimal {
  const qty = new Decimal(baseQuantity);
  const price = new Decimal(pricePerBaseUnit);

  if (qty.isNegative() || price.isNegative()) {
    throw new Error("Quantity and price per base unit cannot be negative");
  }

  return qty.mul(price);
}

/**
 * Computes the line total from user-entered quantity and unit.
 * Under the hood, converts the quantity to base unit first.
 */
export function calculateLineTotalFromUserInputs(
  quantity: number | string | Decimal,
  unit: string,
  pricePerBaseUnit: number | string | Decimal
): {
  baseQuantity: Decimal;
  lineTotal: Decimal;
} {
  const baseQuantity = convertToBaseUnit(quantity, unit);
  const lineTotal = calculateLineTotal(baseQuantity, pricePerBaseUnit);

  return {
    baseQuantity,
    lineTotal,
  };
}

/**
 * Sums list of line totals to get the final total amount.
 */
export function calculateTotalAmount(lineTotals: (number | string | Decimal)[]): Decimal {
  return lineTotals.reduce((acc: Decimal, current) => {
    return acc.add(new Decimal(current));
  }, new Decimal(0));
}

/**
 * Formats a Decimal value to a standard INR display string (2 decimal places, rounded-half-even).
 */
export function formatINR(amount: number | string | Decimal): string {
  const value = new Decimal(amount);
  return value.toFixed(2);
}