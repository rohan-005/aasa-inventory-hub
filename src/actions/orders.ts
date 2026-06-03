"use server";

import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { revalidatePath } from "next/cache";
import { Decimal } from "decimal.js";
import { convertToBaseUnit, isValidUnitForGroup } from "@/lib/conversion/conversion";
import { calculateLineTotal, calculateTotalAmount } from "@/lib/pricing/pricing";

async function assertAuthenticated() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized: Please sign in");
  }
  return session.user;
}

export async function createOrderFromQuotation(quotationId: string) {
  const user = await assertAuthenticated();

  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch quotation and items
    const quotation = await tx.quotation.findUnique({
      where: { id: quotationId },
      include: { quotationItems: { include: { product: true } } },
    });

    if (!quotation) {
      throw new Error("Quotation not found");
    }

    if (quotation.status === "ORDERED") {
      throw new Error("This quotation has already been converted to an order");
    }

    if (quotation.status === "REJECTED") {
      throw new Error("Cannot convert a rejected quotation to an order");
    }

    // Check expiration
    if (new Date() > new Date(quotation.validUntil)) {
      throw new Error("This quotation has expired");
    }

    // 2. Verify stock levels for all items first (Pre-flight check)
    const inventoryUpdates = [];
    
    for (const item of quotation.quotationItems) {
      const inv = await tx.inventory.findUnique({
        where: { productId: item.productId },
      });

      if (!inv) {
        throw new Error(`Inventory record not found for product "${item.product.name}"`);
      }

      const currentStock = new Decimal(inv.baseQuantity);
      const requestedQty = new Decimal(item.baseQuantity);

      if (currentStock.lessThan(requestedQty)) {
        throw new Error(
          `Insufficient stock for "${item.product.name}". Required: ${requestedQty.toString()} ${item.product.baseUnit}, Available: ${currentStock.toString()} ${item.product.baseUnit}`
        );
      }

      inventoryUpdates.push({
        productId: item.productId,
        productName: item.product.name,
        productSku: item.product.sku,
        baseUnit: item.product.baseUnit,
        currentStock,
        requestedQty,
        newStock: currentStock.sub(requestedQty),
        location: inv.location,
      });
    }

    // 3. Deduct stock and log stock audit changes
    for (const update of inventoryUpdates) {
      await tx.inventory.update({
        where: { productId: update.productId },
        data: { baseQuantity: update.newStock },
      });

      // Audit Log for STOCK_CHANGE (Deduction)
      await tx.auditLog.create({
        data: {
          userId: user.id,
          entityType: "INVENTORY",
          entityId: update.productId,
          action: "STOCK_CHANGE",
          details: JSON.stringify({
            productId: update.productId,
            productSku: update.productSku,
            productName: update.productName,
            baseChange: `-${update.requestedQty.toString()}`,
            baseUnit: update.baseUnit,
            beforeBaseQty: update.currentStock.toString(),
            afterBaseQty: update.newStock.toString(),
            reason: `Deduction for Order conversion of Quotation ${quotationId}`,
          }),
        },
      });
    }

    // 4. Create Order and copy items (Locking pricing and conversion data)
    const orderItemsData = quotation.quotationItems.map((item) => ({
      productId: item.productId,
      quantity: new Decimal(item.quantity),
      unit: item.unit,
      baseQuantity: new Decimal(item.baseQuantity),
      pricePerBaseUnit: new Decimal(item.pricePerBaseUnit),
      lineTotal: new Decimal(item.lineTotal),
    }));

    const order = await tx.order.create({
      data: {
        userId: user.id,
        quotationId: quotationId,
        totalAmount: new Decimal(quotation.totalAmount),
        status: "PROCESSING",
        orderItems: {
          create: orderItemsData,
        },
      },
    });

    // 5. Update Quotation Status to ORDERED
    await tx.quotation.update({
      where: { id: quotationId },
      data: { status: "ORDERED" },
    });

    // 6. Audit Log for ORDER and QUOTATION conversion
    await tx.auditLog.create({
      data: {
        userId: user.id,
        entityType: "ORDER",
        entityId: order.id,
        action: "CREATE",
        details: JSON.stringify({
          quotationId,
          totalAmount: quotation.totalAmount.toString(),
          itemCount: orderItemsData.length,
        }),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        entityType: "QUOTATION",
        entityId: quotationId,
        action: "CONVERT_TO_ORDER",
        details: JSON.stringify({
          orderId: order.id,
        }),
      },
    });

    return order;
  });

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/quotations");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/quotations");
  revalidatePath("/admin/dashboard");
  return { success: true, orderId: result.id };
}

