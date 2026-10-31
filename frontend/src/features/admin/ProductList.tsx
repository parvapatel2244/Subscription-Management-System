import React, { useState, useEffect } from 'react';
import { Plus, Package, Archive, Layers, Trash2 } from 'lucide-react';
import { Product } from '../../types';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productType, setProductType] = useState('software');
  const [salesPrice, setSalesPrice] = useState('2000.00');
  const [costPrice, setCostPrice] = useState('500.00');
  const [description, setDescription] = useState('');
  const [variants, setVariants] = useState<{ variant_name: string; variant_code: string; price_adjustment: string }[]>([]);

  // Variant input
  const [varName, setVarName] = useState('');
  const [varCode, setVarCode] = useState('');
  const [varAdj, setVarAdj] = useState('560.00');
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      const data = await api.get<Product[]>('/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addVariant = () => {
    if (!varName.trim() || !varCode.trim()) return;
    setVariants([...variants, { variant_name: varName, variant_code: varCode, price_adjustment: varAdj }]);
    setVarName('');
    setVarCode('');
    setVarAdj('0.00');
  };

  const removeVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/products', {
        name,
        product_code: productCode,
        product_type: productType,
        sales_price: parseFloat(salesPrice),
        cost_price: parseFloat(costPrice),
        description,
        variants: variants.map((v) => ({
          variant_name: v.variant_name,
          variant_code: v.variant_code,
          price_adjustment: parseFloat(v.price_adjustment)
        }))
      });
      setIsCreateOpen(false);
      setName('');
      setProductCode('');
      setDescription('');
      setVariants([]);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id: number) => {
    if (!window.confirm('Are you sure you want to archive this product?')) return;
    try {
      await api.post(`/products/${id}/archive`);
      fetchProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Catalog</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure software products, add-ons, and pricing variants
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-sky-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Create Product
        </button>
      </div>

      {/* Product List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-400 text-sm">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-400 text-sm">
            No products in catalog yet. Click "Create Product" to add your first product.
          </div>
        ) : (
          products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                    <Package className="w-5 h-5" />
                  </div>
                  <Badge status={p.status} />
                </div>

                <div className="mt-3.5">
                  <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                      {p.product_code}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">{p.product_type}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    {p.description || 'No detailed description.'}
                  </p>
                </div>

                {/* Pricing info */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block uppercase font-medium">
                      Base Sales Price
                    </span>
                    <span className="text-lg font-extrabold text-slate-900">
                      ₹{Number(p.sales_price).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block uppercase font-medium">Cost</span>
                    <span className="text-sm font-semibold text-slate-500">
                      ₹{Number(p.cost_price).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Variants List */}
                {p.variants && p.variants.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-400" />
                      Variants ({p.variants.length})
                    </span>
                    <div className="mt-2 space-y-1.5">
                      {p.variants.map((v) => {
                        const finalPrice = Number(p.sales_price) + Number(v.price_adjustment);
                        return (
                          <div
                            key={v.id}
                            className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg"
                          >
                            <div>
                              <span className="font-medium text-slate-800">{v.variant_name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {v.variant_code}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900">
                                ₹{finalPrice.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-sky-600 block">
                                (+₹{Number(v.price_adjustment).toFixed(2)})
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleArchive(p.id)}
                  className="text-xs text-slate-400 hover:text-rose-600 transition flex items-center gap-1 font-medium"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archive
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Product" maxWidth="2xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Brightloop Analytics Pro"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Product Code *
              </label>
              <input
                type="text"
                required
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="PROD-ANA-01"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Base Sales Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Cost Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Type</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
              >
                <option value="software">Software</option>
                <option value="service">Service</option>
                <option value="addon">Add-on</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enterprise cloud monitoring software with real-time metrics."
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
            />
          </div>

          {/* Variants Builder */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase block mb-2">
              Product Variants & Price Adjustments
            </span>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  placeholder="Variant Name (e.g. 5 Users Addon)"
                  value={varName}
                  onChange={(e) => setVarName(e.target.value)}
                  className="sm:col-span-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-white"
                />
                <input
                  type="text"
                  placeholder="Code (e.g. VAR-5U)"
                  value={varCode}
                  onChange={(e) => setVarCode(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-white font-mono"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Adjustment"
                    value={varAdj}
                    onChange={(e) => setVarAdj(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-white"
                  />
                  <button
                    type="button"
                    onClick={addVariant}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Added variants */}
              {variants.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {variants.map((v, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200"
                    >
                      <span className="font-semibold text-slate-800">
                        {v.variant_name} ({v.variant_code}) &rarr; +₹{Number(v.price_adjustment).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVariant(i)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-sky-600/20 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

