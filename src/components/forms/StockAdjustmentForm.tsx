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
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-5 border border-zinc-200 font-sans text-xs">
      <div>
        <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-900">Adjust Balance: {product.name}</h4>
        <p className="text-[10px] text-zinc-400 font-mono">SKU: {product.sku}</p>
      </div>

      {error && (
        <div className="p-3 text-[11px] font-mono text-red-650 bg-red-50 border border-red-200">
          [ERROR] {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[9px] font-bold text-zinc-500 uppercase font-mono">
            Adjustment Quantity (+/-)
          </label>
          <input
            type="number"
            step="0.001"
            required
            placeholder="e.g. 5.5 or -2.0"
            value={qtyChange}
            onChange={(e) => setQtyChange(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[9px] font-bold text-zinc-500 uppercase font-mono">
            Adjustment Unit
          </label>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 font-mono"
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[9px] font-bold text-zinc-500 uppercase font-mono">
            Storage Coordinates
          </label>
          <input
            type="text"
            required
            placeholder="Warehouse A, Rack 3..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[9px] font-bold text-zinc-500 uppercase font-mono">
            Reason Log
          </label>
          <input
            type="text"
            required
            placeholder="Restock, Damaged, Audit adjustment..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950"
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={loading}
          className="bg-zinc-950 hover:bg-zinc-900 text-white text-[10px] font-bold uppercase px-4 py-2 border border-zinc-950 transition-colors disabled:opacity-50 font-mono"
        >
          {loading ? "Adjusting..." : "Submit Adjustment"}
        </button>
      </div>
    </form>
  );
}
