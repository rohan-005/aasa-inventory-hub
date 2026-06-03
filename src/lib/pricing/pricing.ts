import Decimal from "decimal.js";

export function calculatePrice(
  baseQuantity: number,
  unitPrice: string
) {
  return new Decimal(baseQuantity)
    .mul(new Decimal(unitPrice))
    .toFixed(2);
}