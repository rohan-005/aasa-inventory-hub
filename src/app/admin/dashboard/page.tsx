import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Navbar from "@/components/layout/Navbar";
import AdminDashboardTabs from "@/components/tables/AdminDashboardTabs";

export const revalidate = 0; // Disable caching so data is fresh

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch all dashboard data from db
  const productsRaw = await prisma.product.findMany({
    include: { inventory: true },
    orderBy: { sku: "asc" },
  });

  const quotationsRaw = await prisma.quotation.findMany({
    include: {
      user: true,
      quotationItems: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const ordersRaw = await prisma.order.findMany({
    include: {
      user: true,
      orderItems: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const auditLogs = await prisma.auditLog.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
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
    <AdminDashboardTabs
      products={products}
      quotations={quotations}
      orders={orders}
      auditLogs={auditLogs}
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role
      }}
    />
  );
}
