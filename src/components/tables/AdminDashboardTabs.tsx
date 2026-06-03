"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { 
  LayoutDashboard, 
  Package, 
  Database, 
  FileText, 
  ShoppingCart, 
  History,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle,
  FileCheck
} from "lucide-react";
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
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
}

export default function AdminDashboardTabs({
  products,
  quotations,
  orders,
  auditLogs,
  user,
}: AdminDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this product?")) return;
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

  // Determine stock severity details
  const getStockSeverity = (baseQty: number) => {
    if (baseQty >= 10000) return { label: "FULL", barClass: "bg-emerald-500", textClass: "text-emerald-600" };
    if (baseQty >= 5000) return { label: "MED", barClass: "bg-zinc-400", textClass: "text-zinc-500" };
    if (baseQty > 0) return { label: "LOW", barClass: "bg-amber-500", textClass: "text-amber-600" };
    return { label: "CRITICAL", barClass: "bg-red-500", textClass: "text-red-650" };
  };

  // Setup tabs
  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "products", label: "Catalog Manager", icon: Package },
    { id: "inventory", label: "Warehouse Stock", icon: Database },
    { id: "quotations", label: "Approval Ledger", icon: FileText },
    { id: "orders", label: "Order Log", icon: ShoppingCart },
    { id: "audit", label: "Audit Logs", icon: History },
  ];

  // Helper variables for Overview Dashboard stats
  const totalStockItems = products.reduce((sum, p) => sum + Number(p.inventory?.baseQuantity || 0), 0);
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const pendingQuotations = quotations.filter((q) => q.status === "PENDING");
  const lowStockProducts = products.filter((p) => Number(p.inventory?.baseQuantity || 0) < 5000);

  return (
    <AppLayout
      user={user}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      tabs={tabs}
    >
      <div className="space-y-6">
        {actionError && (
          <div className="p-3 text-xs font-mono text-red-650 bg-red-50 border border-red-200">
            [ERROR] {actionError}
          </div>
        )}

        {/* 1. OVERVIEW / COMMAND CENTER */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            
            {/* Asymmetrical Grid: Large Tall Widget + Secondary Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Tall Column: Primary Command Stat */}
              <div className="border border-zinc-200 bg-zinc-950 text-zinc-100 p-8 flex flex-col justify-between h-[320px] lg:h-auto">
                <div className="space-y-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                    TOTAL CUMULATIVE VOLUME
                  </span>
                  <h3 className="text-4xl font-bold font-mono tracking-tight text-white mt-1">
                    {totalStockItems.toLocaleString()}
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-xs font-sans mt-2">
                    Aggregated stock count across weight (grams), volume (milliliters), and unique items currently cataloged in the hub.
                  </p>
                </div>
                
                <div className="border-t border-zinc-800 pt-4 flex items-center space-x-2 text-[10px] font-mono text-zinc-400">
                  <Activity size={12} className="text-emerald-500" />
                  <span>TRANSACTION DEDUCTIONS ONLINE</span>
                </div>
              </div>

              {/* Right Side Column: Secondary Stats + Alerts */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Secondary Stat: Revenue */}
                <div className="border border-zinc-200 p-6 bg-white space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-[9px] font-bold text-zinc-450 uppercase tracking-widest">
                      LOCKED SYSTEM REVENUE
                    </span>
                    <TrendingUp size={14} className="text-zinc-400" />
                  </div>
                  <h4 className="text-2xl font-bold font-mono text-zinc-900">
                    ₹{formatINR(totalRevenue)}
                  </h4>
                  <p className="text-[10px] text-zinc-550">
                    Grand total value of order histories converted and finalized.
                  </p>
                </div>

                {/* Secondary Stat: Pending Approvals */}
                <div className="border border-zinc-200 p-6 bg-white space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-[9px] font-bold text-zinc-450 uppercase tracking-widest">
                      PENDING APPROVALS
                    </span>
                    <FileCheck size={14} className="text-zinc-400" />
                  </div>
                  <h4 className="text-2xl font-bold font-mono text-zinc-900">
                    {pendingQuotations.length}
                  </h4>
                  <p className="text-[10px] text-zinc-550">
                    Quotation requests waiting for administrative review.
                  </p>
                </div>

                {/* Wide Alert widget representing critical stock warnings */}
                <div className="sm:col-span-2 border border-zinc-200 p-5 bg-white space-y-3">
                  <div className="flex items-center space-x-2 border-b border-zinc-150 pb-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-900">
                      CRITICAL DEPLETION WARNINGS ({lowStockProducts.length})
                    </span>
                  </div>

                  {lowStockProducts.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 font-mono">
                      [INFO] All stocks are operating above depletion warning levels.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {lowStockProducts.slice(0, 3).map((prod) => {
                        const baseQty = Number(prod.inventory?.baseQuantity || 0);
                        const status = getStockSeverity(baseQty);
                        return (
                          <div key={prod.id} className="flex justify-between items-center text-[10px] font-mono border-b border-zinc-100 pb-1.5 last:border-0 last:pb-0">
                            <span>{prod.name} ({prod.sku})</span>
                            <span className={`font-bold ${status.textClass}`}>
                              {formatStockDisplay(prod)} [{status.label}]
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Recent Activity Ledger */}
            <div className="border border-zinc-200 bg-white p-6 space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-900">
                SYSTEM ACTIVITY CHRONOLOGY
              </h3>
              
              <div className="border border-zinc-150 divide-y divide-zinc-150 font-mono text-[10px]">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex justify-between items-start p-3 hover:bg-zinc-50 transition-colors gap-4">
                    <div className="space-y-1">
                      <span className="text-zinc-500">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
                      <span className="font-bold text-zinc-900 ml-2">{log.user?.name || "System"}</span>
                      <span className="text-zinc-550 ml-1.5">performed action</span>
                      <span className="inline-block border border-zinc-300 bg-zinc-50 px-1 py-0.2 mx-1.5 font-bold uppercase tracking-wide">
                        {log.action}
                      </span>
                      <span className="text-zinc-650">on {log.entityType}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* 2. CATALOG MANAGER (CRUD) */}
        {activeTab === "products" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 border border-zinc-200 bg-white">
              <div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-900">
                  Product Catalog Management
                </h3>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  Register, update, and manage canonical active ingredients and supply catalog.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingProduct(null);
                }}
                className="bg-zinc-950 hover:bg-zinc-900 text-white text-[10px] font-bold uppercase px-4 py-2 border border-zinc-950 transition-colors"
              >
                {showAddForm ? "Hide Editor" : "Create Product"}
              </button>
            </div>

            {showAddForm && (
              <div className="max-w-2xl">
                <ProductForm onSuccess={() => setShowAddForm(false)} />
              </div>
            )}

            {editingProduct && (
              <div className="max-w-2xl bg-white p-4 border border-zinc-300">
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <span className="text-[10px] font-bold text-zinc-450 uppercase font-mono">Modifying Product SKU: {editingProduct.sku}</span>
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="text-[10px] font-bold text-zinc-400 hover:text-zinc-700 font-mono"
                  >
                    [CANCEL]
                  </button>
                </div>
                <ProductForm
                  product={editingProduct}
                  onSuccess={() => setEditingProduct(null)}
                />
              </div>
            )}

            <div className="border border-zinc-200 overflow-x-auto bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 font-mono text-[10px] font-bold text-zinc-500 border-b border-zinc-200">
                    <th className="p-3">SKU</th>
                    <th className="p-3">Product details</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Conversion Group</th>
                    <th className="p-3 text-right">Base Price (INR)</th>
                    <th className="p-3 text-right">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-zinc-50/50">
                      <td className="p-3 font-bold">{prod.sku}</td>
                      <td className="p-3">
                        <span className="font-sans font-semibold text-zinc-900 block">{prod.name}</span>
                        {prod.description && <span className="text-[10px] text-zinc-400 block mt-0.5">{prod.description}</span>}
                      </td>
                      <td className="p-3 text-[11px] text-zinc-650">{prod.category}</td>
                      <td className="p-3 text-[11px] text-zinc-650">{prod.unitGroup}</td>
                      <td className="p-3 text-right font-bold">
                        ₹{formatINR(prod.pricePerBaseUnit)} / {prod.baseUnit}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`inline-block text-[8px] font-bold px-1.5 py-0.5 border ${
                            prod.active 
                              ? "bg-green-50 border-green-200 text-green-700" 
                              : "bg-red-50 border-red-200 text-red-700"
                          }`}
                        >
                          {prod.active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setEditingProduct(prod);
                            setShowAddForm(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-2 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-[10px] font-bold text-zinc-900 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-[10px] font-bold text-red-650 transition-colors"
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. WAREHOUSE STOCK CONTROL */}
        {activeTab === "inventory" && (
          <div className="space-y-4">
            <div className="p-4 border border-zinc-200 bg-white">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-900">
                Warehouse Stock Balance Controls
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                Inspect physical coordinates and adjust stock volume with automatic unit scaling.
              </p>
            </div>

            {adjustingProduct && (
              <div className="max-w-xl bg-white p-4 border border-zinc-300">
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <span className="text-[10px] font-bold text-zinc-450 uppercase font-mono">Stock Adjustment Form: {adjustingProduct.sku}</span>
                  <button
                    onClick={() => setAdjustingProduct(null)}
                    className="text-[10px] font-bold text-zinc-400 hover:text-zinc-700 font-mono"
                  >
                    [CLOSE]
                  </button>
                </div>
                <StockAdjustmentForm
                  product={adjustingProduct}
                  onSuccess={() => setAdjustingProduct(null)}
                />
              </div>
            )}

            <div className="border border-zinc-200 overflow-x-auto bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 font-mono text-[10px] font-bold text-zinc-500 border-b border-zinc-200">
                    <th className="p-3">SKU</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Warehouse Location</th>
                    <th className="p-3">Stock Level (Base & Large Units)</th>
                    <th className="p-3">Linear stock level</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono">
                  {products.map((prod) => {
                    const baseQty = Number(prod.inventory?.baseQuantity || 0);
                    const severity = getStockSeverity(baseQty);
                    
                    // Simple linear stock indicator: max width at 20,000 base units
                    const barWidthPercent = Math.min(100, (baseQty / 20000) * 100);
                    
                    return (
                      <tr key={prod.id} className="hover:bg-zinc-50/50">
                        <td className="p-3 font-bold">{prod.sku}</td>
                        <td className="p-3 font-sans font-semibold text-zinc-900">{prod.name}</td>
                        <td className="p-3 text-[11px] text-zinc-650">{prod.inventory?.location || "N/A"}</td>
                        <td className="p-3 font-bold text-zinc-950">{formatStockDisplay(prod)}</td>
                        <td className="p-3 w-48">
                          
                          {/* Monospace Linear stock indicators */}
                          <div className="space-y-1">
                            <div className="h-2 w-full bg-zinc-100 border border-zinc-200">
                              <div 
                                className={`h-full ${severity.barClass}`} 
                                style={{ width: `${barWidthPercent}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center text-[8px] font-bold">
                              <span className={severity.textClass}>{severity.label}</span>
                              <span className="text-zinc-450">{Math.round(barWidthPercent)}% OF CAP</span>
                            </div>
                          </div>

                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setAdjustingProduct(prod);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-3 py-1 bg-zinc-950 hover:bg-zinc-900 text-white text-[10px] font-bold uppercase transition-colors"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. SELLER QUOTATIONS APPROVAL LEDGER */}
        {activeTab === "quotations" && (
          <div className="space-y-4">
            <div className="p-4 border border-zinc-200 bg-white">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-900">
                Seller Quotations Ledger
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                Audit pending quotations and perform approvals or rejections.
              </p>
            </div>

            <div className="space-y-4">
              {quotations.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 font-mono text-xs border border-dashed border-zinc-200 bg-white">
                  No quotations submitted yet.
                </div>
              ) : (
                quotations.map((quote) => (
                  <div key={quote.id} className="border border-zinc-200 bg-white p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-zinc-900">Quote ID: {quote.id.substring(0, 8)}</span>
                          <span
                            className={`px-2 py-0.5 text-[8px] font-bold font-mono border ${
                              quote.status === "APPROVED"
                                ? "bg-emerald-50 border-emerald-250 text-emerald-650"
                                : quote.status === "PENDING"
                                ? "bg-amber-50 border-amber-250 text-amber-650"
                                : "bg-red-50 border-red-250 text-red-650"
                            }`}
                          >
                            {quote.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          Prepared by Seller: <strong className="text-zinc-700">{quote.user.name}</strong> ({quote.user.email})
                        </p>
                        <p className="text-[9px] text-zinc-450 font-mono">
                          Submitted: {new Date(quote.createdAt).toLocaleString()} | Valid Until: {new Date(quote.validUntil).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <span className="text-[9px] text-zinc-500 font-mono block">Grand Total Value</span>
                          <span className="font-mono text-sm font-bold text-zinc-950">₹{formatINR(quote.totalAmount)}</span>
                        </div>
                        
                        {quote.status === "PENDING" && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleQuotationStatus(quote.id, "APPROVED")}
                              disabled={actionLoading === quote.id}
                              className="px-3 py-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-950 text-white text-[10px] font-bold uppercase transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleQuotationStatus(quote.id, "REJECTED")}
                              disabled={actionLoading === quote.id}
                              className="px-3 py-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-red-650 text-[10px] font-bold uppercase transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {quote.status === "APPROVED" && (
                          <button
                            onClick={() => handleConvertToOrder(quote.id)}
                            disabled={actionLoading === quote.id}
                            className="px-3 py-1 bg-zinc-950 hover:bg-zinc-900 text-white text-[10px] font-bold uppercase transition-colors"
                          >
                            Direct Place Order
                          </button>
                        )}
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
                              <td className="p-2 text-right text-zinc-450">{Number(item.baseQuantity)} {item.product.baseUnit}</td>
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

        {/* 5. PLACED ORDERS DATABASE */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="p-4 border border-zinc-200 bg-white">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-900">
                Placed Orders Database
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                Audit trail of completed sales.
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
                          Operator: <strong className="text-zinc-700">{order.user.name}</strong> ({order.user.email})
                        </p>
                        <p className="text-[9px] text-zinc-450 font-mono">
                          Placed: {new Date(order.createdAt).toLocaleString()}
                          {order.quotationId && ` | Converted from Quote: ${order.quotationId.substring(0, 8)}...`}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] text-zinc-500 font-mono block">Grand Total Paid</span>
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
                              <td className="p-2 text-right text-zinc-450">{Number(item.baseQuantity)} {item.product.baseUnit}</td>
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

        {/* 6. IMMUTABLE AUDIT TRAIL LOGS */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="p-4 border border-zinc-200 bg-white">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-900">
                System-wide Compliance Audit Trail
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                Immutable chronological logfile detailing stock modifications, conversions, and quotation conversions.
              </p>
            </div>

            <div className="border border-zinc-200 overflow-x-auto bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 font-mono text-[10px] font-bold text-zinc-500 border-b border-zinc-200">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Operator</th>
                    <th className="p-3">Entity Type</th>
                    <th className="p-3">Action</th>
                    <th className="p-3 text-right">Metadata Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono">
                  {auditLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <tr key={log.id} className="hover:bg-zinc-50/50 align-top">
                        <td className="p-3 text-[10px] text-zinc-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className="font-sans font-bold text-zinc-900 block">{log.user?.name || "System"}</span>
                          <span className="text-[9px] text-zinc-400 block mt-0.5">{log.user?.email || "SYSTEM_DAEMON"}</span>
                        </td>
                        <td className="p-3 text-zinc-650 font-bold text-[10px]">{log.entityType}</td>
                        <td className="p-3">
                          <span
                            className={`inline-block text-[8px] font-bold px-1.5 py-0.5 border ${
                              log.action === "STOCK_CHANGE"
                                ? "bg-amber-50 border-amber-250 text-amber-650"
                                : log.action === "CREATE" || log.action === "APPROVED"
                                ? "bg-emerald-50 border-emerald-250 text-emerald-650"
                                : "bg-zinc-50 border-zinc-250 text-zinc-650"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-[10px] font-bold hover:underline font-mono text-zinc-550"
                          >
                            {isExpanded ? "[COLLAPSE]" : "[EXPAND JSON]"}
                          </button>

                          {isExpanded && (
                            <pre className="text-left mt-2 p-3 bg-zinc-50 border border-zinc-200 text-[10px] text-zinc-600 overflow-x-auto font-mono whitespace-pre-wrap max-w-sm">
                              {JSON.stringify(JSON.parse(log.details), null, 2)}
                            </pre>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
