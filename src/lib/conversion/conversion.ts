import Decimal from "decimal.js";

// Set precision for Decimal operations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

export const BASE_UNITS = {
  WEIGHT: "g",
  VOLUME: "mL",
  COUNT: "item",
} as const;

export const UNIT_CONFIG: Record<
  string,
  { group: "WEIGHT" | "VOLUME" | "COUNT"; factor: Decimal; label: string }
> = {
  g: { group: "WEIGHT", factor: new Decimal(1), label: "Grams" },
  kg: { group: "WEIGHT", factor: new Decimal(1000), label: "Kilograms" },
  mL: { group: "VOLUME", factor: new Decimal(1), label: "Milliliters" },
  L: { group: "VOLUME", factor: new Decimal(1000), label: "Liters" },
  item: { group: "COUNT", factor: new Decimal(1), label: "Items" },
};

/**
 * Validates whether a unit belongs to a specific unit group.
 */
export function isValidUnitForGroup(unit: string, group: string): boolean {
  const config = UNIT_CONFIG[unit];
  if (!config) return false;
  return config.group === group;
}

/**
 * Converts a quantity in a specific unit to its base unit.
 * E.g., convertToBaseUnit(2.5, "kg") -> Decimal(2500)
 */
export function convertToBaseUnit(quantity: number | string | Decimal, unit: string): Decimal {
  const config = UNIT_CONFIG[unit];
  if (!config) {
    throw new Error(`Unsupported unit: "${unit}"`);
  }

  const qty = new Decimal(quantity);
  if (qty.isNegative()) {
    throw new Error("Quantity cannot be negative");
  }

  return qty.mul(config.factor);
}

/**
 * Converts a quantity in a base unit back to a specific target unit.
 * E.g., convertFromBaseUnit(2500, "kg") -> Decimal(2.5)
 */
export function convertFromBaseUnit(baseQuantity: number | string | Decimal, unit: string): Decimal {
  const config = UNIT_CONFIG[unit];
  if (!config) {
    throw new Error(`Unsupported unit: "${unit}"`);
  }

  const baseQty = new Decimal(baseQuantity);
  if (baseQty.isNegative()) {
    throw new Error("Base quantity cannot be negative");
  }

  return baseQty.div(config.factor);
}

/**
 * Retrieves the unit group of a given unit.
 */
export function getUnitGroup(unit: string): "WEIGHT" | "VOLUME" | "COUNT" {
  const config = UNIT_CONFIG[unit];
  if (!config) {
    throw new Error(`Unsupported unit: "${unit}"`);
  }
  return config.group;
}

/**
 * Gets list of supported units for a unit group.
 */
export function getSupportedUnitsForGroup(group: "WEIGHT" | "VOLUME" | "COUNT"): string[] {
  return Object.keys(UNIT_CONFIG).filter((unit) => UNIT_CONFIG[unit].group === group);
}