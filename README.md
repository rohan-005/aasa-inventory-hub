# Aasa Inventory Hub — Production-Grade Architecture & Implementation Blueprint

Welcome to the **Aasa Inventory Hub**, a pharmaceutical-focused Inventory, Quotation, and Order Management System designed and implemented for the **AasaMedChem** recruit assignment.

This system is built using **Next.js 15 (App Router)**, **Neon Serverless PostgreSQL**, **Prisma ORM**, **Auth.js (NextAuth.js)**, and **Tailwind CSS**. It implements a high-precision, multi-unit chemical conversion engine, role-based workflows, and a minimalist industrial design system.

---

## 1. Project Overview & Role Workflows

Aasa Inventory Hub manages the workflow from catalog registration to quotation negotiation, compliance validation, order placing, stock deduction, and immutable audit logs. It defines three distinct user personas:

1. **Admin (Operations Center)**:
   - Registers and manages catalog products, category assignments, and canonical pricing rates.
   - Adjusts warehouse inventory balances using custom units (e.g. adding `kg` or deducting `L`).
   - Audits, approves, or rejects seller quotations.
   - Accesses the system-wide immutable compliance audit log tracking database state modifications.

2. **Seller / User (Sales Desk)**:
   - Browses the active chemical catalog with a category filter panel.
   - Adds items to a flexible Quotation Cart. Sellers can enter quantities in any measurement unit (`kg`, `g`, `L`, `mL`, `item`).
   - Negotiates and submits quotation drafts for administrative review or performs direct order placing.

3. **Buyer (Client Portal)**:
   - Views approved quotations prepared by sellers.
   - Completes a **Compliance Checkout Verification Checklist** (e.g., verifying chemical license limits, locked prices, and inventory constraints) before placing an order.
   - Converts the approved quotation directly into a finalized placed order.

---

## 2. High-Level System Architecture & Data Flow

The application uses a server-side-first architecture powered by Next.js.

```mermaid
graph TD
    A[Client UI / React components] -->|Next.js Server Actions| B[Server Action Layer]
    B -->|NextAuth Session Check| C[Auth Validation]
    B -->|Prisma Client| D[Neon serverless PostgreSQL]
    D -->|Write logs| E[Immutable AuditLog Table]
    B -->|Client redirection| A
```

### Flow Sequences

#### A. Quotation Submission to Order Conversion
1. **Drafting (Seller)**: The seller adds products to the cart, chooses arbitrary units (e.g. `2.5 kg` of Paracetamol API), and submits. The system runs the unit conversion engine on the server, calculates base units (`2500 g`), applies the base price rate, records the line totals, and creates a `PENDING` Quotation.
2. **Review (Admin)**: The admin reviews the quotation details, verifying converted quantities. The admin changes the status to `APPROVED`.
3. **Checkout (Buyer)**: The buyer views approved quotations, signs off on the compliance checklist, and submits a checkout request.
4. **Order Finalization**: The system locks the price, verifies stock availability, deducts the base quantities from the `inventory` table, changes the quotation state to `ORDERED`, and generates a new `Order` entry.
5. **Auditing**: Every transition (quotation created, quotation approved, order converted, stock updated) records an immutable log in the `AuditLog` table containing a JSON snapshot of the state changes.

---

## 3. High-Precision Unit Storage & Conversion Strategy

### Core Strategy

To avoid floating-point rounding errors and ensure perfect price calculation consistency, the system stores all quantity and pricing metrics in a single **Canonical Base Unit** per measurement dimension:

| Dimension | User Units Supported | Canonical Base Unit (DB) | Storage Unit Ratio |
| :--- | :--- | :--- | :--- |
| **Weight** | `g`, `kg` | **grams (`g`)** | `1 kg = 1,000 g` |
| **Volume** | `mL`, `L` | **milliliters (`mL`)** | `1 L = 1,000 mL` |
| **Count** | `item` | **items (`item`)** | `1 item = 1 item` |

### Data Representation in PostgreSQL
We use the PostgreSQL `DECIMAL(20, 6)` data type for all numeric values (prices, quantities, line totals, adjustment values). This ensures:
- Safe storage of massive numbers (up to 14 integer digits).
- High decimal precision (6 decimal places), which is critical for fine-grained raw chemical dosages or microgram pricing.
- No floating-point inaccuracies typical of `FLOAT` or `DOUBLE PRECISION` types.

### Code Implementations

- **Unit Normalization (`convertToBaseUnit`)**: Converted immediately on submission before database writes.
  - Formula: $\text{Base Quantity} = \text{User Quantity} \times \text{Scale Factor}$
  - Code: `src/lib/conversion/conversion.ts`
- **Unit Scale Factors**:
  - `kg` to `g`: $\times 1000$
  - `L` to `mL`: $\times 1000$
- **Price Calculation (`calculateLineTotal`)**:
  - Formula: $\text{Line Total} = \text{Base Quantity} \times \text{Price Per Base Unit}$
  - Code: `src/lib/pricing/pricing.ts`
- **Output Formatting (`convertFromBaseUnit`)**: Converts canonical base units back into user units for readable rendering.
  - Formula: $\text{User Quantity} = \frac{\text{Base Quantity}}{\text{Scale Factor}}$

---

## 4. Database Schema

The entity relationship model is defined as follows:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  USER      // Seller
  BUYER
}

enum UnitGroup {
  WEIGHT
  VOLUME
  COUNT
}

enum QuotationStatus {
  PENDING
  APPROVED
  REJECTED
  ORDERED
}

enum OrderStatus {
  PENDING
  PROCESSING
  COMPLETED
  CANCELLED
}