export async function createDirectOrder(
  items: {
    productId: string;
    quantity: number;
    unit: string;
  }[]
) {
  const user = await assertAuthenticated();

  if (!items || items.length === 0) {
    throw new Error("Cannot create an empty order");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch products
    const productIds = items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
    });
    const productsMap = new Map(products.map((p) => [p.id, p]));

    // 2. Validate, convert, check stock levels
    const orderItemsData = [];
    const lineTotals = [];
    const stockUpdates = [];

    for (const item of items) {
      const prod = productsMap.get(item.productId);
      if (!prod) throw new Error(`Product not found: ${item.productId}`);
      if (!prod.active) throw new Error(`Product "${prod.name}" is inactive`);

      // Validate unit matches unit group
      if (!isValidUnitForGroup(item.unit, prod.unitGroup)) {
        throw new Error(`Unit "${item.unit}" is invalid for product "${prod.name}" (${prod.unitGroup})`);
      }

      // Convert quantity to base unit
      const baseQty = convertToBaseUnit(item.quantity, item.unit);
      
      // Calculate line total
      const lineTotal = calculateLineTotal(baseQty, prod.pricePerBaseUnit);

      // Verify stock
      const inv = await tx.inventory.findUnique({
        where: { productId: item.productId },
      });
      if (!inv) throw new Error(`Inventory not found for "${prod.name}"`);

      const currentStock = new Decimal(inv.baseQuantity);
      if (currentStock.lessThan(baseQty)) {
        throw new Error(
          `Insufficient stock for "${prod.name}". Required: ${baseQty.toString()} ${prod.baseUnit}, Available: ${currentStock.toString()} ${prod.baseUnit}`
        );
      }

      orderItemsData.push({
        productId: item.productId,
        quantity: new Decimal(item.quantity),
        unit: item.unit,
        baseQuantity: baseQty,
        pricePerBaseUnit: new Decimal(prod.pricePerBaseUnit),
        lineTotal: lineTotal,
      });

      lineTotals.push(lineTotal);

      stockUpdates.push({
        productId: item.productId,
        productSku: prod.sku,
        productName: prod.name,
        baseUnit: prod.baseUnit,
        currentStock,
        requestedQty: baseQty,
        newStock: currentStock.sub(baseQty),
      });
    }

    const totalAmount = calculateTotalAmount(lineTotals);

    // Deduct stock
    for (const update of stockUpdates) {
      await tx.inventory.update({
        where: { productId: update.productId },
        data: { baseQuantity: update.newStock },
      });

      // Audit Log for STOCK_CHANGE
      await tx.auditLog.create({
        data: {
          userId: user.id,
          entityType: "INVENTORY",
          entityId: update.productId,
          action: "STOCK_CHANGE",
          details: JSON.stringify({
            productId: update.productId,
            productSku: update.productSku,
            productName: update.productName,
            baseChange: `-${update.requestedQty.toString()}`,
            baseUnit: update.baseUnit,
            beforeBaseQty: update.currentStock.toString(),
            afterBaseQty: update.newStock.toString(),
            reason: "Deduction for direct Order placement",
          }),
        },
      });
    }

    // Create Order
    const order = await tx.order.create({
      data: {
        userId: user.id,
        totalAmount,
        status: "PROCESSING",
        orderItems: {
          create: orderItemsData,
        },
      },
    });

    // Write Audit Log
    await tx.auditLog.create({
      data: {
        userId: user.id,
        entityType: "ORDER",
        entityId: order.id,
        action: "CREATE",
        details: JSON.stringify({
          totalAmount: totalAmount.toString(),
          itemCount: items.length,
          type: "DIRECT",
        }),
      },
    });

    return order;
  });

  revalidatePath("/dashboard/orders");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  return { success: true, orderId: result.id };
}
