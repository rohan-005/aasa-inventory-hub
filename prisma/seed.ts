import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning up database...");

  // Delete in reverse order of dependencies
  await prisma.auditLog.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.quotationItem.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Seeding users...");

  const adminPasswordHash = bcrypt.hashSync("admin123", 10);
  const sellerPasswordHash = bcrypt.hashSync("seller123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@inventory.com",
      name: "Admin User",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const seller = await prisma.user.create({
    data: {
      email: "seller@inventory.com",
      name: "Seller User",
      passwordHash: sellerPasswordHash,
      role: "USER",
    },
  });

  console.log(`Users seeded:\n- Admin: ${admin.email}\n- Seller: ${seller.email}`);

  console.log("Seeding products and inventory...");

  const productsData = [
    // WEIGHT unit group (Base Unit = g)
    {
      sku: "W-RICE-001",
      name: "Premium Basmati Rice",
      description: "Extra long grain basmati rice, aged for fragrance.",
      category: "Grains",
      unitGroup: "WEIGHT" as const,
      baseUnit: "g",
      pricePerBaseUnit: 0.08, // ₹80 per kg => 80/1000 = ₹0.08/g
      initialStock: 500000, // 500 kg in grams
    },
    {
      sku: "W-FLOUR-001",
      name: "Organic Whole Wheat Flour",
      description: "100% organic stone-ground whole wheat flour.",
      category: "Grains",
      unitGroup: "WEIGHT" as const,
      baseUnit: "g",
      pricePerBaseUnit: 0.05, // ₹50 per kg => 50/1000 = ₹0.05/g
      initialStock: 200000, // 200 kg in grams
    },
    // VOLUME unit group (Base Unit = mL)
    {
      sku: "V-OIL-001",
      name: "Cold Pressed Mustard Oil",
      description: "Pure cold-pressed mustard oil for traditional cooking.",
      category: "Oils",
      unitGroup: "VOLUME" as const,
      baseUnit: "mL",
      pricePerBaseUnit: 0.18, // ₹180 per L => 180/1000 = ₹0.18/mL
      initialStock: 150000, // 150 L in mL
    },
    {
      sku: "V-MILK-001",
      name: "Pasteurized Whole Milk",
      description: "Fresh pasteurized whole milk, rich in cream.",
      category: "Dairy",
      unitGroup: "VOLUME" as const,
      baseUnit: "mL",
      pricePerBaseUnit: 0.06, // ₹60 per L => 60/1000 = ₹0.06/mL
      initialStock: 50000, // 50 L in mL
    },
    // COUNT unit group (Base Unit = item)
    {
      sku: "C-CUPS-001",
      name: "Eco-friendly Paper Cups (Pack of 50)",
      description: "Biodegradable paper cups, perfect for hot & cold drinks.",
      category: "Packaging",
      unitGroup: "COUNT" as const,
      baseUnit: "item",
      pricePerBaseUnit: 120.0, // ₹120 per pack/item
      initialStock: 1000, // 1000 packs
    },
    {
      sku: "C-PLATES-001",
      name: "Biodegradable Plates (Pack of 25)",
      description: "Sturdy plates made from sugarcane bagasse.",
      category: "Packaging",
      unitGroup: "COUNT" as const,
      baseUnit: "item",
      pricePerBaseUnit: 90.0, // ₹90 per pack/item
      initialStock: 500, // 500 packs
    },
  ];

  for (const prod of productsData) {
    const { initialStock, ...productFields } = prod;

    const product = await prisma.product.create({
      data: productFields,
    });

    await prisma.inventory.create({
      data: {
        productId: product.id,
        baseQuantity: initialStock,
        location: "Warehouse A",
      },
    });

    console.log(`Product created: ${product.name} (SKU: ${product.sku}) with ${initialStock} ${product.baseUnit} stock.`);
  }

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