model User {
  id           String      @id @default(uuid()) @db.Uuid
  email        String      @unique
  name         String?
  passwordHash String
  role         Role        @default(USER)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  quotations   Quotation[]
  orders       Order[]
  auditLogs    AuditLog[]

  @@map("users")
}

model Product {
  id                String          @id @default(uuid()) @db.Uuid
  sku               String          @unique
  name              String
  description       String?
  category          String
  unitGroup         UnitGroup
  baseUnit          String          // "g", "mL", "item"
  pricePerBaseUnit  Decimal         @db.Decimal(20, 6) // price per 1 gram, mL, or item
  active            Boolean         @default(true)
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  inventory         Inventory?
  quotationItems    QuotationItem[]
  orderItems        OrderItem[]

  @@map("products")
}

model Inventory {
  id           String   @id @default(uuid()) @db.Uuid
  productId    String   @unique @db.Uuid
  product      Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  baseQuantity Decimal  @db.Decimal(20, 6) @default(0.000000) // stored in g, mL, or count
  location     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("inventory")
}

model Quotation {
  id             String          @id @default(uuid()) @db.Uuid
  userId         String          @db.Uuid
  user           User            @relation(fields: [userId], references: [id], onDelete: Restrict)
  totalAmount    Decimal         @db.Decimal(20, 6)
  status         QuotationStatus @default(PENDING)
  validUntil     DateTime
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  quotationItems QuotationItem[]
  orders         Order[]

  @@map("quotations")
}

model QuotationItem {
  id               String    @id @default(uuid()) @db.Uuid
  quotationId      String    @db.Uuid
  quotation        Quotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  productId        String    @db.Uuid
  product          Product   @relation(fields: [productId], references: [id], onDelete: Restrict)
  quantity         Decimal   @db.Decimal(20, 6) // original ordered quantity
  unit             String    // original ordered unit (e.g. kg, L)
  baseQuantity     Decimal   @db.Decimal(20, 6) // quantity converted to base unit (e.g. g, mL)
  pricePerBaseUnit Decimal   @db.Decimal(20, 6) // price per base unit at the time of creation
  lineTotal        Decimal   @db.Decimal(20, 6) // subtotal of item
  createdAt        DateTime  @default(now())

  @@map("quotation_items")
}

model Order {
  id          String      @id @default(uuid()) @db.Uuid
  userId      String      @db.Uuid
  user        User        @relation(fields: [userId], references: [id], onDelete: Restrict)
  quotationId String?     @db.Uuid
  quotation   Quotation?  @relation(fields: [quotationId], references: [id], onDelete: SetNull)
  totalAmount Decimal     @db.Decimal(20, 6)
  status      OrderStatus @default(PENDING)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  orderItems  OrderItem[]

  @@map("orders")
}

model OrderItem {
  id               String   @id @default(uuid()) @db.Uuid
  orderId          String   @db.Uuid
  order            Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId        String   @db.Uuid
  product          Product  @relation(fields: [productId], references: [id], onDelete: Restrict)
  quantity         Decimal  @db.Decimal(20, 6)
  unit             String
  baseQuantity     Decimal  @db.Decimal(20, 6)
  pricePerBaseUnit Decimal  @db.Decimal(20, 6)
  lineTotal        Decimal  @db.Decimal(20, 6)
  createdAt        DateTime @default(now())

  @@map("order_items")
}

model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String?  @db.Uuid
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  entityType String   // "ORDER", "QUOTATION", "PRODUCT", "INVENTORY"
  entityId   String   @db.Uuid
  action     String   // "CREATE", "UPDATE", "DELETE", "STOCK_CHANGE"
  details    Json     // Change log payload
  createdAt  DateTime @default(now())

  @@map("audit_logs")
}
```

---

## 5. Security & Authentication Model

We implement secure user authentication and session verification using **Auth.js (NextAuth v5)**:
- **Credential Sign-In**: Verifies emails and hashes passwords using `bcryptjs` on sign-in attempts.
- **JWT Client Sessions**: Passes role claims (`ADMIN`, `USER`, `BUYER`) from user records into the session token.
- **Server Action Security**: Every database mutation checks the active session's role constraints. Attempting unauthorized updates returns structured error codes.
- **Middleware Protected Routes**: Protects paths dynamically (e.g. `/admin/*` is restricted exclusively to the `ADMIN` role).

---

## 6. Setup & Installation Instructions

### Running Locally
1. Clone the repository and navigate to the project directory:
   ```bash
   cd aasa-inventory-hub
   ```
2. Install the package dependencies:
   ```bash
   npm install
   ```
3. Set up the environment file by creating a `.env` in the root:
   ```env
   # PostgreSQL database connection (Neon connection string)
   DATABASE_URL="postgresql://user:password@endpoint-pooler.neon.tech/dbname?sslmode=require"

   # Auth.js secret key
   NEXTAUTH_SECRET="generate-a-strong-random-bytes-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```
4. Push the schema migrations to your Neon database instance:
   ```bash
   npx prisma db push
   ```
5. Seed the database with core inventory items and test credentials:
   ```bash
   npx prisma db seed
   ```
6. Start the local development server:
   ```bash
   npm run dev
   ```

### Seeding Test Credentials
The seeding file registers these test accounts (passwords are all `password`):
- **Admin**: `admin@aasa.com` (also responds to `admin@assa.com` as fallback)
- **Seller / User**: `seller@aasa.com` (also responds to `seller@assa.com`)
- **Buyer**: `buyer@aasa.com` (also responds to `buyer@assa.com`)

---

## 7. Deployment to Vercel

1. Push your project commits to a private or public GitHub repository.
2. Log into the [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
3. Select your GitHub repository.
4. Add the environment variables in the project configuration:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
5. Click **Deploy**. Vercel will build the Next.js App Router endpoints and make the project live.
