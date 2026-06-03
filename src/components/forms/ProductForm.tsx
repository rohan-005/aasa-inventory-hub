"use client";

import { useState } from "react";
import { createProduct, updateProduct } from "@/actions/products";

interface ProductFormProps {
  onSuccess?: () => void;
  product?: {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    category: string;
    unitGroup: "WEIGHT" | "VOLUME" | "COUNT";
    baseUnit: string;
    pricePerBaseUnit: any; // Decimal
  };
}

export default function ProductForm({ onSuccess, product }: ProductFormProps) {
  const isEdit = !!product;
  const [sku, setSku] = useState(product?.sku || "");
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [category, setCategory] = useState(product?.category || "");
  const [unitGroup, setUnitGroup] = useState<"WEIGHT" | "VOLUME" | "COUNT">(
    product?.unitGroup || "WEIGHT"
  );
  const [pricePerBaseUnit, setPricePerBaseUnit] = useState(
    product ? Number(product.pricePerBaseUnit).toString() : ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getBaseUnitLabel = () => {
    if (unitGroup === "WEIGHT") return "Grams (g)";
    if (unitGroup === "VOLUME") return "Milliliters (mL)";
    return "Items (item)";
  };

  const getPriceHelpText = () => {
    if (unitGroup === "WEIGHT") return "Price per 1 Gram (e.g. ₹80 per kg = ₹0.08 per g)";
    if (unitGroup === "VOLUME") return "Price per 1 mL (e.g. ₹180 per L = ₹0.18 per mL)";
    return "Price per 1 Item";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isEdit && product) {
        await updateProduct(product.id, {
          name,
          description,
          category,
          pricePerBaseUnit: parseFloat(pricePerBaseUnit),
        });
      } else {
        await createProduct({
          sku,
          name,
          description,
          category,
          unitGroup,
          baseUnit: unitGroup === "WEIGHT" ? "g" : unitGroup === "VOLUME" ? "mL" : "item",
          pricePerBaseUnit: parseFloat(pricePerBaseUnit),
        });
      }
      if (onSuccess) onSuccess();
      if (!isEdit) {
        setSku("");
        setName("");
        setDescription("");
        setCategory("");
        setPricePerBaseUnit("");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 border border-zinc-200 font-sans">
      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-900 border-b pb-2">
        {isEdit ? "Modify Catalog Item" : "Register Catalog Item"}
      </h3>

      {error && (
        <div className="p-3 text-[11px] font-mono text-red-650 bg-red-50 border border-red-200">
          [ERROR] {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isEdit && (
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase font-mono">
              SKU (Immutable Identifier)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. W-API-PARACETAMOL-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 font-mono uppercase"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase font-mono">
            Product Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Paracetamol Raw API"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase font-mono">
            Category
          </label>
          <input
            type="text"
            required
            placeholder="e.g. API Active, Excipients, Liquid API"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
          />
        </div>

        {!isEdit && (
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase font-mono">
              Unit Measurement Group
            </label>
            <select
              value={unitGroup}
              onChange={(e) => setUnitGroup(e.target.value as any)}
              className="w-full px-3 py-2 border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 font-mono"
            >
              <option value="WEIGHT">Weight (g, kg)</option>
              <option value="VOLUME">Volume (mL, L)</option>
              <option value="COUNT">Count (item)</option>
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase font-mono">
            Price per Base Unit (₹)
          </label>
          <input
            type="number"
            step="0.0001"
            required
            placeholder="e.g. 0.08"
            value={pricePerBaseUnit}
            onChange={(e) => setPricePerBaseUnit(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 font-mono"
          />
          <p className="text-[9px] text-zinc-400 mt-1 font-mono italic">
            Base Unit: {getBaseUnitLabel()}. {getPriceHelpText()}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-zinc-500 uppercase font-mono">
          Description / Product notes
        </label>
        <textarea
          rows={2}
          placeholder="Enter pharmaceutical grade details or storage specs..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-zinc-950 hover:bg-zinc-900 text-white text-[10px] font-bold uppercase px-4 py-2 border border-zinc-950 transition-colors disabled:opacity-50 font-mono"
        >
          {loading ? "Registering..." : isEdit ? "Update Catalog" : "Register Product"}
        </button>
      </div>
    </form>
  );
}
