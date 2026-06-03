"use client";

import { useState } from "react";
import ProductForm from "../forms/ProductForm";
import StockAdjustmentForm from "../forms/StockAdjustmentForm";
import { deleteProduct } from "@/actions/products";
import { updateQuotationStatus } from "@/actions/quotations";
import { createOrderFromQuotation } from "@/actions/orders";
import { convertFromBaseUnit } from "@/lib/conversion/conversion";
import { formatINR } from "@/lib/pricing/pricing";

interface AdminDashboardTabsProps {
  products: any[];
  quotations: any[];
  orders: any[];
  auditLogs: any[];
}

export default function AdminDashboardTabs({
  products,
  quotations,
  orders,
  auditLogs,
}: AdminDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<"products" | "inventory" | "quotations" | "orders" | "audit">("products");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete or deactivate this product?")) return;
    setActionError(null);
    try {
      await deleteProduct(id);
    } catch (err: any) {
      setActionError(err.message || "Failed to delete product");
    }
  };

  const handleQuotationStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    setActionError(null);
    setActionLoading(id);
    try {
      await updateQuotationStatus(id, status);
    } catch (err: any) {
      setActionError(err.message || "Failed to update quotation status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvertToOrder = async (id: string) => {
    setActionError(null);
    setActionLoading(id);
    try {
      await createOrderFromQuotation(id);
      alert("Order placed successfully!");
    } catch (err: any) {
      setActionError(err.message || "Failed to convert quotation to order");
    } finally {
      setActionLoading(null);
    }
  };

  const formatStockDisplay = (product: any) => {
    const baseQty = Number(product.inventory?.baseQuantity || 0);
    const baseUnit = product.baseUnit;

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
      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded shadow-sm">
        {(
          [
            { id: "products", label: "Product Catalog CRUD" },
            { id: "inventory", label: "Inventory Stock Control" },
            { id: "quotations", label: "Seller Quotations" },
            { id: "orders", label: "Placed Orders" },
            { id: "audit", label: "Audit Logs Logfile" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setActionError(null);
            }}
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

      {actionError && (
        <div className="p-3 text-sm text-red-650 bg-red-50 border border-red-200 rounded">
          {actionError}
        </div>
      )}

      {/* Tab: Products */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg">Product Catalog Management</h3>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingProduct(null);
              }}
              className="bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-bold px-4 py-2 rounded transition-colors"
            >
              {showAddForm ? "Hide Form" : "Add Product"}
            </button>
          </div>

          {showAddForm && (
            <div className="max-w-2xl">
              <ProductForm onSuccess={() => setShowAddForm(false)} />
            </div>
          )}

          {editingProduct && (
            <div className="max-w-2xl bg-white p-4 rounded shadow border border-indigo-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-indigo-600 font-mono">Editing: {editingProduct.sku}</span>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
              <ProductForm
                product={editingProduct}
                onSuccess={() => setEditingProduct(null)}
              />
            </div>
          )}

          <div className="bg-white rounded shadow overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-3 font-semibold">SKU</th>
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Unit Group</th>
                  <th className="p-3 font-semibold">Price per Base Unit (INR)</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-xs">{prod.sku}</td>
                    <td className="p-3">
                      <p className="font-semibold">{prod.name}</p>
                      {prod.description && <p className="text-xs text-slate-400">{prod.description}</p>}
                    </td>
                    <td className="p-3 text-xs">{prod.category}</td>
                    <td className="p-3 text-xs font-mono">{prod.unitGroup}</td>
                    <td className="p-3 font-mono text-xs">
                      ₹{formatINR(prod.pricePerBaseUnit)} / {prod.baseUnit}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          prod.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {prod.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        onClick={() => {
                          setEditingProduct(prod);
                          setShowAddForm(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-indigo-600 hover:text-indigo-900 font-semibold text-xs px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="text-red-600 hover:text-red-950 font-semibold text-xs px-2 py-1 bg-red-50 hover:bg-red-100 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Inventory */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg">Inventory Stock Levels & Control</h3>
            <p className="text-xs text-slate-500 mt-1">Adjust stock in any unit and have it automatically calculated in canonical base units.</p>
          </div>

          {adjustingProduct && (
            <div className="max-w-xl bg-white p-4 rounded shadow border border-indigo-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-indigo-600 font-mono">Stock Adjustment</span>
                <button
                  onClick={() => setAdjustingProduct(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Close Form
                </button>
              </div>
              <StockAdjustmentForm
                product={adjustingProduct}
                onSuccess={() => setAdjustingProduct(null)}
              />
            </div>
          )}

          <div className="bg-white rounded shadow overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-3 font-semibold">SKU</th>
                  <th className="p-3 font-semibold">Product Name</th>
                  <th className="p-3 font-semibold">Warehouse Location</th>
                  <th className="p-3 font-semibold">Stock Level (Base & Large Units)</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-xs">{prod.sku}</td>
                    <td className="p-3 font-semibold">{prod.name}</td>
                    <td className="p-3 text-xs">{prod.inventory?.location || "N/A"}</td>
                    <td className="p-3 font-mono font-bold text-xs text-indigo-700">
                      {formatStockDisplay(prod)}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setAdjustingProduct(prod);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-indigo-650 hover:text-indigo-850 font-semibold text-xs px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Quotations */}
      {activeTab === "quotations" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg">Seller Quotations Management</h3>
            <p className="text-xs text-slate-500 mt-1">Review and approve quotations before they can be converted to orders.</p>
          </div>

          <div className="space-y-4">
            {quotations.length === 0 ? (
              <div className="bg-white p-8 text-center text-slate-500 rounded shadow border">
                No quotations submitted yet.
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
                        Submitted by: <strong className="text-slate-700">{quote.user.name}</strong> ({quote.user.email})
                      </p>
                      <p className="text-xs text-slate-500">
                        Date: {new Date(quote.createdAt).toLocaleString()} | Valid Until: {new Date(quote.validUntil).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex flex-col items-end">
                      <p className="text-xs text-slate-500">Grand Total Amount</p>
                      <p className="text-lg font-bold text-indigo-700">₹{formatINR(quote.totalAmount)}</p>
                      
                      {quote.status === "PENDING" && (
                        <div className="flex space-x-1 mt-2">
                          <button
                            onClick={() => handleQuotationStatus(quote.id, "APPROVED")}
                            disabled={actionLoading === quote.id}
                            className="bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold px-3 py-1 rounded disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleQuotationStatus(quote.id, "REJECTED")}
                            disabled={actionLoading === quote.id}
                            className="bg-red-650 hover:bg-red-750 text-white text-[11px] font-bold px-3 py-1 rounded disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {quote.status === "APPROVED" && (
                        <button
                          onClick={() => handleConvertToOrder(quote.id)}
                          disabled={actionLoading === quote.id}
                          className="bg-indigo-650 hover:bg-indigo-750 text-white text-[11px] font-bold px-4 py-1.5 rounded disabled:opacity-50 mt-2"
                        >
                          Place Order Now
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quote Items Table */}
                  <div className="overflow-x-auto bg-slate-50 rounded border border-slate-100">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                          <th className="p-2 font-semibold">SKU / Product</th>
                          <th className="p-2 font-semibold">Original Qty</th>
                          <th className="p-2 font-semibold">Base Qty (Audit)</th>
                          <th className="p-2 font-semibold">Base Price</th>
                          <th className="p-2 font-semibold text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-slate-700">
                        {quote.quotationItems.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-100/50">
                            <td className="p-2">
                              <p className="font-semibold">{item.product.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{item.product.sku}</p>
                            </td>
                            <td className="p-2 font-semibold">{Number(item.quantity)} {item.unit}</td>
                            <td className="p-2 font-mono text-slate-500">{Number(item.baseQuantity)} {item.product.baseUnit}</td>
                            <td className="p-2 font-mono">₹{formatINR(item.pricePerBaseUnit)} / {item.product.baseUnit}</td>
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

      {/* Tab: Orders */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg">Placed Orders Database</h3>
            <p className="text-xs text-slate-500 mt-1">Review finalized orders and trace audit records.</p>
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
                        Customer/Seller: <strong className="text-slate-700">{order.user.name}</strong> ({order.user.email})
                      </p>
                      <p className="text-xs text-slate-500">
                        Placed: {new Date(order.createdAt).toLocaleString()}
                        {order.quotationId && ` | Converted from Quote: ${order.quotationId.substring(0, 8)}...`}
                      </p>
                    </div>

                    <div className="flex flex-col items-end">
                      <p className="text-xs text-slate-500">Grand Total Amount</p>
                      <p className="text-lg font-bold text-indigo-700 font-mono">₹{formatINR(order.totalAmount)}</p>
                    </div>
                  </div>

                  {/* Order Items Table */}
                  <div className="overflow-x-auto bg-slate-50 rounded border border-slate-100">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                          <th className="p-2 font-semibold">SKU / Product</th>
                          <th className="p-2 font-semibold">Original Qty</th>
                          <th className="p-2 font-semibold">Base Qty (Audit)</th>
                          <th className="p-2 font-semibold">Locked Base Price</th>
                          <th className="p-2 font-semibold text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-slate-700">
                        {order.orderItems.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-100/50">
                            <td className="p-2">
                              <p className="font-semibold">{item.product.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{item.product.sku}</p>
                            </td>
                            <td className="p-2 font-semibold">{Number(item.quantity)} {item.unit}</td>
                            <td className="p-2 font-mono text-slate-500">{Number(item.baseQuantity)} {item.product.baseUnit}</td>
                            <td className="p-2 font-mono">₹{formatINR(item.pricePerBaseUnit)} / {item.product.baseUnit}</td>
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

      {/* Tab: Audit Logs */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg">System-wide Audit Trail Logs</h3>
            <p className="text-xs text-slate-500 mt-1">Immutable historic logs for tracking stock levels, product modifications, and conversions.</p>
          </div>

          <div className="bg-white rounded shadow overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-3 font-semibold">Timestamp</th>
                  <th className="p-3 font-semibold">Operator</th>
                  <th className="p-3 font-semibold">Entity Type</th>
                  <th className="p-3 font-semibold">Action</th>
                  <th className="p-3 font-semibold">Details JSON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 align-top">
                    <td className="p-3 text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-[11px] whitespace-nowrap">
                      <p className="font-semibold text-slate-850">{log.user?.name || "System"}</p>
                      <p className="text-[9px] text-slate-400">{log.user?.email}</p>
                    </td>
                    <td className="p-3 text-[10px] whitespace-nowrap font-bold text-indigo-650">
                      {log.entityType}
                    </td>
                    <td className="p-3 text-[10px] whitespace-nowrap">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[9px] ${
                          log.action === "STOCK_CHANGE"
                            ? "bg-amber-100 text-amber-800"
                            : log.action === "CREATE" || log.action === "APPROVED"
                            ? "bg-green-150 text-green-800"
                            : log.action === "REJECTED" || log.action === "DELETE"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-[10px] text-slate-600 break-all whitespace-pre-wrap max-w-md font-sans">
                      {JSON.stringify(JSON.parse(log.details), null, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
