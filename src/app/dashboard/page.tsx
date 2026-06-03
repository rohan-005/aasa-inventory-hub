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
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar user={session.user} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-white p-6 rounded shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isBuyer ? "Buyer Dashboard" : "Seller Dashboard"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isBuyer
                ? "Review and purchase approved pharmaceutical quotations, and track order history."
                : "Search the pharmaceutical product catalog, add items to your cart, build quotations, and review your order history."}
            </p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded px-4 py-2 text-indigo-700 text-xs font-semibold self-start sm:self-auto">
            Role: {isBuyer ? "Purchasing Agent" : "Sales Representative"}
          </div>
        </div>

        <SellerDashboardView
          products={products}
          quotations={quotations}
          orders={orders}
          userRole={session.user.role}
        />
      </main>
    </div>
  );
}
