"use client";

import { useState } from "react";
import { convertToBaseUnit, convertFromBaseUnit, getSupportedUnitsForGroup } from "@/lib/conversion/conversion";
import { calculateLineTotal, formatINR } from "@/lib/pricing/pricing";
import { createQuotation } from "@/actions/quotations";
import { createDirectOrder, createOrderFromQuotation } from "@/actions/orders";
import Decimal from "decimal.js";

interface SellerDashboardViewProps {
  products: any[];
  quotations: any[];
  orders: any[];
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
}: SellerDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"catalog" | "quotations" | "orders">("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartError, setCartError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters active products
  const activeProducts = products.filter(
    (p) =>
      p.active &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Add item to cart
  const addToCart = (product: any) => {
    setCartError("");
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      setCartError(`"${product.name}" is already in the cart. You can modify its quantity below.`);
      return;
    }

    const defaultUnit = getSupportedUnitsForGroup(product.unitGroup)[0] || product.baseUnit;
    const defaultQty = 1;

    // Calculate base and line total
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
    setActionLoading(quoteId);
    try {
      await createOrderFromQuotation(quoteId);
      alert("Quotation successfully converted to Order!");
    } catch (err: any) {
      alert(err.message || "Failed to convert quote to order");
    } finally {
      setActionLoading(null);
    }
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

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded shadow-sm">
        {(
          [
            { id: "catalog", label: "Product Catalog & Cart Builder" },
            { id: "quotations", label: "My Quotations" },
            { id: "orders", label: "My Order History" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-indigo-650 text-indigo-600 bg-indigo-50/20"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content: Catalog */}
      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="font-bold text-slate-800">Catalog Search</h3>
              <input
                type="text"
                placeholder="Search products by SKU, name, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs w-full sm:max-w-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="bg-white rounded shadow overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="p-3 font-semibold">Product info</th>
                    <th className="p-3 font-semibold text-right">Base Price (INR)</th>
                    <th className="p-3 font-semibold text-right">Available Stock</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {activeProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <p className="font-semibold text-slate-900">{prod.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          SKU: {prod.sku} | Category: {prod.category}
                        </p>
                      </td>
                      <td className="p-3 font-mono text-xs text-right">
                        ₹{formatINR(prod.pricePerBaseUnit)} / {prod.baseUnit}
                      </td>
                      <td className="p-3 font-mono text-xs text-right text-indigo-700 font-bold">
                        {formatStockDisplay(prod)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => addToCart(prod)}
                          className="bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                        >
                          Add to Cart
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cart Panel */}
          <div className="bg-white p-6 rounded shadow border border-slate-200 h-fit space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2 flex justify-between items-center">
              <span>Selected Items</span>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                {cart.length} items
              </span>
            </h3>

            {cartError && (
              <div className="p-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded">
                {cartError}
              </div>
            )}

            {cart.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Your cart is empty. Add products from the catalog to build quotations or place orders.
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.productId} className="py-3 text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-red-500 hover:text-red-700 font-semibold"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="w-24">
                          <label className="text-[10px] text-slate-500">Qty</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateCartItem(item.productId, parseFloat(e.target.value) || 0, item.unit)
                            }
                            className="w-full px-2 py-1 border rounded text-xs"
                          />
                        </div>

                        <div className="w-24">
                          <label className="text-[10px] text-slate-500">Unit</label>
                          <select
                            value={item.unit}
                            onChange={(e) => updateCartItem(item.productId, item.quantity, e.target.value)}
                            className="w-full px-2 py-1 border rounded text-xs"
                          >
                            {getSupportedUnitsForGroup(item.unitGroup).map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex-1 text-right self-end pb-1 font-mono text-[11px] font-bold text-slate-900">
                          ₹{formatINR(item.lineTotal)}
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono italic">
                        Conversion: {item.baseQuantity} {item.baseUnit} @ ₹{formatINR(item.pricePerBaseUnit)}/{item.baseUnit}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-lg text-indigo-700 font-mono">₹{formatINR(getCartTotal())}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleRequestQuotation}
                      disabled={submitting}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 rounded disabled:opacity-50 transition-colors"
                    >
                      Request Quotation
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={submitting}
                      className="bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-bold py-2 rounded disabled:opacity-50 transition-colors"
                    >
                      Place Direct Order
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab content: Quotations */}
      {activeTab === "quotations" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg">My Quotations</h3>
            <p className="text-xs text-slate-500 mt-1">Check approval status of your quotations and convert approved ones to orders.</p>
          </div>

          <div className="space-y-4">
            {quotations.length === 0 ? (
              <div className="bg-white p-8 text-center text-slate-500 rounded shadow border">
                No quotations created yet.
              </div>
            ) : (
              quotations.map((quote) => (
                <div key={quote.id} className="bg-white rounded shadow border border-slate-200 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b pb-3 gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-800">Quote ID: {quote.id.substring(0, 8)}...</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            quote.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : quote.status === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : quote.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {quote.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Submitted: {new Date(quote.createdAt).toLocaleString()} | Valid Until: {new Date(quote.validUntil).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex flex-col items-end">
                      <p className="text-xs text-slate-500 font-semibold">Grand Total</p>
                      <p className="text-lg font-bold text-indigo-700 font-mono">₹{formatINR(quote.totalAmount)}</p>

                      {quote.status === "APPROVED" && (
                        <button
                          onClick={() => handleConvertToOrder(quote.id)}
                          disabled={actionLoading === quote.id}
                          className="bg-indigo-650 hover:bg-indigo-750 text-white text-[11px] font-bold px-4 py-1.5 rounded disabled:opacity-50 mt-2 transition-colors"
                        >
                          {actionLoading === quote.id ? "Placing..." : "Place Order Now"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="overflow-x-auto bg-slate-50 rounded border border-slate-100">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                          <th className="p-2 font-semibold">SKU / Product</th>
                          <th className="p-2 font-semibold text-right">Quantity</th>
                          <th className="p-2 font-semibold text-right">Base Quantity (Audit)</th>
                          <th className="p-2 font-semibold text-right">Base Price</th>
                          <th className="p-2 font-semibold text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-slate-700">
                        {quote.quotationItems.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-100/50">
                            <td className="p-2">
                              <p className="font-semibold">{item.product.name}</p>
                              <p className="text-[9px] text-slate-400 font-mono">{item.product.sku}</p>
                            </td>
                            <td className="p-2 font-semibold text-right">{Number(item.quantity)} {item.unit}</td>
                            <td className="p-2 font-mono text-slate-500 text-right">{Number(item.baseQuantity)} {item.product.baseUnit}</td>
                            <td className="p-2 font-mono text-right">₹{formatINR(item.pricePerBaseUnit)}/{item.product.baseUnit}</td>
                            <td className="p-2 font-mono font-bold text-right text-slate-900">₹{formatINR(item.lineTotal)}</td>
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

      {/* Tab content: Orders */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg">My Order History</h3>
            <p className="text-xs text-slate-500 mt-1">Trace statuses and historic orders.</p>
          </div>

          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white p-8 text-center text-slate-500 rounded shadow border">
                No orders placed yet.
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-white rounded shadow border border-slate-200 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b pb-3 gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-800">Order ID: {order.id.substring(0, 8)}...</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase">
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Placed: {new Date(order.createdAt).toLocaleString()}
                        {order.quotationId && ` | Converted from Quote: ${order.quotationId.substring(0, 8)}...`}
                      </p>
                    </div>

                    <div className="flex flex-col items-end">
                      <p className="text-xs text-slate-500 font-semibold">Grand Total</p>
                      <p className="text-lg font-bold text-indigo-700 font-mono">₹{formatINR(order.totalAmount)}</p>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="overflow-x-auto bg-slate-50 rounded border border-slate-100">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                          <th className="p-2 font-semibold">SKU / Product</th>
                          <th className="p-2 font-semibold text-right">Quantity</th>
                          <th className="p-2 font-semibold text-right">Base Quantity (Audit)</th>
                          <th className="p-2 font-semibold text-right">Locked Base Price</th>
                          <th className="p-2 font-semibold text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-slate-700">
                        {order.orderItems.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-100/50">
                            <td className="p-2">
                              <p className="font-semibold">{item.product.name}</p>
                              <p className="text-[9px] text-slate-400 font-mono">{item.product.sku}</p>
                            </td>
                            <td className="p-2 font-semibold text-right">{Number(item.quantity)} {item.unit}</td>
                            <td className="p-2 font-mono text-slate-500 text-right">{Number(item.baseQuantity)} {item.product.baseUnit}</td>
                            <td className="p-2 font-mono text-right">₹{formatINR(item.pricePerBaseUnit)}/{item.product.baseUnit}</td>
                            <td className="p-2 font-mono font-bold text-right text-slate-900">₹{formatINR(item.lineTotal)}</td>
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
  );
}
