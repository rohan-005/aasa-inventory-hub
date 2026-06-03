"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { 
  Package, 
  FileText, 
  ShoppingCart, 
  ArrowRight,
  Database,
  CheckCircle2,
  X,
  AlertTriangle
} from "lucide-react";
import { convertToBaseUnit, convertFromBaseUnit, getSupportedUnitsForGroup } from "@/lib/conversion/conversion";
import { calculateLineTotal, formatINR } from "@/lib/pricing/pricing";
import { createQuotation } from "@/actions/quotations";
import { createDirectOrder, createOrderFromQuotation } from "@/actions/orders";

interface SellerDashboardViewProps {
  products: any[];
  quotations: any[];
  orders: any[];
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
}

interface CartItem {
  productId: string;
  sku: string;
  name: string;
  unitGroup: "WEIGHT" | "VOLUME" | "COUNT";
  baseUnit: string;
  pricePerBaseUnit: number;
  quantity: number;
  unit: string;
  baseQuantity: number;
  lineTotal: number;
}

export default function SellerDashboardView({
  products,
  quotations,
  orders,
  user,
}: SellerDashboardViewProps) {
  const isBuyer = user.role === "BUYER";
  
  // Track active tab inside layout
  const [activeTab, setActiveTab] = useState<string>(
    isBuyer ? "approved_quotations" : "catalog"
  );
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartError, setCartError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Selected product for Drawer
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // Verification states for Buyer Checkout Checklists
  const [verificationChecked, setVerificationChecked] = useState<{ [quoteId: string]: boolean }>({});

  // Extract unique categories
  const categories = Array.from(new Set(products.map((p) => p.category)));

  // Filters active products
  const activeProducts = products.filter(
    (p) =>
      p.active &&
      (!selectedCategory || p.category === selectedCategory) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Add item to cart
  const addToCart = (product: any) => {
    setCartError("");
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      setCartError(`"${product.name}" is already in the cart.`);
      return;
    }

    const defaultUnit = getSupportedUnitsForGroup(product.unitGroup)[0] || product.baseUnit;
    const defaultQty = 1;

    const baseQty = convertToBaseUnit(defaultQty, defaultUnit).toNumber();
    const lineTotal = calculateLineTotal(baseQty, product.pricePerBaseUnit).toNumber();

    const newItem: CartItem = {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unitGroup: product.unitGroup,
      baseUnit: product.baseUnit,
      pricePerBaseUnit: Number(product.pricePerBaseUnit),
      quantity: defaultQty,
      unit: defaultUnit,
      baseQuantity: baseQty,
      lineTotal,
    };

    setCart([...cart, newItem]);
  };

  // Modify cart item quantity or unit
  const updateCartItem = (productId: string, qty: number, unit: string) => {
    if (qty < 0) return;

    setCart(
      cart.map((item) => {
        if (item.productId === productId) {
          try {
            const baseQty = convertToBaseUnit(qty, unit).toNumber();
            const lineTotal = calculateLineTotal(baseQty, item.pricePerBaseUnit).toNumber();
            return {
              ...item,
              quantity: qty,
              unit,
              baseQuantity: baseQty,
              lineTotal,
            };
          } catch (e) {
            return item;
          }
        }
        return item;
      })
    );
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  // Get total of cart
  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.lineTotal, 0);
  };

  // Submit cart as Quotation
  const handleRequestQuotation = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setCartError("");

    try {
      const items = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit,
      }));

      await createQuotation(items);
      setCart([]);
      setActiveTab("quotations");
      alert("Quotation request submitted successfully!");
    } catch (err: any) {
      setCartError(err.message || "Failed to create quotation");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit cart as Direct Order (instant placement)
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setCartError("");

    try {
      const items = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit,
      }));

      await createDirectOrder(items);
      setCart([]);
      setActiveTab("orders");
      alert("Order placed successfully!");
    } catch (err: any) {
      setCartError(err.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  // Convert Approved Quote to Order
  const handleConvertToOrder = async (quoteId: string) => {
    if (!verificationChecked[quoteId]) {
      alert("Please review and confirm all items in the verification checklist first.");
      return;
    }
    
    setActionLoading(quoteId);
    try {
      await createOrderFromQuotation(quoteId);
      alert("Quotation successfully converted to Order!");
      setActiveTab("orders");
    } catch (err: any) {
      alert(err.message || "Failed to convert quote to order");
    } finally {
      setActionLoading(null);
    }
  };

  const getStockStatus = (baseQty: number) => {
    if (baseQty >= 10000) return { label: "FULL STOCK", color: "text-emerald-650 bg-emerald-50 border-emerald-200" };
    if (baseQty >= 5000) return { label: "MEDIUM STOCK", color: "text-zinc-650 bg-zinc-50 border-zinc-200" };
    if (baseQty > 0) return { label: "LOW STOCK", color: "text-amber-650 bg-amber-50 border-amber-200" };
    return { label: "CRITICAL STOCK", color: "text-red-650 bg-red-50 border-red-200" };
  };

  const formatStockDisplay = (product: any) => {
    const baseQty = Number(product.inventory?.baseQuantity || 0);
    if (product.unitGroup === "WEIGHT") {
      const kgQty = convertFromBaseUnit(baseQty, "kg").toNumber();
      return `${baseQty.toLocaleString()} g (${kgQty.toLocaleString()} kg)`;
    }
    if (product.unitGroup === "VOLUME") {
      const lQty = convertFromBaseUnit(baseQty, "L").toNumber();
      return `${baseQty.toLocaleString()} mL (${lQty.toLocaleString()} L)`;
    }
    return `${baseQty.toLocaleString()} item`;
  };

  // Setup tabs for layout
  const tabs = isBuyer
    ? [
        { id: "approved_quotations", label: "Approved Quotations", icon: FileText },
        { id: "orders", label: "My Orders", icon: ShoppingCart },
      ]
    : [
        { id: "catalog", label: "Catalog & Cart", icon: Package },
        { id: "quotations", label: "My Quotations", icon: FileText },
        { id: "orders", label: "My Orders", icon: ShoppingCart },
      ];

  return (
    <AppLayout
      user={user}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      tabs={tabs}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    >
      <div className="space-y-6">
        
        {/* CATALOG / CART TAB */}
        {activeTab === "catalog" && !isBuyer && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Product List (which takes up 2 cols on wide viewports) */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Header / Search Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-zinc-200 bg-white dark:bg-zinc-900 gap-4">
                <div>
                  <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    Product Catalog
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    Select rows for stock specs, and use left side filters for category browsing.
                  </p>
                </div>
                
                <div className="w-full sm:max-w-xs flex items-center border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[10px]">
                  <input
                    type="text"
                    placeholder="Search SKU, name, category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-zinc-800 w-full uppercase placeholder-zinc-400"
                  />
                </div>
              </div>

              {/* Asymmetrical layout: left filter panel + right table view */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Left Category Filter Column */}
                <div className="md:col-span-1 border border-zinc-200 bg-white p-4 space-y-3 font-mono text-[11px] h-fit">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b pb-1.5">
                    Category Filters
                  </h4>
                  <div className="flex flex-wrap md:flex-col gap-1.5 pt-1">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`text-left px-2 py-1.5 border text-[10px] uppercase font-bold transition-colors w-full ${
                        !selectedCategory 
                          ? "bg-zinc-950 text-white border-zinc-950" 
                          : "border-zinc-200 text-zinc-550 hover:text-zinc-900 bg-zinc-50/50"
                      }`}
                    >
                      ALL PRODUCTS
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-left px-2 py-1.5 border text-[10px] uppercase font-bold transition-colors w-full truncate ${
                          selectedCategory === cat 
                            ? "bg-zinc-950 text-white border-zinc-950" 
                            : "border-zinc-200 text-zinc-550 hover:text-zinc-900 bg-zinc-50/50"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Table Column */}
                <div className="md:col-span-3 border border-zinc-200 overflow-x-auto bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 font-mono text-[10px] font-bold text-zinc-500 border-b border-zinc-200">
                        <th className="p-3">Product Name / SKU</th>
                        <th className="p-3 text-right">Base Price</th>
                        <th className="p-3 text-right">Warehouse Stock</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-mono">
                      {activeProducts.map((prod) => {
                        const baseQty = Number(prod.inventory?.baseQuantity || 0);
                        const stockStatus = getStockStatus(baseQty);
                        return (
                          <tr 
                            key={prod.id} 
                            onClick={() => setSelectedProduct(prod)}
                            className="hover:bg-zinc-50/50 cursor-pointer transition-colors"
                          >
                            <td className="p-3">
                              <span className="font-sans font-semibold text-zinc-900 block hover:underline">
                                {prod.name}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                SKU: {prod.sku}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold whitespace-nowrap">
                              ₹{formatINR(prod.pricePerBaseUnit)} / {prod.baseUnit}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-zinc-850">
                                  {formatStockDisplay(prod)}
                                </span>
                                <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 border ${stockStatus.color} mt-1`}>
                                  {stockStatus.label}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => addToCart(prod)}
                                className="px-3 py-1 bg-zinc-950 hover:bg-zinc-900 text-white text-[10px] font-bold uppercase transition-colors"
                              >
                                Add
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>

            {/* Right: Quotation Cart Builder */}
            <div className="border border-zinc-200 p-6 bg-white space-y-5 h-fit">
              <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-900">
                  Quotation Cart
                </h3>
                <span className="font-mono text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 border border-zinc-200">
                  {cart.length} items
                </span>
              </div>

              {cartError && (
                <div className="p-3 text-[11px] text-red-650 bg-red-50 border border-red-200 font-mono">
                  [ERROR] {cartError}
                </div>
              )}

              {cart.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 font-mono text-[11px] border border-dashed border-zinc-200 bg-zinc-50/20">
                  Cart is empty. Add products from the catalog.
                </div>
              ) : (
                <>
                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.productId} className="border border-zinc-200 p-3 bg-zinc-50 space-y-3 font-mono text-[11px]">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-sans font-bold text-zinc-900 block">{item.name}</span>
                            <span className="text-[9px] text-zinc-400">SKU: {item.sku}</span>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="text-red-650 hover:underline text-[10px] font-bold uppercase"
                          >
                            Remove
                          </button>
                        </div>

                        {/* Conversions Visual Pipeline */}
                        <div className="border-y border-zinc-200/60 py-2 space-y-1.5 bg-white/50 px-2">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">
                            Precision Conversion Engine
                          </p>
                          <div className="flex items-center space-x-1.5 text-[10px] text-zinc-650 font-bold">
                            <span>{item.quantity} {item.unit}</span>
                            <ArrowRight size={10} className="text-zinc-400" />
                            <span className="text-zinc-900">{item.baseQuantity} {item.baseUnit}</span>
                            <ArrowRight size={10} className="text-zinc-400" />
                            <span className="text-emerald-650">₹{formatINR(item.lineTotal)}</span>
                          </div>
                        </div>

                        {/* Quantity and Unit Inputs */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-450 uppercase">Quantity</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) =>
                                updateCartItem(item.productId, parseFloat(e.target.value) || 0, item.unit)
                              }
                              className="w-full px-2 py-1 border border-zinc-200 text-[11px] focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-450 uppercase">Unit Choice</label>
                            <select
                              value={item.unit}
                              onChange={(e) => updateCartItem(item.productId, item.quantity, e.target.value)}
                              className="w-full px-2 py-1 border border-zinc-200 text-[11px] focus:outline-none"
                            >
                              {getSupportedUnitsForGroup(item.unitGroup).map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-zinc-200 pt-4 space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold text-zinc-900 font-mono">
                      <span>GRAND TOTAL:</span>
                      <span className="text-sm font-bold text-zinc-950 font-mono">₹{formatINR(getCartTotal())}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleRequestQuotation}
                        disabled={submitting}
                        className="py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-350 text-zinc-900 text-[10px] font-bold uppercase transition-colors"
                      >
                        Request Quote
                      </button>
                      <button
                        onClick={handlePlaceOrder}
                        disabled={submitting}
                        className="py-2 bg-zinc-950 hover:bg-zinc-900 text-white text-[10px] font-bold uppercase transition-colors"
                      >
                        Place Order
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {/* APPROVED QUOTATIONS (BUYER VIEW) */}
        {activeTab === "approved_quotations" && isBuyer && (
          <div className="space-y-6">
            <div className="p-4 border border-zinc-200 bg-white">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-900">
                Approved Quotations Available for Purchase
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                Review, verify compliance checklists, and complete direct stock ordering.
              </p>
            </div>

            {quotations.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 font-mono text-xs border border-dashed border-zinc-200 bg-white">
                No approved quotations are currently available.
              </div>
            ) : (
              <div className="space-y-6">
                {quotations.map((quote) => (
                  <div key={quote.id} className="border border-zinc-200 bg-white p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Quotation details & Item Ledger */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="border-b border-zinc-150 pb-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-zinc-900">Quote ID: {quote.id.substring(0, 8)}</span>
                          <span className="px-2 py-0.5 text-[8px] font-bold font-mono border border-emerald-200 bg-emerald-50 text-emerald-650">
                            {quote.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono mt-1">
                          Prepared by Seller: {quote.user?.name || quote.user?.email} | Valid Until: {new Date(quote.validUntil).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="border border-zinc-100 overflow-x-auto bg-zinc-50/50">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200 font-mono text-[9px] font-bold text-zinc-500">
                              <th className="p-2.5">Product info</th>
                              <th className="p-2.5 text-right">Requested Qty</th>
                              <th className="p-2.5 text-right">Base Conversion</th>
                              <th className="p-2.5 text-right">Locked Rate</th>
                              <th className="p-2.5 text-right">Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-150/70 font-mono text-[10px] text-zinc-700">
                            {quote.quotationItems.map((item: any) => (
                              <tr key={item.id} className="hover:bg-zinc-100/50">
                                <td className="p-2.5">
                                  <span className="font-sans font-bold text-zinc-900 block">{item.product.name}</span>
                                  <span className="text-[9px] text-zinc-400">SKU: {item.product.sku}</span>
                                </td>
                                <td className="p-2.5 text-right font-bold">{Number(item.quantity)} {item.unit}</td>
                                <td className="p-2.5 text-right text-zinc-450">{Number(item.baseQuantity)} {item.product.baseUnit}</td>
                                <td className="p-2.5 text-right">₹{formatINR(item.pricePerBaseUnit)}/{item.product.baseUnit}</td>
                                <td className="p-2.5 text-right font-bold text-zinc-950">₹{formatINR(item.lineTotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Order Creation Checklist & Checkout Action */}
                    <div className="border border-zinc-200 p-5 bg-zinc-50 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-900">
                          Compliance Checkout Verification
                        </h4>
                        
                        <div className="space-y-2 pt-2">
                          <label className="flex items-start space-x-2.5 cursor-pointer text-[10px] font-mono text-zinc-650">
                            <input 
                              type="checkbox"
                              checked={verificationChecked[quote.id] || false}
                              onChange={(e) => setVerificationChecked({
                                ...verificationChecked,
                                [quote.id]: e.target.checked
                              })}
                              className="mt-0.5 border-zinc-300 text-zinc-950 focus:ring-0"
                            />
                            <span>
                              I verify user credentials, locked conversion factors, and stock level limits for chemical deduction.
                            </span>
                          </label>
                        </div>

                        <div className="border-t border-zinc-200 pt-3 space-y-1 font-mono text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-zinc-550">SUBTOTAL</span>
                            <span>₹{formatINR(quote.totalAmount)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-zinc-900 text-[11px]">
                            <span>ORDER TOTAL</span>
                            <span>₹{formatINR(quote.totalAmount)}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleConvertToOrder(quote.id)}
                        disabled={actionLoading === quote.id || !verificationChecked[quote.id]}
                        className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 text-white text-[10px] font-bold uppercase transition-colors disabled:opacity-30"
                      >
                        {actionLoading === quote.id ? "Processing..." : "Place Order"}
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QUOTATIONS TAB (Sellers View) */}
        {activeTab === "quotations" && !isBuyer && (
          <div className="space-y-4">
            <div className="p-4 border border-zinc-200 bg-white">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-900">
                My Quotations Ledger
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                Monitor status and validation limits of submitted quotations.
              </p>
            </div>

            <div className="space-y-4">
              {quotations.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 font-mono text-xs border border-dashed border-zinc-200 bg-white">
                  No quotations created yet.
                </div>
              ) : (
                quotations.map((quote) => (
                  <div key={quote.id} className="border border-zinc-200 bg-white p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-zinc-900">Quote ID: {quote.id.substring(0, 8)}</span>
                          <span className={`px-2 py-0.5 text-[8px] font-bold font-mono border ${
                            quote.status === "APPROVED" 
                              ? "border-emerald-250 bg-emerald-50 text-emerald-650"
                              : quote.status === "PENDING"
                              ? "border-amber-255 bg-amber-50 text-amber-650"
                              : "border-red-255 bg-red-50 text-red-650"
                          }`}>
                            {quote.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          Submitted: {new Date(quote.createdAt).toLocaleString()} | Valid Until: {new Date(quote.validUntil).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 font-mono block">Grand Total</span>
                        <span className="font-mono text-sm font-bold text-zinc-950">₹{formatINR(quote.totalAmount)}</span>
                      </div>
                    </div>

                    <div className="border border-zinc-100 overflow-x-auto bg-zinc-50/50">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-200 font-mono text-[9px] font-bold text-zinc-500">
                            <th className="p-2">Product Name</th>
                            <th className="p-2 text-right">Quantity</th>
                            <th className="p-2 text-right">Base Qty</th>
                            <th className="p-2 text-right">Base Price</th>
                            <th className="p-2 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-150/70 font-mono text-[10px] text-zinc-700">
                          {quote.quotationItems.map((item: any) => (
                            <tr key={item.id}>
                              <td className="p-2 font-sans font-bold text-zinc-900">{item.product.name}</td>
                              <td className="p-2 text-right">{Number(item.quantity)} {item.unit}</td>
                              <td className="p-2 text-right text-zinc-455">{Number(item.baseQuantity)} {item.product.baseUnit}</td>
                              <td className="p-2 text-right">₹{formatINR(item.pricePerBaseUnit)}/{item.product.baseUnit}</td>
                              <td className="p-2 text-right font-bold text-zinc-950">₹{formatINR(item.lineTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* MY ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="p-4 border border-zinc-200 bg-white">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-900">
                Order History Ledger
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                Audit history of finalized orders.
              </p>
            </div>

            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 font-mono text-xs border border-dashed border-zinc-200 bg-white">
                  No orders placed yet.
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="border border-zinc-200 bg-white p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-zinc-900">Order ID: {order.id.substring(0, 8)}</span>
                          <span className="px-2 py-0.5 text-[8px] font-bold font-mono border border-blue-200 bg-blue-50 text-blue-655 uppercase">
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-550 font-mono">
                          Placed: {new Date(order.createdAt).toLocaleString()}
                          {order.quotationId && ` | Converted from Quote: ${order.quotationId.substring(0, 8)}...`}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-zinc-550 font-mono block">Grand Total Paid</span>
                        <span className="font-mono text-sm font-bold text-zinc-950">₹{formatINR(order.totalAmount)}</span>
                      </div>
                    </div>

                    <div className="border border-zinc-100 overflow-x-auto bg-zinc-50/50">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-200 font-mono text-[9px] font-bold text-zinc-500">
                            <th className="p-2">Product Name</th>
                            <th className="p-2 text-right">Quantity</th>
                            <th className="p-2 text-right">Base Qty</th>
                            <th className="p-2 text-right">Locked Rate</th>
                            <th className="p-2 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-150/70 font-mono text-[10px] text-zinc-700">
                          {order.orderItems.map((item: any) => (
                            <tr key={item.id}>
                              <td className="p-2 font-sans font-bold text-zinc-900">{item.product.name}</td>
                              <td className="p-2 text-right">{Number(item.quantity)} {item.unit}</td>
                              <td className="p-2 text-right text-zinc-455">{Number(item.baseQuantity)} {item.product.baseUnit}</td>
                              <td className="p-2 text-right">₹{formatINR(item.pricePerBaseUnit)}/{item.product.baseUnit}</td>
                              <td className="p-2 text-right font-bold text-zinc-950">₹{formatINR(item.lineTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* PRODUCT DETAILS DRAWER */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
          
          {/* Backdrop Click Dismiss */}
          <div className="absolute inset-0 cursor-default" onClick={() => setSelectedProduct(null)}></div>
          
          <div className="relative w-full max-w-md bg-white h-full border-l border-zinc-200 shadow-2xl flex flex-col justify-between font-sans">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
              <div className="space-y-1">
                <span className="font-mono text-[10px] font-bold text-zinc-450 uppercase">PRODUCT DATA SHEETS</span>
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">{selectedProduct.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 border border-zinc-200 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800"
              >
                <X size={14} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-[11px]">
              
              {/* Profile details */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Specifications</h4>
                <div className="border border-zinc-150 divide-y divide-zinc-150">
                  <div className="flex justify-between p-2.5">
                    <span className="text-zinc-550">SKU CODE</span>
                    <span className="font-bold text-zinc-900">{selectedProduct.sku}</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span className="text-zinc-550">CATEGORY</span>
                    <span className="text-zinc-900">{selectedProduct.category}</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span className="text-zinc-550">UNIT CONVERSION GROUP</span>
                    <span className="text-zinc-900">{selectedProduct.unitGroup}</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span className="text-zinc-550">CANONICAL BASE UNIT</span>
                    <span className="text-zinc-900">{selectedProduct.baseUnit}</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span className="text-zinc-550">BASE UNIT PRICE</span>
                    <span className="font-bold text-zinc-950">₹{formatINR(selectedProduct.pricePerBaseUnit)} / {selectedProduct.baseUnit}</span>
                  </div>
                </div>
              </div>

              {/* Stock status detail */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Warehouse Balance</h4>
                <div className="border border-zinc-150 p-4 space-y-3 bg-zinc-50">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-550">CURRENT INVENTORY</span>
                    <span className="font-bold text-zinc-900">{formatStockDisplay(selectedProduct)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-2 border border-zinc-200 bg-white">
                    <Database size={14} className="text-zinc-400" />
                    <div className="flex-1 flex justify-between items-center text-[10px]">
                      <span>STOCK RATING:</span>
                      <span className={`px-2 py-0.5 border font-bold ${getStockStatus(Number(selectedProduct.inventory?.baseQuantity || 0)).color}`}>
                        {getStockStatus(Number(selectedProduct.inventory?.baseQuantity || 0)).label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion engine layout */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Conversion Engine Mapping</h4>
                <div className="border border-zinc-150 p-4 space-y-2 bg-white">
                  <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">
                    This product operates under the <span className="font-mono text-zinc-900 font-bold">{selectedProduct.unitGroup}</span> unit group. Transactions can be made in any unit below:
                  </p>
                  <div className="space-y-1.5 pt-1.5">
                    {getSupportedUnitsForGroup(selectedProduct.unitGroup).map((unit) => {
                      const sampleQty = 1;
                      const baseEquiv = convertToBaseUnit(sampleQty, unit).toString();
                      return (
                        <div key={unit} className="flex justify-between items-center p-2 bg-zinc-50 border border-zinc-100">
                          <span>{sampleQty} {unit}</span>
                          <ArrowRight size={10} className="text-zinc-400" />
                          <span className="font-bold text-zinc-900">{baseEquiv} {selectedProduct.baseUnit}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex justify-end">
              <button 
                onClick={() => {
                  addToCart(selectedProduct);
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-white font-mono text-[10px] font-bold uppercase transition-colors"
              >
                Add Product to Cart
              </button>
            </div>

          </div>
        </div>
      )}

    </AppLayout>
  );
}
