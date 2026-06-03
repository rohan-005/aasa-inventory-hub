"use server";

import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { revalidatePath } from "next/cache";
import { convertToBaseUnit, isValidUnitForGroup } from "@/lib/conversion/conversion";
import { calculateLineTotal, calculateTotalAmount } from "@/lib/pricing/pricing";
import { Decimal } from "decimal.js";

async function assertAuthenticated() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized: Please sign in");
  }
  return session.user;
}

export async function createQuotation(
  items: {
    productId: string;
    quantity: number;
    unit: string;
  }[],
  validDays: number = 7
) {
  const user = await assertAuthenticated();

  if (!items || items.length === 0) {
    throw new Error("Cannot create an empty quotation");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch products
    const productIds = items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
    });

    const productsMap = new Map(products.map((p) => [p.id, p]));

    // 2. Validate and convert items
    const quotationItemsData = [];
    const lineTotals = [];

    for (const item of items) {
      const prod = productsMap.get(item.productId);
      if (!prod) throw new Error(`Product not found: ${item.productId}`);
      if (!prod.active) throw new Error(`Product ${prod.name} is currently inactive`);

      // Validate unit matches unit group
      if (!isValidUnitForGroup(item.unit, prod.unitGroup)) {
        throw new Error(`Unit "${item.unit}" is invalid for product "${prod.name}" (${prod.unitGroup})`);
      }

      // Convert quantity to base unit
      const baseQty = convertToBaseUnit(item.quantity, item.unit);
      
      // Calculate line total
      const lineTotal = calculateLineTotal(baseQty, prod.pricePerBaseUnit);

      quotationItemsData.push({
        productId: item.productId,
        quantity: new Decimal(item.quantity),
        unit: item.unit,
        baseQuantity: baseQty,
        pricePerBaseUnit: new Decimal(prod.pricePerBaseUnit),
        lineTotal: lineTotal,
      });

      lineTotals.push(lineTotal);
    }

    // 3. Compute grand total
    const totalAmount = calculateTotalAmount(lineTotals);

    // 4. Set expiration date
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    // 5. Create Quotation and Items
    const quotation = await tx.quotation.create({
      data: {
        userId: user.id,
        totalAmount: totalAmount,
        status: "PENDING",
        validUntil: validUntil,
        quotationItems: {
          create: quotationItemsData,
        },
      },
    });

    // 6. Write Audit Log
    await tx.auditLog.create({
      data: {
        userId: user.id,
        entityType: "QUOTATION",
        entityId: quotation.id,
        action: "CREATE",
        details: JSON.stringify({
          totalAmount: totalAmount.toString(),
          validUntil,
          itemCount: items.length,
        }),
      },
    });

    return quotation;
  });

  revalidatePath("/dashboard/quotations");
  revalidatePath("/admin/quotations");
  return { success: true, quotationId: result.id };
}

export async function updateQuotationStatus(
  quotationId: string,
  status: "APPROVED" | "REJECTED"
) {
  const user = await getServerSession(authOptions);
  if (!user || user.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin privileges required");
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!existing) throw new Error("Quotation not found");
    if (existing.status === "ORDERED") {
      throw new Error("Cannot modify a quotation that has already been converted to an order");
    }

    const updated = await tx.quotation.update({
      where: { id: quotationId },
      data: { status },
    });

    await tx.auditLog.create({
      data: {
        userId: user.user.id,
        entityType: "QUOTATION",
        entityId: quotationId,
        action: status,
        details: JSON.stringify({
          before: existing.status,
          after: updated.status,
        }),
      },
    });

    return updated;
  });

  revalidatePath("/dashboard/quotations");
  revalidatePath("/admin/quotations");
  return { success: true, quotation: result };
}
