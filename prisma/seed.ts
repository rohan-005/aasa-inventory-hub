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
  const buyerPasswordHash = bcrypt.hashSync("buyer123", 10);

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

  const buyer = await prisma.user.create({
    data: {
      email: "buyer@inventory.com",
      name: "Buyer User",
      passwordHash: buyerPasswordHash,
      role: "BUYER",
    },
  });

  console.log(`Users seeded:\n- Admin: ${admin.email}\n- Seller: ${seller.email}\n- Buyer: ${buyer.email}`);

  console.log("Seeding products and inventory...");

  const productsData = [
    // WEIGHT unit group (Base Unit = g)
    {
      sku: "W-PARA-001",
      name: "Paracetamol API Powder",
      description: "Active pharmaceutical ingredient powder for analgesic formulation.",
      category: "API",
      unitGroup: "WEIGHT" as const,
      baseUnit: "g",
      pricePerBaseUnit: 0.80, // ₹800 per kg => 800/1000 = ₹0.80/g
      initialStock: 1000000, // 1000 kg in grams
    },
    {
      sku: "W-AMOX-001",
      name: "Amoxicillin Trihydrate",
      description: "Antibiotic active pharmaceutical raw material.",
      category: "API",
      unitGroup: "WEIGHT" as const,
      baseUnit: "g",
      pricePerBaseUnit: 1.20, // ₹1200 per kg => 1200/1000 = ₹1.20/g
      initialStock: 500000, // 500 kg in grams
    },
    // VOLUME unit group (Base Unit = mL)
    {
      sku: "V-COUGH-001",
      name: "Cough Syrup Syrup Base",
      description: "Sucrose syrup vehicle base for liquid oral formulation.",
      category: "Liquid Formulation",
      unitGroup: "VOLUME" as const,
      baseUnit: "mL",
      pricePerBaseUnit: 0.25, // ₹250 per L => 250/1000 = ₹0.25/mL
      initialStock: 2000000, // 2000 L in mL
    },
    {
      sku: "V-SALINE-001",
      name: "Intravenous Saline Solution",
      description: "Sterile 0.9% sodium chloride infusion solution.",
      category: "Intravenous",
      unitGroup: "VOLUME" as const,
      baseUnit: "mL",
      pricePerBaseUnit: 0.09, // ₹90 per L => 90/1000 = ₹0.09/mL
      initialStock: 1000000, // 1000 L in mL
    },
    // COUNT unit group (Base Unit = item)
    {
      sku: "C-ASPR-100",
      name: "Aspirin 75mg Tablets (Pack of 100)",
      description: "Cardio-protective aspirin tablet blister packs.",
      category: "Tablets",
      unitGroup: "COUNT" as const,
      baseUnit: "item",
      pricePerBaseUnit: 150.0, // ₹150 per pack/item
      initialStock: 5000, // 5000 packs
    },
    {
      sku: "C-SYR-050",
      name: "Disposable Sterile Syringes (Pack of 50)",
      description: "Clinical sterile syringes with needles, 5mL volume.",
      category: "Clinical Supplies",
      unitGroup: "COUNT" as const,
      baseUnit: "item",
      pricePerBaseUnit: 350.0, // ₹350 per pack/item
      initialStock: 2000, // 2000 packs
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
