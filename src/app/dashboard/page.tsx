import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Navbar from "@/components/layout/Navbar";
import SellerDashboardView from "@/components/tables/SellerDashboardView";

export const revalidate = 0; // Disable caching so data is fresh

export default async function SellerDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const isBuyer = session.user.role === "BUYER";

  // Fetch all active products
  const productsRaw = await prisma.product.findMany({
    where: { active: true },
    include: { inventory: true },
    orderBy: { sku: "asc" },
  });

  // Fetch quotations based on role
  // Sellers see their own; Buyers see APPROVED or ORDERED quotations to convert/view
  const quotationsRaw = await prisma.quotation.findMany({
    where: isBuyer 
      ? { status: { in: ["APPROVED", "ORDERED"] } }
      : { userId: session.user.id },
    include: {
      quotationItems: {
        include: { product: true },
      },
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch orders (both see their own placed orders)
  const ordersRaw = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      orderItems: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize Decimal types to plain numbers for Next.js Client Components
  const products = productsRaw.map((p) => ({
    ...p,
    pricePerBaseUnit: Number(p.pricePerBaseUnit),
    inventory: p.inventory
      ? {
          ...p.inventory,
          baseQuantity: Number(p.inventory.baseQuantity),
        }
      : null,
  }));

  const quotations = quotationsRaw.map((q) => ({
    ...q,
    totalAmount: Number(q.totalAmount),
    quotationItems: q.quotationItems.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      baseQuantity: Number(item.baseQuantity),
      pricePerBaseUnit: Number(item.pricePerBaseUnit),
      lineTotal: Number(item.lineTotal),
      product: {
        ...item.product,
        pricePerBaseUnit: Number(item.product.pricePerBaseUnit),
      },
    })),
  }));

  const orders = ordersRaw.map((o) => ({
    ...o,
    totalAmount: Number(o.totalAmount),
    orderItems: o.orderItems.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      baseQuantity: Number(item.baseQuantity),
      pricePerBaseUnit: Number(item.pricePerBaseUnit),
      lineTotal: Number(item.lineTotal),
      product: {
        ...item.product,
        pricePerBaseUnit: Number(item.product.pricePerBaseUnit),
      },
    })),
  }));

  return (
    <SellerDashboardView
      products={products}
      quotations={quotations}
      orders={orders}
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role
      }}
    />
  );
}
