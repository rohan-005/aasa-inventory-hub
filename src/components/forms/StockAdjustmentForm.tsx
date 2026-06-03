"use client";

import { useState } from "react";
import { adjustStock } from "@/actions/inventory";
import { getSupportedUnitsForGroup } from "@/lib/conversion/conversion";

interface StockAdjustmentFormProps {
  onSuccess?: () => void;
  product: {
    id: string;
    sku: string;
    name: string;
    unitGroup: "WEIGHT" | "VOLUME" | "COUNT";
    baseUnit: string;
    inventory: {
      baseQuantity: any; // Decimal
      location: string;
    } | null;
  };
}

export default function StockAdjustmentForm({ onSuccess, product }: StockAdjustmentFormProps) {
  const units = getSupportedUnitsForGroup(product.unitGroup);
  const [qtyChange, setQtyChange] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(units[0] || product.baseUnit);
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState(product.inventory?.location || "Warehouse A");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const changeVal = parseFloat(qtyChange);
    if (isNaN(changeVal)) {
      setError("Please enter a valid number");
      setLoading(false);
      return;
    }

    try {
      await adjustStock(product.id, changeVal, selectedUnit, reason, location);
      setQtyChange("");
      setReason("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to adjust stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-slate-50 p-4 rounded border border-slate-200 text-sm">
      <div>
        <h4 className="font-bold text-slate-800">Adjust Stock: {product.name}</h4>
        <p className="text-xs text-slate-500 font-mono">SKU: {product.sku}</p>
      </div>

      {error && (
        <div className="p-2 text-xs text-red-650 bg-red-50 border border-red-100 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
            Quantity (Positive to add, Negative to deduct)
          </label>
          <input
            type="number"
            step="0.001"
            required
            placeholder="e.g. 5.5 or -2"
            value={qtyChange}
            onChange={(e) => setQtyChange(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
            Unit
          </label>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
            Warehouse Location
          </label>
          <input
            type="text"
            required
            placeholder="Location..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
            Adjustment Reason
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Restock, Damaged stock..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-650 hover:bg-indigo-750 text-white text-[11px] font-bold px-3 py-1.5 rounded disabled:opacity-50 transition-colors"
        >
          {loading ? "Adjusting..." : "Submit Adjustment"}
        </button>
      </div>
    </form>
  );
}
