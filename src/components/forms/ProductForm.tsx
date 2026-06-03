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
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow border border-gray-250">
      <h3 className="text-lg font-bold text-gray-900 border-b pb-2">
        {isEdit ? "Edit Product Details" : "Create New Product"}
      </h3>

      {error && (
        <div className="p-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              SKU (Unique Identifier)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. W-RICE-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Product Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Premium Basmati Rice"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Category
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Grains, Oils, Disposables"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Unit Measurement Group
            </label>
            <select
              value={unitGroup}
              onChange={(e) => setUnitGroup(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="WEIGHT">Weight (g, kg)</option>
              <option value="VOLUME">Volume (mL, L)</option>
              <option value="COUNT">Count (item)</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Price per Base Unit (₹)
          </label>
          <input
            type="number"
            step="0.0001"
            required
            placeholder="e.g. 0.08"
            value={pricePerBaseUnit}
            onChange={(e) => setPricePerBaseUnit(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="text-[10px] text-gray-500 mt-1 font-medium italic">
            Base Unit: {getBaseUnitLabel()}. {getPriceHelpText()}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          rows={2}
          placeholder="Product notes or specifications..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-bold px-4 py-2 rounded disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
        </button>
      </div>
    </form>
  );
}
