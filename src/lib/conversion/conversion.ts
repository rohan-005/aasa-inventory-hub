export const UNIT_FACTORS = {
  g: 1,
  kg: 1000,

  mL: 1,
  L: 1000,

  item: 1,
};


export function convertToBaseUnit(
  quantity: number,
  unit: string
) {
  const factor =
    UNIT_FACTORS[unit as keyof typeof UNIT_FACTORS];

  if (!factor) {
    throw new Error("Invalid Unit");
  }

  return quantity * factor;
}