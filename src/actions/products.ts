"use server";

import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { revalidatePath } from "next/cache";
import { Decimal } from "decimal.js";

// Helper to assert admin user
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin privileges required");
  }
  return session.user;
}

export async function createProduct(formData: {
  sku: string;
  name: string;
  description?: string;
  category: string;
  unitGroup: "WEIGHT" | "VOLUME" | "COUNT";
  baseUnit: string;
  pricePerBaseUnit: number;
}) {
  const user = await assertAdmin();

  const priceDecimal = new Decimal(formData.pricePerBaseUnit);
  if (priceDecimal.isNegative()) {
    throw new Error("Price per base unit cannot be negative");
  }

  // Determine baseUnit automatically from group if not matching
  let baseUnit = formData.baseUnit;
  if (formData.unitGroup === "WEIGHT") baseUnit = "g";
  else if (formData.unitGroup === "VOLUME") baseUnit = "mL";
  else if (formData.unitGroup === "COUNT") baseUnit = "item";

  const product = await prisma.$transaction(async (tx) => {
    const newProd = await tx.product.create({
      data: {
        sku: formData.sku,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        unitGroup: formData.unitGroup,
        baseUnit: baseUnit,
        pricePerBaseUnit: priceDecimal,
      },
    });

    // Initialize inventory record
    await tx.inventory.create({
      data: {
        productId: newProd.id,
        baseQuantity: new Decimal(0),
        location: "Warehouse A",
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        userId: user.id,
        entityType: "PRODUCT",
        entityId: newProd.id,
        action: "CREATE",
        details: JSON.stringify({
          sku: newProd.sku,
          name: newProd.name,
          unitGroup: newProd.unitGroup,
          baseUnit: newProd.baseUnit,
          pricePerBaseUnit: priceDecimal.toString(),
        }),
      },
    });

    return newProd;
  });

  revalidatePath("/admin/products");
  return { success: true, product };
}

export async function updateProduct(
  id: string,
  formData: {
    name?: string;
    description?: string;
    category?: string;
    pricePerBaseUnit?: number;
    active?: boolean;
  }
) {
  const user = await assertAdmin();

  const product = await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id } });
    if (!existing) throw new Error("Product not found");

    const updateData: any = {};
    if (formData.name !== undefined) updateData.name = formData.name;
    if (formData.description !== undefined) updateData.description = formData.description;
    if (formData.category !== undefined) updateData.category = formData.category;
    if (formData.active !== undefined) updateData.active = formData.active;
    if (formData.pricePerBaseUnit !== undefined) {
      const priceDecimal = new Decimal(formData.pricePerBaseUnit);
      if (priceDecimal.isNegative()) throw new Error("Price cannot be negative");
      updateData.pricePerBaseUnit = priceDecimal;
    }

    const updated = await tx.product.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        userId: user.id,
        entityType: "PRODUCT",
        entityId: updated.id,
        action: "UPDATE",
        details: JSON.stringify({
          before: {
            name: existing.name,
            pricePerBaseUnit: existing.pricePerBaseUnit.toString(),
            active: existing.active,
          },
          after: {
            name: updated.name,
            pricePerBaseUnit: updated.pricePerBaseUnit.toString(),
            active: updated.active,
          },
        }),
      },
    });

    return updated;
  });

  revalidatePath("/admin/products");
  return { success: true, product };
}

export async function deleteProduct(id: string) {
  const user = await assertAdmin();

  await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id } });
    if (!existing) throw new Error("Product not found");

    // Perform cascade delete / restrict checks
    // We will do a soft delete (active = false) or hard delete if no orders exist.
    // Let's check if quotation items or order items exist:
    const quotesCount = await tx.quotationItem.count({ where: { productId: id } });
    const ordersCount = await tx.orderItem.count({ where: { productId: id } });

    if (quotesCount > 0 || ordersCount > 0) {
      // Deactivate instead of delete to keep order history intact
      await tx.product.update({
        where: { id },
        data: { active: false },
      });
      
      await tx.auditLog.create({
        data: {
          userId: user.id,
          entityType: "PRODUCT",
          entityId: id,
          action: "DEACTIVATE",
          details: JSON.stringify({ reason: "Product cannot be hard-deleted because it is referenced in past quotes/orders. Deactivated instead." }),
        },
      });
    } else {
      // Safe to hard delete
      await tx.inventory.delete({ where: { productId: id } });
      await tx.product.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          entityType: "PRODUCT",
          entityId: id,
          action: "DELETE",
          details: JSON.stringify({ sku: existing.sku, name: existing.name }),
        },
      });
    }
  });

  revalidatePath("/admin/products");
  return { success: true };
}
