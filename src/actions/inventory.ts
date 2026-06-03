"use server";

import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { revalidatePath } from "next/cache";
import { convertToBaseUnit } from "@/lib/conversion/conversion";
import { Decimal } from "decimal.js";

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin privileges required");
  }
  return session.user;
}

export async function adjustStock(
  productId: string,
  quantityChange: number,
  unit: string,
  reason: string,
  location?: string
) {
  const user = await assertAdmin();

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Product not found");

  const changeDecimal = new Decimal(quantityChange);
  const baseChange = convertToBaseUnit(changeDecimal, unit);

  const result = await prisma.$transaction(async (tx) => {
    const inv = await tx.inventory.findUnique({ where: { productId } });
    if (!inv) throw new Error("Inventory record not found");

    const currentQty = new Decimal(inv.baseQuantity);
    const newQty = currentQty.add(baseChange);

    if (newQty.isNegative()) {
      throw new Error(`Insufficient stock. Current: ${currentQty.toString()} ${product.baseUnit}, Change: ${baseChange.toString()} ${product.baseUnit}`);
    }

    const updatedInv = await tx.inventory.update({
      where: { productId },
      data: {
        baseQuantity: newQty,
        location: location || inv.location,
      },
    });

    // Create Audit Log
    await tx.auditLog.create({
      data: {
        userId: user.id,
        entityType: "INVENTORY",
        entityId: productId,
        action: "STOCK_CHANGE",
        details: JSON.stringify({
          productId,
          productSku: product.sku,
          productName: product.name,
          inputChange: quantityChange,
          inputUnit: unit,
          baseChange: baseChange.toString(),
          baseUnit: product.baseUnit,
          beforeBaseQty: currentQty.toString(),
          afterBaseQty: newQty.toString(),
          reason,
        }),
      },
    });

    return updatedInv;
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard");
  return { success: true, inventory: result };
}
